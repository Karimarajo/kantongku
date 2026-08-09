import React, { useState, useEffect } from 'react';
import { Pocket, Transaction, Budget, Notification, UserProfile, PocketType, Account, Category, Reminder } from './types';
import {
  INITIAL_POCKETS,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACCOUNTS,
  CATEGORIES
} from './mockData';
import { getDefaultProfile } from './utils';

// Import Views
import Login from './components/Login';
import HomeDashboard from './components/HomeDashboard';
import AccountView from './components/AccountView';
import BudgetModal from './components/BudgetModal';
import ActivityView from './components/ActivityView';
import ProfileView from './components/ProfileView';
import { AppSettings } from './components/ProfileView';
import AddTransactionModal from './components/AddTransactionModal';
import BrandLogo from './components/BrandLogo';
import PocketManagerModal from './components/PocketManagerModal';
import CategoryManagerModal from './components/CategoryManagerModal';
import TransactionHistoryView from './components/TransactionHistoryView';
import TransactionHistoryPage from './components/TransactionHistoryPage';
import ReminderModal from './components/ReminderModal';

// Icons for navigation
import { Home, Wallet, PlusCircle, LineChart, User, Receipt } from 'lucide-react';


const getBudgetCategories = (b: Budget): string[] => {
  if (b.categories && Array.isArray(b.categories)) return b.categories;
  if (Array.isArray(b.category)) return b.category;
  return b.category ? [b.category as string] : [];
};

const calculateBudgetSpent = (b: Budget, transactionsList: Transaction[]): number => {
  if (!b.startDate || !b.endDate) return 0;
  
  const sDate = new Date(b.startDate);
  sDate.setHours(0, 0, 0, 0);
  
  const eDate = new Date(b.endDate);
  eDate.setHours(23, 59, 59, 999);

  const categoriesList = getBudgetCategories(b);

  const filteredTrans = transactionsList.filter(t => {
    if (!categoriesList.includes(t.category)) return false;
    const tDate = new Date(t.date);
    return tDate >= sDate && tDate <= eDate;
  });

  return filteredTrans.reduce((sum, t) => sum + t.amount, 0);
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [pockets, setPockets] = useState<Pocket[]>(INITIAL_POCKETS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isPocketManagerOpen, setIsPocketManagerOpen] = useState<boolean>(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);
  const [historyInitialFilter, setHistoryInitialFilter] = useState<{ category?: string } | undefined>(undefined);

  const DEFAULT_SETTINGS: AppSettings = { currency: 'IDR', theme: 'dark', alarmRem: true };
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Clear in-memory state back to the mockup defaults (used on logout / forced
  // session invalidation so no data from the previous account lingers on screen).
  const resetToDefaults = () => {
    setCurrentUser(null);
    setPockets(INITIAL_POCKETS);
    setTransactions(INITIAL_TRANSACTIONS);
    setAccounts(INITIAL_ACCOUNTS);
    setCategories(CATEGORIES);
    setBudgets(INITIAL_BUDGETS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setReminders([]);
    setAppSettings(DEFAULT_SETTINGS);
  };

  // Load the authenticated session (server-verified, httpOnly cookie) and hydrate
  // all app state from the account's saved data in Postgres. Called on boot and
  // right after a successful Google login — this is what makes data follow the
  // account across devices instead of being pinned to one browser's localStorage.
  const loadSessionAndData = async () => {
    try {
      const meRes = await fetch('/api/me', { credentials: 'include' });
      if (!meRes.ok) {
        setCurrentUser(null);
        return;
      }
      const me = await meRes.json();
      const fallback = getDefaultProfile(me.email);
      let profile: UserProfile = {
        email: me.email,
        name: me.name || fallback.name,
        avatarUrl: me.avatarUrl || fallback.avatarUrl,
        joinedAt: me.joinedAt || fallback.joinedAt,
      };

      const dataRes = await fetch('/api/data', { credentials: 'include' });
      if (dataRes.ok) {
        const data = await dataRes.json();
        if (data.profile) {
          profile = { ...profile, ...data.profile, email: me.email };
        }

        const loadedPockets: Pocket[] = data.pockets ?? INITIAL_POCKETS;
        const loadedAccounts: Account[] = data.accounts ?? INITIAL_ACCOUNTS;
        const defaultPocketId = loadedPockets[0]?.id || 'pribadi';

        setPockets(loadedPockets);
        setTransactions(data.transactions ?? INITIAL_TRANSACTIONS);
        setAccounts(loadedAccounts.map((a: Account) => ({
          ...a,
          allocations: a.allocations || { [defaultPocketId]: a.balance }
        })));
        setCategories(data.categories ?? CATEGORIES);
        setBudgets(data.budgets ?? INITIAL_BUDGETS);
        setNotifications(data.notifications ?? INITIAL_NOTIFICATIONS);
        setReminders(data.reminders ?? []);
        setAppSettings(data.settings ?? DEFAULT_SETTINGS);
      }

      setCurrentUser(profile);
      setActiveTab('home');
    } catch (err) {
      console.error('Gagal memuat sesi/data akun:', err);
      setCurrentUser(null);
    } finally {
      setCheckingSession(false);
    }
  };

  // Persist a snapshot of app state to the account's row in Postgres. Any caller
  // can pass just the slices it changed — the rest falls back to current state.
  const persistUserData = async (overrides: Partial<{
    pockets: Pocket[];
    transactions: Transaction[];
    budgets: Budget[];
    notifications: Notification[];
    accounts: Account[];
    categories: Category[];
    reminders: Reminder[];
    profile: UserProfile | null;
    settings: AppSettings;
  }>) => {
    const payload = {
      pockets: overrides.pockets ?? pockets,
      transactions: overrides.transactions ?? transactions,
      budgets: overrides.budgets ?? budgets,
      notifications: overrides.notifications ?? notifications,
      accounts: overrides.accounts ?? accounts,
      categories: overrides.categories ?? categories,
      reminders: overrides.reminders ?? reminders,
      profile: overrides.profile ?? currentUser,
      settings: overrides.settings ?? appSettings,
    };

    try {
      const res = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        // Session was invalidated server-side (e.g. logged in from another device).
        resetToDefaults();
        return;
      }
      if (!res.ok) {
        console.error('Gagal menyimpan data ke server:', await res.text().catch(() => res.statusText));
      }
    } catch (err) {
      console.error('Gagal menyimpan data ke server:', err);
    }
  };

  // Load session + data once on boot.
  useEffect(() => {
    loadSessionAndData();
  }, []);

  // Periodically re-check session validity so a device gets logged out reasonably
  // promptly after another device logs into the same account (server enforces
  // 1 active session per account via current_session_id).
  useEffect(() => {
    if (!currentUser) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.status === 401) {
          resetToDefaults();
        }
      } catch {
        // Ignore transient network errors; next tick will retry.
      }
    }, 45000);

    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Expose global firebase simpanTransaksiKeFirebase function as requested by guidelines
  useEffect(() => {
    (window as any).simpanTransaksiKeFirebase = (jsonParsed: any) => {
      console.log("[Firebase Simulator] simpanTransaksiKeFirebase called:", jsonParsed);
      if (!jsonParsed) return;

      const nominal = Number(jsonParsed.nominal || 0);
      const catatan = jsonParsed.catatan || 'Transaksi Baru';
      const kategoriRaw = String(jsonParsed.kategori || '').toLowerCase();
      const tipeRaw = String(jsonParsed.tipe || 'pengeluaran').toLowerCase();
      
      // Ambil parameter baru hasil analisis cerdas server.ts
      const sumberDanaRaw = String(jsonParsed.sumber_dana || 'Cash').toLowerCase();
      const kepemilikanRaw = String(jsonParsed.kepemilikan || 'Uangku').toLowerCase();

      // 1. Tentukan KANTONG (Pocket) berdasarkan Kepemilikan dari AI
      let pocketId = pockets[0]?.id || 'pribadi';
      if (kepemilikanRaw.includes('bisnis')) {
        pocketId = pockets.find(p => p.id === 'bisnis' || p.name.toLowerCase().includes('bisnis'))?.id || pocketId;
      } else if (kepemilikanRaw.includes('orang') || kepemilikanRaw.includes('grup') || kepemilikanRaw.includes('kas')) {
        pocketId = pockets.find(p => p.id === 'kas' || p.name.toLowerCase().includes('kas'))?.id || pocketId;
      }

      // 2. Tentukan REKENING (Account) berdasarkan Sumber Dana dari AI
      let accountId = accounts[0]?.id || 'acc-bca';
      if (sumberDanaRaw.includes('cash') || sumberDanaRaw.includes('tunai')) {
        const cashAcc = accounts.find(a => a.icon === 'cash' || a.id.toLowerCase().includes('cash'));
        if (cashAcc) accountId = cashAcc.id;
      } else if (sumberDanaRaw.includes('dana')) {
        const danaAcc = accounts.find(a => a.id.toLowerCase().includes('dana') || a.name.toLowerCase().includes('dana'));
        if (danaAcc) accountId = danaAcc.id;
      } else if (sumberDanaRaw.includes('gopay')) {
        const gopayAcc = accounts.find(a => a.id.toLowerCase().includes('gopay') || a.name.toLowerCase().includes('gopay'));
        if (gopayAcc) accountId = gopayAcc.id;
      } else if (sumberDanaRaw.includes('bca')) {
        const bcaAcc = accounts.find(a => a.id.toLowerCase().includes('bca') || a.name.toLowerCase().includes('bca'));
        if (bcaAcc) accountId = bcaAcc.id;
      }

      // 3. Tentukan KATEGORI secara dinamis
      let category = categories[categories.length - 1]?.id || 'lainnya';
      const matchedCategory = categories.find(cat => 
        kategoriRaw.includes(cat.name.toLowerCase()) || 
        cat.name.toLowerCase().includes(kategoriRaw) ||
        kategoriRaw.includes(cat.id.toLowerCase())
      );
      if (matchedCategory) {
        category = matchedCategory.id;
      } else {
        if (kategoriRaw.includes('makan') || kategoriRaw.includes('culinary')) {
          category = categories.find(c => c.id === 'makan' || c.name.toLowerCase().includes('makan'))?.id || category;
        } else if (kategoriRaw.includes('belanja') || kategoriRaw.includes('grosir')) {
          category = categories.find(c => c.id === 'belanja' || c.name.toLowerCase().includes('belanja'))?.id || category;
        } else if (kategoriRaw.includes('kopi') || kategoriRaw.includes('minum') || kategoriRaw.includes('jajan')) {
          category = categories.find(c => c.id === 'kopi' || c.name.toLowerCase().includes('kopi') || c.name.toLowerCase().includes('jajan'))?.id || category;
        } else if (kategoriRaw.includes('gaji') || kategoriRaw.includes('pendapatan')) {
          category = categories.find(c => c.id === 'pendapatan' || c.name.toLowerCase().includes('pendapatan'))?.id || category;
        }
      }

      // 4. Tentukan Tipe Transaksi
      let type: 'incoming' | 'outgoing' = tipeRaw === 'pemasukan' ? 'incoming' : 'outgoing';

      handleAddTransaction({
        title: catatan,
        amount: nominal,
        pocketId,
        accountId,
        category,
        type,
        notes: `Dianalisis AI via Suara/Media: ${catatan}`
      });

      alert(`Sukses Menyimpan ke Perangkat!\nTransaksi: "${catatan}" senilai Rp ${nominal.toLocaleString('id-ID')} masuk ke Kantong ${pocketId.toUpperCase()} & Rekening ${accountId.toUpperCase()}.`);
    };

    // Bind React data deletion helpers globally so index.html Script can update state as well
    (window as any).handleDeleteTransaction = handleDeleteTransaction;
    (window as any).handleDeleteBudget = handleDeleteBudget;
    (window as any).hitungUlangTotalSaldo = () => {
      console.log("[React] hitungUlangTotalSaldo triggered.");
    };

    return () => {
      delete (window as any).simpanTransaksiKeFirebase;
      delete (window as any).handleDeleteTransaction;
      delete (window as any).handleDeleteBudget;
      delete (window as any).hitungUlangTotalSaldo;
    };
  }, [pockets, transactions, budgets, notifications, accounts]);

  // Expose kirimKeGeminiAI globally to meet requested specification with secure server-side proxy
  useEffect(() => {
    (window as any).kirimKeGeminiAI = async function (mediaData: string, tipeMedia: string) {
      console.log("[Gemini API Channel] kirimKeGeminiAI invoked for format:", tipeMedia);

      try {
        // Primary route: Secure full-stack server proxy so private API Keys aren't sent to the browser
        const response = await fetch('/api/parse-media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mediaData, tipeMedia }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Gagal menghubungi asisten AI');
        }

        const jsonParsed = await response.json();
        console.log("[Gemini API Channel] JSON parsed safely:", jsonParsed);
        
        // Save the parsed transaction and update budgets
        (window as any).simpanTransaksiKeFirebase(jsonParsed);
        return jsonParsed;
      } catch (err: any) {
        console.error("[Gemini API Channel] Error:", err.message);
        throw err;
      }
    };

    return () => {
      delete (window as any).kirimKeGeminiAI;
    };
  }, []);

  const updateStateAndStorage = (
    newTransactions: Transaction[],
    newPockets: Pocket[],
    newAccounts: Account[],
    newBudgets: Budget[] = budgets,
    newNotifications: Notification[] = notifications,
    newCategories: Category[] = categories
  ) => {
    setPockets(newPockets);
    setAccounts(newAccounts);
    setTransactions(newTransactions);
    setBudgets(newBudgets);
    setNotifications(newNotifications);
    setCategories(newCategories);
    saveStateToStorage(newPockets, newTransactions, newBudgets, newNotifications, newAccounts, newCategories);
  };

  // Sync state mutations to the account's row in Postgres (via persistUserData).
  const saveStateToStorage = (
    updatedPockets: Pocket[],
    updatedTransactions: Transaction[],
    updatedBudgets: Budget[],
    updatedNotifications: Notification[],
    updatedAccounts: Account[],
    updatedCategories: Category[] = categories
  ) => {
    persistUserData({
      pockets: updatedPockets,
      transactions: updatedTransactions,
      budgets: updatedBudgets,
      notifications: updatedNotifications,
      accounts: updatedAccounts,
      categories: updatedCategories,
    });
  };

  // Called by Login.tsx after the server has already verified Google login and set
  // the session cookie — just (re)hydrate everything from the account's saved data.
  const handleLogin = (_email: string) => {
    loadSessionAndData();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    resetToDefaults();
  };

  const handleResetData = () => {
    const defaultPocketId = INITIAL_POCKETS[0]?.id || 'pribadi';
    const initializedAccounts = INITIAL_ACCOUNTS.map((a: Account) => ({
      ...a,
      allocations: a.allocations || { [defaultPocketId]: a.balance }
    }));

    setPockets(INITIAL_POCKETS);
    setTransactions(INITIAL_TRANSACTIONS);
    setBudgets(INITIAL_BUDGETS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAccounts(initializedAccounts);
    setCategories(CATEGORIES);
    setReminders([]);
    persistUserData({
      pockets: INITIAL_POCKETS,
      transactions: INITIAL_TRANSACTIONS,
      budgets: INITIAL_BUDGETS,
      notifications: INITIAL_NOTIFICATIONS,
      accounts: initializedAccounts,
      categories: CATEGORIES,
      reminders: [],
    });
    alert('Asisten KantongKu berhasil dikembalikan ke data mockup awal.');
  };

  // Mark all notifications as read
  const handleMarkAllNotificationsRead = () => {
    const updatedNotifications = notifications.map((n) => ({ ...n, isRead: true }));
    updateStateAndStorage(transactions, pockets, accounts, budgets, updatedNotifications, categories);
  };

  // Add transaction logic with reactive wallet & budget computations
  const handleAddTransaction = (newTransData: Omit<Transaction, 'id' | 'date'> & { date?: string }) => {
    const newTransaction: Transaction = {
      ...newTransData,
      id: `t-${Date.now()}`,
      date: newTransData.date || new Date().toISOString()
    };

    const nextTransactions = [newTransaction, ...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Update pocket balance directly
    const delta = newTransaction.type === 'incoming' ? newTransaction.amount : -newTransaction.amount;
    const nextPockets = pockets.map(p => {
      if (p.id === newTransaction.pocketId) {
        return { ...p, balance: Math.max(0, p.balance + delta) };
      }
      return p;
    });

    // Update account balance and pocket allocation directly
    const nextAccounts = accounts.map(a => {
      if (a.id === newTransaction.accountId) {
        const currentAllocations = a.allocations || {};
        const pocketAlloc = currentAllocations[newTransaction.pocketId] || 0;
        return {
          ...a,
          balance: Math.max(0, a.balance + delta),
          allocations: {
            ...currentAllocations,
            [newTransaction.pocketId]: Math.max(0, pocketAlloc + delta)
          }
        };
      }
      return a;
    });

    // Increment budget spending if it matches categories
    const nextBudgets = budgets.map((b) => {
      const cats = getBudgetCategories(b);
      const isMatch = cats.includes(newTransaction.category);
      if (isMatch) {
        const nextSpent = calculateBudgetSpent(b, nextTransactions);
        const remaining = b.limit - nextSpent;
        const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
        return {
          ...b,
          spent: nextSpent,
          sisaPercent: nextPercent
        };
      }
      return b;
    });

    // Fire dynamic alarm notifications
    let nextNotifications = [...notifications];
    
    // Helper function for dynamic time formatting
    const dapatkanWaktuSekarangString = (): string => {
      const sekarang = new Date();
      const opsiTanggal: Intl.DateTimeFormatOptions = { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      };
      const tanggalFormat = sekarang.toLocaleDateString('id-ID', opsiTanggal);
      const jamFormat = sekarang.toLocaleTimeString('id-ID', { 
        hour: '2-digit', minute: '2-digit', hour12: false 
      }).replace(':', '.');

      return `${tanggalFormat} - Pukul ${jamFormat}`;
    };

    const waktuSekarang = dapatkanWaktuSekarangString();
    
    // Automatic success notification for transaction creation
    const typeLabel = newTransaction.type === 'incoming' ? 'Pemasukan' : 'Pengeluaran';
    const amountFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(newTransaction.amount);
    
    const successNotif: Notification = {
      id: `n-success-${Date.now()}`,
      title: 'Pencatatan Berhasil',
      message: `Pencatatan berhasil: ${typeLabel} '${newTransaction.title}' sebesar ${amountFormatted} telah disimpan.`,
      time: waktuSekarang,
      isRead: false,
      type: 'success'
    };
    nextNotifications = [successNotif, ...nextNotifications];

    // Check if target limits have been surpassed or reached warning zone
    const matchedBudgets = nextBudgets.filter(b => {
      return getBudgetCategories(b).includes(newTransaction.category);
    });

    matchedBudgets.forEach(targetBudgetObj => {
      // 1. HITUNG PERSENTASE SEBELUM TRANSAKSI BARU MASUK
      const oldSpent = calculateBudgetSpent(targetBudgetObj, transactions);
      const oldProgressPercent = Math.round((oldSpent / targetBudgetObj.limit) * 100);
      const oldSisaPercent = Math.max(0, Math.round(((targetBudgetObj.limit - oldSpent) / targetBudgetObj.limit) * 100));
      
      // 2. HITUNG PERSENTASE SETELAH TRANSAKSI BARU MASUK
      const progressPercent = Math.round((targetBudgetObj.spent / targetBudgetObj.limit) * 100);
      const newSisaPercent = targetBudgetObj.sisaPercent;

      // ==========================================
      // JALUR A: EXPENSE LIMIT (Sisa Anggaran Turun)
      // Aturan Pengingat Milestone: 50%, 30%, 15%, 0% sisa anggaran
      // ==========================================
      if (targetBudgetObj.type === 'expense_limit' && newTransaction.type === 'outgoing') {
        // Milestone 50%
        if (oldSisaPercent > 50 && newSisaPercent <= 50 && newSisaPercent > 30) {
          const warningNotif: Notification = {
            id: `n-warn-50-${Date.now()}-${targetBudgetObj.id}`,
            title: 'Peringatan Anggaran',
            message: `⚠️ Peringatan: Sisa anggaran "${targetBudgetObj.title}" kurang dari 50% (${newSisaPercent}% tersisa).`,
            time: waktuSekarang,
            isRead: false,
            type: 'warning'
          };
          nextNotifications = [warningNotif, ...nextNotifications];
        }
        
        // Milestone 30%
        if (oldSisaPercent > 30 && newSisaPercent <= 30 && newSisaPercent > 15) {
          const warningNotif: Notification = {
            id: `n-warn-30-${Date.now()}-${targetBudgetObj.id}`,
            title: 'Peringatan Anggaran',
            message: `⚠️ Peringatan: Sisa anggaran "${targetBudgetObj.title}" kurang dari 30% (${newSisaPercent}% tersisa).`,
            time: waktuSekarang,
            isRead: false,
            type: 'warning'
          };
          nextNotifications = [warningNotif, ...nextNotifications];
        }

        // Milestone 15%
        if (oldSisaPercent > 15 && newSisaPercent <= 15 && newSisaPercent > 0) {
          const criticalNotif: Notification = {
            id: `n-warn-15-${Date.now()}-${targetBudgetObj.id}`,
            title: 'Peringatan Kritis Anggaran',
            message: `⚠️ Peringatan Kritis: Sisa anggaran "${targetBudgetObj.title}" kurang dari 15% (${newSisaPercent}% tersisa). Batasi pengeluaran Anda!`,
            time: waktuSekarang,
            isRead: false,
            type: 'warning'
          };
          nextNotifications = [criticalNotif, ...nextNotifications];
        }

        // Milestone 0%
        if (oldSisaPercent > 0 && newSisaPercent === 0) {
          const criticalNotif: Notification = {
            id: `n-warn-0-${Date.now()}-${targetBudgetObj.id}`,
            title: 'Batas Anggaran Tercapai',
            message: `🚨 Peringatan Kritis: Anggaran "${targetBudgetObj.title}" telah habis terpakai (0% tersisa).`,
            time: waktuSekarang,
            isRead: false,
            type: 'warning'
          };
          nextNotifications = [criticalNotif, ...nextNotifications];
        }
      }

      // ==========================================
      // JALUR B: TARGET FUNDING (Tabungan Naik)
      // ==========================================
      else if (targetBudgetObj.type === 'target_funding') {
        const savingMilestones = [25, 50, 70, 85, 100];
        
        // Cari milestone yang baru saja dilompati ke atas oleh tabungan ini
        const triggeredMilestone = savingMilestones.find(m => oldProgressPercent < m && progressPercent >= m);

        if (triggeredMilestone !== undefined) {
          let msg = `Mantap! Tabungan "${targetBudgetObj.title}" Anda sudah mencapai progress ${progressPercent}%. Terus konsisten!`;

          if (progressPercent >= 100) {
            msg = `🎉 Selamat! Target Tabungan "${targetBudgetObj.title}" Anda telah tercapai 100%. Luar biasa!`;
          }

          const alertNotif: Notification = {
            id: `n-sav-${Date.now()}-${triggeredMilestone}-${targetBudgetObj.id}`,
            title: 'Target Celengan',
            message: msg,
            time: waktuSekarang,
            isRead: false,
            type: 'info'
          };

          nextNotifications = [alertNotif, ...nextNotifications];
        }
      }
    });

    updateStateAndStorage(nextTransactions, nextPockets, nextAccounts, nextBudgets, nextNotifications);
  };

  // Delete transaction operation
  const handleDeleteTransaction = (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    const nextTransactions = transactions.filter(t => t.id !== id);

    // Revert pocket balance
    const nextPockets = pockets.map(p => {
      if (p.id === target.pocketId) {
        const delta = target.type === 'incoming' ? -target.amount : target.amount;
        return { ...p, balance: Math.max(0, p.balance + delta) };
      }
      return p;
    });

    // Revert account balance and pocket allocation
    const nextAccounts = accounts.map(a => {
      if (a.id === target.accountId) {
        const delta = target.type === 'incoming' ? -target.amount : target.amount;
        const currentAllocations = a.allocations || {};
        const pocketAlloc = currentAllocations[target.pocketId] || 0;
        return {
          ...a,
          balance: Math.max(0, a.balance + delta),
          allocations: {
            ...currentAllocations,
            [target.pocketId]: Math.max(0, pocketAlloc + delta)
          }
        };
      }
      return a;
    });

    // Rollback budget spent counters
    const nextBudgets = budgets.map((b) => {
      const cats = getBudgetCategories(b);
      if (cats.includes(target.category)) {
        const nextSpent = calculateBudgetSpent(b, nextTransactions);
        const remaining = b.limit - nextSpent;
        const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
        return { ...b, spent: nextSpent, sisaPercent: nextPercent };
      }
      return b;
    });

    updateStateAndStorage(nextTransactions, nextPockets, nextAccounts, nextBudgets);
  };

  const handleEditTransactionSelect = (t: Transaction) => {
    setEditingTransaction(t);
    setIsAddModalOpen(true);
  };

  const handleEditTransaction = (editedTrans: Transaction) => {
    const originalTrans = transactions.find(t => t.id === editedTrans.id);
    if (!originalTrans) return;

    // 1. Revert original transaction balance changes
    let nextPockets = pockets.map(p => {
      if (p.id === originalTrans.pocketId) {
        const delta = originalTrans.type === 'incoming' ? -originalTrans.amount : originalTrans.amount;
        return { ...p, balance: Math.max(0, p.balance + delta) };
      }
      return p;
    });

    let nextAccounts = accounts.map(a => {
      if (a.id === originalTrans.accountId) {
        const delta = originalTrans.type === 'incoming' ? -originalTrans.amount : originalTrans.amount;
        const currentAllocations = a.allocations || {};
        const pocketAlloc = currentAllocations[originalTrans.pocketId] || 0;
        return {
          ...a,
          balance: Math.max(0, a.balance + delta),
          allocations: {
            ...currentAllocations,
            [originalTrans.pocketId]: Math.max(0, pocketAlloc + delta)
          }
        };
      }
      return a;
    });

    // 2. Apply edited transaction balance changes
    nextPockets = nextPockets.map(p => {
      if (p.id === editedTrans.pocketId) {
        const delta = editedTrans.type === 'incoming' ? editedTrans.amount : -editedTrans.amount;
        return { ...p, balance: Math.max(0, p.balance + delta) };
      }
      return p;
    });

    nextAccounts = nextAccounts.map(a => {
      if (a.id === editedTrans.accountId) {
        const delta = editedTrans.type === 'incoming' ? editedTrans.amount : -editedTrans.amount;
        const currentAllocations = a.allocations || {};
        const pocketAlloc = currentAllocations[editedTrans.pocketId] || 0;
        return {
          ...a,
          balance: Math.max(0, a.balance + delta),
          allocations: {
            ...currentAllocations,
            [editedTrans.pocketId]: Math.max(0, pocketAlloc + delta)
          }
        };
      }
      return a;
    });

    // Update the transaction in the list
    const nextTransactions = transactions.map(t => t.id === editedTrans.id ? editedTrans : t).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Recompute matching budgets' spent counters
    const nextBudgets = budgets.map((b) => {
      const cats = getBudgetCategories(b);
      if (cats.includes(originalTrans.category) || cats.includes(editedTrans.category)) {
        const nextSpent = calculateBudgetSpent(b, nextTransactions);
        const remaining = b.limit - nextSpent;
        const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
        return { ...b, spent: nextSpent, sisaPercent: nextPercent };
      }
      return b;
    });

    // Fire dynamic alarm notifications on edit
    let nextNotifications = [...notifications];
    const matchedBudgets = nextBudgets.filter(b => getBudgetCategories(b).includes(editedTrans.category));
    
    // Helper function for dynamic time formatting
    const dapatkanWaktuSekarangString = (): string => {
      const sekarang = new Date();
      const opsiTanggal: Intl.DateTimeFormatOptions = { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      };
      const tanggalFormat = sekarang.toLocaleDateString('id-ID', opsiTanggal);
      const jamFormat = sekarang.toLocaleTimeString('id-ID', { 
        hour: '2-digit', minute: '2-digit', hour12: false 
      }).replace(':', '.');

      return `${tanggalFormat} - Pukul ${jamFormat}`;
    };

    const waktuSekarang = dapatkanWaktuSekarangString();

    matchedBudgets.forEach(targetBudgetObj => {
      const oldSpent = calculateBudgetSpent(targetBudgetObj, transactions);
      const oldSisaPercent = Math.max(0, Math.round(((targetBudgetObj.limit - oldSpent) / targetBudgetObj.limit) * 100));
      
      const newSisaPercent = targetBudgetObj.sisaPercent;

      if (targetBudgetObj.type === 'expense_limit' && editedTrans.type === 'outgoing') {
        // Milestone 50%
        if (oldSisaPercent > 50 && newSisaPercent <= 50 && newSisaPercent > 30) {
          const warningNotif: Notification = {
            id: `n-warn-50-${Date.now()}-${targetBudgetObj.id}`,
            title: 'Peringatan Anggaran',
            message: `⚠️ Peringatan: Sisa anggaran "${targetBudgetObj.title}" kurang dari 50% (${newSisaPercent}% tersisa).`,
            time: waktuSekarang,
            isRead: false,
            type: 'warning'
          };
          nextNotifications = [warningNotif, ...nextNotifications];
        }
        
        // Milestone 30%
        if (oldSisaPercent > 30 && newSisaPercent <= 30 && newSisaPercent > 15) {
          const warningNotif: Notification = {
            id: `n-warn-30-${Date.now()}-${targetBudgetObj.id}`,
            title: 'Peringatan Anggaran',
            message: `⚠️ Peringatan: Sisa anggaran "${targetBudgetObj.title}" kurang dari 30% (${newSisaPercent}% tersisa).`,
            time: waktuSekarang,
            isRead: false,
            type: 'warning'
          };
          nextNotifications = [warningNotif, ...nextNotifications];
        }

        // Milestone 15%
        if (oldSisaPercent > 15 && newSisaPercent <= 15 && newSisaPercent > 0) {
          const criticalNotif: Notification = {
            id: `n-warn-15-${Date.now()}-${targetBudgetObj.id}`,
            title: 'Peringatan Kritis Anggaran',
            message: `⚠️ Peringatan Kritis: Sisa anggaran "${targetBudgetObj.title}" kurang dari 15% (${newSisaPercent}% tersisa). Batasi pengeluaran Anda!`,
            time: waktuSekarang,
            isRead: false,
            type: 'warning'
          };
          nextNotifications = [criticalNotif, ...nextNotifications];
        }

        // Milestone 0%
        if (oldSisaPercent > 0 && newSisaPercent === 0) {
          const criticalNotif: Notification = {
            id: `n-warn-0-${Date.now()}-${targetBudgetObj.id}`,
            title: 'Batas Anggaran Tercapai',
            message: `🚨 Peringatan Kritis: Anggaran "${targetBudgetObj.title}" telah habis terpakai (0% tersisa).`,
            time: waktuSekarang,
            isRead: false,
            type: 'warning'
          };
          nextNotifications = [criticalNotif, ...nextNotifications];
        }
      }
    });

    updateStateAndStorage(nextTransactions, nextPockets, nextAccounts, nextBudgets, nextNotifications);
    setEditingTransaction(null);
  };

  // Core add budget target logic
  const handleAddBudget = (newBudData: any) => {
    const remaining = (newBudData.limit || 0) - (newBudData.spent || 0);
    const initialPercent = Math.max(0, Math.round((remaining / (newBudData.limit || 1)) * 100));
    
    const newBudget: Budget = {
      ...newBudData,
      id: `b-${Date.now()}`,
      sisaPercent: initialPercent
    };

    const updatedBudgets = [newBudget, ...budgets];
    setBudgets(updatedBudgets);
    saveStateToStorage(pockets, transactions, updatedBudgets, notifications, accounts);
  };

  const handleDeleteBudget = (id: string) => {
    const updatedBudgets = budgets.filter(b => b.id !== id);
    setBudgets(updatedBudgets);
    saveStateToStorage(pockets, transactions, updatedBudgets, notifications, accounts);
  };

  // CRUD Handlers for Pockets
  // CRUD Handlers for Pockets
  const handleAddPocket = (newPocData: Omit<Pocket, 'balance'> & { initialBalance: number }) => {
    const newPocket: Pocket = {
      id: newPocData.id,
      name: newPocData.name,
      balance: 0,
      icon: newPocData.icon,
      tag: newPocData.tag,
      color: newPocData.color
    };

    const nextPockets = [...pockets, newPocket];

    // If initialBalance > 0, generate an incoming transaction to history
    let nextTransactions = transactions;
    if (newPocData.initialBalance > 0) {
      const primaryAccId = accounts[0]?.id || 'acc-bca';
      const initialTrans: Transaction = {
        id: `t-init-${Date.now()}`,
        title: `Saldo Awal ${newPocData.name}`,
        amount: newPocData.initialBalance,
        type: 'incoming',
        pocketId: newPocData.id,
        accountId: primaryAccId,
        category: 'pendapatan',
        date: new Date().toISOString()
      };
      nextTransactions = [initialTrans, ...transactions];
    }

    updateStateAndStorage(nextTransactions, nextPockets, accounts);
  };

  const handleEditPocket = (updatedPocket: Pocket) => {
    const nextPockets = pockets.map(p => p.id === updatedPocket.id ? updatedPocket : p);
    updateStateAndStorage(transactions, nextPockets, accounts);
  };

  const handleDeletePocket = (id: string) => {
    if (id === 'pribadi') {
      alert("Kantong Pribadi tidak dapat dihapus!");
      return;
    }
    // 1. Find all transactions associated with this pocket
    const targetTrans = transactions.filter(t => t.pocketId === id);
    const targetTransIds = new Set(targetTrans.map(t => t.id));

    // 2. Rollback budgets spent counter
    const nextBudgets = budgets.map((b) => {
      // Find deleted outgoing transactions matching this budget's category
      const budgetDeletedTrans = targetTrans.filter(t => t.category === b.category && t.type === 'outgoing');
      const totalAmount = budgetDeletedTrans.reduce((sum, t) => sum + t.amount, 0);
      const nextSpent = Math.max(0, b.spent - totalAmount);
      const remaining = b.limit - nextSpent;
      const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
      return {
        ...b,
        spent: nextSpent,
        sisaPercent: nextPercent
      };
    });

    // 3. Filter out transactions
    const nextTransactions = transactions.filter(t => !targetTransIds.has(t.id));

    // 4. Delete pocket
    const nextPockets = pockets.filter(p => p.id !== id);

    updateStateAndStorage(nextTransactions, nextPockets, accounts, nextBudgets);
  };

  const handleReorderPockets = (reorderedPockets: Pocket[]) => {
    updateStateAndStorage(transactions, reorderedPockets, accounts);
  };

  // Simulate instant secure pocket-to-pocket transfers
  const handlePocketTransferSimulate = (fromId: PocketType, toId: PocketType, amount: number) => {
    const sourcePocket = pockets.find(p => p.id === fromId);
    if (!sourcePocket || sourcePocket.balance < amount) {
      alert('Maaf, saldo di kantong pengirim tidak mencukupi untuk melakukan transfer ini.');
      return;
    }

    const fromLabel = pockets.find(p => p.id === fromId)?.name || 'Sumber';
    const toLabel = pockets.find(p => p.id === toId)?.name || 'Tujuan';

    // 1. Run greedy Smart Allocation Balancer
    let remainingToTransfer = amount;
    const nextAccounts = accounts.map(a => ({
      ...a,
      allocations: { ...(a.allocations || {}) }
    }));

    while (remainingToTransfer > 0) {
      let largestAccIndex = -1;
      let largestAllocVal = 0;

      for (let i = 0; i < nextAccounts.length; i++) {
        const alloc = nextAccounts[i].allocations[fromId] || 0;
        if (alloc > largestAllocVal) {
          largestAllocVal = alloc;
          largestAccIndex = i;
        }
      }

      if (largestAccIndex === -1 || largestAllocVal <= 0) {
        break;
      }

      const subtractAmount = Math.min(remainingToTransfer, largestAllocVal);
      const acc = nextAccounts[largestAccIndex];
      acc.allocations[fromId] = (acc.allocations[fromId] || 0) - subtractAmount;
      acc.allocations[toId] = (acc.allocations[toId] || 0) + subtractAmount;

      remainingToTransfer -= subtractAmount;
    }

    // 2. Recompute pocket balances
    const nextPockets = pockets.map(p => {
      const totalBalance = nextAccounts.reduce((sum, a) => {
        return sum + (a.allocations?.[p.id] || 0);
      }, 0);
      return { ...p, balance: totalBalance };
    });

    // 3. Create success notification
    const dapatkanWaktuSekarangString = (): string => {
      const sekarang = new Date();
      const opsiTanggal: Intl.DateTimeFormatOptions = { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      };
      const tanggalFormat = sekarang.toLocaleDateString('id-ID', opsiTanggal);
      const jamFormat = sekarang.toLocaleTimeString('id-ID', { 
        hour: '2-digit', minute: '2-digit', hour12: false 
      }).replace(':', '.');

      return `${tanggalFormat} - Pukul ${jamFormat}`;
    };

    const transferNotif: Notification = {
      id: `n-trans-${Date.now()}`,
      title: 'Pemindahan Buku Berhasil',
      message: `Pemindahan saldo dari Kantong "${fromLabel}" ke "${toLabel}" sejumlah ${amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })} berhasil disimpan.`,
      time: dapatkanWaktuSekarangString(),
      isRead: false,
      type: 'info'
    };

    const nextNotifications = [transferNotif, ...notifications];

    setPockets(nextPockets);
    setAccounts(nextAccounts);
    setNotifications(nextNotifications);
    saveStateToStorage(nextPockets, transactions, budgets, nextNotifications, nextAccounts, categories);
  };

  // CRUD Handlers for Accounts (Rekening)
  const handleAddAccount = (newAccData: Omit<Account, 'balance'> & { initialBalance: number }) => {
    const defaultPocketId = pockets[0]?.id || 'pribadi';
    const newAccount: Account = {
      id: newAccData.id,
      name: newAccData.name,
      balance: newAccData.initialBalance || 0,
      icon: newAccData.icon,
      color: newAccData.color,
      tag: newAccData.tag,
      allocations: {
        [defaultPocketId]: newAccData.initialBalance || 0
      }
    };

    const nextAccounts = [...accounts, newAccount];

    // Update default pocket balance directly
    const nextPockets = pockets.map(p => {
      if (p.id === defaultPocketId) {
        return { ...p, balance: p.balance + (newAccData.initialBalance || 0) };
      }
      return p;
    });

    setPockets(nextPockets);
    setAccounts(nextAccounts);
    saveStateToStorage(nextPockets, transactions, budgets, notifications, nextAccounts, categories);
  };

  const handleEditAccount = (updatedAccount: Account, balanceDifference?: number) => {
    const diff = balanceDifference || 0;
    const defaultPocketId = pockets[0]?.id || 'pribadi';
    
    const nextAccounts = accounts.map(a => {
      if (a.id === updatedAccount.id) {
        const currentAllocations = a.allocations || {};
        const oldDefaultAlloc = currentAllocations[defaultPocketId] || 0;
        
        return {
          ...updatedAccount,
          balance: a.balance + diff,
          allocations: {
            ...currentAllocations,
            [defaultPocketId]: Math.max(0, oldDefaultAlloc + diff)
          }
        };
      }
      return a;
    });

    const nextPockets = pockets.map(p => {
      if (p.id === defaultPocketId) {
        return { ...p, balance: Math.max(0, p.balance + diff) };
      }
      return p;
    });

    setPockets(nextPockets);
    setAccounts(nextAccounts);
    saveStateToStorage(nextPockets, transactions, budgets, notifications, nextAccounts, categories);
  };

  const handleDeleteAccount = (id: string) => {
    const accountToDelete = accounts.find(a => a.id === id);
    if (!accountToDelete) return;

    // Subtract this wallet's pocket allocations from each pocket's balance
    const nextPockets = pockets.map(p => {
      const allocatedAmount = accountToDelete.allocations?.[p.id] || 0;
      return { ...p, balance: Math.max(0, p.balance - allocatedAmount) };
    });

    // Remove wallet
    const nextAccounts = accounts.filter(a => a.id !== id);

    // Keep transaction history completely untouched!
    setPockets(nextPockets);
    setAccounts(nextAccounts);
    saveStateToStorage(nextPockets, transactions, budgets, notifications, nextAccounts, categories);
  };

  const handleSaveAllocations = (accountId: string, allocations: Record<string, number>) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const nextAccounts = accounts.map(a => {
      if (a.id === accountId) {
        return { ...a, allocations };
      }
      return a;
    });

    // Recompute pocket balances by summing up allocations across all accounts
    const nextPockets = pockets.map(p => {
      const totalBalance = nextAccounts.reduce((sum, a) => {
        return sum + (a.allocations?.[p.id] || 0);
      }, 0);
      return { ...p, balance: totalBalance };
    });

    setPockets(nextPockets);
    setAccounts(nextAccounts);
    saveStateToStorage(nextPockets, transactions, budgets, notifications, nextAccounts, categories);
  };

  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...newCat,
      id: `cat-${Date.now()}`
    };
    const nextCategories = [...categories, newCategory];
    updateStateAndStorage(transactions, pockets, accounts, budgets, notifications, nextCategories);
  };

  const handleEditCategory = (updatedCat: Category) => {
    const nextCategories = categories.map(c => c.id === updatedCat.id ? updatedCat : c);
    updateStateAndStorage(transactions, pockets, accounts, budgets, notifications, nextCategories);
  };

  const handleDeleteCategory = (id: string) => {
    const nextCategories = categories.filter(c => c.id !== id);
    
    // Cascade delete: remove all transactions and budgets associated with this category
    const nextTransactions = transactions.filter(t => t.category !== id);
    const nextBudgets = budgets.filter(b => b.category !== id);
    
    updateStateAndStorage(nextTransactions, pockets, accounts, nextBudgets, notifications, nextCategories);
  };

  const handleReorderCategories = (reordered: Category[]) => {
    setCategories(reordered);
    saveStateToStorage(pockets, transactions, budgets, notifications, accounts, reordered);
  };

  const handleEditBudget = (updated: Budget) => {
    const nextBudgets = budgets.map(b => b.id === updated.id ? updated : b);
    updateStateAndStorage(transactions, pockets, accounts, nextBudgets, notifications, categories);
  };

  const handleReorderBudgets = (reordered: Budget[]) => {
    setBudgets(reordered);
    saveStateToStorage(pockets, transactions, reordered, notifications, accounts, categories);
  };

  const handleOpenHistory = (filter?: { category?: string }) => {
    setHistoryInitialFilter(filter);
    setActiveTab('history');
  };

  const handleSaveProfile = async (name: string, avatarUrl: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, name, avatarUrl };
    setCurrentUser(updated);
    persistUserData({ profile: updated });
  };

  const handleChangePassword = async (_oldPass: string, _newPass: string) => {
    // No-op: accounts are Google OAuth-only, there is no app-managed password to change.
  };

  const handleSaveSettings = (settings: AppSettings) => {
    setAppSettings(settings);
    persistUserData({ settings });
    // Apply theme
    if (settings.theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  };

  // CRUD Handlers for Reminders (Pengingat)
  const handleAddReminder = (newReminder: Reminder) => {
    const nextReminders = [...reminders, newReminder];
    setReminders(nextReminders);
    persistUserData({ reminders: nextReminders });
  };

  const handleToggleReminder = (id: string) => {
    const nextReminders = reminders.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
    setReminders(nextReminders);
    persistUserData({ reminders: nextReminders });
  };

  const handleDeleteReminder = (id: string) => {
    const nextReminders = reminders.filter(r => r.id !== id);
    setReminders(nextReminders);
    persistUserData({ reminders: nextReminders });
  };

  // Background check effect for active alarm reminders
  useEffect(() => {
    if (!currentUser) return;

    const checkAlarms = () => {
      const now = new Date();
      const currentDateStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;
      const currentDayOfWeek = now.getDay();
      const currentDayOfMonth = now.getDate();

      let hasUpdates = false;
      let updatedReminders = [...reminders];
      let newNotifs: Notification[] = [];

      updatedReminders = updatedReminders.map(r => {
        if (!r.isActive) return r;
        if (r.time !== currentTimeStr) return r;
        if (r.lastTriggeredDate === currentDateStr) return r;

        // Match repetition pattern
        let matches = false;
        if (r.repeatType === 'once' || r.repeatType === 'every_day') {
          matches = true;
        } else if (r.repeatType === 'every_week') {
          matches = r.dayOfWeek === currentDayOfWeek;
        } else if (r.repeatType === 'every_month') {
          matches = r.dayOfMonth === currentDayOfMonth;
        }

        if (matches) {
          hasUpdates = true;

          const opsiTanggal: Intl.DateTimeFormatOptions = { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          };
          const tanggalFormat = now.toLocaleDateString('id-ID', opsiTanggal);
          const jamFormat = now.toLocaleTimeString('id-ID', { 
            hour: '2-digit', minute: '2-digit', hour12: false 
          }).replace(':', '.');
          const waktuSekarang = `${tanggalFormat} - Pukul ${jamFormat}`;

          newNotifs.push({
            id: `n-alarm-${Date.now()}-${r.id}`,
            title: 'Alarm Pengingat',
            message: `⏰ Pengingat: "${r.title}"! Waktu terjadwal: ${r.time}.`,
            time: waktuSekarang,
            isRead: false,
            type: 'success'
          });

          return {
            ...r,
            lastTriggeredDate: currentDateStr,
            isActive: r.repeatType === 'once' ? false : r.isActive
          };
        }
        return r;
      });

      if (hasUpdates) {
        const nextNotifs = [...newNotifs, ...notifications];
        setReminders(updatedReminders);
        setNotifications(nextNotifs);
        persistUserData({ reminders: updatedReminders, notifications: nextNotifs });
      }
    };

    // Check immediately on mount/state update
    checkAlarms();

    const intervalId = setInterval(checkAlarms, 20000);
    return () => clearInterval(intervalId);
  }, [currentUser, reminders, notifications]);

  // Guard routing view: wait for the initial session check before deciding
  // between the app and the login screen, so we don't flash Login for a split
  // second while GET /api/me is still in flight.
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B111E] text-on-surface-variant text-sm">
        Memuat...
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen text-white relative font-body-md antialiased overflow-x-hidden select-none bg-[#0B111E] flex flex-col md:flex-row">
      
      {/* Background Ambient Glow Layout */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-[-10%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-[-10%] w-[350px] h-[350px] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-[#0F172A]/40 backdrop-blur-2xl p-6 h-screen sticky top-0 shrink-0 z-40">
        {/* Brand / Logo */}
        <div className="mb-8 px-2 flex items-center gap-2">
          <BrandLogo className="w-8 h-8 text-primary shrink-0" glow={false} />
          <span className="font-headline-md text-2xl font-bold text-primary tracking-tight glow-text-primary">
            KantongKu
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 flex-grow">
          {/* TAB: Home */}
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'home' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Home</span>
          </button>

          {/* TAB: Wallet */}
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'wallet' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <Wallet className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Wallet</span>
          </button>

          {/* TAB: Analisis / Activity */}
          <button 
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'activity' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <LineChart className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Analisis</span>
          </button>

          {/* TAB: Riwayat / History */}
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'history' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <Receipt className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Riwayat</span>
          </button>

          {/* TAB: Profile Settings */}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'profile' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Profil</span>
          </button>
        </nav>

        {/* User profile section at the bottom of sidebar */}
        <div className="border-t border-white/5 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img 
              alt="User Avatar" 
              className="w-8 h-8 rounded-full border border-white/10 shrink-0 object-cover" 
              src={currentUser?.avatarUrl}
            />
            <span className="text-xs font-semibold text-white truncate max-w-[100px]">{currentUser?.name}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-[10px] uppercase font-label-caps tracking-wider text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main View Container */}
      <div className="flex-grow min-h-screen pb-28 md:pb-8 flex flex-col relative z-10 w-full min-w-0">
        <div className="max-w-md md:max-w-5xl w-full mx-auto pt-4 md:pt-10 px-4 md:px-8">
          {/* Mobile persistent header */}
          <div className="w-full flex justify-center items-center gap-2 pb-3 md:hidden border-b border-white/5 mb-3">
            <BrandLogo className="w-7 h-7 text-primary shrink-0" glow={false} />
            <span className="font-headline-md text-2xl font-bold text-primary tracking-tight glow-text-primary">
              KantongKu
            </span>
          </div>

          {activeTab === 'home' && (
            <HomeDashboard
              pockets={pockets}
              transactions={transactions}
              notifications={notifications}
              userProfile={currentUser}
              categories={categories}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onDeleteTransaction={handleDeleteTransaction}
              onPocketTransferSimulate={handlePocketTransferSimulate}
              onChangeTab={setActiveTab}
              onOpenPocketManager={() => setIsPocketManagerOpen(true)}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              onOpenReminderModal={() => setIsReminderModalOpen(true)}
              onEditTransactionSelect={handleEditTransactionSelect}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onOpenHistory={handleOpenHistory}
            />
          )}

          {activeTab === 'wallet' && (
            <AccountView 
              accounts={accounts}
              pockets={pockets}
              transactions={transactions}
              onAddAccount={handleAddAccount}
              onEditAccount={handleEditAccount}
              onDeleteAccount={handleDeleteAccount}
              onSaveAllocations={handleSaveAllocations}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityView 
              transactions={transactions}
              pockets={pockets}
              categories={categories}
              onOpenHistory={handleOpenHistory}
            />
          )}

          {activeTab === 'history' && (
            <TransactionHistoryPage
              transactions={transactions}
              pockets={pockets}
              accounts={accounts}
              categories={categories}
              initialFilter={historyInitialFilter}
              onEditTransactionSelect={handleEditTransactionSelect}
              onDeleteTransaction={handleDeleteTransaction}
              onBack={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView 
              userProfile={currentUser}
              appSettings={appSettings}
              onLogout={handleLogout}
              onResetData={handleResetData}
              onSaveProfile={handleSaveProfile}
              onSaveSettings={handleSaveSettings}
              onChangePassword={handleChangePassword}
            />
          )}
        </div>
      </div>

      {/* Global Add Floating modal panel bottom sheet */}
      <AddTransactionModal 
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
        }}
        onAddTransaction={handleAddTransaction}
        editingTransaction={editingTransaction}
        onEditTransaction={handleEditTransaction}
        pockets={pockets}
        accounts={accounts}
        categories={categories}
        onOpenCategoryManager={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
          setIsCategoryManagerOpen(true);
        }}
      />

      {/* Budget Modal */}
      <BudgetModal 
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        budgets={budgets}
        transactions={transactions}
        onAddBudget={handleAddBudget}
        onEditBudget={handleEditBudget}
        onDeleteBudget={handleDeleteBudget}
        onReorderBudgets={handleReorderBudgets}
        categories={categories}
      />

      {/* Pocket Manager Modal */}
      <PocketManagerModal
        isOpen={isPocketManagerOpen}
        onClose={() => setIsPocketManagerOpen(false)}
        pockets={pockets}
        transactions={transactions}
        onAddPocket={handleAddPocket}
        onEditPocket={handleEditPocket}
        onDeletePocket={handleDeletePocket}
        onReorderPockets={handleReorderPockets}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        transactions={transactions}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onReorderCategories={handleReorderCategories}
      />

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        reminders={reminders}
        onAddReminder={handleAddReminder}
        onToggleReminder={handleToggleReminder}
        onDeleteReminder={handleDeleteReminder}
      />


      {/* FIXED BOTTOM HUD NAVIGATION (Verbatim mockups layout) */}
      <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-2xl bg-surface/70 border-t border-white/5 backdrop-blur-2xl px-6 pt-2 pb-6 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center relative">
          
          {/* TAB: Home */}
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'home' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-white'}`}
          >
            <Home className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Home</span>
          </button>

          {/* TAB: Wallet */}
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'wallet' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-white'}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Wallet</span>
          </button>

          {/* TAB ACTION EMBED: Add Float trigger */}
          <div className="w-16 flex justify-center relative -top-7">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-13 h-13 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_4px_22px_rgba(78,222,163,0.4)] hover:scale-105 active:scale-90 transition-all font-bold group border border-primary/20"
              title="Catat Baru"
            >
              <PlusCircle className="w-8 h-8 text-on-primary stroke-[2.5]" />
            </button>
          </div>

          {/* TAB: Analytics / Activity */}
          <button 
            onClick={() => setActiveTab('activity')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'activity' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-white'}`}
          >
            <LineChart className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Analisis</span>
          </button>

          {/* TAB: Profile Settings */}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'profile' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-white'}`}
          >
            <User className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Profil</span>
          </button>

        </div>
      </nav>
    </div>
  );
}

