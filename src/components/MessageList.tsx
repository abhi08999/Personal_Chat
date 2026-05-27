'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { TypingDots } from './TypingDots';
import type { DecryptedMessage, Me, Peer } from '@/types';

export function MessageList({
  messages, historyLoaded, me, peer, peerTyping, onReact, markRead,
}: {
  messages: DecryptedMessage[]; historyLoaded: boolean; me: Me; peer: Peer; peerTyping: boolean;
  onReact: (id: string, emoji: string) => void;
  markRead: (ids: string[]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const lightboxOverlayRef = useRef(false);

  // Intercept Android back button to close lightbox instead of exiting the app
  useEffect(() => {
    function onPop() {
      lightboxOverlayRef.current = false;
      setLightbox(null);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function openLightbox(url: string) {
    lightboxOverlayRef.current = true;
    history.pushState({ am_overlay: 'lightbox' }, '');
    setLightbox(url);
  }

  function closeLightbox() {
    setLightbox(null);
    if (lightboxOverlayRef.current) {
      lightboxOverlayRef.current = false;
      history.back();
    }
  }

  const isFirstLoad = useRef(true);

  // Instant jump on initial history load; smooth for live messages/typing
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      if (isFirstLoad.current && historyLoaded) {
        isFirstLoad.current = false;
        el.scrollTop = el.scrollHeight;
      } else if (!isFirstLoad.current) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    });
  }, [messages.length, peerTyping, historyLoaded]);

  useEffect(() => {
    const unread = messages.filter((m) => m.from !== me.id && !m.readAt && !m._id.startsWith('tmp-')).map((m) => m._id);
    if (unread.length) markRead(unread);
  }, [messages, me.id, markRead]);

  // Group by day
  const groups: { day: string; items: DecryptedMessage[] }[] = [];
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const label = d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    const last = groups[groups.length - 1];
    if (last && last.day === label) last.items.push(m);
    else groups.push({ day: label, items: [m] });
  }

  if (!historyLoaded) {
    return (
      <div className="flex-1 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-lavender-600/60" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 grid place-items-center px-6 text-center">
        <div>
          <div className="font-display text-3xl text-ink-900 dark:text-white">Say hi, lovebird 💜</div>
          <p className="mt-2 text-sm text-ink-700/60 dark:text-white/50">Your messages are sealed end-to-end. Only the two of you can read them.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-5 space-y-5">
        {groups.map((g, i) => (
          <div key={i} className="space-y-2">
            <div className="text-center text-[11px] uppercase tracking-[0.16em] text-ink-700/45 dark:text-white/35 my-3">{g.day}</div>
            {g.items.map((m) => (
              <MessageBubble
                key={m._id}
                m={m}
                isMine={m.from === me.id}
                peerId={peer.id}
                onReact={onReact}
                onOpenImage={openLightbox}
              />
            ))}
          </div>
        ))}
        {peerTyping && (
          <div className="flex justify-start"><TypingDots /></div>
        )}
      </div>

      {lightbox && (
        <button
          onClick={closeLightbox}
          className="fixed inset-0 z-50 bg-ink-900/80 backdrop-blur-md grid place-items-center p-6"
        >
          <img src={lightbox} alt="" className="max-h-[88vh] max-w-full rounded-2xl shadow-glow" />
        </button>
      )}
    </div>
  );
}
