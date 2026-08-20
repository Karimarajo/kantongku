import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit3, Trash2, Save, Undo2, CircleDollarSign, ChevronUp, ChevronDown,
  Utensils, ShoppingBag, Coffee, Dumbbell, Heart, Users, Coins, 
  Home as HomeIcon, Car, Plane, Gamepad2, GraduationCap, Gift, Briefcase, 
  BookOpen, Wrench, Zap, Wifi, Tv, Film, Shirt, Sparkles, Baby, 
  PawPrint, Smartphone, PiggyBank, Ticket, Bus, Receipt, HeartPulse,
  GripVertical, Info
} from 'lucide-react';
import { Category, Transaction } from '../types';
import CategoryIcon from './CategoryIcon';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  transactions: Transaction[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories: (reordered: Category[]) => void;
}

// 30 financial icons
const ICONS = [
  { value: 'food', label: 'Makan', icon: Utensils },
  { value: 'shopping', label: 'Belanja', icon: ShoppingBag },
  { value: 'coffee', label: 'Jajan Kopi', icon: Coffee },
  { value: 'sports', label: 'Olahraga', icon: Dumbbell },
  { value: 'health', label: 'Kesehatan', icon: HeartPulse },
  { value: 'social', label: 'Sosial', icon: Users },
  { value: 'income', label: 'Pendapatan', icon: Coins },
  { value: 'home', label: 'Rumah/Tagihan', icon: HomeIcon },
  { value: 'car', label: 'Bensin/Mobil', icon: Car },
  { value: 'plane', label: 'Liburan', icon: Plane },
  { value: 'game', label: 'Hiburan/Game', icon: Gamepad2 },
  { value: 'education', label: 'Pendidikan', icon: GraduationCap },
  { value: 'gift', label: 'Hadiah', icon: Gift },
  { value: 'business', label: 'Bisnis', icon: Briefcase },
  { value: 'book', label: 'Membaca/Buku', icon: BookOpen },
  { value: 'wrench', label: 'Pemeliharaan', icon: Wrench },
  { value: 'electricity', label: 'Listrik', icon: Zap },
  { value: 'wifi', label: 'Internet/Pulsa', icon: Wifi },
  { value: 'tv', label: 'Streaming/TV', icon: Tv },
  { value: 'film', label: 'Bioskop', icon: Film },
  { value: 'clothing', label: 'Pakaian', icon: Shirt },
  { value: 'beauty', label: 'Kecantikan', icon: Sparkles },
  { value: 'baby', label: 'Bayi', icon: Baby },
  { value: 'pet', label: 'Hewan', icon: PawPrint },
  { value: 'gadget', label: 'Gadget', icon: Smartphone },
  { value: 'piggy', label: 'Tabungan', icon: PiggyBank },
  { value: 'ticket', label: 'Tiket/Event', icon: Ticket },
  { value: 'bus', label: 'Kendaraan Umum', icon: Bus },
  { value: 'receipt', label: 'Lain-lain', icon: Receipt },
  { value: 'charity', label: 'Amal/Donasi', icon: Heart }
];

// 15 colors
const COLORS = [
  { value: 'emerald', label: 'Emerald', hex: '#10B981', bgClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', activeClass: 'ring-2 ring-emerald-500 bg-emerald-500/20' },
  { value: 'indigo', label: 'Indigo', hex: '#3B82F6', bgClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400', activeClass: 'ring-2 ring-blue-500 bg-blue-500/20' },
  { value: 'amber', label: 'Amber', hex: '#F59E0B', bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400', activeClass: 'ring-2 ring-amber-500 bg-amber-500/20' },
  { value: 'rose', label: 'Rose', hex: '#EF4444', bgClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400', activeClass: 'ring-2 ring-rose-500 bg-rose-500/20' },
  { value: 'purple', label: 'Purple', hex: '#8B5CF6', bgClass: 'bg-purple-500/10 border-purple-500/20 text-purple-400', activeClass: 'ring-2 ring-purple-500 bg-purple-500/20' },
  { value: 'teal', label: 'Teal', hex: '#14B8A6', bgClass: 'bg-teal-500/10 border-teal-500/20 text-teal-400', activeClass: 'ring-2 ring-teal-500 bg-teal-500/20' },
  { value: 'orange', label: 'Orange', hex: '#F97316', bgClass: 'bg-orange-500/10 border-orange-500/20 text-orange-400', activeClass: 'ring-2 ring-orange-500 bg-orange-500/20' },
  { value: 'cyan', label: 'Cyan', hex: '#06B6D4', bgClass: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', activeClass: 'ring-2 ring-cyan-500 bg-cyan-500/20' },
  { value: 'pink', label: 'Pink', hex: '#EC4899', bgClass: 'bg-pink-500/10 border-pink-500/20 text-pink-400', activeClass: 'ring-2 ring-pink-500 bg-pink-500/20' },
  { value: 'yellow', label: 'Yellow', hex: '#EAB308', bgClass: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400', activeClass: 'ring-2 ring-yellow-500 bg-yellow-500/20' },
  { value: 'sky', label: 'Sky', hex: '#0EA5E9', bgClass: 'bg-sky-500/10 border-sky-500/20 text-sky-400', activeClass: 'ring-2 ring-sky-500 bg-sky-500/20' },
  { value: 'lime', label: 'Lime', hex: '#84CC16', bgClass: 'bg-lime-500/10 border-lime-500/20 text-lime-400', activeClass: 'ring-2 ring-lime-500 bg-lime-500/20' },
  { value: 'violet', label: 'Violet', hex: '#7C3AED', bgClass: 'bg-violet-500/10 border-violet-500/20 text-violet-400', activeClass: 'ring-2 ring-violet-500 bg-violet-500/20' },
  { value: 'fuchsia', label: 'Fuchsia', hex: '#D946EF', bgClass: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400', activeClass: 'ring-2 ring-fuchsia-500 bg-fuchsia-500/20' },
  { value: 'slate', label: 'Slate', hex: '#64748B', bgClass: 'bg-slate-500/10 border-slate-500/20 text-slate-400', activeClass: 'ring-2 ring-slate-500 bg-slate-500/20' }
];

export default function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  transactions,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onReorderCategories
}: CategoryManagerModalProps) {
  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // Determine if device is touch (disable drag-and-drop on mobile)
  const isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('receipt');
  const [color, setColor] = useState('slate');

  // Task 4: this modal is always rendered by App.tsx (isOpen just toggles
  // `if (!isOpen) return null` below) rather than being mounted/unmounted —
  // so without this, closing while mid "Tambah"/"Ubah" left formMode/name
  // stuck, and reopening later showed that stale add/edit form (with
  // whatever text was typed) instead of the category list.
  useEffect(() => {
    if (!isOpen) {
      setFormMode('list');
      setEditingCategoryId(null);
      setName('');
      setIcon('receipt');
      setColor('slate');
      setDeleteWarning(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setName('');
    setIcon('receipt');
    setColor('slate');
    setFormMode('add');
    setDeleteWarning(null);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setFormMode('edit');
    setDeleteWarning(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Nama kategori tidak boleh kosong');

    if (formMode === 'add') {
      onAddCategory({
        name: name.trim(),
        icon,
        color
      });
    } else if (formMode === 'edit' && editingCategoryId) {
      onEditCategory({
        id: editingCategoryId,
        name: name.trim(),
        icon,
        color
      });
    }
    setFormMode('list');
  };

  const handleDeleteCheck = (catId: string, catName: string) => {
    const hasTransactions = transactions.some(t => t.category === catId);
    const msg = hasTransactions
      ? `Apakah Anda yakin ingin menghapus kategori "${catName}"? Peringatan: Semua riwayat transaksi dengan kategori ini juga akan dihapus secara permanen!`
      : `Apakah Anda yakin ingin menghapus kategori "${catName}"?`;

    if (confirm(msg)) {
      onDeleteCategory(catId);
      setDeleteWarning(null);
    }
  };

  const getBorderColorHex = (colorName: string) => {
    const found = COLORS.find(c => c.value === colorName);
    return found ? found.hex : '#64748B';
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isTouchDevice) return; // disable on mobile
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (isTouchDevice) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (isTouchDevice) return;
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragOverId(null);
      setDragId(null);
      return;
    }
    const newOrder = [...categories];
    const fromIdx = newOrder.findIndex(c => c.id === dragId);
    const toIdx = newOrder.findIndex(c => c.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    onReorderCategories(newOrder);
    setDragOverId(null);
    setDragId(null);
  };

  const handleDragEnd = () => {
    setDragOverId(null);
    setDragId(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 select-none font-body-md text-white">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      
      {/* Container */}
      <div className="relative glass-card rounded-2xl w-full max-w-md border border-white/10 z-10 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-surface-variant/20">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-primary" />
            <h3 className="font-headline-sm text-base font-bold">
              {formMode === 'list' && 'Kelola Kategori Transaksi'}
              {formMode === 'add' && 'Tambah Kategori Baru'}
              {formMode === 'edit' && 'Ubah Kategori'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors text-on-surface-variant hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto no-scrollbar flex-1 flex flex-col gap-4">
          
          {/* Warning Message Box */}
          {deleteWarning && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex gap-2 items-start animate-shake">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Peringatan Penghapusan</p>
                <p className="leading-relaxed text-[11px]">{deleteWarning}</p>
                <button 
                  type="button"
                  onClick={() => setDeleteWarning(null)}
                  className="mt-2 text-white bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1 rounded text-[10px] font-bold"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {formMode === 'list' ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="w-full h-11 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Tambah Kategori Baru
              </button>

              {/* Hint drag */}
              <p className="text-[10px] text-on-surface-variant/50 text-center flex items-center justify-center gap-1">
                <GripVertical className="w-3 h-3" />
                Seret ikon <GripVertical className="w-3 h-3 inline" /> untuk mengubah urutan
              </p>

              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                {categories.length === 0 ? (
                  <p className="text-xs text-on-surface-variant/40 py-8 text-center">Belum ada kategori yang ditambahkan.</p>
                ) : (
                  categories.map(cat => {
                    const borderHex = getBorderColorHex(cat.color);
                    const isDragOver = dragOverId === cat.id;
                    const isDragging = dragId === cat.id;
                    return (
                      <div 
                        key={cat.id}
                        draggable={!isTouchDevice}
                        onDragStart={(e) => handleDragStart(e, cat.id)}
                        onDragOver={(e) => handleDragOver(e, cat.id)}
                        onDrop={(e) => handleDrop(e, cat.id)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isDragging
                            ? 'opacity-40 scale-95 bg-white/5 border-white/10'
                            : isDragOver
                            ? 'bg-primary/10 border-primary/30 scale-[1.01]'
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                        style={{ borderLeft: isDragOver ? `3px solid #4EDEA3` : `3px solid ${borderHex}` }}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Drag handle */}
                          <GripVertical className="w-4 h-4 text-on-surface-variant/40 cursor-grab active:cursor-grabbing shrink-0" />
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: borderHex + '15' }}>
                            <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: borderHex }} />
                          </div>
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        
                        {/* Edit button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(cat);
                            }}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-on-surface-variant hover:text-white transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {/* Delete button */}
                          {categories.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCheck(cat.id, cat.name);
                              }}
                              className="p-1.5 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 border border-white/5 rounded-lg text-on-surface-variant hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Move Up */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const idx = categories.findIndex(c => c.id === cat.id);
                              if (idx > 0) {
                                const newOrder = [...categories];
                                [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                                onReorderCategories(newOrder);
                              }
                            }}
                            disabled={categories.findIndex(c => c.id === cat.id) === 0}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-on-surface-variant hover:text-white disabled:opacity-40"
                            title="Naik"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          {/* Move Down */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const idx = categories.findIndex(c => c.id === cat.id);
                              if (idx < categories.length - 1) {
                                const newOrder = [...categories];
                                [newOrder[idx + 1], newOrder[idx]] = [newOrder[idx], newOrder[idx + 1]];
                                onReorderCategories(newOrder);
                              }
                            }}
                            disabled={categories.findIndex(c => c.id === cat.id) === categories.length - 1}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-on-surface-variant hover:text-white disabled:opacity-40"
                            title="Turun"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              
              {/* Category Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Nama Kategori</label>
                <input
                  type="text"
                  required
                  maxLength={18}
                  placeholder="Contoh: Belanja Bulanan, Jajan Anak"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 bg-surface-variant/40 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-primary/60"
                />
              </div>

              {/* Accent Color Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Tema Warna Kategori (Pilih 1 dari 15)</label>
                <div className="grid grid-cols-5 gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`h-9 rounded-lg flex items-center justify-center transition-all border text-xs font-semibold ${color === c.value ? c.activeClass : 'bg-surface-variant/10 border-white/5 text-on-surface-variant hover:bg-white/5'}`}
                      style={{ color: c.hex, borderColor: color === c.value ? c.hex : '' }}
                      title={c.label}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Pilih Ikon Kategori (Pilih 1 dari 30)</label>
                <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
                  {ICONS.map(i => {
                    const IconComp = i.icon;
                    const isSelected = icon === i.value;
                    const foundColor = COLORS.find(c => c.value === color);
                    const activeStyle = foundColor ? { color: foundColor.hex, borderColor: foundColor.hex, backgroundColor: foundColor.hex + '15' } : {};
                    
                    return (
                      <button
                        key={i.value}
                        type="button"
                        onClick={() => setIcon(i.value)}
                        className={`h-10 rounded-lg flex items-center justify-center transition-all border ${isSelected ? '' : 'bg-surface-variant/10 border-white/5 text-on-surface-variant hover:bg-white/5'}`}
                        style={isSelected ? activeStyle : {}}
                        title={i.label}
                      >
                        <IconComp className="w-5 h-5 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 mt-3 pt-3 border-t border-white/5">
                <button
                  type="submit"
                  className="flex-1 h-11 bg-primary text-on-primary rounded-xl font-headline-sm text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-95 transition-all shadow-[0_4px_15px_rgba(78,222,163,0.15)] active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  Simpan Kategori
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode('list')}
                  className="px-4 h-11 bg-white/5 border border-white/10 text-on-surface-variant hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1 hover:bg-white/10 active:scale-[0.98]"
                >
                  <Undo2 className="w-4 h-4" />
                  Batal
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
