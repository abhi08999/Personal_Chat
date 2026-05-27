'use client';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Loader2, AlertCircle, CornerUpLeft, Pencil } from 'lucide-react';
import { useRef, useState } from 'react';
import { LinkText } from './LinkText';
import { cn } from '@/lib/utils';
import type { DecryptedMessage } from '@/types';

const SWIPE_THRESHOLD = 58;

export function MessageBubble({
  m, isMine, peerId, onReact, onOpenImage, onReply, onEdit, replyToMessage,
}: {
  m: DecryptedMessage; isMine: boolean; peerId: string;
  onReact: (id: string, emoji: string) => void;
  onOpenImage: (url: string) => void;
  onReply: (m: DecryptedMessage) => void;
  onEdit: (m: DecryptedMessage) => void;
  replyToMessage?: DecryptedMessage;
}) {
  const [showActions, setShowActions] = useState(false);
  const [swipeDelta, setSwipeDelta] = useState(0);

  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeDir = useRef<'h' | 'v' | null>(null);
  const swipeTriggered = useRef(false);

  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const reactions = m.reactions || {};
  const peerReaction = reactions[peerId];
  const myReaction = Object.entries(reactions).find(([uid]) => uid !== peerId)?.[1];
  const canEdit = isMine && m.contentType === 'text' && !m.pending && !m.failed;

  // ── Touch handlers ──────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeDir.current = null;
    swipeTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!m.pending && !m.failed) setShowActions(true);
    }, 480);
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Determine swipe axis on first significant movement
    if (!swipeDir.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swipeDir.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (swipeDir.current === 'h') clearTimeout(longPressTimer.current);
    }

    if (swipeDir.current === 'h' && dx > 0 && !m.pending && !m.failed) {
      const clamped = Math.min(dx, 80);
      setSwipeDelta(clamped);
      // Haptic tick at threshold
      if (!swipeTriggered.current && clamped >= SWIPE_THRESHOLD) {
        swipeTriggered.current = true;
        try { (navigator as any).vibrate?.(12); } catch {}
      } else if (clamped < SWIPE_THRESHOLD) {
        swipeTriggered.current = false;
      }
    }
  }

  function onTouchEnd() {
    clearTimeout(longPressTimer.current);
    if (swipeDelta >= SWIPE_THRESHOLD) onReply(m);
    setSwipeDelta(0);
    swipeDir.current = null;
    swipeTriggered.current = false;
  }

  function handleAction(fn: () => void) {
    setShowActions(false);
    fn();
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn('group flex w-full', isMine ? 'justify-end' : 'justify-start')}
    >
      {/* Tap-outside overlay to close action bar on mobile */}
      {showActions && (
        <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
      )}

      <div
        className={cn('relative max-w-[78%] sm:max-w-[68%] z-20', isMine ? 'items-end' : 'items-start')}
        style={{
          transform: `translateX(${swipeDelta}px)`,
          transition: swipeDelta === 0 ? 'transform 0.3s cubic-bezier(0.22,1,0.36,1)' : 'none',
          touchAction: 'pan-y',
        }}
      >
        {/* Swipe-to-reply icon — revealed as bubble slides right */}
        {swipeDelta > 4 && (
          <div
            className="absolute left-0 -translate-x-full top-1/2 -translate-y-1/2 pr-2.5 pointer-events-none"
            style={{ opacity: Math.min(swipeDelta / SWIPE_THRESHOLD, 1) }}
          >
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-150',
              swipeDelta >= SWIPE_THRESHOLD
                ? 'bg-lavender-500 text-white'
                : 'bg-blush-200 dark:bg-ink-700 text-ink-700/50 dark:text-white/50',
            )}>
              <CornerUpLeft className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Desktop hover / mobile long-press action bar */}
        {showActions && !m.pending && !m.failed && (
          <div className={cn(
            'absolute -top-11 flex items-center gap-0.5 bg-white dark:bg-ink-800 shadow-soft rounded-full px-2 py-1.5 border border-blush-200/60 dark:border-ink-700/40 z-30',
            isMine ? 'right-0' : 'left-0',
          )}>
            <button
              onClick={() => handleAction(() => onReply(m))}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium text-ink-700/70 dark:text-white/60 hover:bg-blush-50 dark:hover:bg-ink-700/50 hover:text-lavender-700 dark:hover:text-lavender-400 transition"
            >
              <CornerUpLeft className="w-3.5 h-3.5" /> Reply
            </button>
            {canEdit && (
              <button
                onClick={() => handleAction(() => onEdit(m))}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium text-ink-700/70 dark:text-white/60 hover:bg-blush-50 dark:hover:bg-ink-700/50 hover:text-lavender-700 dark:hover:text-lavender-400 transition"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            <div className="w-px h-4 bg-blush-200 dark:bg-ink-700/60 mx-1" />
            {['❤️','😂','😍','🥺','🔥','👍'].map((e) => (
              <button
                key={e}
                onClick={() => handleAction(() => onReact(m._id, e))}
                className="hover:scale-125 transition text-base leading-none px-0.5"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div
          onMouseEnter={() => { if (!m.pending && !m.failed) setShowActions(true); }}
          onMouseLeave={() => setShowActions(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={() => { if (!m.pending && !m.failed) { onReact(m._id, '❤️'); setShowActions(false); } }}
          className={cn(
            'relative px-4 py-2.5 rounded-3xl shadow-bubble break-words whitespace-pre-wrap leading-relaxed text-[15px] cursor-default select-none',
            isMine
              ? 'bg-gradient-bubble-me text-white rounded-br-md'
              : 'bg-gradient-bubble-them dark:bg-none dark:bg-ink-800 text-ink-900 dark:text-white border border-blush-200/60 dark:border-ink-700/30 rounded-bl-md',
          )}
        >
          {/* Reply quote block */}
          {replyToMessage && (
            <div className={cn(
              'mb-2 px-3 py-1.5 rounded-xl text-[12px] border-l-2',
              isMine
                ? 'bg-white/15 border-white/50'
                : 'bg-blush-50 dark:bg-ink-700/40 border-lavender-400 dark:border-lavender-600',
            )}>
              <div className="font-semibold text-[11px] mb-0.5 opacity-70">
                {replyToMessage.from === m.from ? (isMine ? 'You' : 'Them') : (isMine ? 'Them' : 'You')}
              </div>
              <div className="truncate leading-snug opacity-80">
                {replyToMessage.contentType === 'image' ? '📷 Photo' : (replyToMessage.plaintext || '…')}
              </div>
            </div>
          )}
          {/* Deleted reply stub */}
          {m.replyToId && !replyToMessage && (
            <div className={cn(
              'mb-2 px-3 py-1.5 rounded-xl text-[12px] border-l-2 opacity-40 italic',
              isMine
                ? 'bg-white/10 border-white/30'
                : 'bg-blush-50 dark:bg-ink-700/30 border-blush-300 dark:border-ink-600',
            )}>
              Original message no longer available
            </div>
          )}

          {m.contentType === 'image' && m.imageObjectUrl ? (
            <button onClick={() => onOpenImage(m.imageObjectUrl!)} className="block -m-1">
              <img src={m.imageObjectUrl} alt="" loading="lazy" className="rounded-2xl max-h-80 object-cover" />
            </button>
          ) : m.failed ? (
            <span className="italic opacity-70">[could not decrypt]</span>
          ) : (
            <LinkText>{m.plaintext || ''}</LinkText>
          )}
        </div>

        {/* Reactions */}
        {(peerReaction || myReaction) && (
          <div className={cn('flex gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
            {myReaction && <span className="bg-white/80 dark:bg-ink-800/80 border border-blush-200/60 dark:border-ink-700/30 rounded-full px-1.5 py-0.5 text-xs shadow-bubble">{myReaction}</span>}
            {peerReaction && peerReaction !== myReaction && <span className="bg-white/80 dark:bg-ink-800/80 border border-blush-200/60 dark:border-ink-700/30 rounded-full px-1.5 py-0.5 text-xs shadow-bubble">{peerReaction}</span>}
          </div>
        )}

        {/* Timestamp + status */}
        <div className={cn('mt-1 flex items-center gap-1 text-[10px] text-ink-700/50 dark:text-white/35', isMine ? 'justify-end' : 'justify-start')}>
          <span>{time}</span>
          {m.editedAt && <span className="italic opacity-70">edited</span>}
          {isMine && (
            m.pending ? <Loader2 className="w-3 h-3 animate-spin" />
            : m.failed ? <AlertCircle className="w-3 h-3 text-rose-500" />
            : m.readAt ? <CheckCheck className="w-3 h-3 text-lavender-600" />
            : <Check className="w-3 h-3" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
