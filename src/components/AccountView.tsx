import React, { useState, useEffect, useRef } from 'react';
import { Account, Pocket, Transaction } from '../types';
import { formatRupiah } from '../utils';
import { t as tr } from '../i18n';
import CalcKeyboard, { formatEquation, evaluateEquation } from './CalcKeyboard';
import {
  Plus,
  Trash2,
  Edit3,
  Landmark,
  Smartphone,
  Coins,
  Wallet,
  Save,
  X,
  Sliders,
  ChevronRight,
  Info,
  Undo2,
  Copy,
  Check,
  Upload,
  ImageOff
} from 'lucide-react';

interface AccountViewProps {
  accounts: Account[];
  pockets: Pocket[];
  transactions: Transaction[];
  onAddAccount: (account: Omit<Account, 'balance'> & { initialBalance: number }) => void;
  onEditAccount: (account: Account, balanceDifference?: number) => void;
  onDeleteAccount: (id: string) => void;
  onSaveAllocations: (accountId: string, allocations: Record<string, number>) => void;
  onReorderAccounts: (newOrderIds: string[]) => void;
  // Task (revisi, poin 10): lunasi transaksi 'unpaid' terpilih di satu
  // wallet Paylater, dibayar dari satu wallet biasa. Return false = ditolak
  // (alert sudah ditampilkan pemanggilnya), true = berhasil.
  onPayPaylaterTransactions: (paylaterAccountId: string, transactionIds: string[], payingAccountId: string) => boolean;
}

// Long-press threshold to enter drag mode, and the movement tolerance before
// that (a bigger move before the timer fires reads as a scroll, not a hold).
const LONG_PRESS_MS = 450;
const MOVE_CANCEL_THRESHOLD = 8;

const ICONS = [
  { value: 'bank', label: 'Bank', icon: Landmark },
  { value: 'smartphone', label: 'E-Wallet', icon: Smartphone },
  { value: 'cash', label: 'Uang Tunai', icon: Coins },
  { value: 'wallet', label: 'Dompet Lain', icon: Wallet },
];

const COLORS = [
  { value: 'indigo', label: 'Indigo/BCA', hex: '#3B82F6', activeClass: 'ring-2 ring-blue-500 bg-blue-500/20' },
  { value: 'purple', label: 'Purple/GoPay', hex: '#8B5CF6', activeClass: 'ring-2 ring-purple-500 bg-purple-500/20' },
  { value: 'emerald', label: 'Emerald/Tunai', hex: '#10B981', activeClass: 'ring-2 ring-emerald-500 bg-emerald-500/20' },
  { value: 'orange', label: 'Orange', hex: '#F97316', activeClass: 'ring-2 ring-orange-500 bg-orange-500/20' },
  { value: 'cyan', label: 'Cyan', hex: '#06B6D4', activeClass: 'ring-2 ring-cyan-500 bg-cyan-500/20' },
  { value: 'pink', label: 'Pink', hex: '#EC4899', activeClass: 'ring-2 ring-pink-500 bg-pink-500/20' },
];

export default function AccountView({
  accounts,
  pockets,
  transactions,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onSaveAllocations,
  onReorderAccounts,
  onPayPaylaterTransactions
}: AccountViewProps) {
  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialBalanceExpr, setInitialBalanceExpr] = useState<string>('');
  const [showInitialCalc, setShowInitialCalc] = useState<boolean>(false);
  const [icon, setIcon] = useState('bank');
  const [color, setColor] = useState('indigo');
  // Revisi (App poin 2): logo custom hasil upload sendiri (data URI base64),
  // pola resize/compress-nya sama persis dengan avatar upload di
  // ProfileView.tsx. Kalau diisi, menggantikan ikon preset di atas.
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // Task (revisi, poin 10): tipe wallet HANYA bisa dipilih saat menambah
  // baru — mengubah tipe wallet yang sudah punya riwayat transaksi akan
  // bikin data allocations/paylaterStatus tidak konsisten, jadi sengaja
  // dikunci begitu dibuat (sama seperti pattern lain di app ini yang
  // menghindari migrasi data mendadak).
  const [accountType, setAccountType] = useState<'normal' | 'paylater'>('normal');

  // Copy-to-clipboard feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Long-press drag-to-reorder state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  // Allocation States
  const [isEditingAllocation, setIsEditingAllocation] = useState(false);
  const [allocationInputs, setAllocationInputs] = useState<Record<string, number>>({});
  const [allocationExprs, setAllocationExprs] = useState<Record<string, string>>({});
  const [activeAllocPocketId, setActiveAllocPocketId] = useState<string | null>(null);
  const [showAllocCalc, setShowAllocCalc] = useState<boolean>(false);

  // Task (revisi, poin 10): state "Bayar Tagihan" untuk wallet Paylater —
  // transaksi mana yang dicentang untuk dilunasi + wallet biasa mana yang
  // dipakai membayar.
  const [selectedPayTxIds, setSelectedPayTxIds] = useState<Set<string>>(new Set());
  const [payFromAccountId, setPayFromAccountId] = useState<string>('');

  // Reset editing allocation state when wallet selection changes
  useEffect(() => {
    setIsEditingAllocation(false);
    setSelectedPayTxIds(new Set());
    const firstNormal = accounts.find(a => a.type !== 'paylater');
    setPayFromAccountId(firstNormal?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  // Dynamically update evaluated amount from raw expression for wallet initial balance
  useEffect(() => {
    const evaluated = evaluateEquation(initialBalanceExpr);
    setInitialBalance(evaluated);
  }, [initialBalanceExpr]);

  const handleInitialKeyPress = (key: string) => {
    setInitialBalanceExpr(prev => {
      const operators = ['+', '-', '*', '/'];
      if (operators.includes(key) && operators.includes(prev.slice(-1))) {
        return prev.slice(0, -1) + key;
      }
      return prev + key;
    });
  };

  const handleInitialClear = () => {
    setInitialBalanceExpr('');
    setInitialBalance(0);
  };

  const handleInitialDelete = () => {
    setInitialBalanceExpr(prev => prev.slice(0, -1));
  };

  const handleInitialEvaluate = () => {
    const res = evaluateEquation(initialBalanceExpr);
    setInitialBalance(res);
    setInitialBalanceExpr(res > 0 ? res.toString() : '');
  };

  const handleStartEditAllocation = () => {
    if (!selectedAccountId) return;
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!acc) return;

    const defaultPocketId = pockets[0]?.id || 'pribadi';
    const currentAllocations = acc.allocations || { [defaultPocketId]: acc.balance };

    const inputs: Record<string, number> = {};
    const exprs: Record<string, string> = {};
    pockets.forEach(p => {
      const bal = currentAllocations[p.id] || 0;
      inputs[p.id] = bal;
      exprs[p.id] = bal > 0 ? bal.toString() : '';
    });
    setAllocationInputs(inputs);
    setAllocationExprs(exprs);
    setActiveAllocPocketId(null);
    setShowAllocCalc(false);
    setIsEditingAllocation(true);
  };

  const handleAllocationInputChange = (pocketId: string, val: number) => {
    if (!selectedAccountId) return;
    const targetAcc = accounts.find(a => a.id === selectedAccountId);
    if (!targetAcc) return;

    const defaultPocketId = pockets[0]?.id || 'pribadi';

    // Calculate sum of other pocket allocations (excluding pocketId and defaultPocketId)
    const otherPocketsAllocSum = pockets
      .filter(p => p.id !== defaultPocketId && p.id !== pocketId)
      .reduce((sum, p) => sum + (allocationInputs[p.id] || 0), 0) + val;

    if (otherPocketsAllocSum > targetAcc.balance) {
      // Exceeds balance, cap the input value
      const maxVal = targetAcc.balance - pockets
        .filter(p => p.id !== defaultPocketId && p.id !== pocketId)
        .reduce((sum, p) => sum + (allocationInputs[p.id] || 0), 0);
      
      const cappedVal = Math.max(0, maxVal);
      setAllocationInputs(prev => {
        const next = { ...prev, [pocketId]: cappedVal };
        next[defaultPocketId] = 0;
        return next;
      });
      setAllocationExprs(prev => {
        const next = { ...prev, [pocketId]: cappedVal > 0 ? cappedVal.toString() : '' };
        next[defaultPocketId] = '';
        return next;
      });
    } else {
      setAllocationInputs(prev => {
        const next = { ...prev, [pocketId]: val };
        next[defaultPocketId] = targetAcc.balance - otherPocketsAllocSum;
        return next;
      });
      setAllocationExprs(prev => {
        const next = { ...prev, [pocketId]: val > 0 ? val.toString() : '' };
        next[defaultPocketId] = (targetAcc.balance - otherPocketsAllocSum) > 0 ? (targetAcc.balance - otherPocketsAllocSum).toString() : '';
        return next;
      });
    }
  };

  const handleAllocCalcKeyPress = (key: string) => {
    if (!activeAllocPocketId) return;
    setAllocationExprs(prev => {
      const currentExpr = prev[activeAllocPocketId] || '';
      const operators = ['+', '-', '*', '/'];
      let nextExpr = currentExpr;
      if (operators.includes(key) && operators.includes(currentExpr.slice(-1))) {
        nextExpr = currentExpr.slice(0, -1) + key;
      } else {
        nextExpr = currentExpr + key;
      }
      const evaluated = evaluateEquation(nextExpr);
      handleAllocationInputChange(activeAllocPocketId, evaluated);
      return { ...prev, [activeAllocPocketId]: nextExpr };
    });
  };

  const handleAllocCalcClear = () => {
    if (!activeAllocPocketId) return;
    setAllocationExprs(prev => ({ ...prev, [activeAllocPocketId]: '' }));
    handleAllocationInputChange(activeAllocPocketId, 0);
  };

  const handleAllocCalcDelete = () => {
    if (!activeAllocPocketId) return;
    setAllocationExprs(prev => {
      const currentExpr = prev[activeAllocPocketId] || '';
      const nextExpr = currentExpr.slice(0, -1);
      const evaluated = evaluateEquation(nextExpr);
      handleAllocationInputChange(activeAllocPocketId, evaluated);
      return { ...prev, [activeAllocPocketId]: nextExpr };
    });
  };

  const handleAllocCalcEvaluate = () => {
    if (!activeAllocPocketId) return;
    setAllocationExprs(prev => {
      const currentExpr = prev[activeAllocPocketId] || '';
      const evaluated = evaluateEquation(currentExpr);
      handleAllocationInputChange(activeAllocPocketId, evaluated);
      return { ...prev, [activeAllocPocketId]: evaluated > 0 ? evaluated.toString() : '' };
    });
  };

  const totalAllocatedInput = Object.values(allocationInputs).reduce((sum, v) => sum + v, 0);

  const handleAllocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAcc = accounts.find(a => a.id === selectedAccountId);
    if (!selectedAccountId || !targetAcc) return;
    if (totalAllocatedInput !== targetAcc.balance) {
      return alert(tr('Total alokasi harus sama dengan total saldo wallet.'));
    }
    onSaveAllocations(selectedAccountId, allocationInputs);
    setIsEditingAllocation(false);
  };

  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Open add account form
  const handleOpenAdd = () => {
    setName('');
    setAccountNumber('');
    setOwnerName('');
    setInitialBalance(0);
    // Task 5: the saldo input field displays `initialBalanceExpr` (the raw
    // calculator expression string), NOT `initialBalance` directly — so
    // this must be cleared too, otherwise it'd show whatever expression was
    // left over from a previous add/edit session.
    setInitialBalanceExpr('');
    setIcon('bank');
    setColor('indigo');
    setLogoUrl(undefined);
    setAccountType('normal');
    setFormMode('add');
    setDeleteWarning(null);
  };

  // Open edit account form
  const handleOpenEdit = (acc: Account) => {
    setEditingAccountId(acc.id);
    setName(acc.name);
    setAccountNumber(acc.accountNumber || '');
    setOwnerName(acc.ownerName || '');
    setAccountType(acc.type || 'normal');
    // Wallet biasa: field ini mengisi saldo. Wallet Paylater: field yang
    // SAMA dipakai untuk limit kredit (lihat handleSubmit & label dinamis
    // di JSX) — outstanding (acc.balance) sendiri tidak ditampilkan di
    // sini sama sekali, murni hasil transaksi, bukan yang diedit manual.
    const displayValue = acc.type === 'paylater' ? (acc.limit || 0) : acc.balance;
    setInitialBalance(displayValue);
    // Task 5 fix: the saldo input displays `initialBalanceExpr`, not
    // `initialBalance` — this line was missing, so the field always showed
    // 0 (or a stale leftover expression) regardless of the wallet's real
    // balance, even though `initialBalance` itself was set correctly above.
    setInitialBalanceExpr(displayValue.toString());
    setIcon(acc.icon);
    setColor(acc.color);
    setLogoUrl(acc.logoUrl);
    setFormMode('edit');
    setDeleteWarning(null);
  };

  // Revisi (App poin 2): resize/compress ke JPEG kecil sebelum disimpan
  // sebagai base64 — pola sama persis dengan handleAvatarChange di
  // ProfileView.tsx, cuma langsung ke state form (bukan langsung
  // memanggil API) karena logo ini ikut disimpan bareng field lain saat
  // form di-submit, bukan disimpan instan begitu file dipilih.
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setLogoUrl(canvas.toDataURL('image/jpeg', 0.75));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert(tr('Nama rekening tidak boleh kosong'));

    if (formMode === 'add') {
      onAddAccount({
        id: `acc-${Date.now()}`,
        name: name.trim(),
        accountNumber: accountNumber.trim(),
        ownerName: ownerName.trim(),
        icon,
        logoUrl,
        color,
        type: accountType,
        initialBalance: initialBalance || 0
      });
    } else if (formMode === 'edit' && editingAccountId) {
      const accToEdit = accounts.find(a => a.id === editingAccountId);
      if (!accToEdit) return;
      if (accToEdit.type === 'paylater') {
        onEditAccount({
          ...accToEdit,
          name: name.trim(),
          icon,
          logoUrl,
          color,
          limit: initialBalance || 0,
        });
      } else {
        const balanceDifference = (initialBalance || 0) - accToEdit.balance;
        onEditAccount({
          ...accToEdit,
          name: name.trim(),
          accountNumber: accountNumber.trim(),
          ownerName: ownerName.trim(),
          icon,
          logoUrl,
          color
        }, balanceDifference);
      }
    }
    setFormMode('list');
  };

  const handleCopyAccountInfo = async (e: React.MouseEvent, acc: Account) => {
    e.stopPropagation();
    const text = `Bank: ${acc.name}\nAtas Nama: ${acc.ownerName || '-'}\nNo. Rekening: ${acc.accountNumber || '-'}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(acc.id);
      setTimeout(() => setCopiedId(prev => (prev === acc.id ? null : prev)), 1500);
    } catch (err) {
      console.warn('Gagal menyalin info rekening:', err);
    }
  };

  // ==========================================
  // Long-press (Pointer Events) drag & drop reorder for wallet cards
  // ==========================================
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, accId: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
    clearLongPressTimer();
    const pointerId = e.pointerId;
    const target = e.currentTarget;
    longPressTimerRef.current = window.setTimeout(() => {
      setDraggingId(accId);
      setDragOverId(accId);
      didDragRef.current = true;
      try { target.setPointerCapture(pointerId); } catch { /* ignore unsupported */ }
      if (typeof navigator.vibrate === 'function') navigator.vibrate(15);
    }, LONG_PRESS_MS);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId) {
      e.preventDefault();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cardEl = el?.closest('[data-account-id]') as HTMLElement | null;
      const overId = cardEl?.getAttribute('data-account-id');
      if (overId && overId !== dragOverId) setDragOverId(overId);
      return;
    }
    if (pointerStartRef.current) {
      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_THRESHOLD) {
        clearLongPressTimer();
      }
    }
  };

  const finishDrag = (fallbackAccId: string) => {
    clearLongPressTimer();
    if (draggingId) {
      const fromId = draggingId;
      const toId = dragOverId || fallbackAccId;
      if (fromId !== toId) {
        const fromIdx = accounts.findIndex(a => a.id === fromId);
        const toIdx = accounts.findIndex(a => a.id === toId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const reordered = [...accounts];
          const [moved] = reordered.splice(fromIdx, 1);
          reordered.splice(toIdx, 0, moved);
          onReorderAccounts(reordered.map(a => a.id));
        }
      }
      setDraggingId(null);
      setDragOverId(null);
    }
    pointerStartRef.current = null;
  };

  const handleCardPointerUp = (e: React.PointerEvent<HTMLDivElement>, accId: string) => {
    finishDrag(accId);
  };

  const handleCardPointerCancel = (accId: string) => {
    finishDrag(accId);
  };

  const handleCardClick = (accId: string) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setSelectedAccountId(prev => (prev === accId ? null : accId));
  };

  const handleDeleteCheck = (accId: string, accName: string) => {
    const hasTransactions = transactions.some(t => t.accountId === accId);
    const msg = hasTransactions
      ? `${tr('Apakah Anda yakin ingin menghapus rekening')} "${accName}"? ${tr('Peringatan: Semua riwayat transaksi yang menggunakan rekening ini juga akan dihapus secara permanen!')}`
      : `${tr('Apakah Anda yakin ingin menghapus rekening')} "${accName}"?`;

    if (confirm(msg)) {
      onDeleteAccount(accId);
      setDeleteWarning(null);
      if (selectedAccountId === accId) setSelectedAccountId(null);
    }
  };

  // Revisi (App poin 2): logoUrl (upload custom) menggantikan ikon preset
  // kalau diisi — dirender sebagai <img> bulat, bukan ikon lucide-react.
  const getAccountIcon = (iconName: string, colorHex: string, logoUrl?: string) => {
    if (logoUrl) {
      return <img src={logoUrl} alt="" className="w-5 h-5 shrink-0 rounded-full object-cover" />;
    }
    const found = ICONS.find(i => i.value === iconName);
    const IconComp = found ? found.icon : Landmark;
    return <IconComp className="w-5 h-5 shrink-0" style={{ color: colorHex }} />;
  };

  const getBorderColorHex = (colorName: string) => {
    const found = COLORS.find(c => c.value === colorName);
    return found ? found.hex : '#94A3B8';
  };

  const getPocketColorHex = (colorName: string) => {
    const map: Record<string, string> = {
      emerald: '#10B981',
      indigo: '#3B82F6',
      amber: '#F59E0B',
      rose: '#EF4444',
      purple: '#8B5CF6',
      teal: '#14B8A6',
      orange: '#F97316',
      cyan: '#06B6D4',
      pink: '#EC4899',
      yellow: '#EAB308',
      sky: '#0EA5E9',
      lime: '#84CC16'
    };
    return map[colorName] || '#94A3B8';
  };

  // Calculate dynamic pocket allocations inside selected account
  const getPocketAllocations = (accId: string) => {
    const allocations: { pocketId: string; name: string; color: string; balance: number; percentage: number }[] = [];
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return allocations;

    let totalAllocated = 0;
    const tempAllocations: Omit<typeof allocations[number], 'percentage'>[] = [];

    const defaultPocketId = pockets[0]?.id || 'pribadi';
    const currentAllocations = acc.allocations || { [defaultPocketId]: acc.balance };

    pockets.forEach(p => {
      const balance = currentAllocations[p.id] || 0;

      if (balance > 0) {
        tempAllocations.push({
          pocketId: p.id,
          name: p.name,
          color: p.color,
          balance
        });
        totalAllocated += balance;
      }
    });

    // Compute percentages
    tempAllocations.forEach(a => {
      const percentage = totalAllocated > 0 ? Math.round((a.balance / totalAllocated) * 100) : 0;
      allocations.push({ ...a, percentage });
    });

    return allocations;
  };

  const activeAllocations = selectedAccountId ? getPocketAllocations(selectedAccountId) : [];
  const selectedAccount = selectedAccountId ? accounts.find(a => a.id === selectedAccountId) : null;

  return (
    <div className="flex flex-col gap-6 select-none font-body-md text-on-surface">
      {/* Title Header */}
      <div className="flex justify-between items-center w-full">
        <div>
          <h1 className="font-headline-md text-2xl text-on-surface font-bold leading-tight">{tr('Dompet & Wallet')}</h1>
          <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
            {tr('Kelola simpanan fisik (Bank/E-Wallet/Dompet) dan pantau alokasi kantong di dalamnya.')}
          </p>
        </div>

        {formMode === 'list' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 h-11 bg-primary text-on-primary rounded-xl text-xs font-bold transition-all active:scale-95 shadow-[0_4px_15px_rgba(78,222,163,0.2)]"
          >
            <Plus className="w-4 h-4" />
            {tr('Tambah Wallet')}
          </button>
        )}
      </div>

      {deleteWarning && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex gap-2 items-start animate-shake">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">{tr('Tidak Dapat Dihapus')}</p>
            <p className="leading-relaxed">{deleteWarning}</p>
            <button
              type="button"
              onClick={() => setDeleteWarning(null)}
              className="mt-2 text-on-surface bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1 rounded text-[10px] font-bold"
            >
              {tr('Saya Mengerti')}
            </button>
          </div>
        </div>
      )}

      {formMode === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">

          {/* LEFT COLUMN: Accounts List */}
          <div className="lg:col-span-7 flex flex-col gap-4 w-full">
            {accounts.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-on-surface-variant/40 flex flex-col items-center gap-2">
                <Landmark className="w-10 h-10 text-on-surface-variant/30" />
                <p className="text-xs">{tr('Belum ada rekening dibuat. Silakan tambah rekening baru.')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map(acc => {
                  const borderHex = getBorderColorHex(acc.color);
                  const isFocused = selectedAccountId === acc.id;
                  const isDragging = draggingId === acc.id;
                  const isDropTarget = draggingId !== null && dragOverId === acc.id && dragOverId !== draggingId;
                  const borderStyle = isFocused
                    ? `2px solid ${borderHex}`
                    : '1px solid rgba(255, 255, 255, 0.08)';

                  return (
                    <div
                      key={acc.id}
                      data-account-id={acc.id}
                      onClick={() => handleCardClick(acc.id)}
                      onPointerDown={(e) => handleCardPointerDown(e, acc.id)}
                      onPointerMove={handleCardPointerMove}
                      onPointerUp={(e) => handleCardPointerUp(e, acc.id)}
                      onPointerCancel={() => handleCardPointerCancel(acc.id)}
                      className={`glass-card rounded-xl p-5 relative overflow-hidden flex flex-col gap-3 hover:bg-overlay/5 transition-all duration-200 cursor-pointer select-none ${isFocused ? 'ring-2 ring-offset-2 ring-offset-[#0B111E]' : ''} ${isDragging ? 'opacity-60 scale-95 shadow-2xl z-10' : ''} ${isDropTarget ? 'ring-2 ring-primary ring-dashed' : ''}`}
                      style={{
                        borderLeftColor: borderHex,
                        borderLeftWidth: '4px',
                        borderTop: borderStyle,
                        borderRight: borderStyle,
                        borderBottom: borderStyle,
                        borderColor: isFocused ? borderHex : '',
                        touchAction: draggingId ? 'none' : 'auto'
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getAccountIcon(acc.icon, borderHex, acc.logoUrl)}
                          <h3 className="font-headline-sm text-md text-on-surface font-medium truncate">{acc.name}</h3>
                        </div>

                        {/* CRUD Tools in header */}
                        <div
                          className="flex gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleCopyAccountInfo(e, acc)}
                            className="p-1.5 bg-overlay/5 hover:bg-overlay/10 border border-overlay/5 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
                            title="Salin info rekening"
                          >
                            {copiedId === acc.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="p-1.5 bg-overlay/5 hover:bg-overlay/10 border border-overlay/5 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
                            title="Edit rekening"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {accounts.length > 1 && (
                            <button
                              onClick={() => handleDeleteCheck(acc.id, acc.name)}
                              className="p-1.5 bg-overlay/5 hover:bg-rose-500/5 hover:border-rose-500/20 border border-overlay/5 rounded-lg text-on-surface-variant/60 hover:text-rose-400 transition-colors"
                              title="Hapus rekening"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {acc.type === 'paylater' ? (
                        <div>
                          <p className="text-[10px] text-on-surface-variant/70 uppercase font-label-caps tracking-wider">{tr('Tagihan Berjalan')}</p>
                          <p className="font-mono-data text-xl font-bold text-amber-400 mt-0.5">{formatRupiah(acc.balance)}</p>
                          <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{tr('dari limit')} {formatRupiah(acc.limit || 0)}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] text-on-surface-variant/70 uppercase font-label-caps tracking-wider">{tr('Saldo Total')}</p>
                          <p className="font-mono-data text-xl font-bold text-on-surface mt-0.5">{formatRupiah(acc.balance)}</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-1 pt-2.5 border-t border-overlay/5 gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] text-on-surface-variant/60 font-mono-data truncate max-w-[150px]">{acc.accountNumber || '-'}</span>
                          {acc.ownerName && (
                            <span className="text-[9px] text-on-surface-variant/40 italic truncate max-w-[150px]">{tr('a.n.')} {acc.ownerName}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-label-caps font-bold text-primary flex items-center gap-1 shrink-0">
                          {tr('Pemberian Alokasi')}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Pocket Allocation Breakdown for Focused Account */}
          <div className="lg:col-span-5 w-full">
            {selectedAccount ? (
              <div className="glass-card rounded-xl p-5 border border-overlay/10 relative overflow-hidden flex flex-col gap-4 animate-fade-in">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

                {selectedAccount.type === 'paylater' ? (
                  // Task (revisi, poin 10): panel "Bayar Tagihan" — daftar
                  // transaksi 'unpaid' di wallet paylater ini, centang mana
                  // yang mau dilunasi, pilih wallet pembayar, total di atas.
                  (() => {
                    const unpaidTx = transactions.filter(t => t.accountId === selectedAccount.id && t.paylaterStatus === 'unpaid');
                    const payableAccounts = accounts.filter(a => a.type !== 'paylater');
                    const selectedTotal = unpaidTx
                      .filter(t => selectedPayTxIds.has(t.id))
                      .reduce((sum, t) => sum + t.amount, 0);
                    const toggleTx = (id: string) => setSelectedPayTxIds(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                    const handlePaySubmit = () => {
                      if (selectedPayTxIds.size === 0 || !payFromAccountId) return;
                      const success = onPayPaylaterTransactions(selectedAccount.id, Array.from(selectedPayTxIds), payFromAccountId);
                      if (success) setSelectedPayTxIds(new Set());
                    };
                    return (
                      <>
                        <div className="border-b border-overlay/5 pb-3">
                          <span className="text-[10px] font-label-caps text-on-surface-variant uppercase">{tr('Bayar Tagihan')}</span>
                          <h3 className="font-headline-sm text-lg text-on-surface font-bold flex items-center gap-2 mt-0.5">
                            {getAccountIcon(selectedAccount.icon, getBorderColorHex(selectedAccount.color), selectedAccount.logoUrl)}
                            {selectedAccount.name}
                          </h3>
                          <p className="text-[11px] text-on-surface-variant/70 mt-1">
                            {tr('Tagihan berjalan')} {formatRupiah(selectedAccount.balance)} {tr('dari limit')} {formatRupiah(selectedAccount.limit || 0)}.
                          </p>
                        </div>

                        {unpaidTx.length === 0 ? (
                          <div className="text-center py-8 text-on-surface-variant/40 flex flex-col items-center gap-1">
                            <Info className="w-8 h-8 text-on-surface-variant/20 mb-1" />
                            <p className="text-xs">{tr('Tidak ada tagihan yang belum dibayar.')}</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1 no-scrollbar">
                              {unpaidTx.map(ptx => (
                                <label key={ptx.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-overlay/5 border border-overlay/5 cursor-pointer text-xs">
                                  <input type="checkbox" checked={selectedPayTxIds.has(ptx.id)} onChange={() => toggleTx(ptx.id)} className="accent-primary w-4 h-4 shrink-0" />
                                  <span className="flex-1 min-w-0 truncate text-on-surface">{ptx.title}</span>
                                  <span className="font-mono-data font-bold text-on-surface shrink-0">{formatRupiah(ptx.amount)}</span>
                                </label>
                              ))}
                            </div>

                            <div className="p-3 bg-surface-variant/30 border border-overlay/5 rounded-xl text-xs flex flex-col gap-2">
                              <div className="flex justify-between font-mono-data font-bold text-on-surface">
                                <span>{tr('Total Terpilih:')}</span>
                                <span>{formatRupiah(selectedTotal)}</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-label-caps text-on-surface-variant uppercase">{tr('Bayar Dengan Wallet')}</label>
                                <select
                                  value={payFromAccountId}
                                  onChange={(e) => setPayFromAccountId(e.target.value)}
                                  className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-2 text-xs text-on-surface"
                                >
                                  {payableAccounts.length === 0 && <option value="">{tr('Belum ada wallet biasa')}</option>}
                                  {payableAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatRupiah(a.balance)})</option>)}
                                </select>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handlePaySubmit}
                              disabled={selectedPayTxIds.size === 0 || !payFromAccountId}
                              className="w-full h-11 bg-primary text-on-primary rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all active:scale-[0.98]"
                            >
                              <Save className="w-4 h-4" /> {tr('Bayar')} {selectedPayTxIds.size > 0 ? formatRupiah(selectedTotal) : ''}
                            </button>
                          </>
                        )}
                      </>
                    );
                  })()
                ) : isEditingAllocation ? (
                  <form onSubmit={handleAllocationSubmit} className="flex flex-col gap-4 text-left">
                    <div className="border-b border-overlay/5 pb-2">
                      <span className="text-[10px] font-label-caps text-on-surface-variant uppercase">{tr('Atur Alokasi Saldo')}</span>
                      <h3 className="font-headline-sm text-lg text-on-surface font-bold flex items-center gap-2 mt-0.5">
                        {getAccountIcon(selectedAccount.icon, getBorderColorHex(selectedAccount.color), selectedAccount.logoUrl)}
                        {selectedAccount.name}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant/70 mt-1">
                        {tr('Tentukan alokasi saldo')} {formatRupiah(selectedAccount.balance)} {tr('ke kantong-kantong.')}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1 no-scrollbar">
                      {pockets.map(p => {
                        const val = allocationInputs[p.id] || 0;
                        const expr = allocationExprs[p.id] || '';
                        const isPribadi = p.id === 'pribadi';
                        return (
                          <div key={p.id} className="flex flex-col gap-1.5">
                            <label className="text-[11px] text-on-surface/80 font-medium">
                              {p.name} {isPribadi && <span className="text-[10px] text-on-surface-variant">({tr('Terhitung Otomatis')})</span>}
                            </label>
                            <div className="relative flex items-center">
                              <span className="absolute left-3 font-mono-data text-primary text-xs font-bold">Rp</span>
                              <input 
                                type="text"
                                inputMode="none"
                                disabled={isPribadi}
                                placeholder="0"
                                value={isPribadi ? (val ? formatRupiah(val, false) : '') : (formatEquation(expr) || '')}
                                onFocus={() => {
                                  if (!isPribadi) {
                                    setActiveAllocPocketId(p.id);
                                    setShowAllocCalc(true);
                                  }
                                }}
                                onChange={(e) => {
                                  if (!isPribadi) {
                                    const clean = e.target.value.replace(/[^0-9+\-*/]/g, '');
                                    setAllocationExprs(prev => ({ ...prev, [p.id]: clean }));
                                    handleAllocationInputChange(p.id, evaluateEquation(clean));
                                  }
                                }}
                                className={`h-10 w-full bg-body-bg/40 border border-overlay/10 rounded-lg pl-9 pr-3 text-xs text-on-surface focus:outline-none focus:border-primary/60 font-mono-data ${isPribadi ? 'opacity-60 cursor-not-allowed bg-slate-800/20' : ''}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {showAllocCalc && activeAllocPocketId && (
                      <div className="mt-2 border-t border-overlay/5 pt-3 animate-fade-in">
                        <CalcKeyboard
                          onKeyPress={handleAllocCalcKeyPress}
                          onClear={handleAllocCalcClear}
                          onDelete={handleAllocCalcDelete}
                          onEvaluate={handleAllocCalcEvaluate}
                          onOk={() => setShowAllocCalc(false)}
                        />
                      </div>
                    )}

                    {/* Totals check */}
                    <div className="p-3 bg-surface-variant/30 border border-overlay/5 rounded-xl text-xs flex flex-col gap-1.5 font-mono-data">
                      <div className="flex justify-between text-on-surface-variant">
                        <span>{tr('Total Saldo Wallet:')}</span>
                        <span>{formatRupiah(selectedAccount.balance)}</span>
                      </div>
                      <div className="flex justify-between text-on-surface font-bold">
                        <span>{tr('Total Dialokasikan:')}</span>
                        <span>{formatRupiah(totalAllocatedInput)}</span>
                      </div>
                      <div className={`flex justify-between ${totalAllocatedInput === selectedAccount.balance ? 'text-primary font-bold' : 'text-rose-400 font-bold'}`}>
                        <span>{tr('Sisa Saldo:')}</span>
                        <span>{formatRupiah(selectedAccount.balance - totalAllocatedInput)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-overlay/5">
                      <button
                        type="submit"
                        disabled={totalAllocatedInput !== selectedAccount.balance}
                        className="flex-1 h-10 bg-primary text-on-primary rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:opacity-95 disabled:opacity-50 transition-all shadow-[0_4px_12px_rgba(78,222,163,0.15)] active:scale-[0.98]"
                      >
                        <Save className="w-4 h-4" />
                        {tr('Simpan Alokasi')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingAllocation(false)}
                        className="px-3 h-10 bg-overlay/5 border border-overlay/10 text-on-surface-variant hover:text-on-surface rounded-xl text-xs font-semibold hover:bg-overlay/10 transition-all"
                      >
                        {tr('Batal')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="border-b border-overlay/5 pb-3">
                      <span className="text-[10px] font-label-caps text-on-surface-variant uppercase">{tr('Rincian Alokasi Uang')}</span>
                      <h3 className="font-headline-sm text-lg text-on-surface font-bold flex items-center gap-2 mt-0.5">
                        {getAccountIcon(selectedAccount.icon, getBorderColorHex(selectedAccount.color), selectedAccount.logoUrl)}
                        {selectedAccount.name}
                      </h3>
                    </div>

                    <div className="flex flex-col gap-4">
                      {activeAllocations.length === 0 ? (
                        <div className="text-center py-8 text-on-surface-variant/40 flex flex-col items-center gap-1">
                          <Sliders className="w-8 h-8 text-on-surface-variant/20 mb-1" />
                          <p className="text-xs">{tr('Uang di wallet ini belum teralokasi ke kantong mana pun.')}</p>
                          <p className="text-[10px] leading-relaxed mt-1 text-on-surface-variant/30">{tr('Klik tombol di bawah untuk menetapkan alokasi awal.')}</p>
                        </div>
                      ) : (
                        <>
                          {/* Allocation percentages progress bar */}
                          <div className="flex h-3 w-full rounded-full overflow-hidden bg-overlay/5 border border-overlay/5">
                            {activeAllocations.map(alloc => (
                              <div 
                                key={alloc.pocketId}
                                style={{ 
                                  width: `${alloc.percentage}%`,
                                  backgroundColor: getPocketColorHex(alloc.color)
                                }}
                                title={`${alloc.name}: ${alloc.percentage}%`}
                              />
                            ))}
                          </div>

                          {/* Allocations breakdown list */}
                          <div className="flex flex-col gap-3">
                            {activeAllocations.map(alloc => {
                              const pColor = getPocketColorHex(alloc.color);
                              return (
                                <div key={alloc.pocketId} className="flex items-center justify-between text-sm py-1.5 border-b border-overlay/5 last:border-b-0">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pColor }} />
                                    <span className="text-on-surface font-medium">{alloc.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-mono-data text-xs font-bold text-on-surface">{formatRupiah(alloc.balance)}</p>
                                    <p className="text-[10px] text-on-surface-variant font-mono-data mt-0.5">{alloc.percentage}% {tr('dari saldo wallet')}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* Adjust Allocations Action Button */}
                      {selectedAccount.balance > 0 ? (
                        <button
                          type="button"
                          onClick={handleStartEditAllocation}
                          className="w-full h-11 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 mt-2 active:scale-[0.98]"
                        >
                          <Sliders className="w-4 h-4" />
                          {tr('Sesuaikan Alokasi Dana')}
                        </button>
                      ) : (
                        <div className="p-3 bg-overlay/5 border border-overlay/5 rounded-xl text-xs text-on-surface-variant/60 flex items-center gap-2 mt-2">
                          <Info className="w-4 h-4 shrink-0 text-primary" />
                          <span>{tr('Saldo wallet Rp 0. Catat pemasukan baru di wallet ini terlebih dahulu untuk mengalokasikan dana.')}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="glass-card rounded-xl p-6 text-center border border-overlay/5 text-on-surface-variant/40 flex flex-col items-center gap-2 py-12">
                <Sliders className="w-9 h-9 text-on-surface-variant/25" />
                <h3 className="text-sm font-semibold text-on-surface/80">{tr('Pilih Wallet')}</h3>
                <p className="text-xs leading-relaxed max-w-[200px] mx-auto text-on-surface-variant/50">
                  {tr('Klik salah satu kartu wallet di samping untuk melihat rincian alokasi kantong di dalamnya.')}
                </p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ADD / EDIT FORM OVERLAY */
        <div className="glass-card rounded-xl p-5 border border-overlay/10 max-w-md mx-auto w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
            
            {/* Account Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">{tr('Nama Wallet / Dompet')}</label>
              <input
                type="text"
                required
                maxLength={24}
                placeholder={tr('Contoh: Bank BCA, E-Wallet ShopeePay')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-body-md"
              />
            </div>

            {/* Task (revisi, poin 10): toggle tipe wallet — cuma muncul saat
                menambah baru, terkunci setelah dibuat (lihat komentar
                accountType di atas). */}
            {formMode === 'add' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">{tr('Jenis Wallet')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setAccountType('normal')} className={`h-11 rounded-lg border text-xs font-semibold transition-all ${accountType === 'normal' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-variant/20 border-overlay/5 text-on-surface-variant hover:bg-overlay/5'}`}>
                    {tr('Wallet Biasa')}
                  </button>
                  <button type="button" onClick={() => setAccountType('paylater')} className={`h-11 rounded-lg border text-xs font-semibold transition-all ${accountType === 'paylater' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-variant/20 border-overlay/5 text-on-surface-variant hover:bg-overlay/5'}`}>
                    {tr('Paylater / Kartu Kredit')}
                  </button>
                </div>
                {accountType === 'paylater' && (
                  <p className="text-[10px] text-on-surface-variant/60 leading-relaxed mt-0.5">
                    {tr('Transaksi lewat wallet ini tercatat "belum dibayar" dan tidak mengurangi Total Saldo — baru terhitung setelah dilunasi lewat "Bayar Tagihan".')}
                  </p>
                )}
              </div>
            )}

            {/* Account Number — tidak relevan untuk Paylater */}
            {accountType !== 'paylater' && (
            <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">{tr('No Rekening')}</label>
              <input
                type="text"
                maxLength={32}
                placeholder={tr('Contoh: 1234567890')}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-body-md"
              />
            </div>

            {/* Account Owner Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">{tr('Nama Pemilik Rekening')}</label>
              <input
                type="text"
                maxLength={40}
                placeholder={tr('Contoh: Kurnia Ramadhan')}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-body-md"
              />
            </div>
            </>
            )}

            {/* Wallet Balance / Limit Input (visible in both Add and Edit modes) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">
                {accountType === 'paylater' ? tr('Limit Kredit (Rp)') : formMode === 'add' ? tr('Saldo Awal Wallet (Rp)') : tr('Saldo Wallet (Rp)')}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-mono-data text-primary text-xs font-bold">Rp</span>
                <input
                  type="text"
                  inputMode="none"
                  placeholder="0"
                  value={formatEquation(initialBalanceExpr) || ''}
                  onFocus={() => setShowInitialCalc(true)}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9+\-*/]/g, '');
                    setInitialBalanceExpr(clean);
                  }}
                  className="h-11 w-full bg-surface-variant/40 border border-overlay/10 rounded-lg pl-9 pr-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-mono-data"
                />
              </div>
            </div>

            {showInitialCalc && (
              <div className="mt-2 border-t border-overlay/5 pt-3 animate-fade-in">
                <CalcKeyboard
                  onKeyPress={handleInitialKeyPress}
                  onClear={handleInitialClear}
                  onDelete={handleInitialDelete}
                  onEvaluate={handleInitialEvaluate}
                  onOk={() => setShowInitialCalc(false)}
                />
              </div>
            )}

            {/* Accent Color selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">{tr('Tema Warna Aksen')}</label>
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

            {/* Revisi (App poin 2): logo custom upload sendiri — kalau
                diisi, MENGGANTIKAN ikon preset di bawah (lihat
                getAccountIcon). Ditaruh sebelum Icon Selection supaya
                jelas keduanya opsi yang saling menggantikan, bukan
                dipakai bersamaan. */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">{tr('Logo Custom (Opsional)')}</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-dashed border-overlay/20 flex items-center justify-center overflow-hidden bg-surface-variant/20 shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff className="w-5 h-5 text-on-surface-variant/40" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="h-8 px-3 rounded-lg bg-overlay/5 border border-overlay/10 text-on-surface-variant hover:text-on-surface text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> {tr('Unggah Logo')}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl(undefined)}
                      className="text-[10px] text-rose-400 hover:underline text-left"
                    >
                      {tr('Hapus logo, pakai ikon preset')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Icon Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">{tr('Pilih Ikon Wallet')}</label>
              <div className="grid grid-cols-4 gap-2">
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
                      className={`h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all border ${isSelected ? '' : 'bg-surface-variant/10 border-overlay/5 text-on-surface-variant hover:bg-overlay/5'}`}
                      style={isSelected ? activeStyle : {}}
                    >
                      <IconComp className="w-4 h-4 shrink-0" />
                      {tr(i.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Action buttons */}
            <div className="flex gap-2.5 mt-3 pt-3 border-t border-overlay/5">
              <button
                type="submit"
                className="flex-1 h-11 bg-primary text-on-primary rounded-xl font-headline-sm text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-95 transition-all shadow-[0_4px_15px_rgba(78,222,163,0.15)] active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                {tr('Simpan Wallet')}
              </button>
              <button
                type="button"
                onClick={() => setFormMode('list')}
                className="px-4 h-11 bg-overlay/5 border border-overlay/10 text-on-surface-variant hover:text-on-surface rounded-xl text-xs font-semibold transition-all flex items-center gap-1 hover:bg-overlay/10 active:scale-[0.98]"
              >
                <Undo2 className="w-4 h-4" />
                {tr('Batal')}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
