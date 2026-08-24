// Dev-only tool — NOT auto-run by `npm run dev` or the production build, and
// NEVER touches real user data: every user this script creates/touches has
// an email under the dev/test domains below, nothing else.
//
// Seeds two things:
//   1. The [DEV] Login test account (dev-test-user@kantongku.local, same one
//      POST /api/dev/login-as-test-user creates on first use) — one wallet
//      set, for quick single-account smoke testing.
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

interface DummyUserConfig {
  email: string;
  name: string;
  accounts: AccountConfig[];
  categories: { id: string; name: string; icon: string; color: string }[];
  transactions: TransactionConfig[];
}

// Shared bookkeeping — mirrors exactly what App.tsx's handleAddTransaction
// does client-side, so the seeded balances/allocations are internally
// consistent (account.balance == initial + sum of its deltas, pocket.balance
// == sum of that pocket's allocation across accounts) instead of decorative.
function buildAppData(config: DummyUserConfig) {
  const now = Date.now();
  const transactions = config.transactions
    .map((t, idx) => ({
      id: `seed-${config.email.split("@")[0]}-t-${idx}`,
      title: t.title,
      amount: t.amount,
      type: t.type,
      category: t.category,
      accountId: t.accountId,
      pocketId: t.pocketId,
      date: new Date(now - t.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Data dummy (scripts/seed-dummy-data.ts)",
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const accounts = config.accounts.map((meta) => ({
    id: meta.id,
    name: meta.name,
    icon: meta.icon,
    color: meta.color,
    balance: meta.initialBalance,
    allocations: { pribadi: meta.initialBalance, bisnis: 0 } as Record<string, number>,
  }));

  for (const t of transactions) {
    const acc = accounts.find((a) => a.id === t.accountId);
    if (!acc) continue;
    const delta = t.type === "incoming" ? t.amount : -t.amount;
    acc.balance = Math.max(0, acc.balance + delta);
    acc.allocations[t.pocketId] = Math.max(0, (acc.allocations[t.pocketId] || 0) + delta);
  }

  const pockets = POCKETS.map((p) => ({
    ...p,
    balance: accounts.reduce((sum, a) => sum + (a.allocations[p.id] || 0), 0),
  }));

  return {
    profile: { name: config.name },
    pockets,
    accounts,
    categories: config.categories,
    transactions,
    budgets: [],
    notifications: [],
    reminders: [],
    walletTransferLogs: [],
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

// ── Config 1: the original single quick-test account ───────────────────────
const DEV_TEST_USER: DummyUserConfig = {
  email: "dev-test-user@kantongku.local",
  name: "Test User (Dev)",
  accounts: [
    { id: "acc-bca", name: "Bank BCA", icon: "bank", color: "indigo", initialBalance: 5_000_000 },
    { id: "acc-gopay", name: "GoPay", icon: "smartphone", color: "cyan", initialBalance: 300_000 },
    { id: "acc-cash", name: "Cash", icon: "cash", color: "amber", initialBalance: 1_000_000 },
  ],
  categories: [
    { id: "pendapatan", name: "Pendapatan", icon: "income", color: "emerald" },
    { id: "belanja", name: "Belanja", icon: "shopping", color: "rose" },
    { id: "topup", name: "Top Up Saldo", icon: "piggy", color: "teal" },
    { id: "makan", name: "Makan & Minum", icon: "food", color: "orange" },
    { id: "transport", name: "Transportasi", icon: "car", color: "sky" },
    { id: "hiburan", name: "Hiburan", icon: "game", color: "purple" },
  ],
  transactions: [
    { title: "Gaji Bulanan", amount: 8_500_000, type: "incoming", category: "pendapatan", accountId: "acc-bca", pocketId: "pribadi", daysAgo: 75 },
    { title: "Gaji Bulanan", amount: 8_500_000, type: "incoming", category: "pendapatan", accountId: "acc-bca", pocketId: "pribadi", daysAgo: 45 },
    { title: "Gaji Bulanan", amount: 8_500_000, type: "incoming", category: "pendapatan", accountId: "acc-bca", pocketId: "pribadi", daysAgo: 15 },
    { title: "Top Up GoPay", amount: 300_000, type: "incoming", category: "topup", accountId: "acc-gopay", pocketId: "pribadi", daysAgo: 60 },
    { title: "Top Up GoPay", amount: 200_000, type: "incoming", category: "topup", accountId: "acc-gopay", pocketId: "pribadi", daysAgo: 20 },
    { title: "Omset Jualan Online", amount: 2_500_000, type: "incoming", category: "pendapatan", accountId: "acc-bca", pocketId: "bisnis", daysAgo: 50 },
    { title: "Omset Jualan Online", amount: 3_100_000, type: "incoming", category: "pendapatan", accountId: "acc-bca", pocketId: "bisnis", daysAgo: 10 },
    { title: "Makan Siang Warteg", amount: 20_000, type: "outgoing", category: "makan", accountId: "acc-cash", pocketId: "pribadi", daysAgo: 70 },
    { title: "Kopi Kenangan", amount: 28_000, type: "outgoing", category: "makan", accountId: "acc-gopay", pocketId: "pribadi", daysAgo: 65 },
    { title: "Belanja Bulanan Indomaret", amount: 350_000, type: "outgoing", category: "belanja", accountId: "acc-bca", pocketId: "pribadi", daysAgo: 55 },
    { title: "Bensin Motor", amount: 50_000, type: "outgoing", category: "transport", accountId: "acc-cash", pocketId: "pribadi", daysAgo: 48 },
    { title: "Nonton Bioskop", amount: 100_000, type: "outgoing", category: "hiburan", accountId: "acc-gopay", pocketId: "pribadi", daysAgo: 40 },
    { title: "Makan Malam Nasi Padang", amount: 35_000, type: "outgoing", category: "makan", accountId: "acc-cash", pocketId: "pribadi", daysAgo: 35 },
    { title: "Beli Bahan Baku Jualan", amount: 800_000, type: "outgoing", category: "belanja", accountId: "acc-bca", pocketId: "bisnis", daysAgo: 30 },
    { title: "Ongkir Gojek Kirim Barang", amount: 45_000, type: "outgoing", category: "transport", accountId: "acc-gopay", pocketId: "bisnis", daysAgo: 25 },
    { title: "Langganan Netflix", amount: 65_000, type: "outgoing", category: "hiburan", accountId: "acc-bca", pocketId: "pribadi", daysAgo: 18 },
    { title: "Belanja Mingguan", amount: 275_000, type: "outgoing", category: "belanja", accountId: "acc-cash", pocketId: "pribadi", daysAgo: 12 },
    { title: "Makan Siang Ayam Geprek", amount: 22_000, type: "outgoing", category: "makan", accountId: "acc-gopay", pocketId: "pribadi", daysAgo: 5 },
    { title: "Servis Motor", amount: 150_000, type: "outgoing", category: "transport", accountId: "acc-cash", pocketId: "pribadi", daysAgo: 3 },
    { title: "Beli Kuota Internet", amount: 100_000, type: "outgoing", category: "belanja", accountId: "acc-gopay", pocketId: "pribadi", daysAgo: 1 },
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
    { title: "Belanja Gadget", amount: 1_200_000, type: "outgoing", category: "belanja", accountId: "b-mandiri", pocketId: "bisnis", daysAgo: 27 },
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

  console.log(`Seeding ${DEV_TEST_USER.email} ...`);
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
