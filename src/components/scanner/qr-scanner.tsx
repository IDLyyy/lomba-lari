'use client';

import { useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';

interface QrScannerProps {
  onScan: (data: string) => void;
  paused: boolean;
}

export function QrScanner({ onScan, paused }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const pausedRef = useRef(paused);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleDecode = useCallback((text: string) => {
    if (pausedRef.current) return;
    const now = Date.now();
    // 800ms debounce — just enough to prevent double-fire, still very fast
    if (text === lastScanRef.current && now - lastScanTimeRef.current < 800) return;
    lastScanRef.current = text;
    lastScanTimeRef.current = now;
    onScan(text);
  }, [onScan]);

  useEffect(() => {
    if (!videoRef.current) return;

    // Hints: only decode QR codes (skip barcodes etc.) — faster
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    // decodeFromConstraints streams directly from getUserMedia — no wrapper overhead
    reader.decodeFromConstraints(
      {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60, min: 30 },
        },
      },
      videoRef.current,
      (result, err, controls) => {
        // Store controls on first callback so we can stop later
        if (controls && !controlsRef.current) {
          controlsRef.current = controls;
        }
        if (result) {
          handleDecode(result.getText());
        }
        // NotFoundException fires every frame when nothing found — ignore it
        if (err && !(err instanceof NotFoundException)) {
          console.error('Decode error:', err);
        }
      }
    ).catch((err) => {
      console.error('Camera start error:', err);
    });

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      readerRef.current = null;
    };
  }, [handleDecode]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Raw video element — full screen, no wrapper overhead */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Overlay: vignette + scan frame */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 50%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        {/* Scan box */}
        <div className="relative w-64 h-64">
          {/* Animated scan line */}
          <div
            className="absolute left-3 right-3 h-0.5 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #0A84FF, transparent)',
              animation: 'scanLine 1.6s ease-in-out infinite',
            }}
          />

          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-8 h-8 block" style={{ borderTop: '3px solid #0A84FF', borderLeft: '3px solid #0A84FF', borderRadius: '6px 0 0 0' }} />
          <span className="absolute top-0 right-0 w-8 h-8 block" style={{ borderTop: '3px solid #0A84FF', borderRight: '3px solid #0A84FF', borderRadius: '0 6px 0 0' }} />
          <span className="absolute bottom-0 left-0 w-8 h-8 block" style={{ borderBottom: '3px solid #0A84FF', borderLeft: '3px solid #0A84FF', borderRadius: '0 0 0 6px' }} />
          <span className="absolute bottom-0 right-0 w-8 h-8 block" style={{ borderBottom: '3px solid #0A84FF', borderRight: '3px solid #0A84FF', borderRadius: '0 0 6px 0' }} />
        </div>
      </div>

      {/* Paused overlay */}
      {paused && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );
}
