'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Edit, Trash2, MapPin, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import type { Checkpoint } from '@/types';

const emptyForm = { checkpoint_code: '', name: '', sequence: '', location_name: '' };

export default function CheckpointsPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Checkpoint | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/checkpoints');
      setCheckpoints(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleAdd = async () => {
    setError('');
    const res = await fetch('/api/checkpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sequence: parseInt(form.sequence) || 0 }),
    });
    if (res.ok) {
      setShowAdd(false);
      setForm(emptyForm);
      fetch_();
    } else {
      const d = await res.json();
      setError(d.error ?? 'Gagal menyimpan.');
    }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setError('');
    const res = await fetch(`/api/checkpoints/${showEdit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sequence: parseInt(form.sequence) || showEdit.sequence }),
    });
    if (res.ok) {
      setShowEdit(null);
      setForm(emptyForm);
      fetch_();
    } else {
      const d = await res.json();
      setError(d.error ?? 'Gagal menyimpan.');
    }
  };

  const handleToggle = async (cp: Checkpoint) => {
    await fetch(`/api/checkpoints/${cp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !cp.active }),
    });
    fetch_();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus checkpoint ini? Semua scan terkait akan ikut terhapus.')) return;
    await fetch(`/api/checkpoints/${id}`, { method: 'DELETE' });
    fetch_();
  };

  const openAdd = () => { setForm(emptyForm); setError(''); setShowAdd(true); };
  const openEdit = (cp: Checkpoint) => {
    setForm({
      checkpoint_code: cp.checkpoint_code,
      name: cp.name,
      sequence: String(cp.sequence),
      location_name: cp.location_name ?? '',
    });
    setError('');
    setShowEdit(cp);
  };

  if (loading) return <Loading text="Memuat checkpoint..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-text-primary">Checkpoint</h1>
          <p className="text-[14px] text-text-secondary">{checkpoints.length} checkpoint terdaftar</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> Tambah
        </Button>
      </div>

      {checkpoints.length === 0 ? (
        <EmptyState
          icon={<MapPin size={48} />}
          title="Belum ada checkpoint"
          description="Tambahkan checkpoint untuk memulai perlombaan."
          action={<Button onClick={openAdd}><Plus size={16} /> Tambah Checkpoint</Button>}
        />
      ) : (
        <div className="space-y-2">
          {checkpoints.map(cp => (
            <div key={cp.id} className={`glass rounded-2xl px-5 py-4 flex items-center gap-4 transition-opacity ${!cp.active ? 'opacity-50' : ''}`}>
              {/* Sequence badge */}
              <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center font-bold text-[16px] shrink-0">
                {cp.sequence}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[15px] font-semibold text-text-primary">{cp.name}</p>
                  <span className="text-[12px] font-mono text-text-secondary">{cp.checkpoint_code}</span>
                  <Badge variant={cp.active ? 'success' : 'default'}>
                    {cp.active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                {cp.location_name && (
                  <p className="text-[13px] text-text-secondary mt-0.5">{cp.location_name}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(cp)}
                  aria-label={cp.active ? 'Nonaktifkan' : 'Aktifkan'}
                  className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
                >
                  {cp.active ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} />}
                </button>
                <button
                  onClick={() => openEdit(cp)}
                  aria-label="Edit"
                  className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(cp.id)}
                  aria-label="Hapus"
                  className="p-2 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Checkpoint">
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-[13px]">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <Input label="Kode Checkpoint" placeholder="CP01" value={form.checkpoint_code} onChange={e => setForm({ ...form, checkpoint_code: e.target.value })} />
          <Input label="Nama" placeholder="Checkpoint 01" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Sequence (urutan)" type="number" placeholder="1" value={form.sequence} onChange={e => setForm({ ...form, sequence: e.target.value })} />
          <Input label="Lokasi (opsional)" placeholder="KM 2.5" value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} />
          <Button className="w-full" onClick={handleAdd}>Simpan</Button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Checkpoint">
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-[13px]">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <Input label="Kode Checkpoint" value={form.checkpoint_code} onChange={e => setForm({ ...form, checkpoint_code: e.target.value })} />
          <Input label="Nama" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Sequence (urutan)" type="number" value={form.sequence} onChange={e => setForm({ ...form, sequence: e.target.value })} />
          <Input label="Lokasi (opsional)" value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} />
          <Button className="w-full" onClick={handleEdit}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
