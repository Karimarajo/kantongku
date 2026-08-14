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

