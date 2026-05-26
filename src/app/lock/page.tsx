'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Lock, Loader2 } from 'lucide-react';
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
        if (derivedPub === currentPub) return; // stored key matches server record ✓
        if (!currentPub) {
          // Server has no key yet — register the one we have
          await fetch('/api/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicKey: derivedPub }),
          });
          return;
        }
        // Mismatch (key rotation / different device) — fall through to regenerate
      } catch {
        // Blob corrupted or password changed — fall through to regenerate
      }
    }
    const kp = await generateKeyPair();
    const sealed = await sealPrivateKeyWithPassword(kp.privateKey, password);
    await storeSealedPrivateKey(sealed);
    await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: b64(kp.publicKey) }),
    });
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
    <main className="relative min-h-dvh flex items-center justify-center px-6 overflow-hidden aurora">
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[28px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-soft p-8 sm:p-10"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-gradient-bubble-me shadow-glow grid place-items-center"
            >
              <Heart className="w-7 h-7 text-white" fill="white" />
            </motion.div>
            <h1 className="mt-5 font-display text-4xl tracking-tight text-ink-900">
              @bhi <span className="text-lavender-600">&amp;</span> Mommy
            </h1>
            <p className="mt-2 text-sm text-ink-700/70">A private space for two.</p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <Field label="Who's there?">
              <select
                value={handle}
                onChange={(e) => onHandleChange(e.target.value)}
                required
                className="w-full bg-transparent outline-none text-ink-900"
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
                className="w-full bg-transparent outline-none text-ink-900 placeholder:text-ink-700/30"
              />
            </Field>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-rose-600 text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              onMouseDown={(e) => e.preventDefault()}
              className="w-full mt-2 rounded-2xl py-3.5 bg-gradient-bubble-me text-white font-medium shadow-glow hover:opacity-95 active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Unlock
            </button>
          </form>

          <p className="mt-6 text-[11px] text-center text-ink-700/50">
            End-to-end encrypted. Even the server can&apos;t read us.
          </p>
        </motion.div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-white/70 border border-blush-200/60 px-4 py-3 focus-within:border-lavender-500 focus-within:ring-4 focus-within:ring-lavender-300/30 transition">
      <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-700/50 mb-1">{label}</span>
      {children}
    </label>
  );
}
