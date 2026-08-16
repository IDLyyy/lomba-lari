'use client';

import { useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';

interface QrScannerProps {
  onScan: (data: string) => void;
  paused: boolean;
}

export function QrScanner({ onScan, paused }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(paused);
  const lastTextRef = useRef('');
  const lastTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Keep pausedRef current without restarting the loop
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

    // Match canvas to video dimensions
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    const result = jsQR(imageData.data, w, h, {
      inversionAttempts: 'dontInvert', // fastest — skip inverted QR attempt
    });

    if (result && !pausedRef.current) {
      const text = result.data;
      const now = Date.now();
      // 600ms debounce — prevents same code firing twice, still instant feel
      if (text !== lastTextRef.current || now - lastTimeRef.current > 600) {
        lastTextRef.current = text;
        lastTimeRef.current = now;
        onScan(text);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onScan]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 },
          },
          audio: false,
        });

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
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
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [tick]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Live video feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Hidden canvas for pixel decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Subtle vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 62% 62% at 50% 50%, transparent 52%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Scan box */}
        <div className="relative w-64 h-64">
          {/* Animated scan line */}
          <div
            className="absolute left-3 right-3 h-[2px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #0A84FF 40%, #0A84FF 60%, transparent)',
              boxShadow: '0 0 8px #0A84FF',
              animation: 'scanLine 1.4s ease-in-out infinite',
            }}
          />

          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-9 h-9 block" style={{ borderTop: '3px solid #0A84FF', borderLeft: '3px solid #0A84FF', borderRadius: '8px 0 0 0' }} />
          <span className="absolute top-0 right-0 w-9 h-9 block" style={{ borderTop: '3px solid #0A84FF', borderRight: '3px solid #0A84FF', borderRadius: '0 8px 0 0' }} />
          <span className="absolute bottom-0 left-0 w-9 h-9 block" style={{ borderBottom: '3px solid #0A84FF', borderLeft: '3px solid #0A84FF', borderRadius: '0 0 0 8px' }} />
          <span className="absolute bottom-0 right-0 w-9 h-9 block" style={{ borderBottom: '3px solid #0A84FF', borderRight: '3px solid #0A84FF', borderRadius: '0 0 8px 0' }} />
        </div>
      </div>

      {/* Paused overlay */}
      {paused && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );
}
