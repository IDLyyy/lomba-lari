'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, Trash2, Edit, QrCode, Users, Download } from 'lucide-react';
import type { Participant } from '@/types';
import Link from 'next/link';

const CATEGORIES = ['5K', '10K', 'OPEN', 'TEEN', 'JUNIOR'];

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Participant | null>(null);
  const [showBatch, setShowBatch] = useState(false);
  const [form, setForm] = useState({ name: '', category: '10K', bib_number: '', participant_number: '' });
  const [batchCount, setBatchCount] = useState(10);
  const [batchCategory, setBatchCategory] = useState('10K');
  const [batchPrefix, setBatchPrefix] = useState('RUN');

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch('/api/participants');
      setParticipants(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  const handleAdd = async () => {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowAdd(false); setForm({ name: '', category: '10K', bib_number: '', participant_number: '' }); fetchParticipants(); }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    const res = await fetch(`/api/participants/${showEdit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowEdit(null); fetchParticipants(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus peserta ini?')) return;
    await fetch(`/api/participants/${id}`, { method: 'DELETE' });
    fetchParticipants();
  };

  const handleBatchGenerate = async () => {
    const existing = participants.length;
    const batch = Array.from({ length: batchCount }, (_, i) => {
      const num = existing + i + 1;
      return {
        participant_number: `${batchPrefix}-${String(num).padStart(3, '0')}`,
        bib_number: `${batchPrefix}-${String(num).padStart(3, '0')}`,
        name: `Peserta ${num}`,
        category: batchCategory,
      };
    });
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) { setShowBatch(false); fetchParticipants(); }
  };

  const filtered = participants.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.bib_number.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'ALL' || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const statusVariant = (s: string) => {
    switch (s) {
      case 'FINISHED': return 'success';
      case 'RUNNING': return 'info';
      case 'DNF': return 'warning';
      case 'DISQUALIFIED': return 'error';
      default: return 'default';
    }
  };

  if (loading) return <Loading text="Memuat data peserta..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-text-primary">Peserta</h1>
          <p className="text-[14px] text-text-secondary">{participants.length} peserta terdaftar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowBatch(true)}>
            <Users size={16} className="mr-1.5" /> Batch Generate
          </Button>
          <Link href="/admin/participants/qr">
            <Button variant="secondary" size="sm">
              <QrCode size={16} className="mr-1.5" /> QR Codes
            </Button>
          </Link>
          <Button size="sm" onClick={() => { setForm({ name: '', category: '10K', bib_number: '', participant_number: '' }); setShowAdd(true); }}>
            <Plus size={16} className="mr-1.5" /> Tambah
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            placeholder="Cari peserta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl bg-surface-elevated border border-border-subtle pl-10 pr-4 text-[14px] text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-info/50"
          />
        </div>
        <Select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          options={[{ value: 'ALL', label: 'Semua Kategori' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="Belum ada peserta" description="Tambahkan peserta atau gunakan batch generate." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-6 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Bib</th>
                  <th className="text-left px-6 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Nama</th>
                  <th className="text-left px-6 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Kategori</th>
                  <th className="text-left px-6 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-6 py-3 text-[14px] font-mono font-medium text-text-primary">{p.bib_number}</td>
                    <td className="px-6 py-3 text-[14px] text-text-primary">{p.name}</td>
                    <td className="px-6 py-3"><Badge>{p.category}</Badge></td>
                    <td className="px-6 py-3"><Badge variant={statusVariant(p.status)}>{p.status}</Badge></td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setForm({ name: p.name, category: p.category, bib_number: p.bib_number, participant_number: p.participant_number }); setShowEdit(p); }} className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Peserta">
        <div className="space-y-4">
          <Input label="Nomor Peserta" placeholder="RUN-001" value={form.participant_number} onChange={e => setForm({ ...form, participant_number: e.target.value })} />
          <Input label="Nomor Bib" placeholder="RUN-001" value={form.bib_number} onChange={e => setForm({ ...form, bib_number: e.target.value })} />
          <Input label="Nama" placeholder="Ahmad" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Select label="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Button className="w-full" onClick={handleAdd}>Simpan</Button>
        </div>
      </Modal>

      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Peserta">
        <div className="space-y-4">
          <Input label="Nama" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Select label="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Button className="w-full" onClick={handleEdit}>Simpan</Button>
        </div>
      </Modal>

      <Modal open={showBatch} onClose={() => setShowBatch(false)} title="Batch Generate Peserta">
        <div className="space-y-4">
          <Input label="Prefix" value={batchPrefix} onChange={e => setBatchPrefix(e.target.value)} />
          <Input label="Jumlah" type="number" value={String(batchCount)} onChange={e => setBatchCount(parseInt(e.target.value) || 0)} />
          <Select label="Kategori" value={batchCategory} onChange={e => setBatchCategory(e.target.value)} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Button className="w-full" onClick={handleBatchGenerate}>Generate {batchCount} Peserta</Button>
        </div>
      </Modal>
    </div>
  );
}
