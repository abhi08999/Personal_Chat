'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Colour filters (CSS filter strings) ──────────────────────────────────────
const FILTERS = [
  { id: 'normal',  label: 'Normal',  css: 'none',                                                          dot: '#d4d4d4' },
  { id: 'warm',    label: 'Warm',    css: 'saturate(1.3) sepia(0.28) hue-rotate(-15deg) brightness(1.06)', dot: '#fb923c' },
  { id: 'cool',    label: 'Cool',    css: 'saturate(1.2) hue-rotate(18deg) brightness(1.04) contrast(1.06)',dot: '#38bdf8' },
  { id: 'vivid',   label: 'Vivid',   css: 'saturate(2) contrast(1.15)',                                    dot: '#a855f7' },
  { id: 'fade',    label: 'Fade',    css: 'saturate(0.6) brightness(1.22) contrast(0.8)',                   dot: '#a8a8a8' },
  { id: 'mono',    label: 'Mono',    css: 'grayscale(1) contrast(1.1)',                                     dot: '#555' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.55) contrast(1.1) brightness(0.92) saturate(0.7)',       dot: '#c8914a' },
  { id: 'rosy',    label: 'Rosy',    css: 'saturate(1.4) hue-rotate(-25deg) brightness(1.08)',              dot: '#f472b6' },
] as const;

type FilterId = typeof FILTERS[number]['id'];

// ─── Face sticker overlays ────────────────────────────────────────────────────
const OVERLAYS = [
  { id: 'none',    icon: '✕' },
  { id: 'hearts',  icon: '💜' },
  { id: 'crown',   icon: '👑' },
  { id: 'bunny',   icon: '🐰' },
  { id: 'sparkle', icon: '✨' },
  { id: 'flowers', icon: '🌸' },
  { id: 'dog',     icon: '🐶' },
  { id: 'blush',   icon: '🎀' },
] as const;

type OverlayId = typeof OVERLAYS[number]['id'];

// ─── Overlay drawing (emoji-based, animated with time t) ──────────────────────
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  ov: OverlayId,
  face: { x: number; y: number; w: number; h: number } | null,
  t: number,
) {
  if (ov === 'none') return;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // Approximate selfie face position when no FaceDetector
  const fx = face ? face.x + face.w / 2 : W / 2;
  const fy = face ? face.y + face.h / 2 : H * 0.36;
  const fw = face ? face.w : Math.min(W, H) * 0.48;
  const fh = face ? face.h : fw * 1.35;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  switch (ov) {
    case 'hearts': {
      const pts = [
        { dx: -0.75, dy: -0.12, s: 0.32, p: 0 },
        { dx:  0.75, dy: -0.12, s: 0.30, p: 1 },
        { dx: -0.55, dy: -0.58, s: 0.22, p: 2 },
        { dx:  0.55, dy: -0.58, s: 0.22, p: 0.5 },
        { dx:  0.00, dy: -0.75, s: 0.28, p: 1.5 },
      ];
      for (const p of pts) {
        ctx.font = `${fw * p.s}px serif`;
        ctx.fillText('💜', fx + fw * p.dx, fy + fh * p.dy + Math.sin(t * 2.2 + p.p) * 6);
      }
      break;
    }
    case 'crown': {
      ctx.font = `${fw * 0.85}px serif`;
      ctx.fillText('👑', fx, fy - fh * 0.63 + Math.sin(t * 1.5) * 4);
      break;
    }
    case 'bunny': {
      const b = Math.sin(t * 2) * 3;
      ctx.font = `${fw * 0.72}px serif`;
      ctx.fillText('🐰', fx, fy - fh * 0.58 + b);
      ctx.font = `${fw * 0.28}px serif`;
      ctx.fillText('🐽', fx, fy + fh * 0.15);
      break;
    }
    case 'sparkle': {
      const pts = [
        { dx: -0.82, dy: -0.30, s: 0.28, p: 0   },
        { dx:  0.82, dy: -0.30, s: 0.28, p: 1   },
        { dx: -0.52, dy: -0.68, s: 0.22, p: 2   },
        { dx:  0.52, dy: -0.68, s: 0.22, p: 0.5 },
        { dx:  0.00, dy: -0.82, s: 0.30, p: 1.5 },
        { dx: -0.88, dy:  0.10, s: 0.18, p: 3   },
        { dx:  0.88, dy:  0.10, s: 0.18, p: 2.5 },
      ];
      for (const p of pts) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 3.2 + p.p));
        ctx.font = `${fw * p.s}px serif`;
        ctx.fillText('✨', fx + fw * p.dx, fy + fh * p.dy);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'flowers': {
      const b = Math.sin(t * 1.2) * 3;
      ctx.font = `${fw * 0.9}px serif`;
      ctx.fillText('🌸', fx, fy - fh * 0.64 + b);
      ctx.font = `${fw * 0.46}px serif`;
      ctx.fillText('🌸', fx - fw * 0.72, fy - fh * 0.57 + b * 0.7);
      ctx.fillText('🌸', fx + fw * 0.72, fy - fh * 0.57 + b * 0.7);
      ctx.font = `${fw * 0.25}px serif`;
      ctx.fillText('🌿', fx - fw * 0.96, fy - fh * 0.46 + b * 0.5);
      ctx.fillText('🌿', fx + fw * 0.96, fy - fh * 0.46 + b * 0.5);
      break;
    }
    case 'dog': {
      const eb = Math.sin(t * 2.5) * 4;
      ctx.font = `${fw * 0.55}px serif`;
      ctx.fillText('🦴', fx - fw * 0.65, fy - fh * 0.55 + eb);
      ctx.fillText('🦴', fx + fw * 0.65, fy - fh * 0.55 - eb);
      ctx.font = `${fw * 0.26}px serif`;
      ctx.fillText('🐾', fx - fw * 0.52, fy + fh * 0.46);
      ctx.fillText('🐾', fx + fw * 0.52, fy + fh * 0.46);
      ctx.font = `${fw * 0.28}px serif`;
      ctx.fillText('👅', fx, fy + fh * 0.30 + Math.sin(t * 3) * 3);
      break;
    }
    case 'blush': {
      const r = fw * 0.22;
      ctx.globalAlpha = 0.32 + 0.06 * Math.sin(t * 1.5);
      ctx.fillStyle = '#ff80c0';
      ctx.beginPath();
      ctx.ellipse(fx - fw * 0.38, fy + fh * 0.12, r, r * 0.55, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(fx + fw * 0.38, fy + fh * 0.12, r, r * 0.55, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = `${fw * 0.42}px serif`;
      ctx.fillText('🎀', fx, fy - fh * 0.62 + Math.sin(t * 2) * 3);
      break;
    }
  }

  ctx.restore();
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (f: File) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const rafRef       = useRef<number>(0);
  const faceRef      = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const [facing,   setFacing]   = useState<'user' | 'environment'>('user');
  const [filter,   setFilter]   = useState<FilterId>('normal');
  const [overlay,  setOverlay]  = useState<OverlayId>('none');
  const [snapshot, setSnapshot] = useState<{ url: string; blob: Blob } | null>(null);
  const [err,      setErr]      = useState<string | null>(null);
  const [live,     setLive]     = useState(false);

  // ── Start camera ────────────────────────────────────────────────────────────
  const startCam = useCallback(async () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    faceRef.current = null;
    setLive(false);
    setErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = s;
      const v = videoRef.current!;
      v.srcObject = s;
      v.onloadedmetadata = () => v.play().then(() => setLive(true)).catch(() => {});
    } catch {
      setErr('Camera access denied. Please allow camera in browser settings.');
    }
  }, [facing]);

  useEffect(() => {
    startCam();
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCam]);

  // ── Face detection (Chrome/Edge native API) ──────────────────────────────────
  useEffect(() => {
    if (!live || !('FaceDetector' in window)) return;
    const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const id = setInterval(async () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2) return;
      try {
        const faces = await detector.detect(v);
        if (!faces.length) return;
        const bb = faces[0].boundingBox;
        const vW = v.videoWidth, vH = v.videoHeight;
        const cW = c.width,     cH = c.height;
        // Cover-scale factors (same as render loop)
        const sc = Math.max(cW / vW, cH / vH);
        const ox = (cW - vW * sc) / 2;
        const oy = (cH - vH * sc) / 2;
        let fx = bb.x * sc + ox;
        const fy = bb.y * sc + oy;
        const fw = bb.width  * sc;
        const fh = bb.height * sc;
        // Mirror for front camera
        if (facing === 'user') fx = cW - fx - fw;
        faceRef.current = { x: fx, y: fy, w: fw, h: fh };
      } catch {}
    }, 160);
    return () => clearInterval(id);
  }, [live, facing]);

  // ── Render loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!live) return;
    let alive = true;

    function loop() {
      if (!alive) return;
      const v = videoRef.current;
      const c = canvasRef.current;
      const container = containerRef.current;
      if (!v || !c || !container || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Keep canvas matched to container pixel size
      const { width: cW, height: cH } = container.getBoundingClientRect();
      if (c.width !== Math.floor(cW) || c.height !== Math.floor(cH)) {
        c.width  = Math.floor(cW);
        c.height = Math.floor(cH);
      }

      const vW = v.videoWidth;
      const vH = v.videoHeight;
      if (!vW || !vH) { rafRef.current = requestAnimationFrame(loop); return; }

      // Cover-scale: fill canvas, crop overflow
      const sc = Math.max(c.width / vW, c.height / vH);
      const dW = vW * sc, dH = vH * sc;
      const dx = (c.width  - dW) / 2;
      const dy = (c.height - dH) / 2;

      const ctx = c.getContext('2d')!;
      const t = Date.now() / 1000;

      ctx.save();
      // Mirror front camera
      if (facing === 'user') {
        ctx.scale(-1, 1);
        ctx.translate(-c.width, 0);
      }
      // Apply colour filter
      const f = FILTERS.find((x) => x.id === filter);
      try { ctx.filter = f && f.css !== 'none' ? f.css : 'none'; } catch {}
      ctx.drawImage(v, dx, dy, dW, dH);
      try { ctx.filter = 'none'; } catch {}
      ctx.restore();

      // Draw animated overlay on top
      drawOverlay(ctx, overlay, faceRef.current, t);

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [live, facing, filter, overlay]);

  // ── Capture / retake / send ──────────────────────────────────────────────────
  function capture() {
    const c = canvasRef.current;
    if (!c) return;
    cancelAnimationFrame(rafRef.current);
    c.toBlob(
      (blob) => {
        if (!blob) return;
        setSnapshot({ url: c.toDataURL('image/jpeg', 0.93), blob });
      },
      'image/jpeg',
      0.93,
    );
  }

  function retake() {
    setSnapshot(null);
    startCam();
  }

  function send() {
    if (!snapshot) return;
    const file = new File([snapshot.blob], `snap-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* ── Live preview or captured snapshot ── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-black">
        {/* Hidden video source */}
        <video ref={videoRef} className="hidden" playsInline muted />

        {snapshot ? (
          <img
            src={snapshot.url}
            alt="snapshot"
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        )}

        {err && (
          <p className="absolute inset-0 flex items-center justify-center text-white/70 text-sm text-center px-8">
            {err}
          </p>
        )}

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 px-4 pt-10 pb-3 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
          <button
            onClick={onClose}
            className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm grid place-items-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
          {!snapshot && (
            <button
              onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
              className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm grid place-items-center text-white"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Overlay selector — right rail (only during live preview) */}
        {!snapshot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            {OVERLAYS.map((ov) => (
              <button
                key={ov.id}
                onClick={() => setOverlay(ov.id as OverlayId)}
                className={cn(
                  'w-10 h-10 rounded-full text-lg leading-none grid place-items-center transition-all duration-150',
                  overlay === ov.id
                    ? 'bg-white scale-110 shadow-lg'
                    : 'bg-black/40 backdrop-blur-sm',
                )}
              >
                {ov.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      {!snapshot ? (
        <div className="flex-shrink-0 bg-black px-4 pt-4 pb-10">
          {/* Colour filter strip */}
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as FilterId)}
                className="flex-shrink-0 flex flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl border-2 transition-all duration-150',
                    filter === f.id ? 'border-white scale-110' : 'border-white/20',
                  )}
                  style={{
                    background: f.dot === '#555'
                      ? 'linear-gradient(135deg, #555, #333)'
                      : `radial-gradient(circle at 35% 35%, ${f.dot}, ${f.dot}55)`,
                  }}
                />
                <span className={cn('text-[10px] font-medium', filter === f.id ? 'text-white' : 'text-white/40')}>
                  {f.label}
                </span>
              </button>
            ))}
          </div>

          {/* Shutter button */}
          <div className="flex justify-center">
            <button
              onClick={capture}
              className="w-20 h-20 rounded-full border-4 border-white/80 p-1.5 active:scale-95 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-white" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 bg-black px-8 py-8 flex justify-between items-center">
          <button onClick={retake} className="flex items-center gap-2 text-white/80 text-sm font-medium active:opacity-60">
            <RotateCcw className="w-4 h-4" />
            Retake
          </button>
          <button
            onClick={send}
            className="bg-gradient-bubble-me text-white px-7 py-3 rounded-2xl font-medium shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
          >
            Send <Check className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
