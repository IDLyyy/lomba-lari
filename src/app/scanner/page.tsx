'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QrScanner } from '@/components/scanner/qr-scanner';
import { ScanFeedback, type FeedbackState } from '@/components/scanner/scan-feedback';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Wifi, WifiOff, Settings, ChevronLeft, Camera } from 'lucide-react';
import type { Checkpoint, ScannerSession } from '@/types';

type ScannerState = 'setup' | 'scanning';

export default function ScannerPage() {
  const [state, setState] = useState<ScannerState>('setup');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [session, setSession] = useState<ScannerSession | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({ phase: 'idle' });
  const [lastScan, setLastScan] = useState<{ bib: string; name: string; cp: string; time: string } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Ref so handleScan always reads current phase without stale closure
  const feedbackPhaseRef = useRef<FeedbackState['phase']>('idle');
  useEffect(() => { feedbackPhaseRef.current = feedback.phase; }, [feedback.phase]);

  const warmStreamRef = useRef<MediaStream | null>(null);
  const { isOnline, pendingCount, addToQueue } = useOfflineQueue();

  // Load checkpoints + restore saved session
  useEffect(() => {
    fetch('/api/checkpoints').then(r => r.json()).then(setCheckpoints).catch(() => {});
    const saved = localStorage.getItem('scanner_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSession(s);
        setSelectedCheckpoint(s.checkpoint_id);
        setDeviceName(s.device_name);
        setState('scanning');
      } catch {}
    }
  }, []);

  // Pre-warm camera as soon as checkpoint is selected
  useEffect(() => {
    if (!selectedCheckpoint || state !== 'setup') return;
    setCameraReady(false);
    setCameraError('');
    let cancelled = false;

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
      audio: false,
    }).then(stream => {
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      warmStreamRef.current?.getTracks().forEach(t => t.stop());
      warmStreamRef.current = stream;
      setCameraReady(true);
    }).catch(() => {
      if (!cancelled) setCameraError('Izin kamera ditolak atau tidak tersedia.');
    });

    return () => { cancelled = true; };
  }, [selectedCheckpoint, state]);

  // Cleanup on unmount
  useEffect(() => () => { warmStreamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const startScanner = async () => {
    if (!selectedCheckpoint || !deviceName) return;
    try {
      const res = await fetch('/api/scanner-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpoint_id: selectedCheckpoint, device_name: deviceName }),
      });
      const s = await res.json();
      setSession(s);
      localStorage.setItem('scanner_session', JSON.stringify(s));
      setState('scanning');
    } catch {}
  };

  const handleScan = useCallback(async (qrToken: string) => {
    if (!session || feedbackPhaseRef.current !== 'idle') return;

    // Show pending IMMEDIATELY — < 1ms
    setFeedback({ phase: 'pending', qrText: qrToken });

    if (!isOnline) {
      addToQueue({ qr_token: qrToken, checkpoint_id: session.checkpoint_id, scanner_session_id: session.id });
      setFeedback({ phase: 'done', result: { success: false, status: 'REJECTED', message: 'Offline — scan disimpan.' } });
      return;
    }

    try {
      // keepalive reuses TCP connection; text()+JSON.parse avoids extra async tick
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: qrToken, checkpoint_id: session.checkpoint_id, scanner_session_id: session.id }),
        keepalive: true,
      });
      const result = JSON.parse(await res.text());
      setFeedback({ phase: 'done', result });
      if (result.success) {
        setLastScan({
          bib: result.participant?.bib_number ?? '',
          name: result.participant?.name ?? '',
          cp: result.checkpoint?.name ?? '',
          time: result.scanned_at ? new Date(result.scanned_at).toLocaleTimeString('id-ID', { hour12: false }) : '',
        });
      }
    } catch {
      addToQueue({ qr_token: qrToken, checkpoint_id: session.checkpoint_id, scanner_session_id: session.id });
      setFeedback({ phase: 'done', result: { success: false, status: 'REJECTED', message: 'Koneksi bermasalah. Scan disimpan.' } });
    }
  }, [session, isOnline, addToQueue]);

  const handleReset = () => {
    warmStreamRef.current?.getTracks().forEach(t => t.stop());
    warmStreamRef.current = null;
    setCameraReady(false);
    setState('setup');
    setSession(null);
    setFeedback({ phase: 'idle' });
    localStorage.removeItem('scanner_session');
  };

  const currentCheckpoint = checkpoints.find(c => c.id === session?.checkpoint_id);
  const isPaused = feedback.phase !== 'idle';

  /* ── SETUP ──────────────────────────────────────────────────── */
  if (state === 'setup') {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-info/15 flex items-center justify-center mx-auto mb-4">
              <Settings size={32} className="text-info" />
            </div>
            <h1 className="text-[24px] font-bold text-text-primary">Set Scanner</h1>
            <p className="text-[14px] text-text-secondary mt-1">Pilih checkpoint untuk scanner ini</p>
          </div>
          <div className="space-y-4">
            <Select
              label="Checkpoint"
              value={selectedCheckpoint}
              onChange={e => setSelectedCheckpoint(e.target.value)}
              options={[{ value: '', label: 'Pilih checkpoint...' }, ...checkpoints.map(c => ({ value: c.id, label: c.name }))]}
            />
            <Input label="Nama Device" placeholder="CP01-Phone-01" value={deviceName} onChange={e => setDeviceName(e.target.value)} />
          </div>

          {selectedCheckpoint && (
            <div className={`flex items-center gap-2 text-[13px] px-3 py-2 rounded-xl ${
              cameraError ? 'bg-error/10 text-error' :
              cameraReady ? 'bg-success/10 text-success' :
              'bg-surface-elevated text-text-secondary'
            }`}>
              {cameraError ? cameraError :
               cameraReady ? <><Camera size={14} /> Kamera siap</> :
               <><div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" /> Menyiapkan kamera...</>}
            </div>
          )}

          <Button className="w-full" size="lg" onClick={startScanner} disabled={!selectedCheckpoint || !deviceName || !!cameraError}>
            {cameraReady ? 'Start Scanner' : selectedCheckpoint ? 'Menunggu kamera...' : 'Start Scanner'}
          </Button>
        </div>
      </div>
    );
  }

  /* ── SCANNING ───────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <div className="absolute inset-0">
        <QrScanner onScan={handleScan} paused={isPaused} stream={warmStreamRef.current} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pb-3 pt-12"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
        <button onClick={handleReset}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[16px] font-semibold text-white drop-shadow">{currentCheckpoint?.name ?? 'Scanner'}</p>
          <p className="text-[11px] text-white/50">Arahkan ke QR code peserta</p>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm text-[11px] font-medium ${
          isOnline ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
        }`}>
          {isOnline ? <><Wifi size={11} />{pendingCount > 0 ? ` ${pendingCount}` : ' ON'}</> : <><WifiOff size={11} />{pendingCount > 0 ? ` ${pendingCount}` : ' OFF'}</>}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 mt-auto px-4 pb-10 pt-6"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
        {lastScan ? (
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
            <div className="w-9 h-9 rounded-xl bg-success/20 flex items-center justify-center text-success font-bold text-[15px] shrink-0">✓</div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white truncate">{lastScan.bib} — {lastScan.name}</p>
              <p className="text-[11px] text-white/50">{lastScan.cp}</p>
            </div>
            <p className="text-[12px] text-white/50 shrink-0">{lastScan.time}</p>
          </div>
        ) : (
          <p className="text-center text-[12px] text-white/30">Arahkan kamera ke QR code peserta</p>
        )}
        {!isOnline && pendingCount > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-warning">
            <WifiOff size={11} /><span>{pendingCount} scan pending</span>
          </div>
        )}
      </div>

      <ScanFeedback state={feedback} onDismiss={() => setFeedback({ phase: 'idle' })} />
    </div>
  );
}
