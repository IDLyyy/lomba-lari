'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Smartphone, RefreshCw, PowerOff, Clock } from 'lucide-react';
import type { ScannerSession } from '@/types';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function ScannersPage() {
  const [sessions, setSessions] = useState<ScannerSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/scanner-sessions');
      setSessions(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeactivate = async (id: string) => {
    await fetch(`/api/scanner-sessions/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const active = sessions.filter(s => s.active);
  const inactive = sessions.filter(s => !s.active);

  if (loading) return <Loading text="Memuat scanner devices..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-text-primary">Scanner Devices</h1>
          <p className="text-[14px] text-text-secondary">{active.length} aktif · {sessions.length} total</p>
        </div>
        <Button variant="secondary" onClick={fetchData}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Smartphone size={48} />}
          title="Belum ada scanner terdaftar"
          description="Scanner akan muncul saat operator membuka halaman /scanner dan memilih checkpoint."
        />
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-[13px] font-medium text-text-secondary uppercase tracking-wider">Aktif</p>
              {active.map(s => (
                <SessionCard key={s.id} session={s} onDeactivate={handleDeactivate} />
              ))}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="space-y-3">
              <p className="text-[13px] font-medium text-text-secondary uppercase tracking-wider">Nonaktif</p>
              {inactive.map(s => (
                <SessionCard key={s.id} session={s} onDeactivate={handleDeactivate} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SessionCard({ session, onDeactivate }: { session: ScannerSession; onDeactivate: (id: string) => void }) {
  const cp = (session as any).checkpoint;
  return (
    <div className={`glass rounded-2xl px-5 py-4 flex items-center gap-4 ${!session.active ? 'opacity-50' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${session.active ? 'bg-success/10 text-success' : 'bg-white/05 text-text-secondary'}`}>
        <Smartphone size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[15px] font-semibold text-text-primary">{session.device_name}</p>
          {cp && <Badge variant="info">{cp.name}</Badge>}
          <Badge variant={session.active ? 'success' : 'default'}>{session.active ? 'Online' : 'Offline'}</Badge>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-[12px] text-text-secondary">
          <Clock size={11} />
          <span>Terakhir aktif {timeAgo(session.last_active_at)}</span>
        </div>
      </div>
      {session.active && (
        <button
          onClick={() => onDeactivate(session.id)}
          aria-label="Nonaktifkan"
          className="p-2 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
        >
          <PowerOff size={16} />
        </button>
      )}
    </div>
  );
}
