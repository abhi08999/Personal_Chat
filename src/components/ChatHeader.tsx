'use client';
import { Avatar } from './Avatar';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function ChatHeader({
  peerName, online, peerTyping,
}: { peerName: string; online: boolean; peerTyping: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch('/api/messages/clear', { method: 'POST' });
    await fetch('/api/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('am.kpw');
    router.replace('/lock');
  }
  return (
    <header className="sticky top-0 z-20 backdrop-blur-2xl bg-white/65 border-b border-blush-200/50">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <Avatar name={peerName} size={42} online={online} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg leading-tight truncate">{peerName}</div>
          <div className="text-[11px] text-ink-700/60 truncate">
            {peerTyping ? 'typing…' : online ? 'online' : 'offline'}
          </div>
        </div>

        <motion.span
          className="text-xl leading-none select-none cursor-default"
          animate={{ y: [0, -5, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          💜
        </motion.span>

        <button
          onClick={logout}
          className="ml-1 p-2 rounded-xl hover:bg-blush-100 text-ink-700/70 transition"
          title="Lock"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
