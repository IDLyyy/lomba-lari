'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { useRealtimeScans } from '@/hooks/useRealtime';
import { FileSearch } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import type { CheckpointScan } from '@/types';
import { cn } from '@/lib/utils';

type Filter = 'ALL' | 'VALID' | 'REJECTED' | 'DUPLICATE';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'VALID', label: 'Valid' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'DUPLICATE', label: 'Duplikat' },
];

function statusVariant(s: string): 'success' | 'error' | 'warning' | 'default' {
  if (s === 'VALID') return 'success';
  if (s === 'REJECTED') return 'error';
  if (s === 'DUPLICATE') return 'warning';
  return 'default';
}

export default function AuditPage() {
  const [scans, setScans] = useState<CheckpointScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');

  const fetchData = useCallback(async () => {
    try {
      const url = filter !== 'ALL'
        ? `/api/scans?limit=200&status=${filter}`
        : '/api/scans?limit=200';
      const res = await fetch(url);
      setScans(await res.json());
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeScans(useCallback(() => fetchData(), [fetchData]));

  if (loading) return <Loading text="Memuat audit log..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[28px] font-bold text-text-primary">Audit Log</h1>
        <p className="text-[14px] text-text-secondary">{scans.length} entri ditampilkan</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl w-fit">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all',
              filter === f.value
                ? 'bg-info text-white'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {scans.length === 0 ? (
        <EmptyState
          icon={<FileSearch size={48} />}
          title="Belum ada aktivitas"
          description="Log scan akan muncul di sini."
        />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Waktu</th>
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Peserta</th>
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Checkpoint</th>
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {scans.map(scan => {
                  const p = (scan as any).participant;
                  const cp = (scan as any).checkpoint;
                  return (
                    <tr key={scan.id} className="hover:bg-surface-elevated/50 transition-colors">
                      <td className="px-5 py-3 text-[13px] text-text-secondary whitespace-nowrap">
                        {formatTime(scan.scanned_at)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[13px] font-mono font-medium text-text-primary">{p?.bib_number ?? '—'}</p>
                        <p className="text-[12px] text-text-secondary">{p?.name ?? ''}</p>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-text-primary whitespace-nowrap">
                        {cp?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant={statusVariant(scan.status)}>{scan.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-text-secondary">
                        {scan.rejection_reason ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
