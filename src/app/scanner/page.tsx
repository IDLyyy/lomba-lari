'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { QrScanner } from '@/components/scanner/qr-scanner';
import { ScanFeedback } from '@/components/scanner/scan-feedback';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Wifi, WifiOff, Settings, ChevronLeft } from 'lucide-react';
import type { Checkpoint, ScanResult, ScannerSession } from '@/types';

type ScannerState = 'setup' | 'scanning';

export default function ScannerPage() {
  const [state, setState] = useState<ScannerState>('setup');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [session, setSession] = useState<ScannerSession | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const { isOnline, pendingCount, addToQueue } = useOfflineQueue();

  useEffect(() => {
    fetch('/api/checkpoints')
      .then(r => r.json())
      .then(setCheckpoints)
      .catch(() => {});

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
    if (!session) return;

    // Offline: queue and show offline feedback
    if (!isOnline) {
      addToQueue({
        qr_token: qrToken,
        checkpoint_id: session.checkpoint_id,
        scanner_session_id: session.id,
      });
      setScanResult({
        success: false,
        status: 'REJECTED',
        message: 'Offline — scan disimpan dan akan dikirim saat online kembali.',
      });
      return;
    }

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token: qrToken,
          checkpoint_id: session.checkpoint_id,
          scanner_session_id: session.id,
        }),
      });
      const result: ScanResult = await res.json();
      setScanResult(result);
      if (result.success) setLastScan(result);
    } catch {
      // Network error while nominally online — queue it
      addToQueue({
        qr_token: qrToken,
        checkpoint_id: session.checkpoint_id,
        scanner_session_id: session.id,
      });
      setScanResult({
        success: false,
        status: 'REJECTED',
        message: 'Koneksi bermasalah. Scan disimpan dan akan dikirim ulang.',
      });
    }
  }, [session, isOnline, addToQueue]);

  const handleReset = () => {
    setState('setup');
    setSession(null);
    localStorage.removeItem('scanner_session');
  };

  const currentCheckpoint = checkpoints.find(c => c.id === session?.checkpoint_id);

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
              options={[
                { value: '', label: 'Pilih checkpoint...' },
                ...checkpoints.map(c => ({ value: c.id, label: c.name })),
              ]}
            />
            <Input
              label="Nama Device"
              placeholder="CP01-Phone-01"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
            />
          </div>

          <Button className="w-full" size="lg" onClick={startScanner} disabled={!selectedCheckpoint || !deviceName}>
            Start Scanner
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 glass">
        <button
          onClick={handleReset}
          aria-label="Kembali ke setup"
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="text-center">
          <p className="text-[17px] font-semibold text-text-primary">{currentCheckpoint?.name ?? 'Scanner'}</p>
          <p className="text-[12px] text-text-secondary">Scan peserta yang melewati checkpoint ini</p>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi size={16} className="text-success" aria-label="Online" />
          ) : (
            <WifiOff size={16} className="text-error" aria-label="Offline" />
          )}
          {pendingCount > 0 && (
            <span className="text-[11px] font-medium text-warning" aria-label={`${pendingCount} scan pending`}>
              {pendingCount}
            </span>
          )}
        </div>
      </header>

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-error/10 border-b border-error/20 px-4 py-2 flex items-center justify-between">
          <p className="text-[12px] text-error font-medium">
            ● OFFLINE{pendingCount > 0 ? ` — ${pendingCount} scan pending` : ''}
          </p>
          <p className="text-[11px] text-text-secondary">Scan tersimpan lokal</p>
        </div>
      )}

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        <QrScanner onScan={handleScan} active={!scanResult} />

        {/* Last successful scan */}
        {lastScan?.participant && (
          <div className="glass rounded-2xl p-4 w-full max-w-sm animate-fade-in">
            <p className="text-[12px] text-text-secondary mb-2">Scan terakhir</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center text-success font-bold text-[16px]">
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-text-primary">{lastScan.participant.bib_number}</p>
                <p className="text-[13px] text-text-secondary">{lastScan.participant.name}</p>
              </div>
              {lastScan.scanned_at && (
                <p className="text-[13px] text-text-secondary">
                  {new Date(lastScan.scanned_at).toLocaleTimeString('id-ID', { hour12: false })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <ScanFeedback result={scanResult} onDismiss={() => setScanResult(null)} />
    </div>
  );
}
