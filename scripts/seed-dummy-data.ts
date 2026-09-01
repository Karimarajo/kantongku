// Dev-only tool — NOT auto-run by `npm run dev` or the production build, and
// NEVER touches real user data: every user this script creates/touches has
// an email under the dev/test domains below, nothing else.
//
// Seeds two things:
//   1. The [DEV] Login test account (dev-test-user@kantongku.local, same one
//      POST /api/dev/login-as-test-user creates on first use) — full-featured
//      smoke-test data: 100 transactions spread across the last 3 months,
//      plus real Anggaran (budgets), Pengingat (reminders), Cicilan/Hutang
//      (debts + payment history), Notifikasi, and Transfer Wallet logs, so
//      every feature in the app has something to look at, not just Transaksi.
//   2. THREE independent dummy owner accounts (Task 3) with distinctly
//      different wallets/categories/transactions, plus a 4th dummy email
//      invited + activated as User A's collaborator — so you can prove data
//      isolation between owners AND that a collaborator really does see the
//      SAME data as their owner (not their own empty account).
//
// Usage:
//   npx tsx scripts/seed-dummy-data.ts            # safe to re-run (upserts)
//   npx tsx scripts/seed-dummy-data.ts --reset     # delete dummy users first, then recreate fresh
//
// To log in as any of these locally: use the "[DEV] Login sebagai Test User"
// button's underlying endpoint with an email override — e.g. from the
// browser console on the login page:
//   fetch('/api/dev/login-as-test-user', { method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({ email: 'usera.dummy@kantongku.test' }) }).then(() => location.reload())
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const RESET = process.argv.includes("--reset");

// Every email this script ever creates lives under one of these two domains
// — .local for the single quick-test account, .dummy@kantongku.test for the
// multi-user isolation scenario. Never anything resembling a real address.
const DUMMY_EMAILS = [
  "dev-test-user@kantongku.local",
  "usera.dummy@kantongku.test",
  "userb.dummy@kantongku.test",
  "userc.dummy@kantongku.test",
  "userd.dummy@kantongku.test", // invited as User A's collaborator, gets NO user_app_data of its own
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const POCKETS = [
  { id: "pribadi", name: "Kantong Pribadi", icon: "user", tag: "Pribadi", color: "emerald" },
  { id: "bisnis", name: "Kantong Bisnis", icon: "briefcase", tag: "Bisnis", color: "indigo" },
];

interface AccountConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  initialBalance: number;
}

interface TransactionConfig {
  title: string;
  amount: number;
  type: "incoming" | "outgoing";
  category: string;
  accountId: string;
  pocketId: string;
  daysAgo: number;
}

// ── Extra per-feature seed shapes (Task: "data di seluruh fitur terisi")────
// All optional on DummyUserConfig — USER_A/B/C/D keep working untouched
// (default to []), only DEV_TEST_USER below actually supplies them so every
// feature (Anggaran, Pengingat, Cicilan/Hutang, Notifikasi, Transfer Wallet)
// has real data to test, not just Transaksi.
interface BudgetSeed {
  title: string;
  categories: string[];
  limit: number;
  type: "expense_limit" | "target_funding";
  timeframe?: string;
  // With startDate/endDate: `spent` is IGNORED and recomputed below from the
  // actual seeded transactions (mirrors calculateBudgetSpent in App.tsx /
  // recomputeBudgetSpent in server.ts) so the progress bar is real, not
  // decorative. Without them (e.g. a target_funding savings goal with no
  // category window), `spent` is used as-is.
  startDate?: string;
  endDate?: string;
  spent?: number;
}

interface ReminderSeed {
  id: string;
  title: string;
  time: string; // "HH:MM"
  repeatType: "once" | "every_day" | "every_week" | "every_month";
  isActive: boolean;
  dayOfWeek: number;
  dayOfMonth: number;
  createdDaysAgo: number;
}

interface DebtSeed {
  id: string;
  name: string;
  principalAmount: number;
  monthlyInstallment: number;
  tenorMonths: number;
  dueDay: number;
  startDaysAgo: number;
  status: "active" | "paid_off";
  createdDaysAgo: number;
  reminderId?: string;
}

interface DebtPaymentSeed {
  id: string;
  debtId: string;
  paidAmount: number;
  paidDaysAgo: number;
}

interface NotificationSeed {
  id: string;
  title: string;
  message: string;
  daysAgo: number;
  isRead: boolean;
  type: "info" | "warning" | "success";
}

interface WalletTransferSeed {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note?: string;
  daysAgo: number;
}

interface DummyUserConfig {
  email: string;
  name: string;
  accounts: AccountConfig[];
  categories: { id: string; name: string; icon: string; color: string }[];
  transactions: TransactionConfig[];
  budgets?: BudgetSeed[];
  reminders?: ReminderSeed[];
  debts?: DebtSeed[];
  debtPayments?: DebtPaymentSeed[];
  notifications?: NotificationSeed[];
  walletTransferLogs?: WalletTransferSeed[];
}

const daysAgoToISO = (daysAgo: number, now: number) => new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();

// Mirrors calculateBudgetSpent (src/App.tsx) / recomputeBudgetSpent
// (server.ts) exactly: sum of outgoing transactions whose category matches
// AND whose date falls inside [startDate 00:00, endDate 23:59:59]. Keep this
// in sync if that client/server logic ever changes.
function computeBudgetSpent(budget: BudgetSeed, transactions: { category: string; type: string; amount: number; date: string }[]): number {
  if (!budget.startDate || !budget.endDate) return budget.spent ?? 0;
  const start = new Date(budget.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(budget.endDate);
  end.setHours(23, 59, 59, 999);
  return transactions
    .filter((t) => t.type === "outgoing" && budget.categories.includes(t.category))
    .filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

// Human-readable Indonesian timestamp, same format App.tsx generates for a
// real Notification's `time` field (see dapatkanWaktuSekarangString there).
function formatWaktuIndo(date: Date): string {
  const tanggal = date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const jam = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", ".");
  return `${tanggal} - Pukul ${jam}`;
}

// Shared bookkeeping — mirrors exactly what App.tsx's handleAddTransaction
// does client-side, so the seeded balances/allocations are internally
// consistent (account.balance == initial + sum of its deltas, pocket.balance
// == sum of that pocket's allocation across accounts) instead of decorative.
function buildAppData(config: DummyUserConfig) {
  const now = Date.now();
  const transactionsWithDates = config.transactions.map((t, idx) => ({
    id: `seed-${config.email.split("@")[0]}-t-${idx}`,
    title: t.title,
    amount: t.amount,
    type: t.type,
    category: t.category,
    accountId: t.accountId,
    pocketId: t.pocketId,
    date: daysAgoToISO(t.daysAgo, now),
    notes: "Data dummy (scripts/seed-dummy-data.ts)",
  }));

  const accounts = config.accounts.map((meta) => ({
    id: meta.id,
    name: meta.name,
    icon: meta.icon,
    color: meta.color,
    balance: meta.initialBalance,
    allocations: { pribadi: meta.initialBalance, bisnis: 0 } as Record<string, number>,
  }));

  // Balances/allocations MUST be walked oldest -> newest: `Math.max(0, ...)`
  // clamps every step, so (unlike plain unclamped addition) the ORDER
  // transactions are applied in actually changes the result — applying
  // newest-first here previously made a big early debit clamp a bucket to 0
  // before an earlier credit that should have covered it was ever applied,
  // permanently drifting account.balance away from
  // sum(account.allocations) for any pocket/account pair with more than a
  // couple of transactions. `transactions` (returned/serialized below) stays
  // sorted newest-first for display, same as before — only the order this
  // loop walks them in changed.
  const chronological = transactionsWithDates.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const t of chronological) {
    const acc = accounts.find((a) => a.id === t.accountId);
    if (!acc) continue;
    const delta = t.type === "incoming" ? t.amount : -t.amount;
    acc.balance = Math.max(0, acc.balance + delta);
    acc.allocations[t.pocketId] = Math.max(0, (acc.allocations[t.pocketId] || 0) + delta);
  }

  const transactions = transactionsWithDates.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Wallet-to-wallet transfers (oldest first, same order the real
  // handleTransferBetweenWallets in App.tsx would have applied them) — moves
  // balance AND the default pocket's ("pockets[0]", i.e. 'pribadi')
  // allocation bucket together so every pocket's aggregate total stays
  // mathematically unchanged, exactly like the real handler. Deliberately
  // NOT a Transaction — must stay excluded from income/expense reports.
  const defaultPocketId = POCKETS[0]?.id || "pribadi";
  const walletTransferLogs = (config.walletTransferLogs || [])
    .slice()
    .sort((a, b) => b.daysAgo - a.daysAgo)
    .map((w) => {
      const from = accounts.find((a) => a.id === w.fromAccountId);
      const to = accounts.find((a) => a.id === w.toAccountId);
      if (from && to) {
        from.balance = Math.max(0, from.balance - w.amount);
        from.allocations[defaultPocketId] = Math.max(0, (from.allocations[defaultPocketId] || 0) - w.amount);
        to.balance = to.balance + w.amount;
        to.allocations[defaultPocketId] = (to.allocations[defaultPocketId] || 0) + w.amount;
      }
      return {
        id: w.id,
        fromAccountId: w.fromAccountId,
        toAccountId: w.toAccountId,
        amount: w.amount,
        note: w.note,
        date: daysAgoToISO(w.daysAgo, now),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pockets = POCKETS.map((p) => ({
    ...p,
    balance: accounts.reduce((sum, a) => sum + (a.allocations[p.id] || 0), 0),
  }));

  const budgets = (config.budgets || []).map((b, idx) => {
    const spent = computeBudgetSpent(b, transactions);
    const sisaPercent = b.limit > 0 ? Math.max(0, Math.round(((b.limit - spent) / b.limit) * 100)) : 0;
    return {
      id: `seed-${config.email.split("@")[0]}-budget-${idx}`,
      title: b.title,
      spent,
      limit: b.limit,
      category: b.categories.length === 1 ? b.categories[0] : b.categories,
      categories: b.categories,
      sisaPercent,
      type: b.type,
      timeframe: b.timeframe,
      startDate: b.startDate,
      endDate: b.endDate,
    };
  });

  const reminders = (config.reminders || []).map((r) => ({
    id: r.id,
    title: r.title,
    time: r.time,
    repeatType: r.repeatType,
    isActive: r.isActive,
    createdAt: daysAgoToISO(r.createdDaysAgo, now),
    dayOfWeek: r.dayOfWeek,
    dayOfMonth: r.dayOfMonth,
  }));

  const debts = (config.debts || []).map((d) => ({
    id: d.id,
    name: d.name,
    principalAmount: d.principalAmount,
    monthlyInstallment: d.monthlyInstallment,
    tenorMonths: d.tenorMonths,
    dueDay: d.dueDay,
    startDate: daysAgoToISO(d.startDaysAgo, now).slice(0, 10),
    status: d.status,
    createdAt: daysAgoToISO(d.createdDaysAgo, now),
    reminderId: d.reminderId,
  }));

  const debtPayments = (config.debtPayments || []).map((p) => ({
    id: p.id,
    debtId: p.debtId,
    paidAmount: p.paidAmount,
    paidAt: daysAgoToISO(p.paidDaysAgo, now),
  }));

  const notifications = (config.notifications || [])
    .map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      time: formatWaktuIndo(new Date(now - n.daysAgo * 24 * 60 * 60 * 1000)),
      isRead: n.isRead,
      type: n.type,
    }))
    .sort((a, b) => (a.id < b.id ? 1 : -1));

  return {
    profile: { name: config.name },
    pockets,
    accounts,
    categories: config.categories,
    transactions,
    budgets,
    notifications,
    reminders,
    debts,
    debtPayments,
    walletTransferLogs,
    activityLog: [
      {
        id: `seed-${config.email.split("@")[0]}-log-1`,
        message: "Data dummy dimuat via scripts/seed-dummy-data.ts",
        timestamp: new Date().toISOString(),
        category: "system",
      },
    ],
    settings: { currency: "IDR", theme: "dark", alarmRem: true },
  };
}

// `activate: false` leaves `status` at the table default ('pending') instead
// of forcing 'active' — used for the pure-collaborator dummy user (Task 2
// revision): their access is meant to come ENTIRELY from an active
// `collaborators` row, never from their own users.status, so seeding them as
// 'active' directly would test a state that can't actually happen for a real
// collaborator and would mask a login-gate bug.
async function upsertUser(email: string, name: string, activate = true): Promise<string> {
  const result = activate
    ? await pool.query(
        `INSERT INTO users (email, name, status, activated_at)
         VALUES ($1, $2, 'active', now())
         ON CONFLICT (email) DO UPDATE SET status = 'active', name = COALESCE(users.name, $2)
         RETURNING id`,
        [email, name]
      )
    : await pool.query(
        `INSERT INTO users (email, name)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET name = COALESCE(users.name, $2)
         RETURNING id`,
        [email, name]
      );
  return result.rows[0].id;
}

async function writeAppData(userId: string, config: DummyUserConfig) {
  const appData = buildAppData(config);
  await pool.query(
    `INSERT INTO user_app_data (user_id, data, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()`,
    [userId, JSON.stringify(appData)]
  );
}

// ── Config 1: the main quick-test account — Task "buat transaksi selama 3
// bulan sebanyak 100 transaksi, data di seluruh fitur terisi": 100
// transactions spread across the last 3 months (~90 days), plus real data in
// every other feature (Anggaran, Pengingat, Cicilan/Hutang, Notifikasi,
// Transfer Wallet) so the whole app is exercisable, not just Transaksi. ──

// One fixed "start of month window" per of the 3 months (oldest first);
// `i` (0/1/2) lets amounts drift slightly month over month instead of being
// perfectly identical, like a real income/bill history would.
const DEV_MONTH_WINDOW_STARTS = [89, 59, 29];

// 9 recurring monthly anchors (gaji, 2x omset toko online, top up GoPay,
// listrik/internet/air/pulsa, cicilan motor) × 3 months = 27 transactions.
function buildDevMonthlyAnchors(): TransactionConfig[] {
  const anchors: TransactionConfig[] = [];
  DEV_MONTH_WINDOW_STARTS.forEach((start, i) => {
    anchors.push(
      { title: "Gaji Bulanan", amount: 8_500_000, type: "incoming", category: "pendapatan", accountId: "acc-bca", pocketId: "pribadi", daysAgo: start - 2 },
      { title: "Omset Jualan Online", amount: 2_200_000 + i * 300_000, type: "incoming", category: "pendapatan", accountId: "acc-bca", pocketId: "bisnis", daysAgo: start - 9 },
      { title: "Omset Jualan Online", amount: 1_850_000 + i * 250_000, type: "incoming", category: "pendapatan", accountId: "acc-bca", pocketId: "bisnis", daysAgo: start - 23 },
      { title: "Top Up GoPay", amount: 500_000, type: "incoming", category: "topup", accountId: "acc-gopay", pocketId: "pribadi", daysAgo: start - 14 },
      { title: "Bayar Listrik PLN", amount: 245_000 + i * 10_000, type: "outgoing", category: "tagihan", accountId: "acc-bca", pocketId: "pribadi", daysAgo: start - 4 },
      { title: "Bayar Internet Indihome", amount: 350_000, type: "outgoing", category: "tagihan", accountId: "acc-bca", pocketId: "pribadi", daysAgo: start - 5 },
      { title: "Bayar Air PDAM", amount: 90_000, type: "outgoing", category: "tagihan", accountId: "acc-bca", pocketId: "pribadi", daysAgo: start - 6 },
      { title: "Isi Pulsa & Paket Data", amount: 100_000, type: "outgoing", category: "tagihan", accountId: "acc-gopay", pocketId: "pribadi", daysAgo: start - 7 },
      { title: "Cicilan Motor Honda Vario", amount: 850_000, type: "outgoing", category: "tagihan", accountId: "acc-bca", pocketId: "pribadi", daysAgo: start - 3 }
    );
  });
  return anchors;
}

// Recurring day-to-day spending cycled across the templates below, spread
// evenly over the full 90-day window to fill out the remaining count.
const DEV_DAILY_TEMPLATES: Omit<TransactionConfig, "daysAgo">[] = [
  { title: "Sarapan Nasi Uduk", amount: 15_000, type: "outgoing", category: "makan", accountId: "acc-cash", pocketId: "pribadi" },
  { title: "Kopi Kenangan", amount: 28_000, type: "outgoing", category: "makan", accountId: "acc-gopay", pocketId: "pribadi" },
  { title: "Makan Siang Warteg", amount: 22_000, type: "outgoing", category: "makan", accountId: "acc-cash", pocketId: "pribadi" },
  { title: "Makan Malam Nasi Padang", amount: 35_000, type: "outgoing", category: "makan", accountId: "acc-cash", pocketId: "pribadi" },
  { title: "Ngopi Sore", amount: 25_000, type: "outgoing", category: "makan", accountId: "acc-gopay", pocketId: "pribadi" },
  { title: "Bensin Motor", amount: 50_000, type: "outgoing", category: "transport", accountId: "acc-cash", pocketId: "pribadi" },
  { title: "Ongkos Ojek Online", amount: 18_000, type: "outgoing", category: "transport", accountId: "acc-gopay", pocketId: "pribadi" },
  { title: "Parkir Mall", amount: 5_000, type: "outgoing", category: "transport", accountId: "acc-cash", pocketId: "pribadi" },
  { title: "Belanja Bulanan Indomaret", amount: 275_000, type: "outgoing", category: "belanja", accountId: "acc-bca", pocketId: "pribadi" },
  { title: "Belanja Sayur Pasar", amount: 60_000, type: "outgoing", category: "belanja", accountId: "acc-cash", pocketId: "pribadi" },
  { title: "Checkout Shopee", amount: 145_000, type: "outgoing", category: "belanja", accountId: "acc-gopay", pocketId: "pribadi" },
  { title: "Nonton Bioskop", amount: 100_000, type: "outgoing", category: "hiburan", accountId: "acc-gopay", pocketId: "pribadi" },
  { title: "Langganan Netflix", amount: 65_000, type: "outgoing", category: "hiburan", accountId: "acc-bca", pocketId: "pribadi" },
  { title: "Langganan Spotify", amount: 55_000, type: "outgoing", category: "hiburan", accountId: "acc-gopay", pocketId: "pribadi" },
  { title: "Top Up Mobile Legends", amount: 50_000, type: "outgoing", category: "hiburan", accountId: "acc-gopay", pocketId: "pribadi" },
  { title: "Konsultasi Dokter", amount: 200_000, type: "outgoing", category: "kesehatan", accountId: "acc-cash", pocketId: "pribadi" },
  { title: "Beli Vitamin & Obat", amount: 85_000, type: "outgoing", category: "kesehatan", accountId: "acc-cash", pocketId: "pribadi" },
  // All 3 'bisnis' entries deliberately route through acc-bca — the only
  // account that ever RECEIVES 'bisnis'-pocket income (the Omset Jualan
  // Online anchors above). Routing a bisnis debit through acc-gopay/acc-cash
  // instead — accounts whose 'bisnis' allocation bucket never gets a credit
  // — would drive that bucket negative and get silently floored to 0 by the
  // `Math.max(0, ...)` clamping in buildAppData, permanently drifting
  // account.balance away from sum(account.allocations) for that account.
  { title: "Beli Bahan Baku Jualan", amount: 650_000, type: "outgoing", category: "belanja", accountId: "acc-bca", pocketId: "bisnis" },
  { title: "Ongkir Kirim Barang Jualan", amount: 35_000, type: "outgoing", category: "transport", accountId: "acc-bca", pocketId: "bisnis" },
  { title: "Beli Kemasan Produk", amount: 120_000, type: "outgoing", category: "belanja", accountId: "acc-bca", pocketId: "bisnis" },
];

// 27 monthly anchors + N daily-cycle transactions = exactly 100, spread
// across the full ~90-day / 3-month window (evenly spaced oldest → newest).
function buildDevTestTransactions(): TransactionConfig[] {
  const anchors = buildDevMonthlyAnchors();
  const remaining = 100 - anchors.length; // 73
  const daily: TransactionConfig[] = [];
  for (let k = 0; k < remaining; k++) {
    const template = DEV_DAILY_TEMPLATES[k % DEV_DAILY_TEMPLATES.length];
    const daysAgo = Math.round(89 - (k * 89) / (remaining - 1));
    daily.push({ ...template, amount: template.amount + (k % 5) * 1_000, daysAgo });
  }
  return [...anchors, ...daily];
}

const DEV_TEST_USER: DummyUserConfig = {
  email: "dev-test-user@kantongku.local",
  name: "Test User (Dev)",
  accounts: [
    { id: "acc-bca", name: "Bank BCA", icon: "bank", color: "indigo", initialBalance: 5_000_000 },
    { id: "acc-gopay", name: "GoPay", icon: "smartphone", color: "cyan", initialBalance: 800_000 },
    { id: "acc-cash", name: "Cash", icon: "cash", color: "amber", initialBalance: 1_500_000 },
  ],
  categories: [
    { id: "pendapatan", name: "Pendapatan", icon: "income", color: "emerald" },
    { id: "belanja", name: "Belanja", icon: "shopping", color: "rose" },
    { id: "topup", name: "Top Up Saldo", icon: "piggy", color: "teal" },
    { id: "makan", name: "Makan & Minum", icon: "food", color: "orange" },
    { id: "transport", name: "Transportasi", icon: "car", color: "sky" },
    { id: "hiburan", name: "Hiburan", icon: "game", color: "purple" },
    { id: "tagihan", name: "Tagihan & Cicilan", icon: "electricity", color: "amber" },
    { id: "kesehatan", name: "Kesehatan", icon: "health", color: "pink" },
  ],
  transactions: buildDevTestTransactions(),
  // Anggaran: one real expense-limit budget, backdated ~20 days so it
  // actually captures some of the recently-seeded 'makan' transactions in
  // its window (spent recomputed for real by computeBudgetSpent — a
  // freshly-"today"-started 1_bulan budget, matching how BudgetModal itself
  // computes a brand new one, would start at 0/empty and defeat the point of
  // seeding it), plus one target-funding savings goal (spent is a fixed
  // manual value, same as a real target_funding budget that accumulates
  // from manual top-ups rather than a transaction category window).
  budgets: (() => {
    const nowMs = Date.now();
    const toYMD = (daysAgo: number) => daysAgoToISO(daysAgo, nowMs).slice(0, 10);
    return [
      {
        title: "Anggaran Makan & Jajan",
        categories: ["makan"],
        limit: 350_000,
        type: "expense_limit" as const,
        timeframe: "1_bulan",
        startDate: toYMD(20), // 20 hari lalu
        endDate: toYMD(-10), // 10 hari lagi (daysAgo negatif = masa depan)
      },
      {
        title: "Dana Darurat",
        categories: ["topup"],
        limit: 10_000_000,
        spent: 3_500_000,
        type: "target_funding" as const,
      },
    ];
  })(),
  // Pengingat: satu terhubung ke Cicilan Motor (lihat debts di bawah), dua
  // lainnya berdiri sendiri (tagihan bulanan + setoran tabungan mingguan).
  reminders: [
    { id: "seed-dev-reminder-cicilan-motor", title: "Bayar Cicilan Motor", time: "09:00", repeatType: "every_month", isActive: true, dayOfWeek: 0, dayOfMonth: 5, createdDaysAgo: 89 },
    { id: "seed-dev-reminder-tagihan", title: "Bayar Tagihan Listrik & Internet", time: "08:00", repeatType: "every_month", isActive: true, dayOfWeek: 0, dayOfMonth: 5, createdDaysAgo: 89 },
    { id: "seed-dev-reminder-tabungan", title: "Setor Tabungan Mingguan", time: "19:00", repeatType: "every_week", isActive: true, dayOfWeek: 1, dayOfMonth: 1, createdDaysAgo: 60 },
  ],
  // Cicilan/Hutang: Cicilan Motor's 3 payments below match the "Cicilan
  // Motor Honda Vario" anchor transactions exactly (same amount/date) — real
  // payment history, not decorative. Pinjaman Modal Usaha is independent
  // (Debt/DebtPayment intentionally don't reconcile against
  // Transaction/Account balances — see the comment on the Debt type).
  debts: [
    { id: "seed-dev-debt-cicilan-motor", name: "Cicilan Motor Honda Vario", principalAmount: 18_000_000, monthlyInstallment: 850_000, tenorMonths: 24, dueDay: 5, startDaysAgo: 89, status: "active", createdDaysAgo: 89, reminderId: "seed-dev-reminder-cicilan-motor" },
    { id: "seed-dev-debt-pinjaman-usaha", name: "Pinjaman Modal Usaha Bisnis", principalAmount: 5_000_000, monthlyInstallment: 550_000, tenorMonths: 10, dueDay: 20, startDaysAgo: 55, status: "active", createdDaysAgo: 55 },
  ],
  debtPayments: [
    ...DEV_MONTH_WINDOW_STARTS.map((start, idx) => ({
      id: `seed-dev-debtpay-cicilan-motor-${idx}`,
      debtId: "seed-dev-debt-cicilan-motor",
      paidAmount: 850_000,
      paidDaysAgo: start - 3,
    })),
    { id: "seed-dev-debtpay-pinjaman-usaha-0", debtId: "seed-dev-debt-pinjaman-usaha", paidAmount: 550_000, paidDaysAgo: 55 },
    { id: "seed-dev-debtpay-pinjaman-usaha-1", debtId: "seed-dev-debt-pinjaman-usaha", paidAmount: 550_000, paidDaysAgo: 25 },
  ],
  // Notifikasi: campuran info/warning/success, sebagian sudah dibaca —
  // supaya badge "belum dibaca" dan daftar riwayat sama-sama ada isinya.
  notifications: [
    { id: "seed-dev-notif-0", title: "Pencatatan Berhasil", message: "Pencatatan berhasil: Pengeluaran 'Kopi Kenangan' sebesar Rp28.000 telah disimpan.", daysAgo: 0, isRead: false, type: "success" },
    { id: "seed-dev-notif-1", title: "Anggaran Berjalan", message: "Anggaran 'Anggaran Makan & Jajan' sudah mulai terpakai bulan ini — pantau terus supaya nggak kebablasan.", daysAgo: 1, isRead: false, type: "warning" },
    { id: "seed-dev-notif-2", title: "Pengingat Aktif", message: "Pengingat 'Bayar Cicilan Motor' akan berbunyi setiap tanggal 5.", daysAgo: 3, isRead: true, type: "info" },
    { id: "seed-dev-notif-3", title: "Cicilan Mendekati Jatuh Tempo", message: "Cicilan Motor Honda Vario jatuh tempo pada tanggal 5 bulan ini.", daysAgo: 5, isRead: true, type: "warning" },
    { id: "seed-dev-notif-4", title: "Top Up GoPay Berhasil", message: "Top up GoPay sebesar Rp500.000 berhasil ditambahkan.", daysAgo: 14, isRead: true, type: "success" },
  ],
  // Transfer Wallet: tarik tunai bulanan BCA→Cash (yang menjaga saldo Cash
  // tetap positif meski dipakai jajan harian) + satu transfer GoPay→Cash.
  walletTransferLogs: [
    ...DEV_MONTH_WINDOW_STARTS.map((start, idx) => ({
      id: `seed-dev-transfer-tarik-tunai-${idx}`,
      fromAccountId: "acc-bca",
      toAccountId: "acc-cash",
      amount: 700_000,
      note: "Tarik tunai ATM",
      daysAgo: start - 1,
    })),
    { id: "seed-dev-transfer-gopay-cash", fromAccountId: "acc-gopay", toAccountId: "acc-cash", amount: 150_000, note: "Transfer saldo GoPay ke Cash", daysAgo: 40 },
  ],
};

// ── Config 2/3/4: three independent dummy owners for isolation testing ────
const USER_A: DummyUserConfig = {
  email: "usera.dummy@kantongku.test",
  name: "Andi (Dummy A)",
  accounts: [
    { id: "a-bca", name: "Bank BCA", icon: "bank", color: "indigo", initialBalance: 3_000_000 },
    { id: "a-cash", name: "Cash", icon: "cash", color: "amber", initialBalance: 500_000 },
  ],
  categories: [
    { id: "pendapatan", name: "Pendapatan", icon: "income", color: "emerald" },
    { id: "belanja", name: "Belanja", icon: "shopping", color: "rose" },
    { id: "makan", name: "Makan & Minum", icon: "food", color: "orange" },
    { id: "transport", name: "Transportasi", icon: "car", color: "sky" },
  ],
  transactions: [
    { title: "Gaji Andi", amount: 6_000_000, type: "incoming", category: "pendapatan", accountId: "a-bca", pocketId: "pribadi", daysAgo: 58 },
    { title: "Gaji Andi", amount: 6_000_000, type: "incoming", category: "pendapatan", accountId: "a-bca", pocketId: "pribadi", daysAgo: 28 },
    { title: "Sarapan Nasi Uduk", amount: 15_000, type: "outgoing", category: "makan", accountId: "a-cash", pocketId: "pribadi", daysAgo: 55 },
    { title: "Makan Siang Kantin", amount: 18_000, type: "outgoing", category: "makan", accountId: "a-cash", pocketId: "pribadi", daysAgo: 50 },
    { title: "Belanja Bulanan", amount: 420_000, type: "outgoing", category: "belanja", accountId: "a-bca", pocketId: "pribadi", daysAgo: 45 },
    { title: "Bensin", amount: 60_000, type: "outgoing", category: "transport", accountId: "a-cash", pocketId: "pribadi", daysAgo: 40 },
    { title: "Parkir Mall", amount: 5_000, type: "outgoing", category: "transport", accountId: "a-cash", pocketId: "pribadi", daysAgo: 35 },
    { title: "Makan Malam Warteg", amount: 20_000, type: "outgoing", category: "makan", accountId: "a-cash", pocketId: "pribadi", daysAgo: 30 },
    { title: "Beli Baju Lebaran", amount: 250_000, type: "outgoing", category: "belanja", accountId: "a-bca", pocketId: "pribadi", daysAgo: 22 },
    { title: "Ongkos Ojek", amount: 25_000, type: "outgoing", category: "transport", accountId: "a-cash", pocketId: "pribadi", daysAgo: 15 },
    { title: "Kopi Pagi", amount: 22_000, type: "outgoing", category: "makan", accountId: "a-cash", pocketId: "pribadi", daysAgo: 8 },
    { title: "Belanja Mingguan", amount: 180_000, type: "outgoing", category: "belanja", accountId: "a-bca", pocketId: "pribadi", daysAgo: 2 },
  ],
};

const USER_B: DummyUserConfig = {
  email: "userb.dummy@kantongku.test",
  name: "Budi (Dummy B)",
  accounts: [
    { id: "b-mandiri", name: "Bank Mandiri", icon: "bank", color: "orange", initialBalance: 12_000_000 },
    { id: "b-gopay", name: "GoPay", icon: "smartphone", color: "cyan", initialBalance: 450_000 },
    { id: "b-ovo", name: "OVO", icon: "smartphone", color: "purple", initialBalance: 200_000 },
    { id: "b-cash", name: "Cash", icon: "cash", color: "amber", initialBalance: 750_000 },
  ],
  categories: [
    { id: "pendapatan", name: "Pendapatan", icon: "income", color: "emerald" },
    { id: "belanja", name: "Belanja", icon: "shopping", color: "rose" },
    { id: "hiburan", name: "Hiburan", icon: "game", color: "purple" },
    { id: "kesehatan", name: "Kesehatan", icon: "heart", color: "pink" },
    { id: "pendidikan", name: "Pendidikan", icon: "education", color: "sky" },
  ],
  transactions: [
    { title: "Gaji Budi", amount: 15_000_000, type: "incoming", category: "pendapatan", accountId: "b-mandiri", pocketId: "pribadi", daysAgo: 62 },
    { title: "Gaji Budi", amount: 15_000_000, type: "incoming", category: "pendapatan", accountId: "b-mandiri", pocketId: "pribadi", daysAgo: 32 },
    { title: "Bonus Tahunan", amount: 5_000_000, type: "incoming", category: "pendapatan", accountId: "b-mandiri", pocketId: "bisnis", daysAgo: 20 },
    { title: "Top Up OVO", amount: 200_000, type: "incoming", category: "pendapatan", accountId: "b-ovo", pocketId: "pribadi", daysAgo: 50 },
    { title: "Biaya Kursus Online", amount: 350_000, type: "outgoing", category: "pendidikan", accountId: "b-mandiri", pocketId: "pribadi", daysAgo: 48 },
    { title: "Konsultasi Dokter", amount: 200_000, type: "outgoing", category: "kesehatan", accountId: "b-cash", pocketId: "pribadi", daysAgo: 44 },
    { title: "Nonton Konser", amount: 750_000, type: "outgoing", category: "hiburan", accountId: "b-gopay", pocketId: "pribadi", daysAgo: 38 },
    { title: "Beli Vitamin", amount: 120_000, type: "outgoing", category: "kesehatan", accountId: "b-cash", pocketId: "pribadi", daysAgo: 33 },
    // Must stay chronologically AFTER "Bonus Tahunan" above (daysAgo 20) —
    // it's the only 'bisnis' credit b-mandiri ever gets, so a 'bisnis' debit
    // dated earlier would drive that pocket's allocation bucket negative and
    // get floored to 0 by buildAppData's Math.max(0, ...) clamping,
    // permanently drifting b-mandiri's balance away from the sum of its
    // allocations (see the comment on the 'bisnis' entries in
    // DEV_DAILY_TEMPLATES above for the same failure mode).
    { title: "Belanja Gadget", amount: 1_200_000, type: "outgoing", category: "belanja", accountId: "b-mandiri", pocketId: "bisnis", daysAgo: 15 },
    { title: "Langganan Spotify", amount: 55_000, type: "outgoing", category: "hiburan", accountId: "b-ovo", pocketId: "pribadi", daysAgo: 24 },
    { title: "Buku Pelajaran", amount: 180_000, type: "outgoing", category: "pendidikan", accountId: "b-cash", pocketId: "pribadi", daysAgo: 19 },
    { title: "Nonton Bioskop", amount: 100_000, type: "outgoing", category: "hiburan", accountId: "b-gopay", pocketId: "pribadi", daysAgo: 11 },
    { title: "Belanja Bulanan", amount: 900_000, type: "outgoing", category: "belanja", accountId: "b-mandiri", pocketId: "pribadi", daysAgo: 6 },
    { title: "Check-up Kesehatan", amount: 300_000, type: "outgoing", category: "kesehatan", accountId: "b-cash", pocketId: "pribadi", daysAgo: 2 },
  ],
};

const USER_C: DummyUserConfig = {
  email: "userc.dummy@kantongku.test",
  name: "Citra (Dummy C)",
  accounts: [
    { id: "c-cash", name: "Cash", icon: "cash", color: "amber", initialBalance: 800_000 },
  ],
  categories: [
    { id: "pendapatan", name: "Pendapatan", icon: "income", color: "emerald" },
    { id: "belanja", name: "Belanja", icon: "shopping", color: "rose" },
    { id: "belanja-online", name: "Belanja Online", icon: "shopping", color: "cyan" },
  ],
  transactions: [
    { title: "Uang Saku Bulanan", amount: 1_500_000, type: "incoming", category: "pendapatan", accountId: "c-cash", pocketId: "pribadi", daysAgo: 40 },
    { title: "Uang Saku Bulanan", amount: 1_500_000, type: "incoming", category: "pendapatan", accountId: "c-cash", pocketId: "pribadi", daysAgo: 10 },
    { title: "Belanja Pasar", amount: 85_000, type: "outgoing", category: "belanja", accountId: "c-cash", pocketId: "pribadi", daysAgo: 36 },
    { title: "Checkout Shopee", amount: 120_000, type: "outgoing", category: "belanja-online", accountId: "c-cash", pocketId: "pribadi", daysAgo: 30 },
    { title: "Jajan Sore", amount: 15_000, type: "outgoing", category: "belanja", accountId: "c-cash", pocketId: "pribadi", daysAgo: 25 },
    { title: "Checkout Tokopedia", amount: 95_000, type: "outgoing", category: "belanja-online", accountId: "c-cash", pocketId: "pribadi", daysAgo: 18 },
    { title: "Beli Alat Tulis", amount: 40_000, type: "outgoing", category: "belanja", accountId: "c-cash", pocketId: "pribadi", daysAgo: 12 },
    { title: "Checkout Shopee", amount: 65_000, type: "outgoing", category: "belanja-online", accountId: "c-cash", pocketId: "pribadi", daysAgo: 7 },
    { title: "Belanja Bulanan", amount: 150_000, type: "outgoing", category: "belanja", accountId: "c-cash", pocketId: "pribadi", daysAgo: 3 },
    { title: "Jajan Sore", amount: 12_000, type: "outgoing", category: "belanja", accountId: "c-cash", pocketId: "pribadi", daysAgo: 1 },
  ],
};

const COLLABORATOR_EMAIL = "userd.dummy@kantongku.test";

async function main() {
  if (RESET) {
    console.log("--reset: menghapus users dummy yang ada (dan seluruh data terkait via CASCADE)...");
    await pool.query(`DELETE FROM users WHERE email = ANY($1)`, [DUMMY_EMAILS]);
  }

  console.log(`Seeding ${DEV_TEST_USER.email} (${DEV_TEST_USER.transactions.length} transaksi / 3 bulan, + budgets/reminders/debts/notifications/transfers) ...`);
  const devUserId = await upsertUser(DEV_TEST_USER.email, DEV_TEST_USER.name);
  await writeAppData(devUserId, DEV_TEST_USER);

  console.log(`Seeding ${USER_A.email} (2 wallet) ...`);
  const userAId = await upsertUser(USER_A.email, USER_A.name);
  await writeAppData(userAId, USER_A);

  console.log(`Seeding ${USER_B.email} (4 wallet) ...`);
  const userBId = await upsertUser(USER_B.email, USER_B.name);
  await writeAppData(userBId, USER_B);

  console.log(`Seeding ${USER_C.email} (1 wallet) ...`);
  const userCId = await upsertUser(USER_C.email, USER_C.name);
  await writeAppData(userCId, USER_C);

  console.log(`Provisioning ${COLLABORATOR_EMAIL} as User A's ACTIVE collaborator (Task 2: via a simulated settled order) ...`);
  // Login-only row, status left at the default ('pending') — their access
  // must come ENTIRELY from the active `collaborators` row below, never from
  // their own users.status (see upsertUser's `activate` param comment).
  // Deliberately NEVER given its own user_app_data: logging in as this email
  // should show User A's data via req.effectiveUserId (server.ts), not an
  // empty account of its own.
  await upsertUser(COLLABORATOR_EMAIL, "Dummy Collaborator (D)", false);

  // Simulate a real confirmed collaborator-seat order (Task 2 revision —
  // collaboration is no longer a free stub) so `collaborators.order_id` is
  // set exactly like a real admin-confirmed order would leave it — this is
  // what makes the free "Sambungkan Lagi" reconnect legitimate after a
  // disconnect. Skips the actual HTTP flow (no server running while this
  // script executes) but leaves the DB in the identical end state.
  const collabOrderResult = await pool.query(
    `INSERT INTO orders (order_code, name, email, channel, base_amount, unique_code, total_amount, status, expires_at, confirmed_at, confirmed_by, order_type, collaborator_owner_user_id, collaborator_email)
     VALUES ($1, $2, $3, 'doku', 17900, 0, 17900, 'settlement', now() + interval '24 hours', now(), 'admin (seed script)', 'collaborator', $4, $3)
     ON CONFLICT (order_code) DO UPDATE SET status = 'settlement'
     RETURNING id`,
    [`KK-SEED-${COLLABORATOR_EMAIL.split("@")[0].toUpperCase()}`, `Kolaborator untuk ${USER_A.email}`, COLLABORATOR_EMAIL, userAId]
  );
  const collabOrderId = collabOrderResult.rows[0].id;

  await pool.query(
    `INSERT INTO collaborators (owner_user_id, email, status, activated_at, order_id)
     VALUES ($1, $2, 'active', now(), $3)
     ON CONFLICT (owner_user_id, email) DO UPDATE SET status = 'active', activated_at = now(), order_id = $3`,
    [userAId, COLLABORATOR_EMAIL, collabOrderId]
  );

  console.log("\nSelesai. Login lokal (dev-only) via POST /api/dev/login-as-test-user dengan body { email }:");
  console.log(`  - ${DEV_TEST_USER.email}  (akun single-test biasa, tombol [DEV] default)`);
  console.log(`  - ${USER_A.email}         (2 wallet, owner dari kolaborator di bawah)`);
  console.log(`  - ${USER_B.email}         (4 wallet)`);
  console.log(`  - ${USER_C.email}         (1 wallet)`);
  console.log(`  - ${COLLABORATOR_EMAIL}         (kolaborator AKTIF milik ${USER_A.email} — harus menampilkan data yang SAMA dengan User A; login-nya sendiri PENDING, akses murni dari baris collaborators)`);
}

main()
  .catch((err) => {
    console.error("Gagal seed data dummy:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
