'use client';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { LinkText } from './LinkText';
import { cn } from '@/lib/utils';
import type { DecryptedMessage } from '@/types';

export function MessageBubble({
  m, isMine, peerId, onReact, onOpenImage,
}: {
  m: DecryptedMessage; isMine: boolean; peerId: string;
  onReact: (id: string, emoji: string) => void;
  onOpenImage: (url: string) => void;
}) {
  const [showReact, setShowReact] = useState(false);
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const reactions = m.reactions || {};
  const peerReaction = reactions[peerId];
  const myReaction = Object.entries(reactions).find(([uid]) => uid !== peerId)?.[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn('group flex w-full', isMine ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('relative max-w-[78%] sm:max-w-[68%]', isMine ? 'items-end' : 'items-start')}>
        <div
          onDoubleClick={() => { if (!m.pending && !m.failed) { onReact(m._id, '❤️'); setShowReact(false); } }}
          onMouseEnter={() => setShowReact(true)}
          onMouseLeave={() => setShowReact(false)}
          className={cn(
            'relative px-4 py-2.5 rounded-3xl shadow-bubble break-words whitespace-pre-wrap leading-relaxed text-[15px]',
            isMine
              ? 'bg-gradient-bubble-me text-white rounded-br-md'
              : 'bg-gradient-bubble-them dark:bg-none dark:bg-ink-800 text-ink-900 dark:text-white border border-blush-200/60 dark:border-ink-700/30 rounded-bl-md'
          )}
        >
          {m.contentType === 'image' && m.imageObjectUrl ? (
            <button onClick={() => onOpenImage(m.imageObjectUrl!)} className="block -m-1">
              <img
                src={m.imageObjectUrl}
                alt=""
                loading="lazy"
                className="rounded-2xl max-h-80 object-cover"
              />
            </button>
          ) : m.failed ? (
            <span className="italic opacity-70">[could not decrypt]</span>
          ) : (
            <LinkText>{m.plaintext || ''}</LinkText>
          )}

          {showReact && !m.pending && !m.failed && (
            <div className={cn(
              'absolute -top-9 flex gap-1 bg-white dark:bg-ink-800 shadow-soft rounded-full px-2 py-1 border border-blush-200/60 dark:border-ink-700/40',
              isMine ? 'right-0' : 'left-0'
            )}>
              {['❤️','😂','😍','🥺','🔥','👍'].map((e) => (
                <button key={e} onClick={() => { onReact(m._id, e); setShowReact(false); }} className="hover:scale-125 transition text-base leading-none">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {(peerReaction || myReaction) && (
          <div className={cn('flex gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
            {myReaction && <span className="bg-white/80 dark:bg-ink-800/80 border border-blush-200/60 dark:border-ink-700/30 rounded-full px-1.5 py-0.5 text-xs shadow-bubble">{myReaction}</span>}
            {peerReaction && peerReaction !== myReaction && <span className="bg-white/80 dark:bg-ink-800/80 border border-blush-200/60 dark:border-ink-700/30 rounded-full px-1.5 py-0.5 text-xs shadow-bubble">{peerReaction}</span>}
          </div>
        )}

        <div className={cn('mt-1 flex items-center gap-1 text-[10px] text-ink-700/50 dark:text-white/35', isMine ? 'justify-end' : 'justify-start')}>
          <span>{time}</span>
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
