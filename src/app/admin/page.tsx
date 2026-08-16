'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { useRealtimeScans } from '@/hooks/useRealtime';
import { Users, Play, Flag, AlertTriangle, Scan, XCircle } from 'lucide-react';
import type { RaceStats, CheckpointScan } from '@/types';
import { formatTime } from '@/lib/utils';

export default function OverviewPage() {
  const [stats, setStats] = useState<RaceStats | null>(null);
  const [recentScans, setRecentScans] = useState<CheckpointScan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, scansRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/scans?limit=10'),
      ]);
      setStats(await statsRes.json());
      setRecentScans(await scansRes.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtimeScans(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) return <Loading text="Memuat data lomba..." />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-[32px] font-bold text-text-primary">Race Control</h1>
        <p className="text-[15px] text-text-secondary mt-1">Monitor checkpoint progress in real time.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Peserta" value={stats?.total ?? 0} icon={<Users size={20} />} />
        <StatCard label="Sedang Berlari" value={stats?.running ?? 0} icon={<Play size={20} />} />
        <StatCard label="Finish" value={stats?.finished ?? 0} icon={<Flag size={20} />} />
        <StatCard label="Scan Ditolak" value={stats?.rejectedScans ?? 0} icon={<XCircle size={20} />} />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <h2 className="text-[17px] font-semibold text-text-primary">Aktivitas Scan Terbaru</h2>
        </div>
        <div className="divide-y divide-border-subtle">
          {recentScans.length === 0 ? (
            <div className="px-6 py-8 text-center text-text-secondary text-[14px]">
              Belum ada aktivitas checkpoint.
            </div>
          ) : (
            recentScans.map(scan => (
              <div key={scan.id} className="flex items-center gap-4 px-6 py-3 hover:bg-surface-elevated/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  scan.status === 'VALID' ? 'bg-success/15 text-success' :
                  scan.status === 'DUPLICATE' ? 'bg-warning/15 text-warning' :
                  'bg-error/15 text-error'
                }`}>
                  {scan.status === 'VALID' ? '✓' : scan.status === 'DUPLICATE' ? '⊘' : '✕'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-text-primary truncate">
                    {(scan as any).participant?.bib_number} — {(scan as any).participant?.name}
                  </p>
                  <p className="text-[12px] text-text-secondary truncate">
                    {(scan as any).checkpoint?.name}
                    {scan.rejection_reason && ` · ${scan.rejection_reason}`}
                  </p>
                </div>
                <Badge variant={scan.status === 'VALID' ? 'success' : scan.status === 'DUPLICATE' ? 'warning' : 'error'}>
                  {scan.status}
                </Badge>
                <span className="text-[12px] text-text-secondary whitespace-nowrap">
                  {formatTime(scan.scanned_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
