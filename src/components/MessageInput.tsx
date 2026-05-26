'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
// import { AnimatePresence } from 'framer-motion';
// import { Camera } from 'lucide-react';
// import { CameraCapture } from './CameraCapture';
import { ImagePlus, Send, Smile, X } from 'lucide-react';
const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export function MessageInput({
  onSend, onSendImage, onTyping,
}: {
  onSend: (text: string) => void;
  onSendImage: (file: File) => void;
  onTyping: (typing: boolean) => void;
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  // const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<any>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  function autoResize() {
    const ta = taRef.current; if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }

  function handleChange(v: string) {
    setText(v);
    onTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 1500);
    autoResize();
  }

  function submit() {
    if (preview) {
      onSendImage(preview.file);
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
    const t = text.trim();
    if (t) onSend(t);
    setText('');
    onTyping(false);
    requestAnimationFrame(autoResize);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function pickImage(f?: File) {
    if (!f) return;
    if (!f.type.startsWith('image/')) return;
    setPreview({ file: f, url: URL.createObjectURL(f) });
  }

  return (
    <div className="sticky bottom-0 z-10 backdrop-blur-2xl bg-white/75 border-t border-blush-200/50">
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-3" style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}>
        {preview && (
          <div className="mb-2 inline-flex items-center gap-2 bg-white rounded-2xl border border-blush-200/60 p-2 shadow-bubble">
            <img src={preview.url} className="w-14 h-14 rounded-xl object-cover" />
            <button onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} className="p-1 rounded-full hover:bg-blush-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-white rounded-3xl border border-blush-200/70 px-2 py-1.5 shadow-bubble focus-within:border-lavender-500 focus-within:ring-4 focus-within:ring-lavender-300/30 transition">
          {/* Gallery picker */}
          <button
            type="button"
            onClick={() => document.getElementById('img-input')?.click()}
            className="p-2 rounded-2xl hover:bg-blush-100 text-ink-700/70"
            aria-label="Send image from gallery"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <input id="img-input" type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0] || undefined)} />

          {/* Camera with filters — TODO: re-enable when ready */}
          {/* <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="p-2 rounded-2xl hover:bg-blush-100 text-ink-700/70"
            aria-label="Take photo"
          >
            <Camera className="w-5 h-5" />
          </button> */}

          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Message…"
            className="flex-1 resize-none bg-transparent outline-none py-2 px-1 text-[15px] placeholder:text-ink-700/30 max-h-44"
          />

          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="p-2 rounded-2xl hover:bg-blush-100 text-ink-700/70"
            aria-label="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() && !preview}
            className="p-2.5 rounded-2xl bg-gradient-bubble-me text-white shadow-glow disabled:opacity-40 disabled:shadow-none hover:opacity-95 active:scale-95 transition"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {showEmoji && (
          <div className="mt-2 flex justify-end">
            <div className="rounded-2xl overflow-hidden shadow-soft">
              <Picker
                onEmojiClick={(e: any) => {
                  setText((t) => t + e.emoji);
                  setShowEmoji(false);
                  requestAnimationFrame(autoResize);
                }}
                width={320}
                height={360}
                lazyLoadEmojis
              />
            </div>
          </div>
        )}
      </div>

      {/* <AnimatePresence>
        {showCamera && (
          <CameraCapture
            onCapture={(file) => { pickImage(file); setShowCamera(false); }}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence> */}
    </div>
  );
}
