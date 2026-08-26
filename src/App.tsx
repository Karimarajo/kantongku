import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Pocket, Transaction, Budget, Notification, UserProfile, Account, Category, Reminder, WalletTransferLog, ActivityLogEntry, PocketShare, SharedPocketBundle, Debt, DebtPayment } from './types';
import {
  INITIAL_POCKETS,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACCOUNTS,
  CATEGORIES,
  INITIAL_WALLET_TRANSFER_LOGS,
  INITIAL_ACTIVITY_LOG
} from './mockData';
import { getDefaultProfile, formatRupiah } from './utils';
import { disablePushNotifications } from './lib/pushNotifications';

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
import ActivityLogView from './components/ActivityLogView';
import GuideView from './components/GuideView';
import { APP_VERSION } from './version';
import DebtManagerView from './components/DebtManagerView';
import MonthlyExpenseView from './components/MonthlyExpenseView';
import SharedPocketsView from './components/SharedPocketsView';

// Default category added retroactively for any account that predates the Top
// Up Wallet feature — kept in one place so App.tsx and mockData.ts stay in sync.
const TOPUP_CATEGORY: Category = { id: 'topup', name: 'Top Up Saldo', icon: 'piggy', color: 'teal' };

// Icons for navigation
import { Home, Wallet, PlusCircle, LineChart, User, Receipt, Users } from 'lucide-react';


const getBudgetCategories = (b: Budget): string[] => {
  if (b.categories && Array.isArray(b.categories)) return b.categories;
  if (Array.isArray(b.category)) return b.category;
  return b.category ? [b.category as string] : [];
};

// Theme (dark/light, v11) — applied via a `data-theme` attribute on <html>,
// which src/index.css's light-theme token overrides key off. Cached in
// localStorage purely so the RIGHT theme can be painted before the account's
// real settings arrive from the server (avoids a dark->light flash on
// reload) — the server's `settings.theme` (loaded in loadSessionAndData)
// is always the source of truth once it arrives.
const THEME_STORAGE_KEY = 'kantongku_theme';
function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable (private mode, etc.) — theme still applies
    // for this session, just won't be cached for next time.
  }
}

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
  const [walletTransferLogs, setWalletTransferLogs] = useState<WalletTransferLog[]>(INITIAL_WALLET_TRANSFER_LOGS);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(INITIAL_ACTIVITY_LOG);
  // Kelola Cicilan/Hutang (Task 3) — same JSONB-blob persistence pattern as
  // everything else above (see the comment on the Debt/DebtPayment types).
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);

  // Pocket Sharing (v11, replaces the old whole-account "Collaborator"
  // concept). Three independent lists:
  // - sharedPockets: pockets OTHER people shared WITH me, returned directly
  //   by GET /api/data (server-computed, read-only slice of their data).
  // - pendingInvitations: invites addressed to my email, awaiting my
  //   accept/decline.
  // - myShares: pockets I (as owner) have shared out to others, for
  //   management (see who has access, disconnect them).
  const [sharedPockets, setSharedPockets] = useState<SharedPocketBundle[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [myShares, setMyShares] = useState<PocketShare[]>([]);

  const [activeTab, setActiveTab] = useState<string>('home');

  // Badge "ada update baru" di menu Panduan Pengguna — device-local by
  // design (localStorage, bukan disinkron ke server): membandingkan
  // APP_VERSION saat ini terhadap versi terakhir yang pernah dibuka user DI
  // BROWSER INI. Sengaja tidak nge-poll server untuk cek versi baru — commit
  // yang menaikkan APP_VERSION sudah otomatis membuat setiap sesi baru
  // (setelah reload pasca-deploy) melihat versi yang berbeda dari yang
  // tersimpan, itulah "otomatis terdeteksi ada push baru" yang dimaksud.
  const GUIDE_VERSION_STORAGE_KEY = 'kantongku_last_seen_guide_version';
  const [hasUnseenGuideUpdate, setHasUnseenGuideUpdate] = useState<boolean>(false);

  // Paint the cached theme BEFORE the browser's first paint (useLayoutEffect,
  // not useEffect) so there's no dark->light flash while loadSessionAndData
  // is still fetching the account's real settings. Defaults to dark if
  // nothing's cached yet (first-ever visit, or localStorage unavailable) —
  // matches DEFAULT_SETTINGS.theme above.
  useLayoutEffect(() => {
    try {
      const cached = window.localStorage.getItem(THEME_STORAGE_KEY);
      document.documentElement.setAttribute('data-theme', cached === 'light' ? 'light' : 'dark');
    } catch {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  useEffect(() => {
    try {
      const lastSeen = window.localStorage.getItem(GUIDE_VERSION_STORAGE_KEY);
      setHasUnseenGuideUpdate(lastSeen !== APP_VERSION);
    } catch {
      // localStorage bisa saja diblokir (mode privat dsb) — badge cukup
      // default ke "tidak ada update", bukan hal yang layak mem-block UI.
    }
  }, []);
  const handleNavigateGuide = () => {
    setActiveTab('guide');
    try {
      window.localStorage.setItem(GUIDE_VERSION_STORAGE_KEY, APP_VERSION);
    } catch {
      // Sama seperti di atas — best-effort, gagal simpan bukan hal fatal.
    }
    setHasUnseenGuideUpdate(false);
  };

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
    setWalletTransferLogs(INITIAL_WALLET_TRANSFER_LOGS);
    setActivityLog(INITIAL_ACTIVITY_LOG);
    setAppSettings(DEFAULT_SETTINGS);
    setSharedPockets([]);
    setPendingInvitations([]);
    setMyShares([]);
    setDebts([]);
    setDebtPayments([]);
  };

  // Load the authenticated session (server-verified, httpOnly cookie) and hydrate
  // all app state from the account's saved data in Postgres. Called on boot and
  // right after a successful Google login — this is what makes data follow the
  // account across devices instead of being pinned to one browser's localStorage.
  const loadSessionAndData = async () => {
    try {
      // Task 8: these two used to run one-after-another (await /api/me, THEN
      // await /api/data) even though /api/data doesn't need anything from
      // /api/me's response — both only need the session cookie, which the
      // browser already sends on every request. Firing them together turns
      // two sequential round-trips into one round-trip's worth of wall time
      // on every app open. /api/data still requires a valid session
      // server-side (requireSession) — if /api/me comes back 401, we just
      // discard whatever /api/data returned instead of using it.
      const [meRes, dataRes] = await Promise.all([
        fetch('/api/me', { credentials: 'include' }),
        fetch('/api/data', { credentials: 'include' }),
      ]);
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
      if (dataRes.ok) {
        const data = await dataRes.json();
        setSharedPockets(data.sharedPockets ?? []);
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

        // Retrofit: accounts created before the Top Up Wallet feature won't
        // have the 'topup' category saved yet — add it once, transparently.
        const loadedCategories: Category[] = data.categories ?? CATEGORIES;
        const categoriesWithTopup = loadedCategories.some((c: Category) => c.id === 'topup')
          ? loadedCategories
          : [...loadedCategories, TOPUP_CATEGORY];

        setCategories(categoriesWithTopup);
        setBudgets(data.budgets ?? INITIAL_BUDGETS);
        setNotifications(data.notifications ?? INITIAL_NOTIFICATIONS);
        setReminders(data.reminders ?? []);
        setWalletTransferLogs(data.walletTransferLogs ?? INITIAL_WALLET_TRANSFER_LOGS);
        setActivityLog(data.activityLog ?? INITIAL_ACTIVITY_LOG);
        const loadedSettings: AppSettings = data.settings ?? DEFAULT_SETTINGS;
        setAppSettings(loadedSettings);
        applyTheme(loadedSettings.theme);
        setDebts(data.debts ?? []);
        setDebtPayments(data.debtPayments ?? []);
      }

      setCurrentUser(profile);
      setActiveTab('home');
      loadPocketShareState();
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
    walletTransferLogs: WalletTransferLog[];
    activityLog: ActivityLogEntry[];
    debts: Debt[];
    debtPayments: DebtPayment[];
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
      walletTransferLogs: overrides.walletTransferLogs ?? walletTransferLogs,
      activityLog: overrides.activityLog ?? activityLog,
      debts: overrides.debts ?? debts,
      debtPayments: overrides.debtPayments ?? debtPayments,
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

  // Expose kirimKeGeminiAI globally to meet requested specification with secure server-side proxy.
  // NOTE: this only PARSES the media and returns the result — it deliberately does
  // NOT auto-save the transaction. The caller (AddTransactionModal) pre-fills the
  // manual form with the result so the user reviews/confirms every detail before
  // it's actually saved; auto-saving here would both skip that confirmation and
  // double-save once the user also submits the pre-filled form.
  useEffect(() => {
    (window as any).kirimKeGeminiAI = async function (mediaData: string, tipeMedia: string) {
      console.log("[AI Channel] kirimKeGeminiAI invoked for format:", tipeMedia);

      try {
        // Primary route: Secure full-stack server proxy so private API Keys aren't sent to the browser.
        // Context (the user's actual pockets/accounts/categories + current time) lets the AI map the
        // transaction to precise IDs instead of guessing from a fixed keyword list.
        const response = await fetch('/api/parse-media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mediaData,
            tipeMedia,
            context: {
              categories: categories.map(c => ({ id: c.id, name: c.name })),
              pockets: pockets.map(p => ({ id: p.id, name: p.name })),
              accounts: accounts.map(a => ({ id: a.id, name: a.name })),
              now: new Date().toISOString(),
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Gagal menghubungi asisten AI');
        }

        const jsonParsed = await response.json();
        console.log("[AI Channel] JSON parsed safely:", jsonParsed);
        return jsonParsed;
      } catch (err: any) {
        console.error("[AI Channel] Error:", err.message);
        throw err;
      }
    };

    return () => {
      delete (window as any).kirimKeGeminiAI;
    };
  }, [categories, pockets, accounts]);

  const updateStateAndStorage = (
    newTransactions: Transaction[],
    newPockets: Pocket[],
    newAccounts: Account[],
    newBudgets: Budget[] = budgets,
    newNotifications: Notification[] = notifications,
    newCategories: Category[] = categories,
    newWalletTransferLogs: WalletTransferLog[] = walletTransferLogs,
    newActivityLog: ActivityLogEntry[] = activityLog
  ) => {
    setPockets(newPockets);
    setAccounts(newAccounts);
    setTransactions(newTransactions);
    setBudgets(newBudgets);
    setNotifications(newNotifications);
    setCategories(newCategories);
    setWalletTransferLogs(newWalletTransferLogs);
    setActivityLog(newActivityLog);
    saveStateToStorage(newPockets, newTransactions, newBudgets, newNotifications, newAccounts, newCategories, newWalletTransferLogs, newActivityLog);
  };

  // Sync state mutations to the account's row in Postgres (via persistUserData).
  const saveStateToStorage = (
    updatedPockets: Pocket[],
    updatedTransactions: Transaction[],
    updatedBudgets: Budget[],
    updatedNotifications: Notification[],
    updatedAccounts: Account[],
    updatedCategories: Category[] = categories,
    updatedWalletTransferLogs: WalletTransferLog[] = walletTransferLogs,
    updatedActivityLog: ActivityLogEntry[] = activityLog
  ) => {
    persistUserData({
      pockets: updatedPockets,
      transactions: updatedTransactions,
      budgets: updatedBudgets,
      notifications: updatedNotifications,
      accounts: updatedAccounts,
      categories: updatedCategories,
      walletTransferLogs: updatedWalletTransferLogs,
      activityLog: updatedActivityLog,
    });
  };

  // Centralized, purely-textual activity feed. Must NEVER affect balance/report
  // calculations, and a logging failure must never block the caller's main
  // action — hence the try/catch that silently falls back to the current log.
  //
  // Actor prefix (cicilan-ai-notifikasi Task 2): currentUser always reflects
  // the ACTUAL logged-in identity — /api/me returns the real session's own
  // email/name even when that session is a collaborator viewing an owner's
  // data (see loadSessionAndData/collaboratorOwnerEmail above), so no
  // separate "am I a collaborator" branch is needed here: prefixing with
  // currentUser's own name/email is already correct for both the owner and
  // a collaborator, with zero effect on any balance/data calculation.
  const logActivity = (message: string, category?: string, icon?: string): ActivityLogEntry[] => {
    try {
      const actor = currentUser?.name || currentUser?.email;
      const entry: ActivityLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: actor ? `[${actor}] ${message}` : message,
        timestamp: new Date().toISOString(),
        category,
        icon,
      };
      const nextLog = [entry, ...activityLog];
      setActivityLog(nextLog);
      return nextLog;
    } catch (err) {
      console.error('Gagal mencatat activity log (diabaikan, tidak memengaruhi aksi utama):', err);
      return activityLog;
    }
  };

  const handleClearActivityLog = () => {
    setActivityLog([]);
    persistUserData({ activityLog: [] });
  };

  // Called by Login.tsx after the server has already verified Google login and set
  // the session cookie — just (re)hydrate everything from the account's saved data.
  const handleLogin = (_email: string) => {
    loadSessionAndData();
  };

  const handleLogout = async () => {
    // Task 7: unsubscribe from push BEFORE clearing the session — it needs
    // the still-valid session cookie (POST /api/push/unsubscribe requires
    // requireSession, same as subscribe). Best-effort by design, like every
    // other step here: a failure must never block the actual logout.
    await disablePushNotifications();
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
    setWalletTransferLogs(INITIAL_WALLET_TRANSFER_LOGS);
    setActivityLog(INITIAL_ACTIVITY_LOG);
    setDebts([]);
    setDebtPayments([]);
    persistUserData({
      pockets: INITIAL_POCKETS,
      transactions: INITIAL_TRANSACTIONS,
      budgets: INITIAL_BUDGETS,
      notifications: INITIAL_NOTIFICATIONS,
      accounts: initializedAccounts,
      categories: CATEGORIES,
      reminders: [],
      walletTransferLogs: INITIAL_WALLET_TRANSFER_LOGS,
      activityLog: INITIAL_ACTIVITY_LOG,
      debts: [],
      debtPayments: [],
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
      date: newTransData.date || new Date().toISOString(),
      // "Siapa yang input" (Riwayat Transaksi export) — the owner's own
      // transactions are always attributed to themselves. Shared-pocket
      // transactions from an invitee are stamped server-side instead (see
      // POST /api/pocket-shares/:id/transactions in server.ts), never here.
      inputBy: newTransData.inputBy || currentUser?.email,
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

    const typeSign = newTransaction.type === 'incoming' ? '+' : '-';
    const nextLog = logActivity(
      `Menambahkan transaksi '${newTransaction.title}' ${typeSign}${formatRupiah(newTransaction.amount)}`,
      'transaction',
      'receipt'
    );

    updateStateAndStorage(nextTransactions, nextPockets, nextAccounts, nextBudgets, nextNotifications, undefined, undefined, nextLog);
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

    const typeSign = target.type === 'incoming' ? '+' : '-';
    const nextLog = logActivity(
      `Menghapus transaksi '${target.title}' ${typeSign}${formatRupiah(target.amount)}`,
      'transaction',
      'receipt'
    );

    updateStateAndStorage(nextTransactions, nextPockets, nextAccounts, nextBudgets, undefined, undefined, undefined, nextLog);
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

    const editLog = logActivity(`Mengedit transaksi '${editedTrans.title}'`, 'transaction', 'receipt');

    updateStateAndStorage(nextTransactions, nextPockets, nextAccounts, nextBudgets, nextNotifications, undefined, undefined, editLog);
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
        date: new Date().toISOString(),
        inputBy: currentUser?.email,
      };
      nextTransactions = [initialTrans, ...transactions];
    }

    const addPocketLog = logActivity(`Kantong '${newPocket.name}' ditambahkan`, 'pocket', 'wallet');
    updateStateAndStorage(nextTransactions, nextPockets, accounts, undefined, undefined, undefined, undefined, addPocketLog);
  };

  const handleEditPocket = (updatedPocket: Pocket) => {
    const nextPockets = pockets.map(p => p.id === updatedPocket.id ? updatedPocket : p);
    const editPocketLog = logActivity(`Kantong '${updatedPocket.name}' diperbarui`, 'pocket', 'wallet');
    updateStateAndStorage(transactions, nextPockets, accounts, undefined, undefined, undefined, undefined, editPocketLog);
  };

  const handleDeletePocket = (id: string) => {
    if (id === 'pribadi') {
      alert("Kantong Pribadi tidak dapat dihapus!");
      return;
    }
    const pocketToDelete = pockets.find(p => p.id === id);
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

    const deletePocketLog = logActivity(`Kantong '${pocketToDelete?.name || id}' dihapus`, 'pocket', 'wallet');
    updateStateAndStorage(nextTransactions, nextPockets, accounts, nextBudgets, undefined, undefined, undefined, deletePocketLog);
  };

  const handleReorderPockets = (reorderedPockets: Pocket[]) => {
    updateStateAndStorage(transactions, reorderedPockets, accounts);
  };

  // Move balance between two Accounts (wallets) — a purely internal movement of
  // money the user already has. Deliberately NOT recorded as a Transaction (that
  // would double-count as income/expense in reports); recorded instead as a
  // WalletTransferLog plus a textual activity-log entry.
  const handleTransferBetweenWallets = (fromAccountId: string, toAccountId: string, amount: number, note?: string) => {
    if (fromAccountId === toAccountId) {
      alert('Wallet sumber dan tujuan tidak boleh sama.');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Nominal transfer harus lebih dari 0.');
      return;
    }

    const sourceAccount = accounts.find(a => a.id === fromAccountId);
    const destAccount = accounts.find(a => a.id === toAccountId);
    if (!sourceAccount || !destAccount) return;

    if (sourceAccount.balance < amount) {
      alert('Saldo di wallet sumber tidak mencukupi untuk melakukan transfer ini.');
      return;
    }

    const defaultPocketId = pockets[0]?.id || 'pribadi';

    // Shift both balance and the default-pocket allocation bucket together
    // (mirrors handleEditAccount's balance-difference pattern) so every
    // pocket's aggregate total stays mathematically unchanged.
    const nextAccounts = accounts.map(a => {
      if (a.id === fromAccountId) {
        const currentAllocations = a.allocations || {};
        const oldAlloc = currentAllocations[defaultPocketId] || 0;
        return {
          ...a,
          balance: Math.max(0, a.balance - amount),
          allocations: { ...currentAllocations, [defaultPocketId]: Math.max(0, oldAlloc - amount) }
        };
      }
      if (a.id === toAccountId) {
        const currentAllocations = a.allocations || {};
        const oldAlloc = currentAllocations[defaultPocketId] || 0;
        return {
          ...a,
          balance: a.balance + amount,
          allocations: { ...currentAllocations, [defaultPocketId]: oldAlloc + amount }
        };
      }
      return a;
    });

    const nextPockets = pockets.map(p => {
      const totalBalance = nextAccounts.reduce((sum, a) => sum + (a.allocations?.[p.id] || 0), 0);
      return { ...p, balance: totalBalance };
    });

    const transferLog: WalletTransferLog = {
      id: `wt-${Date.now()}`,
      fromAccountId,
      toAccountId,
      amount,
      note: note?.trim() || undefined,
      date: new Date().toISOString(),
    };
    const nextWalletTransferLogs = [transferLog, ...walletTransferLogs];

    const nextLog = logActivity(
      `Transfer ${formatRupiah(amount)} dari ${sourceAccount.name} ke ${destAccount.name}`,
      'transfer',
      'send'
    );

    setPockets(nextPockets);
    setAccounts(nextAccounts);
    setWalletTransferLogs(nextWalletTransferLogs);
    saveStateToStorage(nextPockets, transactions, budgets, notifications, nextAccounts, categories, nextWalletTransferLogs, nextLog);
  };

  // Top up a wallet's balance from an outside source (e.g. cash deposit, salary).
  // UNLIKE a wallet transfer, this IS recorded as a normal incoming Transaction
  // (dedicated 'topup' category) so it counts correctly in income reports.
  const handleTopUpWallet = (accountId: string, amount: number, note?: string) => {
    if (!amount || amount <= 0) {
      alert('Nominal top up harus lebih dari 0.');
      return;
    }
    const targetAccount = accounts.find(a => a.id === accountId);
    if (!targetAccount) return;

    const defaultPocketId = pockets[0]?.id || 'pribadi';

    // Retrofit safety net: make sure the 'topup' category exists even if this
    // account somehow predates the load-time retrofit in loadSessionAndData.
    const nextCategories = categories.some(c => c.id === 'topup')
      ? categories
      : [...categories, TOPUP_CATEGORY];

    const topUpTransaction: Transaction = {
      id: `t-topup-${Date.now()}`,
      title: note?.trim() || `Top Up ${targetAccount.name}`,
      amount,
      type: 'incoming',
      pocketId: defaultPocketId,
      accountId,
      category: 'topup',
      date: new Date().toISOString(),
      notes: note?.trim() || undefined,
      inputBy: currentUser?.email,
    };
    const nextTransactions = [topUpTransaction, ...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const nextAccounts = accounts.map(a => {
      if (a.id === accountId) {
        const currentAllocations = a.allocations || {};
        const oldAlloc = currentAllocations[defaultPocketId] || 0;
        return {
          ...a,
          balance: a.balance + amount,
          allocations: { ...currentAllocations, [defaultPocketId]: oldAlloc + amount }
        };
      }
      return a;
    });

    const nextPockets = pockets.map(p => {
      if (p.id === defaultPocketId) {
        return { ...p, balance: p.balance + amount };
      }
      return p;
    });

    const nextLog = logActivity(
      `Top up ${formatRupiah(amount)} ke wallet ${targetAccount.name}`,
      'topup',
      'piggy'
    );

    updateStateAndStorage(nextTransactions, nextPockets, nextAccounts, budgets, notifications, nextCategories, walletTransferLogs, nextLog);
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
      accountNumber: newAccData.accountNumber,
      ownerName: newAccData.ownerName,
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

    const addAccountLog = logActivity(`Wallet '${newAccount.name}' ditambahkan`, 'wallet', 'wallet');
    setPockets(nextPockets);
    setAccounts(nextAccounts);
    saveStateToStorage(nextPockets, transactions, budgets, notifications, nextAccounts, categories, undefined, addAccountLog);
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

    const editAccountLog = logActivity(`Wallet '${updatedAccount.name}' diperbarui`, 'wallet', 'wallet');
    setPockets(nextPockets);
    setAccounts(nextAccounts);
    saveStateToStorage(nextPockets, transactions, budgets, notifications, nextAccounts, categories, undefined, editAccountLog);
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
    const deleteAccountLog = logActivity(`Wallet '${accountToDelete.name}' dihapus`, 'wallet', 'wallet');
    setPockets(nextPockets);
    setAccounts(nextAccounts);
    saveStateToStorage(nextPockets, transactions, budgets, notifications, nextAccounts, categories, undefined, deleteAccountLog);
  };

  // Reorder wallet cards (long-press drag & drop in AccountView) and persist the
  // new order the same way every other account mutation is saved.
  const handleReorderAccounts = (newOrderIds: string[]) => {
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const reordered = newOrderIds
      .map(id => accountMap.get(id))
      .filter((a): a is Account => !!a);
    // Safety net: keep any account missing from newOrderIds instead of dropping it.
    const missing = accounts.filter(a => !newOrderIds.includes(a.id));
    const nextAccounts = [...reordered, ...missing];

    setAccounts(nextAccounts);
    saveStateToStorage(pockets, transactions, budgets, notifications, nextAccounts, categories);
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
    const addCatLog = logActivity(`Kategori '${newCategory.name}' ditambahkan`, 'category', 'tag');
    updateStateAndStorage(transactions, pockets, accounts, budgets, notifications, nextCategories, undefined, addCatLog);
  };

  const handleEditCategory = (updatedCat: Category) => {
    const nextCategories = categories.map(c => c.id === updatedCat.id ? updatedCat : c);
    const editCatLog = logActivity(`Kategori '${updatedCat.name}' diperbarui`, 'category', 'tag');
    updateStateAndStorage(transactions, pockets, accounts, budgets, notifications, nextCategories, undefined, editCatLog);
  };

  const handleDeleteCategory = (id: string) => {
    const categoryToDelete = categories.find(c => c.id === id);
    const nextCategories = categories.filter(c => c.id !== id);

    // Cascade delete: remove all transactions and budgets associated with this category
    const nextTransactions = transactions.filter(t => t.category !== id);
    const nextBudgets = budgets.filter(b => b.category !== id);

    const deleteCatLog = logActivity(`Kategori '${categoryToDelete?.name || id}' dihapus`, 'category', 'tag');
    updateStateAndStorage(nextTransactions, pockets, accounts, nextBudgets, notifications, nextCategories, undefined, deleteCatLog);
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

  const handleSaveSettings = (settings: AppSettings) => {
    setAppSettings(settings);
    persistUserData({ settings });
    applyTheme(settings.theme);
  };

  // CRUD Handlers for Reminders (Pengingat)
  // CRUD Handlers for Pocket Sharing (v11) — replaces the old whole-account
  // Collaboration handlers. Free (no order/payment), per-pocket, and the
  // invitee must already be a registered+active KantongKu user (server-enforced).
  const loadPocketShareState = async () => {
    try {
      const [invRes, sharesRes] = await Promise.all([
        fetch('/api/pocket-shares/invitations', { credentials: 'include' }),
        fetch('/api/pocket-shares/owned', { credentials: 'include' }),
      ]);
      if (invRes.ok) setPendingInvitations(await invRes.json());
      if (sharesRes.ok) setMyShares(await sharesRes.json());
    } catch (err) {
      console.error('Gagal memuat status berbagi kantong:', err);
    }
  };

  const handleInvitePocketShare = async (
    pocketId: string,
    email: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await fetch('/api/pocket-shares/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pocketId, email }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Gagal membagikan kantong' };
      await loadPocketShareState();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Gagal membagikan kantong' };
    }
  };

  const handleAcceptPocketInvitation = async (id: string) => {
    try {
      const res = await fetch(`/api/pocket-shares/${id}/accept`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        await loadPocketShareState();
        // The newly-accepted pocket's data only shows up via GET /api/data —
        // reload once so it appears immediately instead of after the next refresh.
        await loadSessionAndData();
      }
    } catch (err) {
      console.error('Gagal menerima undangan kantong:', err);
    }
  };

  const handleDeclinePocketInvitation = async (id: string) => {
    try {
      const res = await fetch(`/api/pocket-shares/${id}/decline`, { method: 'POST', credentials: 'include' });
      if (res.ok) await loadPocketShareState();
    } catch (err) {
      console.error('Gagal menolak undangan kantong:', err);
    }
  };

  // Either side can call this: the owner disconnecting an invitee, or the
  // invitee leaving a pocket shared to them.
  const handleDisconnectPocketShare = async (id: string) => {
    try {
      const res = await fetch(`/api/pocket-shares/${id}/disconnect`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        await loadPocketShareState();
        await loadSessionAndData();
      }
    } catch (err) {
      console.error('Gagal memutus berbagi kantong:', err);
    }
  };

  // Add/edit/delete a transaction INSIDE a pocket shared to me — routed to
  // the owner's data server-side (see POST/PATCH/DELETE
  // /api/pocket-shares/:id/transactions* in server.ts), never through
  // persistUserData/PUT /api/data (that would try to overwrite MY OWN blob,
  // not the owner's). Reloads sharedPockets afterward so the balances shown
  // reflect the owner's freshly-updated wallet.
  const handleAddSharedPocketTransaction = async (
    shareId: string,
    tx: { title: string; amount: number; type: 'incoming' | 'outgoing'; accountId: string; category: string }
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await fetch(`/api/pocket-shares/${shareId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(tx),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Gagal menambah transaksi' };
      await loadSessionAndData();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Gagal menambah transaksi' };
    }
  };

  const handleDeleteSharedPocketTransaction = async (shareId: string, txId: string) => {
    try {
      const res = await fetch(`/api/pocket-shares/${shareId}/transactions/${txId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) await loadSessionAndData();
    } catch (err) {
      console.error('Gagal menghapus transaksi kantong bersama:', err);
    }
  };

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

  // Kelola Cicilan/Hutang (cicilan-ai-notifikasi Task 3) — reuses the
  // EXISTING reminder mechanism instead of building a parallel one: adding a
  // debt auto-creates a normal 'every_month' Reminder tied to its dueDay, so
  // the same background alarm-check effect above (and, once wired, Task 5's
  // push notifications) picks it up with zero extra code. The reminder's id
  // is kept on the Debt row so deleting the debt can clean it up too.
  const handleAddDebt = (input: Omit<Debt, 'id' | 'createdAt' | 'status' | 'reminderId'>) => {
    const debtId = `debt-${Date.now()}`;
    const reminderId = `rem-debt-${debtId}`;

    const newDebt: Debt = {
      ...input,
      id: debtId,
      status: 'active',
      createdAt: new Date().toISOString(),
      reminderId,
    };

    const newReminder: Reminder = {
      id: reminderId,
      title: `Cicilan/Hutang: ${input.name}`,
      time: '09:00',
      repeatType: 'every_month',
      isActive: true,
      createdAt: new Date().toISOString(),
      dayOfWeek: 0,
      dayOfMonth: input.dueDay,
    };

    const nextDebts = [...debts, newDebt];
    const nextReminders = [...reminders, newReminder];
    setDebts(nextDebts);
    setReminders(nextReminders);
    const nextLog = logActivity(`Menambahkan cicilan/hutang '${input.name}'`, 'debt', 'wallet');
    persistUserData({ debts: nextDebts, reminders: nextReminders, activityLog: nextLog });
  };

  // Records a debt_payments-equivalent entry and auto-flips status to
  // 'paid_off' once the number of recorded payments reaches the tenor —
  // mirrors the SQL version's "COUNT(*) >= tenor_months" check the prompt
  // described, just evaluated over the JSONB array instead of a table.
  const handleMarkDebtPaid = (debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt || debt.status === 'paid_off') return;

    const newPayment: DebtPayment = {
      id: `debtpay-${Date.now()}`,
      debtId,
      paidAmount: debt.monthlyInstallment,
      paidAt: new Date().toISOString(),
    };
    const nextPayments = [...debtPayments, newPayment];
    const paidCount = nextPayments.filter(p => p.debtId === debtId).length;
    const isNowPaidOff = paidCount >= debt.tenorMonths;

    const nextDebts = debts.map(d => d.id === debtId ? { ...d, status: isNowPaidOff ? 'paid_off' as const : d.status } : d);
    setDebts(nextDebts);
    setDebtPayments(nextPayments);
    const nextLog = logActivity(
      isNowPaidOff
        ? `Cicilan/hutang '${debt.name}' lunas!`
        : `Menandai cicilan/hutang '${debt.name}' sudah dibayar bulan ini`,
      'debt',
      'wallet'
    );
    persistUserData({ debts: nextDebts, debtPayments: nextPayments, activityLog: nextLog });
  };

  const handleDeleteDebt = (debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;
    const nextDebts = debts.filter(d => d.id !== debtId);
    const nextPayments = debtPayments.filter(p => p.debtId !== debtId);
    // Clean up the linked monthly reminder too, otherwise it keeps firing for
    // a debt that no longer exists.
    const nextReminders = debt.reminderId ? reminders.filter(r => r.id !== debt.reminderId) : reminders;
    setDebts(nextDebts);
    setDebtPayments(nextPayments);
    setReminders(nextReminders);
    const nextLog = logActivity(`Menghapus cicilan/hutang '${debt.name}'`, 'debt', 'wallet');
    persistUserData({ debts: nextDebts, debtPayments: nextPayments, reminders: nextReminders, activityLog: nextLog });
  };

  // Background check effect for active alarm reminders
  useEffect(() => {
    if (!currentUser) return;

    const checkAlarms = () => {
      const now = new Date();
      // Local calendar date, NOT now.toISOString()'s UTC date — every other
      // field here (currentHour/Minute/DayOfWeek/DayOfMonth below) is already
      // local, so a UTC date string would silently disagree with them for
      // roughly the first 7 hours of each WIB day (a WIB user's UTC date is
      // still "yesterday" until ~07:00 local), causing lastTriggeredDate to
      // mismatch the server's WIB-based sweep (see getWibDateParts in
      // server.ts) and risking a duplicate push notification for alarms
      // timed in that window.
      const currentDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
      <div className="min-h-screen flex items-center justify-center bg-body-bg text-on-surface-variant text-sm">
        Memuat...
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen text-on-surface relative font-body-md antialiased overflow-x-hidden select-none bg-body-bg flex flex-col md:flex-row">
      
      {/* Background Ambient Glow Layout */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-[-10%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-[-10%] w-[350px] h-[350px] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      {/* DESKTOP SIDEBAR NAVIGATION — fixed (not sticky): a sticky element
          only stays put as long as no ancestor's overflow/height computation
          accidentally creates a nested scroll container; fixed pins it to
          the viewport unconditionally, which is what "menu tidak boleh ikut
          bergerak saat scroll" actually needs. Taken out of flow, so the
          main content column below carries a matching md:ml-64 offset. */}
      <aside className="hidden md:flex flex-col w-64 border-r border-overlay/5 bg-surface/40 backdrop-blur-2xl p-6 h-screen fixed left-0 top-0 shrink-0 z-40">
        {/* Brand / Logo */}
        <div className="mb-8 px-2 flex items-center gap-2">
          <BrandLogo className="w-8 h-8 text-primary shrink-0" glow={false} />
          <span className="font-headline-md text-2xl font-bold text-primary tracking-tight glow-text-primary">
            KantongKu
          </span>
        </div>

        {/* Tambah Transaksi — desktop punya sidebar tetap (bukan bottom nav
            seperti mobile), jadi FAB "+" mobile tidak pernah terlihat di
            layar ini; tombol ini adalah satu-satunya cara desktop untuk
            memicu Tambah Transaksi. */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 mb-4 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-[0_4px_16px_rgba(78,222,163,0.25)] hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <PlusCircle className="w-5 h-5 shrink-0" />
          Tambah Transaksi
        </button>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 flex-grow">
          {/* TAB: Home */}
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'home' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-overlay/5'}`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Home</span>
          </button>

          {/* TAB: Wallet */}
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'wallet' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-overlay/5'}`}
          >
            <Wallet className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Wallet</span>
          </button>

          {/* TAB: Analisis / Activity */}
          <button 
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'activity' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-overlay/5'}`}
          >
            <LineChart className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Analisis</span>
          </button>

          {/* TAB: Riwayat / History */}
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'history' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-overlay/5'}`}
          >
            <Receipt className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Riwayat</span>
          </button>

          {/* TAB: Profile Settings */}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'profile' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-overlay/5'}`}
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Profil</span>
          </button>
        </nav>

        {/* User profile section at the bottom of sidebar */}
        <div className="border-t border-overlay/5 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img 
              alt="User Avatar" 
              className="w-8 h-8 rounded-full border border-overlay/10 shrink-0 object-cover" 
              src={currentUser?.avatarUrl}
            />
            <span className="text-xs font-semibold text-on-surface truncate max-w-[100px]">{currentUser?.name}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-[10px] uppercase font-label-caps tracking-wider text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main View Container — md:ml-64 makes up for the sidebar now being
          `fixed` (out of normal flow) instead of an in-flow flex sibling. */}
      <div className="flex-grow min-h-screen pb-28 md:pb-8 flex flex-col relative z-10 w-full min-w-0 md:ml-64">
        <div className="max-w-md md:max-w-5xl w-full mx-auto pt-4 md:pt-10 px-4 md:px-8">
          {/* Mobile persistent header */}
          <div className="w-full flex justify-center items-center gap-2 pb-3 md:hidden border-b border-overlay/5 mb-3">
            <BrandLogo className="w-7 h-7 text-primary shrink-0" glow={false} />
            <span className="font-headline-md text-2xl font-bold text-primary tracking-tight glow-text-primary">
              KantongKu
            </span>
          </div>

          {/* Pocket Sharing (v11): visible on every tab whenever there's a
              pending invitation waiting on this account, so it's never
              missed just because the user doesn't happen to open Profile. */}
          {pendingInvitations.length > 0 && (
            <button
              onClick={() => setActiveTab('shared-pockets')}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 mb-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs text-left hover:bg-indigo-500/15 transition-colors"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>
                Ada <span className="font-semibold text-on-surface">{pendingInvitations.length}</span> undangan kantong bersama menunggu — ketuk untuk lihat.
              </span>
            </button>
          )}

          {activeTab === 'home' && (
            <HomeDashboard
              pockets={pockets}
              accounts={accounts}
              transactions={transactions}
              notifications={notifications}
              userProfile={currentUser}
              categories={categories}
              budgets={budgets}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onDeleteTransaction={handleDeleteTransaction}
              onTransferBetweenWallets={handleTransferBetweenWallets}
              onTopUpWallet={handleTopUpWallet}
              onChangeTab={setActiveTab}
              onOpenPocketManager={() => setIsPocketManagerOpen(true)}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              onOpenReminderModal={() => setIsReminderModalOpen(true)}
              onEditTransactionSelect={handleEditTransactionSelect}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onOpenHistory={handleOpenHistory}
              onOpenMonthlyDetail={() => setActiveTab('monthly-detail')}
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
              onReorderAccounts={handleReorderAccounts}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityView
              transactions={transactions}
              pockets={pockets}
              categories={categories}
              onOpenHistory={handleOpenHistory}
              onOpenMonthlyDetail={() => setActiveTab('monthly-detail')}
            />
          )}

          {activeTab === 'monthly-detail' && (
            <MonthlyExpenseView
              transactions={transactions}
              categories={categories}
              onEditTransactionSelect={handleEditTransactionSelect}
              onDeleteTransaction={handleDeleteTransaction}
              onBack={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'history' && (
            <TransactionHistoryPage
              transactions={transactions}
              pockets={pockets}
              accounts={accounts}
              categories={categories}
              walletTransferLogs={walletTransferLogs}
              initialFilter={historyInitialFilter}
              currentUserEmail={currentUser?.email}
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
              onOpenPocketManager={() => setIsPocketManagerOpen(true)}
              onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
              onNavigateHistory={() => setActiveTab('history')}
              onNavigateActivityLog={() => setActiveTab('activity-log')}
              onNavigateDebtManager={() => setActiveTab('debts')}
              onNavigateGuide={handleNavigateGuide}
              hasUnseenGuideUpdate={hasUnseenGuideUpdate}
              onNavigateSharedPockets={() => setActiveTab('shared-pockets')}
              pendingInvitationCount={pendingInvitations.length}
            />
          )}

          {activeTab === 'shared-pockets' && (
            <SharedPocketsView
              pockets={pockets}
              sharedPockets={sharedPockets}
              pendingInvitations={pendingInvitations}
              myShares={myShares}
              currentUserEmail={currentUser?.email || ''}
              onBack={() => setActiveTab('profile')}
              onInvite={handleInvitePocketShare}
              onAcceptInvitation={handleAcceptPocketInvitation}
              onDeclineInvitation={handleDeclinePocketInvitation}
              onDisconnectShare={handleDisconnectPocketShare}
              onAddSharedTransaction={handleAddSharedPocketTransaction}
              onDeleteSharedTransaction={handleDeleteSharedPocketTransaction}
            />
          )}

          {activeTab === 'activity-log' && (
            <ActivityLogView
              activityLog={activityLog}
              onBack={() => setActiveTab('profile')}
              onClearLog={handleClearActivityLog}
            />
          )}

          {activeTab === 'guide' && (
            <GuideView onBack={() => setActiveTab('profile')} />
          )}

          {activeTab === 'debts' && (
            <DebtManagerView
              debts={debts}
              debtPayments={debtPayments}
              onBack={() => setActiveTab('profile')}
              onAddDebt={handleAddDebt}
              onMarkPaid={handleMarkDebtPaid}
              onDeleteDebt={handleDeleteDebt}
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
        // Task 3: keep AddTransactionModal mounted (don't close/clear it)
        // while CategoryManagerModal opens on top (it already renders at a
        // higher z-index, z-[70] vs z-[60] — designed to stack, not
        // replace). Closing/unmounting it here used to reset its internal
        // `currentView` and wipe whatever the user had already typed in the
        // manual/parser detail view, landing back on 'options' (effectively
        // the dashboard) instead of returning to the in-progress input.
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
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
      <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-2xl bg-surface/70 border-t border-overlay/5 backdrop-blur-2xl px-6 pt-2 pb-6 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center relative">
          
          {/* TAB: Home */}
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'home' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-on-surface'}`}
          >
            <Home className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Home</span>
          </button>

          {/* TAB: Wallet */}
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'wallet' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-on-surface'}`}
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
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'activity' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-on-surface'}`}
          >
            <LineChart className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Analisis</span>
          </button>

          {/* TAB: Profile Settings */}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'profile' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-on-surface'}`}
          >
            <User className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Profil</span>
          </button>

        </div>
      </nav>
    </div>
  );
}

