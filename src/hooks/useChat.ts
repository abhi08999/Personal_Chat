'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPusher, PUSHER_CHANNEL } from '@/lib/pusher-client';
import type { PresenceChannel } from 'pusher-js';
import {
  sodiumReady, encryptText, decryptText, openPrivateKeyWithPassword,
  loadSealedPrivateKey, wipeSealedPrivateKey, encryptBytesForPeer, decryptBytesFromPeer,
  derivePublicKey,
} from '@/lib/crypto/e2ee';
import type { DecryptedMessage, Me, Peer, WireMessage } from '@/types';

// Decoy notifications — disguised as generic company alerts so no one knows
// what this app actually is.
const DECOYS = [
  { title: 'HDFC Bank', body: 'OTP 638271 for your transaction. Valid 10 min. Do not share.' },
  { title: 'Nykaa', body: 'Items in your wishlist are almost sold out! Shop now 🛍️' },
  { title: 'Amazon', body: 'Your package is out for delivery today.' },
  { title: 'Flipkart', body: 'Exclusive deal! Extra 20% off your next order. Tap to claim.' },
  { title: 'SBI Bank', body: 'Your account statement for this month is now available.' },
  { title: 'Zomato', body: 'Your order is on the way! ETA: 22 mins 🍕' },
  { title: 'Myntra', body: 'Your wishlist item just came back in stock!' },
  { title: 'ICICI Bank', body: 'Credit card payment of ₹2,499 due in 3 days.' },
  { title: 'PharmEasy', body: 'Reminder: time to reorder your medicines. Free delivery today!' },
  { title: 'Swiggy', body: 'Special offer near you — free delivery on next 3 orders 🎉' },
];

// Soft two-tone chime (no audio file needed — generated via Web Audio API)
function playPing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    function tone(freq: number, startAt: number, duration: number, vol: number) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + startAt);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + startAt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration);
    }

    tone(880, 0,    0.18, 0.18); // high A
    tone(1174, 0.12, 0.22, 0.13); // D above
    setTimeout(() => ctx.close(), 600);
  } catch { /* AudioContext not available */ }
}

function fireDecoyNotification() {
  playPing();
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const d = DECOYS[Math.floor(Math.random() * DECOYS.length)];
  new Notification(d.title, { body: d.body, silent: true }); // sound handled by playPing
}

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
        // Safety net: ensure the server has the public key that matches THIS private key.
        // If ensureKeys on the lock page had a timing issue or the key rotated on another
        // device, this re-registers the correct public key so senderPublicKey in sent
        // messages always matches the private key actually used for encryption.
        try {
          const derivedPub = await derivePublicKey(sk);
          const keyRes = await fetch('/api/keys');
          const keyJson = await keyRes.json();
          if (keyJson.publicKey !== derivedPub) {
            await fetch('/api/keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicKey: derivedPub }),
            });
          }
        } catch { /* non-critical, continue */ }
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

  // Messages are cleared on logout (ChatHeader) — not on tab close,
  // because closing the tab before the other person reads would wipe their messages.

  const decrypt = useCallback(async (m: WireMessage): Promise<DecryptedMessage> => {
    if (!privateKeyRef.current) return { ...m, failed: true };
    const mysk = privateKeyRef.current;

    // Build ordered list of public keys to try.
    // For my own echoed messages: peer's key for DH (symmetric property of crypto_box).
    // For received messages: prefer the key embedded at send time (senderPublicKey) so
    // key rotation doesn't break decryption; fall back to current peer key.
    const candidates: string[] = [];
    if (m.from === me.id) {
      if (peer.publicKey) candidates.push(peer.publicKey);
    } else {
      if (m.senderPublicKey) candidates.push(m.senderPublicKey);
      if (peer.publicKey && peer.publicKey !== m.senderPublicKey) candidates.push(peer.publicKey);
    }
    if (!candidates.length) return { ...m, failed: true };

    async function tryDecrypt(pub: string): Promise<DecryptedMessage> {
      if (m.contentType === 'text') {
        const text = await decryptText(m.ciphertext, m.nonce, pub, mysk);
        return { ...m, plaintext: text };
      }
      if (m.contentType === 'image' && m.mediaUrl && m.mediaKeyNonce) {
        const res = await fetch(m.mediaUrl, { mode: 'cors' });
        if (!res.ok) throw new Error(`blob fetch ${res.status}`);
        const ct = new Uint8Array(await res.arrayBuffer());
        const bytes = await decryptBytesFromPeer(
          ct, m.mediaNonce!, m.mediaKeyCiphertext!, m.mediaKeyNonce, pub, mysk,
        );
        const url = URL.createObjectURL(new Blob([bytes]));
        objectUrlsRef.current.push(url);
        return { ...m, imageObjectUrl: url, plaintext: '' };
      }
      return m as DecryptedMessage;
    }

    // Try each candidate key
    for (const pub of candidates) {
      try { return await tryDecrypt(pub); } catch { /* next */ }
    }

    // All local keys failed — fetch a fresh peer key from the server and try once more
    try {
      const r = await fetch('/api/keys/peer');
      const j = await r.json();
      const freshPub: string | null = j?.peer?.publicKey ?? null;
      if (freshPub && !candidates.includes(freshPub)) {
        try { return await tryDecrypt(freshPub); } catch { /* still failed */ }
      }
    } catch { /* network error */ }

    return { ...m, failed: true };
  }, [peer.publicKey, me.id]);

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
      if (m.from !== me.id) fireDecoyNotification();
      const d = await decrypt(m);
      setMessages((prev) => {
        const idx = m.clientId ? prev.findIndex((x) => x.clientId === m.clientId && x.pending) : -1;
        if (idx >= 0) {
          const copy = prev.slice();
          const optimistic = prev[idx];
          // Sender's own image: keep the local object URL if re-decrypt fails
          // (Blob fetch from a different origin can be flaky on mobile)
          if (d.failed && optimistic.imageObjectUrl) {
            copy[idx] = { ...d, imageObjectUrl: optimistic.imageObjectUrl, failed: false, pending: false };
          } else {
            copy[idx] = d;
          }
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
