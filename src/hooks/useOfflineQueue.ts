'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface QueuedScan {
  id: string;
  qr_token: string;
  checkpoint_id: string;
  scanner_session_id?: string;
  queued_at: string;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const syncingRef = useRef(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('scan_queue');
    if (stored) {
      try { setQueue(JSON.parse(stored)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('scan_queue', JSON.stringify(queue));
  }, [queue]);

  const addToQueue = useCallback((scan: Omit<QueuedScan, 'id' | 'queued_at'>) => {
    const item: QueuedScan = {
      ...scan,
      id: crypto.randomUUID(),
      queued_at: new Date().toISOString(),
    };
    setQueue(prev => [...prev, item]);
    return item;
  }, []);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current || queue.length === 0) return;
    syncingRef.current = true;

    const remaining: QueuedScan[] = [];

    for (const item of queue) {
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qr_token: item.qr_token,
            checkpoint_id: item.checkpoint_id,
            scanner_session_id: item.scanner_session_id,
          }),
        });
        // 4xx = business rejection (DUPLICATE/REJECTED) — discard, don't retry
        // 5xx or network error — keep in queue for retry
        if (res.status >= 500) remaining.push(item);
      } catch {
        // Network failure — keep for retry
        remaining.push(item);
      }
    }

    setQueue(remaining);
    syncingRef.current = false;
  }, [queue]);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  }, [isOnline, queue.length, syncQueue]);

  return { queue, isOnline, addToQueue, syncQueue, pendingCount: queue.length };
}
