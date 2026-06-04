'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2 } from 'lucide-react';
import {
  sodiumReady, generateKeyPair, sealPrivateKeyWithPassword,
  storeSealedPrivateKey, loadSealedPrivateKey, openPrivateKeyWithPassword, b64, derivePublicKey,
} from '@/lib/crypto/e2ee';

const HANDLE_KEY = 'am.handle';

export default function LockScreen() {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sodiumReady();
    const saved = localStorage.getItem(HANDLE_KEY);
    if (saved) setHandle(saved);
  }, []);

  function onHandleChange(v: string) {
    setHandle(v);
    if (v) localStorage.setItem(HANDLE_KEY, v);
  }

  async function ensureKeys(password: string, currentPub: string | null) {
    const existing = await loadSealedPrivateKey();
    if (existing) {
      try {
        const sk = await openPrivateKeyWithPassword(existing, password);
        const derivedPub = await derivePublicKey(sk);
        if (derivedPub === currentPub) return;
        if (!currentPub) {
          await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicKey: derivedPub }) });
          return;
        }
      } catch { /* fall through to regenerate */ }
    }
    const kp = await generateKeyPair();
    const sealed = await sealPrivateKeyWithPassword(kp.privateKey, password);
    await storeSealedPrivateKey(sealed);
    await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicKey: b64(kp.publicKey) }) });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      await ensureKeys(password, data.user.publicKey);
      sessionStorage.setItem('am.kpw', password);
      router.replace('/chat');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh flex items-center justify-center px-5 overflow-hidden aurora">
      <div className="relative z-10 w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo mark */}
          <div className="flex justify-center mb-8">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-3xl bg-gradient-bubble-me shadow-glow grid place-items-center"
            >
              <span className="text-4xl leading-none select-none">💕</span>
            </motion.div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-display text-6xl tracking-tight text-ink-900 dark:text-white leading-none">
              Rummy
            </h1>
            <p className="mt-3 text-sm text-lavender-600 dark:text-lavender-400 font-medium tracking-widest uppercase">
              Our private space
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl bg-white/75 dark:bg-ink-800/60 backdrop-blur-2xl border border-white/70 dark:border-white/8 shadow-soft p-7">
            <form onSubmit={onSubmit} className="space-y-3">
              <Field label="Who's there?">
                <select
                  value={handle}
                  onChange={(e) => onHandleChange(e.target.value)}
                  required
                  className="w-full bg-transparent outline-none text-ink-900 dark:text-white"
                >
                  <option value="">Choose…</option>
                  <option value="abhi">@bhi</option>
                  <option value="mommy">Mommy</option>
                </select>
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-transparent outline-none text-ink-900 dark:text-white placeholder:text-ink-700/30 dark:placeholder:text-white/25"
                />
              </Field>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-red-500 text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                onMouseDown={(e) => e.preventDefault()}
                className="w-full mt-1 rounded-2xl py-4 bg-gradient-bubble-me text-white font-semibold shadow-glow hover:opacity-95 active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2 text-[15px]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Unlock
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[11px] text-ink-700/45 dark:text-white/35 tracking-wide">
            End-to-end encrypted · Only you two can read this
          </p>
        </motion.div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-white/60 dark:bg-white/5 border border-blush-200/70 dark:border-white/10 px-4 py-3 focus-within:border-lavender-500 focus-within:ring-4 focus-within:ring-lavender-500/20 transition cursor-pointer">
      <span className="block text-[10px] uppercase tracking-[0.18em] text-lavender-600 dark:text-lavender-400 font-semibold mb-1">{label}</span>
      {children}
    </label>
  );
}
