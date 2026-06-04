'use client';
import { Avatar } from './Avatar';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import { useState } from 'react';

const HANDLE_EMOJIS: Record<string, string> = {
  abhi:  '❤️😘',
  mommy: '🥵',
};

export function ChatHeader({
  peerName, peerHandle, online, peerTyping, onPing,
}: {
  peerName: string; peerHandle: string; online: boolean; peerTyping: boolean;
  onPing: () => Promise<boolean>;
}) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [pingSent, setPingSent] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('am.kpw');
    router.replace('/lock');
  }

  async function handlePing() {
    if (pingSent) return;
    const ok = await onPing();
    if (ok) {
      setPingSent(true);
      setTimeout(() => setPingSent(false), 45_000);
    }
  }

  const nameEmoji = HANDLE_EMOJIS[peerHandle] ?? '';

  return (
    <header className="shrink-0 z-20 bg-white/70 dark:bg-ink-900/90 backdrop-blur-2xl border-b border-blush-100/80 dark:border-white/[0.06]">
      <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
        <Avatar name={peerName} size={44} online={online} />

        <div className="flex-1 min-w-0">
          <div className="font-display text-xl leading-tight truncate text-ink-900 dark:text-white font-medium">
            {peerName}{nameEmoji && <span className="ml-1.5 text-base">{nameEmoji}</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? 'bg-emerald-400' : 'bg-blush-300 dark:bg-white/20'}`} />
            <span className="text-[11px] text-ink-700/55 dark:text-white/45 truncate">
              {peerTyping ? 'typing…' : online ? 'online' : 'offline'}
            </span>
          </div>
        </div>

        {/* Ping heart — tap to say "thinking of you" */}
        <motion.button
          onClick={handlePing}
          disabled={pingSent}
          title={pingSent ? 'Sent 💕' : 'Thinking of you?'}
          className="text-[17px] leading-none select-none disabled:opacity-50 focus:outline-none active:scale-90 transition-transform"
          animate={pingSent
            ? { scale: [1, 2, 1.3, 1], rotate: [0, -15, 15, 0] }
            : { y: [0, -2.5, 0], scale: [1, 1.08, 1] }
          }
          transition={pingSent
            ? { duration: 0.45, ease: 'easeOut' }
            : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          💜
        </motion.button>

        <button
          onClick={toggle}
          className="p-2 rounded-xl hover:bg-blush-100 dark:hover:bg-white/8 text-ink-700/60 dark:text-white/55 transition"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        <button
          onClick={logout}
          className="p-2 rounded-xl hover:bg-blush-100 dark:hover:bg-white/8 text-ink-700/60 dark:text-white/55 transition"
          title="Lock"
        >
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
