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
    <header className="shrink-0 z-20 backdrop-blur-2xl bg-white/65 dark:bg-ink-900/85 border-b border-blush-200/50 dark:border-ink-700/30">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <Avatar name={peerName} size={42} online={online} />

        <div className="flex-1 min-w-0">
          <div className="font-display text-lg leading-tight truncate text-ink-900 dark:text-white">
            {peerName}{nameEmoji && <span className="ml-1">{nameEmoji}</span>}
          </div>
          <div className="text-[11px] text-ink-700/60 dark:text-white/50 truncate">
            {peerTyping ? 'typing…' : online ? 'online' : 'offline'}
          </div>
        </div>

        {/* Ping heart — tap to say "thinking of you" */}
        <motion.button
          onClick={handlePing}
          disabled={pingSent}
          title={pingSent ? 'Sent 💜' : 'Tap — thinking of you?'}
          className="text-base leading-none select-none disabled:opacity-50 focus:outline-none"
          animate={pingSent
            ? { scale: [1, 1.9, 1.3, 1], rotate: [0, -15, 15, 0] }
            : { y: [0, -3, 0], scale: [1, 1.1, 1] }
          }
          transition={pingSent
            ? { duration: 0.5, ease: 'easeOut' }
            : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          💜
        </motion.button>

        <button
          onClick={toggle}
          className="p-2 rounded-xl hover:bg-blush-100 dark:hover:bg-ink-700/50 text-ink-700/70 dark:text-white/60 transition"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={logout}
          className="p-2 rounded-xl hover:bg-blush-100 dark:hover:bg-ink-700/50 text-ink-700/70 dark:text-white/60 transition"
          title="Lock"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
