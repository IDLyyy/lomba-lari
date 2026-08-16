'use client';

import { useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';

interface QrScannerProps {
  onScan: (data: string) => void;
  paused: boolean;
  stream?: MediaStream | null;
}

// Decode at this resolution — 640×480 is more than enough for QR codes and
// is ~9x fewer pixels than 1920×1080, making each decode ~9x faster.
const DECODE_W = 640;
const DECODE_H = 480;

// Decode at most this many times per second — 20fps is plenty for a scanner,
// and keeps the main thread free for React renders and animations.
const MAX_FPS = 20;
const FRAME_MS = 1000 / MAX_FPS;

export function QrScanner({ onScan, paused, stream: externalStream }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const pausedRef = useRef(paused);
  const lastTextRef = useRef('');
  const lastTimeRef = useRef(0);
  const ownStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const tick = useCallback((now: number) => {
    // Throttle — skip frames that arrive faster than FRAME_MS
    if (now - lastFrameRef.current < FRAME_MS) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    lastFrameRef.current = now;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

    // Draw at reduced resolution — much faster getImageData + jsQR decode
    ctx.drawImage(video, 0, 0, DECODE_W, DECODE_H);
    const imageData = ctx.getImageData(0, 0, DECODE_W, DECODE_H);
    const result = jsQR(imageData.data, DECODE_W, DECODE_H, { inversionAttempts: 'dontInvert' });

    if (result && !pausedRef.current) {
      const text = result.data;
      const ts = Date.now();
      // 600ms debounce — prevents same QR firing twice in a row
      if (text !== lastTextRef.current || ts - lastTimeRef.current > 600) {
        lastTextRef.current = text;
        lastTimeRef.current = ts;
        onScan(text);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onScan]);

  useEffect(() => {
    // Fix canvas size once — it never needs to match video resolution
    const canvas = canvasRef.current;
    if (canvas) { canvas.width = DECODE_W; canvas.height = DECODE_H; }

    let cancelled = false;

    async function start() {
      try {
        const stream = externalStream ?? await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },   // 30fps is enough — decoder runs at 20fps
          },
          audio: false,
        });

        if (cancelled) {
          if (!externalStream) stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (!externalStream) ownStreamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.error('Camera error:', err);
      }
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      ownStreamRef.current?.getTracks().forEach(t => t.stop());
      ownStreamRef.current = null;
    };
  }, [tick, externalStream]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />
      {/* Fixed-size decode canvas — never shown */}
      <canvas ref={canvasRef} className="hidden" width={DECODE_W} height={DECODE_H} />

      {/* Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 62% 62% at 50% 50%, transparent 52%, rgba(0,0,0,0.55) 100%)',
        }} />
        <div className="relative w-64 h-64">
          <div className="absolute left-3 right-3 h-[2px] rounded-full" style={{
            background: 'linear-gradient(90deg, transparent, #0A84FF 40%, #0A84FF 60%, transparent)',
            boxShadow: '0 0 8px #0A84FF',
            animation: 'scanLine 1.4s ease-in-out infinite',
          }} />
          <span className="absolute top-0 left-0 w-9 h-9 block" style={{ borderTop: '3px solid #0A84FF', borderLeft: '3px solid #0A84FF', borderRadius: '8px 0 0 0' }} />
          <span className="absolute top-0 right-0 w-9 h-9 block" style={{ borderTop: '3px solid #0A84FF', borderRight: '3px solid #0A84FF', borderRadius: '0 8px 0 0' }} />
          <span className="absolute bottom-0 left-0 w-9 h-9 block" style={{ borderBottom: '3px solid #0A84FF', borderLeft: '3px solid #0A84FF', borderRadius: '0 0 0 8px' }} />
          <span className="absolute bottom-0 right-0 w-9 h-9 block" style={{ borderBottom: '3px solid #0A84FF', borderRight: '3px solid #0A84FF', borderRadius: '0 0 8px 0' }} />
        </div>
      </div>

      {paused && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );
}
