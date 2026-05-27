'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { Camera, ImagePlus, Send, Smile, X, CornerUpLeft, Pencil } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { CameraCapture } from './CameraCapture';
import type { DecryptedMessage } from '@/types';
const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export function MessageInput({
  onSend, onSendImage, onTyping, onEdit,
  replyTo, onCancelReply,
  editingMessage, onCancelEdit,
}: {
  onSend: (text: string, replyToId?: string | null) => void;
  onSendImage: (file: File) => void;
  onTyping: (typing: boolean) => void;
  onEdit: (id: string, text: string) => void;
  replyTo: DecryptedMessage | null;
  onCancelReply: () => void;
  editingMessage: DecryptedMessage | null;
  onCancelEdit: () => void;
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<any>(null);
  const emojiOverlayRef = useRef(false);
  const { theme } = useTheme();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  // Pre-fill input when entering edit mode
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.plaintext || '');
      requestAnimationFrame(() => { autoResize(); taRef.current?.focus(); });
    }
  }, [editingMessage]);

  useEffect(() => {
    if (!editingMessage) { setText(''); requestAnimationFrame(autoResize); }
  }, [editingMessage]);

  // Intercept Android back button to close emoji picker
  useEffect(() => {
    function onPop() { emojiOverlayRef.current = false; setShowEmoji(false); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function openEmojiPicker() { emojiOverlayRef.current = true; history.pushState({ am_overlay: 'emoji' }, ''); setShowEmoji(true); }
  function closeEmojiPicker() {
    setShowEmoji(false);
    if (emojiOverlayRef.current) { emojiOverlayRef.current = false; history.back(); }
  }

  function autoResize() {
    const ta = taRef.current; if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }

  function handleChange(v: string) {
    setText(v);
    if (!editingMessage) {
      onTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onTyping(false), 1500);
    }
    autoResize();
  }

  function submit() {
    if (editingMessage) {
      const t = text.trim();
      if (t && t !== (editingMessage.plaintext || '').trim()) onEdit(editingMessage._id, t);
      onCancelEdit();
      setText('');
      requestAnimationFrame(autoResize);
      return;
    }
    if (preview) { onSendImage(preview.file); URL.revokeObjectURL(preview.url); setPreview(null); }
    const t = text.trim();
    if (t) onSend(t, replyTo?._id ?? null);
    if (replyTo) onCancelReply();
    setText('');
    onTyping(false);
    requestAnimationFrame(autoResize);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') {
      if (editingMessage) { onCancelEdit(); setText(''); requestAnimationFrame(autoResize); }
      if (replyTo) onCancelReply();
    }
  }

  function pickImage(f?: File) {
    if (!f || !f.type.startsWith('image/')) return;
    setPreview({ file: f, url: URL.createObjectURL(f) });
  }

  const replyLabel = replyTo
    ? (replyTo.contentType === 'image' ? '📷 Photo' : replyTo.plaintext || '…')
    : '';

  return (
    <>
      {/* Full-screen camera overlay */}
      <AnimatePresence>
        {showCamera && (
          <CameraCapture
            onCapture={(file) => { pickImage(file); setShowCamera(false); }}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>

      <div className="shrink-0 z-10 backdrop-blur-2xl bg-white/75 dark:bg-ink-900/85 border-t border-blush-200/50 dark:border-ink-700/30">
        <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-2 pb-3" style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}>

          {/* Reply preview bar */}
          {replyTo && !editingMessage && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl bg-lavender-300/20 dark:bg-lavender-700/20 border border-lavender-300/50 dark:border-lavender-700/30 px-3 py-2">
              <CornerUpLeft className="w-4 h-4 text-lavender-600 dark:text-lavender-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-lavender-700 dark:text-lavender-400 mb-0.5">Replying</div>
                <div className="text-[12px] text-ink-700/70 dark:text-white/50 truncate">{replyLabel}</div>
              </div>
              <button onClick={onCancelReply} className="p-1 rounded-full hover:bg-blush-100 dark:hover:bg-ink-700/50 shrink-0">
                <X className="w-3.5 h-3.5 text-ink-700/60 dark:text-white/50" />
              </button>
            </div>
          )}

          {/* Edit mode bar */}
          {editingMessage && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/30 px-3 py-2">
              <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Editing message</div>
                <div className="text-[12px] text-ink-700/60 dark:text-white/40 truncate">{editingMessage.plaintext}</div>
              </div>
              <button onClick={() => { onCancelEdit(); setText(''); requestAnimationFrame(autoResize); }} className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/40 shrink-0">
                <X className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </button>
            </div>
          )}

          {/* Image preview thumbnail */}
          {preview && (
            <div className="mb-2 inline-flex items-center gap-2 bg-white dark:bg-ink-800 rounded-2xl border border-blush-200/60 dark:border-ink-700/40 p-2 shadow-bubble">
              <img src={preview.url} className="w-14 h-14 rounded-xl object-cover" />
              <button onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} className="p-1 rounded-full hover:bg-blush-100 dark:hover:bg-ink-700/50">
                <X className="w-4 h-4 dark:text-white/70" />
              </button>
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2 bg-white dark:bg-ink-800/60 rounded-3xl border border-blush-200/70 dark:border-ink-700/40 px-2 py-1.5 shadow-bubble focus-within:border-lavender-500 dark:focus-within:border-lavender-600 focus-within:ring-4 focus-within:ring-lavender-300/30 dark:focus-within:ring-lavender-700/20 transition">
            {!editingMessage && (
              <>
                {/* Gallery */}
                <button type="button" onClick={() => document.getElementById('img-input')?.click()} className="p-2 rounded-2xl hover:bg-blush-100 dark:hover:bg-ink-700/50 text-ink-700/70 dark:text-white/60" aria-label="Send image from gallery">
                  <ImagePlus className="w-5 h-5" />
                </button>
                <input id="img-input" type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />

                {/* Camera */}
                <button type="button" onClick={() => setShowCamera(true)} className="p-2 rounded-2xl hover:bg-blush-100 dark:hover:bg-ink-700/50 text-ink-700/70 dark:text-white/60" aria-label="Take photo">
                  <Camera className="w-5 h-5" />
                </button>
              </>
            )}

            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder={editingMessage ? 'Edit message…' : 'Message…'}
              className="flex-1 resize-none bg-transparent outline-none py-2 px-1 text-[15px] text-ink-900 dark:text-white placeholder:text-ink-700/30 dark:placeholder:text-white/25 max-h-44"
            />

            {!editingMessage && (
              <button type="button" onClick={() => showEmoji ? closeEmojiPicker() : openEmojiPicker()} className="p-2 rounded-2xl hover:bg-blush-100 dark:hover:bg-ink-700/50 text-ink-700/70 dark:text-white/60" aria-label="Emoji">
                <Smile className="w-5 h-5" />
              </button>
            )}

            <button type="button" onClick={submit} disabled={!text.trim() && !preview} className="p-2.5 rounded-2xl bg-gradient-bubble-me text-white shadow-glow disabled:opacity-40 disabled:shadow-none hover:opacity-95 active:scale-95 transition" aria-label={editingMessage ? 'Save edit' : 'Send'}>
              <Send className="w-4 h-4" />
            </button>
          </div>

          {showEmoji && (
            <div className="mt-2 flex justify-end">
              <div className="rounded-2xl overflow-hidden shadow-soft">
                <Picker
                  onEmojiClick={(e: any) => { setText((t) => t + e.emoji); closeEmojiPicker(); requestAnimationFrame(autoResize); }}
                  theme={theme as any}
                  width={320}
                  height={360}
                  lazyLoadEmojis
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
