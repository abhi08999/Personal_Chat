'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPusher, PUSHER_CHANNEL } from '@/lib/pusher-client';
import type { PresenceChannel } from 'pusher-js';
import {
  sodiumReady, encryptText, decryptText, openPrivateKeyWithPassword,
  loadSealedPrivateKey, wipeSealedPrivateKey, encryptBytesForPeer, decryptBytesFromPeer,
} from '@/lib/crypto/e2ee';
import type { DecryptedMessage, Me, Peer, WireMessage } from '@/types';

export function useChat(me: Me, peer: Peer) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [peerTyping, setPeerTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const privateKeyRef = useRef<Uint8Array | null>(null);
  const channelRef = useRef<PresenceChannel | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const markedReadRef = useRef<Set<string>>(new Set());
  const lastTypingSentRef = useRef<boolean>(false);

  // Unseal private key once on mount using password kept in sessionStorage
  useEffect(() => {
    let alive = true;
    (async () => {
      await sodiumReady();
      const pw = sessionStorage.getItem('am.kpw');
      const sealed = await loadSealedPrivateKey();
      if (!pw || !sealed) { setReady(true); return; }
      try {
        const sk = await openPrivateKeyWithPassword(sealed, pw);
        if (!alive) return;
        privateKeyRef.current = sk;
        setReady(true);
      } catch {
        // Stale or corrupted key blob — wipe it and force re-login to regenerate
        await wipeSealedPrivateKey();
        sessionStorage.removeItem('am.kpw');
        if (alive) window.location.replace('/lock');
      }
    })();
    return () => { alive = false; };
  }, []);

  // Revoke all object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => { objectUrlsRef.current.forEach(URL.revokeObjectURL); };
  }, []);

  // Erase all messages when the tab/window is closed
  useEffect(() => {
    function onPageHide() {
      navigator.sendBeacon('/api/messages/clear');
    }
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  const decrypt = useCallback(async (m: WireMessage): Promise<DecryptedMessage> => {
    if (!privateKeyRef.current || !peer.publicKey) {
      return { ...m, failed: true };
    }
    // NaCl crypto_box DH: shared secret = DH(mySK, peerPK) regardless of who sent the message
    const peerPub = peer.publicKey;
    try {
      if (m.contentType === 'text') {
        const text = await decryptText(m.ciphertext, m.nonce, peerPub, privateKeyRef.current);
        return { ...m, plaintext: text };
      } else if (m.contentType === 'image' && m.mediaUrl && m.mediaKeyNonce) {
        const res = await fetch(m.mediaUrl);
        const ct = new Uint8Array(await res.arrayBuffer());
        const bytes = await decryptBytesFromPeer(
          ct,
          m.mediaNonce!,
          m.mediaKeyCiphertext!,
          m.mediaKeyNonce,
          peerPub,
          privateKeyRef.current,
        );
        const url = URL.createObjectURL(new Blob([bytes]));
        objectUrlsRef.current.push(url);
        return { ...m, imageObjectUrl: url, plaintext: '' };
      }
      return m as DecryptedMessage;
    } catch {
      return { ...m, failed: true };
    }
  }, [peer.publicKey]);

  // Load history and subscribe to Pusher
  useEffect(() => {
    if (!ready || !peer.publicKey) return;
    let alive = true;

    (async () => {
      const res = await fetch('/api/messages?limit=50');
      const { messages: hist } = await res.json();
      const dec = await Promise.all((hist as WireMessage[]).map(decrypt));
      if (alive) setMessages(dec);
    })();

    const pusher = getPusher();
    const ch = pusher.subscribe(PUSHER_CHANNEL) as PresenceChannel;
    channelRef.current = ch;

    ch.bind('pusher:subscription_succeeded', (data: { members: Record<string, unknown> }) => {
      setOnline(new Set(Object.keys(data.members)));
    });
    ch.bind('pusher:member_added', (member: { id: string }) => {
      setOnline((prev) => new Set([...prev, member.id]));
    });
    ch.bind('pusher:member_removed', (member: { id: string }) => {
      setOnline((prev) => { const n = new Set(prev); n.delete(member.id); return n; });
    });

    ch.bind('message:new', async (m: WireMessage) => {
      const d = await decrypt(m);
      setMessages((prev) => {
        const idx = m.clientId ? prev.findIndex((x) => x.clientId === m.clientId && x.pending) : -1;
        if (idx >= 0) {
          const copy = prev.slice();
          copy[idx] = d;
          return copy;
        }
        if (prev.some((x) => x._id === m._id)) return prev;
        return [...prev, d];
      });
    });

    ch.bind('message:read', ({ ids, by, at }: { ids: string[]; by: string; at: string }) => {
      if (by === me.id) return;
      setMessages((prev) => prev.map((m) => ids.includes(m._id) ? { ...m, readAt: at } : m));
    });

    ch.bind('message:reaction', ({ id, by, emoji }: { id: string; by: string; emoji: string }) => {
      setMessages((prev) => prev.map((m) => m._id === id
        ? { ...m, reactions: { ...(m.reactions || {}), [by]: emoji } }
        : m
      ));
    });

    ch.bind('typing', ({ from, isTyping }: { from: string; isTyping: boolean }) => {
      if (from !== me.id) setPeerTyping(isTyping);
    });

    return () => {
      alive = false;
      ch.unbind_all();
      pusher.unsubscribe(PUSHER_CHANNEL);
      channelRef.current = null;
    };
  }, [ready, peer.publicKey, decrypt, me.id]);

  const sendText = useCallback(async (text: string) => {
    if (!privateKeyRef.current || !peer.publicKey) return;
    const clientId = crypto.randomUUID();
    const optimistic: DecryptedMessage = {
      _id: 'tmp-' + clientId,
      from: me.id, ciphertext: '', nonce: '', contentType: 'text',
      plaintext: text, pending: true, clientId, createdAt: new Date(),
    };
    setMessages((p) => [...p, optimistic]);

    const env = await encryptText(text, peer.publicKey, privateKeyRef.current);
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...env, contentType: 'text', clientId }),
    });
    if (!res.ok) {
      setMessages((p) => p.map((m) => m.clientId === clientId
        ? { ...m, failed: true, pending: false } : m));
    }
  }, [me.id, peer.publicKey]);

  const sendImage = useCallback(async (file: File) => {
    if (!privateKeyRef.current || !peer.publicKey) return;
    const clientId = crypto.randomUUID();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const objUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(objUrl);

    const optimistic: DecryptedMessage = {
      _id: 'tmp-' + clientId, from: me.id, ciphertext: '', nonce: '',
      contentType: 'image', imageObjectUrl: objUrl, pending: true, clientId, createdAt: new Date(),
    };
    setMessages((p) => [...p, optimistic]);

    const enc = await encryptBytesForPeer(bytes, peer.publicKey, privateKeyRef.current);
    const up = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: enc.mediaCiphertext,
    });

    if (!up.ok) {
      setMessages((p) => p.map((m) => m.clientId === clientId
        ? { ...m, failed: true, pending: false } : m));
      return;
    }

    const { url: mediaUrl } = await up.json();
    const textEnv = await encryptText('[image]', peer.publicKey, privateKeyRef.current);
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...textEnv,
        contentType: 'image',
        mediaUrl,
        mediaNonce: enc.mediaNonce,
        mediaKeyCiphertext: enc.mediaKeyCiphertext,
        mediaKeyNonce: enc.mediaKeyNonce,
        clientId,
      }),
    });
    if (!res.ok) {
      setMessages((p) => p.map((m) => m.clientId === clientId
        ? { ...m, failed: true, pending: false } : m));
    }
  }, [me.id, peer.publicKey]);

  const markRead = useCallback((ids: string[]) => {
    const newIds = ids.filter((id) => !markedReadRef.current.has(id));
    if (!newIds.length) return;
    newIds.forEach((id) => markedReadRef.current.add(id));
    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: newIds }),
    });
  }, []);

  const react = useCallback((id: string, emoji: string) => {
    fetch('/api/messages/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, emoji }),
    });
  }, []);

  const setTyping = useCallback((isTyping: boolean) => {
    if (isTyping === lastTypingSentRef.current) return;
    lastTypingSentRef.current = isTyping;
    fetch('/api/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTyping }),
    }).catch(() => {});
  }, []);

  return { messages, online, peerTyping, ready, sendText, sendImage, markRead, react, setTyping };
}
