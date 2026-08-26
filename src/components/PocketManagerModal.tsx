import React, { useState, useEffect } from 'react';
import { Pocket, Transaction } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Wallet, 
  Users, 
  Store, 
  Coffee, 
  Heart, 
  Info, 
  Save, 
  Undo2,
  Sparkles,
  CircleDollarSign,
  PiggyBank,
  CreditCard,
  Coins,
  ShoppingBag,
  Home,
  Car,
  Plane,
  Gamepad2,
  GraduationCap,
  Utensils,
  Gift,
  Briefcase,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { formatRupiah } from '../utils';
import CalcKeyboard, { formatEquation, evaluateEquation } from './CalcKeyboard';

interface PocketManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pockets: Pocket[];
  transactions: Transaction[];
  onAddPocket: (pocket: Omit<Pocket, 'balance'> & { initialBalance: number }) => void;
  onEditPocket: (pocket: Pocket) => void;
  onDeletePocket: (id: string) => void;
  onReorderPockets: (reorderedPockets: Pocket[]) => void;
}

const ICONS = [
  { value: 'wallet', label: 'Dompet', icon: Wallet },
  { value: 'group', label: 'Bendahara/Kas', icon: Users },
  { value: 'storefront', label: 'Toko/Bisnis', icon: Store },
  { value: 'coffee', label: 'Jajan/Kafe', icon: Coffee },
  { value: 'heart', label: 'Kesehatan', icon: Heart },
  { value: 'sparkles', label: 'Tabungan/Bebas', icon: Sparkles },
  { value: 'piggy', label: 'Celengan', icon: PiggyBank },
  { value: 'creditcard', label: 'Kartu', icon: CreditCard },
  { value: 'coins', label: 'Koin/Cash', icon: Coins },
  { value: 'shopping', label: 'Belanja', icon: ShoppingBag },
  { value: 'home', label: 'Rumah/Sewa', icon: Home },
  { value: 'car', label: 'Transport/Bensin', icon: Car },
  { value: 'plane', label: 'Travel/Liburan', icon: Plane },
  { value: 'game', label: 'Game/Hiburan', icon: Gamepad2 },
  { value: 'education', label: 'Pendidikan', icon: GraduationCap },
  { value: 'food', label: 'Makan', icon: Utensils },
  { value: 'gift', label: 'Hadiah/Amal', icon: Gift },
  { value: 'briefcase', label: 'Pekerjaan/Gaji', icon: Briefcase },
];

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
];

export default function PocketManagerModal({
  isOpen,
  onClose,
  pockets,
  transactions,
  onAddPocket,
  onEditPocket,
  onDeletePocket,
  onReorderPockets
}: PocketManagerModalProps) {
  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingPocketId, setEditingPocketId] = useState<string | null>(null);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...pockets];
    const temp = reordered[index];
    reordered[index] = reordered[index - 1];
    reordered[index - 1] = temp;
    onReorderPockets(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === pockets.length - 1) return;
    const reordered = [...pockets];
    const temp = reordered[index];
    reordered[index] = reordered[index + 1];
    reordered[index + 1] = temp;
    onReorderPockets(reordered);
  };

  // Form States
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialBalanceExpr, setInitialBalanceExpr] = useState<string>('');
  const [showCalc, setShowCalc] = useState<boolean>(false);
  const [icon, setIcon] = useState('wallet');
  const [color, setColor] = useState('emerald');

  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Handle open add pocket form
  const handleOpenAdd = () => {
    setName('');
    setTag('');
    setInitialBalance(0);
    setInitialBalanceExpr('');
    setShowCalc(false);
    setIcon('wallet');
    setColor('emerald');
    setFormMode('add');
    setDeleteWarning(null);
  };

  // Handle open edit pocket form
  const handleOpenEdit = (pocket: Pocket) => {
    setEditingPocketId(pocket.id);
    setName(pocket.name);
    setTag(pocket.tag);
    setInitialBalance(pocket.balance);
    setInitialBalanceExpr(pocket.balance.toString());
    setShowCalc(false);
    setIcon(pocket.icon);
    setColor(pocket.color);
    setFormMode('edit');
    setDeleteWarning(null);
  };

  // Task 4: this modal is always rendered by App.tsx (isOpen just toggles
  // `if (!isOpen) return null` below) rather than being mounted/unmounted —
  // so without this, closing while mid "Tambah"/"Ubah" left formMode/name
  // stuck, and reopening later showed that stale add/edit form (with
  // whatever text was typed) instead of the pocket list.
  useEffect(() => {
    if (!isOpen) {
      setFormMode('list');
      setEditingPocketId(null);
      setName('');
      setTag('');
      setInitialBalance(0);
      setInitialBalanceExpr('');
      setShowCalc(false);
      setIcon('wallet');
      setColor('emerald');
      setDeleteWarning(null);
    }
  }, [isOpen]);

  // Dynamically update evaluated amount from raw expression
  useEffect(() => {
    const evaluated = evaluateEquation(initialBalanceExpr);
    setInitialBalance(evaluated);
  }, [initialBalanceExpr]);

  const handleCalcKeyPress = (key: string) => {
    setInitialBalanceExpr(prev => {
      const operators = ['+', '-', '*', '/'];
      if (operators.includes(key) && operators.includes(prev.slice(-1))) {
        return prev.slice(0, -1) + key;
      }
      return prev + key;
    });
  };

  const handleCalcClear = () => {
    setInitialBalanceExpr('');
    setInitialBalance(0);
  };

  const handleCalcDelete = () => {
    setInitialBalanceExpr(prev => prev.slice(0, -1));
  };

  const handleCalcEvaluate = () => {
    const res = evaluateEquation(initialBalanceExpr);
    setInitialBalance(res);
    setInitialBalanceExpr(res > 0 ? res.toString() : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Nama kantong tidak boleh kosong');

    if (formMode === 'add') {
      const newPocket = {
        id: `p-${Date.now()}`,
        name: name.trim(),
        tag: tag.trim() || 'Kantong kustom',
        icon,
        color,
        initialBalance: initialBalance || 0
      };
      onAddPocket(newPocket);
    } else if (formMode === 'edit' && editingPocketId) {
      const pocketToEdit = pockets.find(p => p.id === editingPocketId);
      if (!pocketToEdit) return;
      
      const updatedPocket: Pocket = {
        ...pocketToEdit,
        name: name.trim(),
        tag: tag.trim() || 'Kantong kustom',
        icon,
        color
      };
      onEditPocket(updatedPocket);
    }
    setFormMode('list');
  };

  const handleDeleteCheck = (pocketId: string, pocketName: string) => {
    const hasTransactions = transactions.some(t => t.pocketId === pocketId);
    const msg = hasTransactions
      ? `Apakah Anda yakin ingin menghapus kantong "${pocketName}"? Peringatan: Semua riwayat transaksi yang menggunakan kantong ini juga akan dihapus secara permanen!`
      : `Apakah Anda yakin ingin menghapus kantong "${pocketName}"?`;

    if (confirm(msg)) {
      onDeletePocket(pocketId);
      setDeleteWarning(null);
    }
  };

  const getPocketIcon = (iconName: string, colorClass: string) => {
    const found = ICONS.find(i => i.value === iconName);
    const IconComponent = found ? found.icon : Wallet;
    return <IconComponent className={`w-5 h-5 ${colorClass}`} />;
  };

  const getColorClass = (colorName: string) => {
    const found = COLORS.find(c => c.value === colorName);
    return found ? found.bgClass : 'bg-slate-500/10 border-slate-500/20 text-slate-400';
  };

  const getBorderHex = (colorName: string) => {
    const found = COLORS.find(c => c.value === colorName);
    return found ? found.hex : '#94A3B8';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 select-none font-body-md text-on-surface">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      
      {/* Container */}
      <div className="relative glass-card rounded-2xl w-full max-w-md border border-overlay/10 z-10 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-overlay/5 flex justify-between items-center bg-surface-variant/20">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-primary" />
            <h3 className="font-headline-sm text-lg text-on-surface">
              {formMode === 'list' && 'Kelola Kantong Keuangan'}
              {formMode === 'add' && 'Tambah Kantong Baru'}
              {formMode === 'edit' && 'Ubah Detail Kantong'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-overlay/5 rounded-full transition-colors text-on-surface-variant hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto no-scrollbar flex-1 flex flex-col gap-4">
          
          {/* Warning Message Box */}
          {deleteWarning && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger flex gap-2 items-start animate-shake">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Tidak Dapat Dihapus</p>
                <p className="leading-relaxed">{deleteWarning}</p>
                <button 
                  type="button"
                  onClick={() => setDeleteWarning(null)}
                  className="mt-2 text-on-surface bg-danger/20 hover:bg-danger/30 px-2.5 py-1 rounded text-[10px] font-bold"
                >
                  Saya Mengerti
                </button>
              </div>
            </div>
          )}

          {formMode === 'list' ? (
            <>
              {/* Pocket List View */}
              <div className="flex flex-col gap-3">
                {pockets.map((p, idx) => {
                  const borderHex = getBorderHex(p.color);
                  const colorClass = getColorClass(p.color);
                  
                  return (
                    <div 
                      key={p.id}
                      className="glass-card rounded-xl p-3.5 border-l-4 flex justify-between items-center hover:bg-overlay/5 transition-all"
                      style={{ borderLeftColor: borderHex }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClass} shrink-0`}>
                          {getPocketIcon(p.icon, '')}
                        </div>
                        <div>
                          <p className="font-body-md text-on-surface font-medium">{p.name}</p>
                          <p className="text-[10px] text-on-surface-variant/70 italic">{p.tag}</p>
                          <p className="font-mono-data text-xs text-primary font-bold mt-0.5">{formatRupiah(p.balance)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Reordering Controls */}
                        <div className="flex flex-col gap-1 mr-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveUp(idx)}
                            className="p-1 bg-overlay/5 border border-overlay/5 text-on-surface-variant hover:text-on-surface rounded-md hover:bg-overlay/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
                            title="Pindahkan ke atas"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === pockets.length - 1}
                            onClick={() => handleMoveDown(idx)}
                            className="p-1 bg-overlay/5 border border-overlay/5 text-on-surface-variant hover:text-on-surface rounded-md hover:bg-overlay/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
                            title="Pindahkan ke bawah"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-2 bg-overlay/5 border border-overlay/5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-overlay/10 transition-all animate-fade-in"
                          title="Edit kantong"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {pockets.length > 1 && p.id !== 'pribadi' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCheck(p.id, p.name)}
                            className="p-2 bg-overlay/5 border border-overlay/5 text-on-surface-variant/60 hover:text-danger rounded-lg hover:bg-danger/5 hover:border-danger/20 transition-all animate-fade-in"
                            title="Hapus kantong"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Button footer */}
              <button
                type="button"
                onClick={handleOpenAdd}
                className="w-full h-11 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all mt-2 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Tambah Kantong Baru
              </button>
            </>
          ) : (
            /* Add/Edit Form View */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              {/* Pocket Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Nama Kantong</label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  placeholder="Contoh: Tabungan Liburan, Belanja Mingguan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-body-md"
                />
              </div>

              {/* Tag / Description Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Catatan / Tagline Singkat</label>
                <input
                  type="text"
                  maxLength={32}
                  placeholder="Contoh: Tabungan target akhir tahun"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-body-md"
                />
              </div>

              {/* Initial Balance (Only visible on add mode) */}
              {formMode === 'add' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-label-caps text-on-surface-variant uppercase">Saldo Awal (Rp)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 font-mono-data text-primary text-xs font-bold">Rp</span>
                    <input
                      type="text"
                      inputMode="none"
                      placeholder="0"
                      value={formatEquation(initialBalanceExpr) || ''}
                      onFocus={() => setShowCalc(true)}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9+\-*/]/g, '');
                        setInitialBalanceExpr(clean);
                      }}
                      className="h-11 w-full bg-surface-variant/40 border border-overlay/10 rounded-lg pl-9 pr-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-mono-data"
                    />
                  </div>
                </div>
              )}

              {formMode === 'add' && showCalc && (
                <div className="mt-2 border-t border-overlay/5 pt-3 animate-fade-in">
                  <CalcKeyboard
                    onKeyPress={handleCalcKeyPress}
                    onClear={handleCalcClear}
                    onDelete={handleCalcDelete}
                    onEvaluate={handleCalcEvaluate}
                    onOk={() => setShowCalc(false)}
                  />
                </div>
              )}

              {/* Custom Accent Color Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Tema Warna</label>
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`h-9 rounded-lg flex items-center justify-center transition-all border text-xs font-semibold ${color === c.value ? c.activeClass : 'bg-surface-variant/10 border-overlay/5 text-on-surface-variant hover:bg-overlay/5'}`}
                      style={{ color: c.hex, borderColor: color === c.value ? c.hex : '' }}
                      title={c.label}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Icon Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Pilih Ikon</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map(i => {
                    const IconComp = i.icon;
                    const isSelected = icon === i.value;
                    const cClass = getColorClass(color);
                    
                    return (
                      <button
                        key={i.value}
                        type="button"
                        onClick={() => setIcon(i.value)}
                        className={`h-9 rounded-lg flex items-center justify-center transition-all border ${isSelected ? cClass + ' border-current' : 'bg-surface-variant/10 border-overlay/5 text-on-surface-variant hover:bg-overlay/5'}`}
                        title={i.label}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2.5 mt-3 pt-3 border-t border-overlay/5">
                <button
                  type="submit"
                  className="flex-1 h-11 bg-primary text-on-primary rounded-xl font-headline-sm text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-95 transition-all shadow-[0_4px_15px_rgba(78,222,163,0.15)] active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  Simpan Kantong
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode('list')}
                  className="px-4 h-11 bg-overlay/5 border border-overlay/10 text-on-surface-variant hover:text-on-surface rounded-xl text-xs font-semibold transition-all flex items-center gap-1 hover:bg-overlay/10 active:scale-[0.98]"
                >
                  <Undo2 className="w-4 h-4" />
                  Kembali
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
