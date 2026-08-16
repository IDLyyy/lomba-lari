'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (data: string) => void;
  paused: boolean;
}

export function QrScanner({ onScan, paused }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleScan = useCallback((decodedText: string) => {
    if (pausedRef.current) return;
    const now = Date.now();
    // 1.2s debounce — fast enough for rapid scanning, prevents double-fire
    if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 1200) return;
    lastScanRef.current = decodedText;
    lastScanTimeRef.current = now;
    onScan(decodedText);
  }, [onScan]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 30,              // 30fps — much faster decode cycle
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,     // square video feed, not rectangular
        disableFlip: false,
      },
      handleScan,
      () => {}
    ).catch((err) => {
      console.error('Camera start error:', err);
      startedRef.current = false;
    });

    return () => {
      scanner.stop().catch(() => {}).finally(() => scanner.clear());
      startedRef.current = false;
    };
  }, [handleScan]);

  return (
    <div className="relative w-full h-full">
      {/* html5-qrcode renders into this div */}
      <div id="qr-reader" className="w-full h-full" />

      {/* Hide html5-qrcode's own UI chrome (file button, torch, etc.) */}
      <style>{`
        #qr-reader__header_message,
        #qr-reader__status_span,
        #qr-reader__dashboard,
        #qr-reader img,
        #qr-reader button,
        #qr-reader select { display: none !important; }
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
        #qr-reader {
          border: none !important;
          padding: 0 !important;
        }
      `}</style>

      {/* Scan frame overlay — the corners + finder box */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Dark vignette around the scan zone */}
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'
          }}
        />

        {/* Scan box */}
        <div className="relative w-64 h-64">
          {/* Animated scan line */}
          <div
            className="absolute left-2 right-2 h-0.5 bg-info/80"
            style={{ animation: 'scanLine 2s ease-in-out infinite', top: '50%' }}
          />

          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-3 border-l-3 border-info rounded-tl-lg" style={{ borderWidth: '3px 0 0 3px' }} />
          <div className="absolute top-0 right-0 w-10 h-10 border-info rounded-tr-lg" style={{ borderWidth: '3px 3px 0 0' }} />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-info rounded-bl-lg" style={{ borderWidth: '0 0 3px 3px' }} />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-info rounded-br-lg" style={{ borderWidth: '0 3px 3px 0' }} />
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
