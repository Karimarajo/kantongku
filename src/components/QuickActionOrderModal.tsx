import React, { useRef, useState } from 'react';
import { X, GripVertical, ChevronUp, ChevronDown, Settings2, Save } from 'lucide-react';

export interface QuickActionMeta {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface QuickActionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: QuickActionMeta[]; // sudah dalam urutan saat ini
  onSave: (orderedIds: string[]) => void;
}

// Task: "urutannya bisa diatur ... drag & drop" — daftar vertikal SEMUA aksi
// cepat, bisa digeser (mouse, HTML5 drag-and-drop) atau lewat tombol panah
// naik/turun (konsisten dengan pola reorder yang sudah dipakai di
// PocketManagerModal/BudgetModal/CategoryManagerModal — juga menutup celah
// drag-and-drop native yang tidak selalu mulus di layar sentuh). 5 teratas
// hasil urutan ini yang tampil langsung di Home; sisanya di balik "Lihat
// Semua" (lihat HomeDashboard.tsx).
export default function QuickActionOrderModal({ isOpen, onClose, actions, onSave }: QuickActionOrderModalProps) {
  const [order, setOrder] = useState<string[]>(() => actions.map(a => a.id));
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Re-seed local order whenever the modal is (re)opened with fresh props,
  // so a previous unsaved drag session never leaks into the next open.
  const prevIsOpenRef = useRef(false);
  if (isOpen && !prevIsOpenRef.current) {
    prevIsOpenRef.current = true;
    if (order.join(',') !== actions.map(a => a.id).join(',')) {
      setOrder(actions.map(a => a.id));
    }
  } else if (!isOpen && prevIsOpenRef.current) {
    prevIsOpenRef.current = false;
  }

  if (!isOpen) return null;

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleDrop = (index: number) => {
    const from = dragIndexRef.current;
    setDragOverIndex(null);
    dragIndexRef.current = null;
    if (from === null || from === index) return;
    setOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const orderedActions = order
    .map(id => actions.find(a => a.id === id))
    .filter((a): a is QuickActionMeta => !!a);

  return (
    <div className="fixed inset-0 bg-[#060A13]/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div
        className="glass-card rounded-2xl w-full max-w-md border border-overlay/10 relative flex flex-col max-h-[85vh] shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-overlay/5 shrink-0 bg-surface-variant/20">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4.5 h-4.5 text-primary" />
            <h3 className="font-headline-sm text-base text-on-surface font-bold">Atur Urutan Aksi Cepat</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-overlay/5 border border-overlay/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-on-surface-variant px-5 pt-3 leading-relaxed">
          Geser (atau pakai panah) untuk mengatur urutan. 5 teratas yang langsung tampil di Home.
        </p>

        <div className="flex flex-col gap-1.5 p-4 overflow-y-auto no-scrollbar">
          {orderedActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                draggable
                onDragStart={() => { dragIndexRef.current = index; }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                onDragLeave={() => setDragOverIndex(prev => (prev === index ? null : prev))}
                onDrop={() => handleDrop(index)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                  dragOverIndex === index ? 'border-primary bg-primary/10' : 'border-overlay/5 bg-overlay/5'
                } ${index < 5 ? '' : 'opacity-60'}`}
              >
                <GripVertical className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
                <div className="w-8 h-8 rounded-full bg-surface-variant border border-overlay/10 flex items-center justify-center text-primary shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm text-on-surface flex-grow truncate">{action.label}</span>
                <span className="text-[9px] font-label-caps text-on-surface-variant/50 uppercase shrink-0">{index < 5 ? 'Tampil' : 'Lainnya'}</span>
                <div className="flex flex-col shrink-0">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-on-surface-variant/60 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === orderedActions.length - 1} className="text-on-surface-variant/60 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-overlay/5 shrink-0">
          <button
            onClick={() => { onSave(order); onClose(); }}
            className="w-full h-11 bg-primary text-on-primary font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Save className="w-4 h-4" /> Simpan Urutan
          </button>
        </div>
      </div>
    </div>
  );
}
