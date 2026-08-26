export type PocketType = string;

export interface Pocket {
  id: PocketType;
  name: string;
  balance: number;
  icon: string;
  tag: string;
  color: string; // Tailwind color class or hex string
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  icon: string; // bank, wallet, smartphone, cash, etc.
  color: string; // theme color
  accountNumber?: string; // No Rekening
  ownerName?: string; // Nama Pemilik Rekening
  allocations?: Record<string, number>; // pocketId -> amount
}

export type CategoryType = string;

export interface Category {
  id: CategoryType;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'incoming' | 'outgoing';
  pocketId: PocketType;
  accountId: string; // Link to Rekening / Dompet
  category: CategoryType;
  date: string; // ISO String or Date representation
  notes?: string;
  // Email of whoever actually entered this transaction. Only meaningfully
  // populated for transactions made through a SHARED pocket (see
  // PocketShare below) — someone other than the pocket's owner, editing the
  // owner's own wallet balance. Undefined for historical transactions from
  // before this field existed, and for an owner's own normal transactions
  // (where "me" is implicit) — the export feature falls back to the
  // current user's own email in that case, never leaves the column blank.
  inputBy?: string;
}

export interface Budget {
  id: string;
  title: string;
  spent: number;
  limit: number;
  category: CategoryType | CategoryType[];
  categories?: CategoryType[];
  sisaPercent: number;
  type: 'expense_limit' | 'target_funding'; // expense limit has threshold alerts, target funding accumulates towards a target
  timeframe?: string;
  startDate?: string;
  endDate?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'info' | 'warning' | 'success';
}

export interface UserProfile {
  email: string;
  name: string;
  avatarUrl: string;
  joinedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  time: string; // Format: "HH:MM"
  repeatType: 'once' | 'every_day' | 'every_week' | 'every_month';
  isActive: boolean;
  createdAt: string; // ISO date string
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  dayOfMonth: number; // 1-31 (day of month)
  lastTriggeredDate?: string; // Format: "YYYY-MM-DD"
  targetDate?: string; // Format: "YYYY-MM-DD"
}

// Internal movement of balance between two Accounts (wallets). Deliberately
// NOT a Transaction — must stay excluded from income/expense reports.
export interface WalletTransferLog {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note?: string;
  date: string; // ISO string
}

// Purely textual/historical activity feed. Must never be read by any
// balance/report calculation — logging failures must never block the
// action they describe.
export interface ActivityLogEntry {
  id: string;
  message: string;
  timestamp: string; // ISO string
  category?: string;
  icon?: string;
}

// Kelola Cicilan/Hutang (cicilan-ai-notifikasi Task 3) — stored inside the
// same per-user JSONB blob (user_app_data) as pockets/transactions/budgets/
// reminders, NOT a new relational table. Task 0 of that prompt explicitly
// asked to follow whatever convention the rest of the project already uses
// for per-user financial data before reaching for a new SQL table, and every
// other per-user record in this app (transactions, budgets, reminders,
// activityLog, walletTransferLogs) already lives in that same blob, loaded/
// saved as one unit via GET/PUT /api/data — a relational `debts` table would
// be the only per-user financial record NOT following that pattern, adding a
// migration + a second persistence path for no real benefit here (no
// cross-user query ever needs to join into other users' debts, unlike
// orders/collaborators which the Admin Console legitimately queries across
// everyone). Money fields are plain `number` for the same reason every other
// monetary field in this same blob is (amount/balance/limit) — the prompt's
// suggested `NUMERIC` column type is a SQL-table concern that doesn't carry
// over 1:1 to a JSONB value; precision behavior here is identical to every
// other Rupiah amount already stored this way in production.
export interface Debt {
  id: string;
  name: string;
  principalAmount: number;
  monthlyInstallment: number;
  tenorMonths: number;
  dueDay: number; // 1-31, reused to derive the linked Reminder's dayOfMonth
  startDate: string; // "YYYY-MM-DD"
  status: 'active' | 'paid_off';
  createdAt: string; // ISO string
  // id of the Reminder auto-created alongside this debt (see handleAddDebt in
  // App.tsx) — kept so deleting the debt can also clean up its reminder
  // instead of leaving an orphaned monthly alarm behind.
  reminderId?: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  paidAmount: number;
  paidAt: string; // ISO string
}

// v11: per-pocket sharing, REPLACES the old whole-account "Collaborator"
// concept — an owner shares ONE pocket (not their whole account) with
// another already-registered-and-active KantongKu user, for free (no
// order/payment involved, unlike the old collaborator flow). Field names
// match the raw Postgres `pocket_shares` columns (snake_case), same
// convention the old `Collaborator`/AdminConsole.tsx's Order/AdminUser
// interfaces already used rather than introducing a transform layer.
export interface PocketShare {
  id: string;
  owner_user_id: string;
  pocket_id: string;
  invited_email: string;
  // 'pending' = invited, awaiting the invitee's explicit accept/decline.
  // 'active' = invitee accepted, can see/transact in the shared pocket.
  // 'revoked' = declined by the invitee, or disconnected by the owner.
  status: 'pending' | 'active' | 'revoked';
  invited_at: string;
  activated_at: string | null;
  disconnected_at: string | null;
  disconnected_by: 'owner' | 'invitee' | null;
}

// What an invitee actually sees for one pocket shared TO them — the
// owner's pocket + only the transactions/accounts/categories that pocket
// touches, never the owner's other pockets/wallets. Returned by GET
// /api/data as a `sharedPockets` array alongside (not merged into) the
// caller's own pockets/transactions/accounts/categories.
export interface SharedPocketBundle {
  shareId: string;
  ownerUserId: string;
  ownerName: string;
  pocket: Pocket;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

