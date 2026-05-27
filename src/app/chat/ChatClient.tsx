'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatHeader } from '@/components/ChatHeader';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { useChat } from '@/hooks/useChat';
import { Loader2 } from 'lucide-react';
import type { Me, Peer } from '@/types';

export function ChatClient({
  me, peer,
}: { me: Me; peer: Peer | null }) {
  const router = useRouter();

  // Require password re-entry on every new browser session.
  // sessionStorage is cleared when the tab/window is closed, so this
  // effectively auto-logs-out the user on close without wiping their history.
  useEffect(() => {
    if (!sessionStorage.getItem('am.kpw')) {
      router.replace('/lock');
    }
  }, [router]);

  const [peerWithKey, setPeerWithKey] = useState<Peer | null>(peer);

  // Fast poll until peer has a key (initial setup)
  useEffect(() => {
    if (peerWithKey?.publicKey) return;
    const id = setInterval(async () => {
      const r = await fetch('/api/keys/peer');
      const j = await r.json();
      if (j?.peer?.publicKey) {
        setPeerWithKey(j.peer);
        clearInterval(id);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [peerWithKey?.publicKey]);

  // Slow poll to detect key rotation while chat is open — if peer regenerates
  // their keys on another device/browser, we'll pick up the new key within 20s
  useEffect(() => {
    const id = setInterval(async () => {
      const r = await fetch('/api/keys/peer');
      const j = await r.json();
      if (j?.peer?.publicKey) {
        setPeerWithKey((prev) =>
          prev?.publicKey === j.peer.publicKey ? prev : j.peer
        );
      }
    }, 20000);
    return () => clearInterval(id);
  }, []);

  // Make sure my own pubkey is fetched (server source of truth)
  const [meWithKey, setMeWithKey] = useState<Me>(me);
  useEffect(() => {
    if (meWithKey.publicKey) return;
    (async () => {
      const r = await fetch('/api/keys');
      const j = await r.json();
      if (j?.publicKey) setMeWithKey({ ...me, publicKey: j.publicKey });
    })();
  }, [me, meWithKey.publicKey]);

  if (!peerWithKey) {
    return <Centered>Setting up your private space…</Centered>;
  }
  if (!peerWithKey.publicKey) {
    return (
      <Centered>
        Waiting for <span className="font-display text-lavender-700 mx-1">{peerWithKey.displayName}</span> to come online so we can exchange keys 💜
      </Centered>
    );
  }
  if (!meWithKey.publicKey) {
    return <Centered>Preparing your keys…</Centered>;
  }

  return <Bound me={meWithKey} peer={peerWithKey} />;
}

function Bound({ me, peer }: { me: Me; peer: Peer }) {
  const { messages, online, peerTyping, ready, sendText, sendImage, markRead, react, setTyping } = useChat(me, peer);
  const [screenGuard, setScreenGuard] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // iOS VisualViewport fix: when the keyboard opens iOS auto-scrolls the page
  // which visually shifts "fixed" elements upward. We track the actual visible
  // area and keep the container pinned to it so the header never moves.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function pin() {
      const el = mainRef.current;
      if (!el || !vv) return;
      el.style.height = vv.height + 'px';
      el.style.top = vv.offsetTop + 'px';
      window.scrollTo(0, 0);
    }
    pin();
    vv.addEventListener('resize', pin);
    vv.addEventListener('scroll', pin);
    return () => {
      vv.removeEventListener('resize', pin);
      vv.removeEventListener('scroll', pin);
    };
  }, []);

  // Request notification permission once (used for decoy notifications)
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Blur content when tab loses focus (deters screen recording / shoulder surfing)
  useEffect(() => {
    function onChange() { setScreenGuard(document.visibilityState === 'hidden'); }
    document.addEventListener('visibilitychange', onChange);
    // Disable right-click context menu (prevents "Save image as")
    const noCtx = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', noCtx);
    return () => {
      document.removeEventListener('visibilitychange', onChange);
      document.removeEventListener('contextmenu', noCtx);
    };
  }, []);

  if (!ready) return <Centered>Unsealing your messages…</Centered>;

  return (
    <main ref={mainRef} className="fixed left-0 right-0 flex flex-col overflow-hidden select-none" style={{ top: 0, height: '100dvh' }}>
      {screenGuard && (
        <div className="fixed inset-0 z-[9999] backdrop-blur-3xl bg-white/90" />
      )}
      <ChatHeader peerName={peer.displayName} peerHandle={peer.handle} online={online.has(peer.id)} peerTyping={peerTyping} />
      <MessageList
        messages={messages}
        me={me}
        peer={peer}
        peerTyping={peerTyping}
        onReact={react}
        markRead={markRead}
      />
      <MessageInput onSend={sendText} onSendImage={sendImage} onTyping={setTyping} />
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh grid place-items-center px-6 text-center">
      <div>
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-lavender-600" />
        <p className="mt-3 text-ink-700/70 text-sm">{children}</p>
      </div>
    </main>
  );
}
