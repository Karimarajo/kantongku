import { Pocket, Category, Transaction, Budget, Notification, Account, WalletTransferLog, ActivityLogEntry } from './types';

export const INITIAL_POCKETS: Pocket[] = [
  {
    id: 'pribadi',
    name: 'Kantong Pribadi',
    balance: 0,
    icon: 'user',
    tag: 'Pribadi',
    color: 'emerald'
  },
  {
    id: 'bisnis',
    name: 'Kantong Bisnis',
    balance: 0,
    icon: 'briefcase',
    tag: 'Bisnis',
    color: 'indigo'
  }
];

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-bca',
    name: 'Bank BCA',
    balance: 0,
    icon: 'bank',
    color: 'indigo'
  },
  {
    id: 'acc-cash',
    name: 'Cash',
    balance: 0,
    icon: 'cash',
    color: 'emerald'
  }
];

export const CATEGORIES: Category[] = [
  {
    id: 'pendapatan',
    name: 'Pendapatan',
    icon: 'income',
    color: 'emerald'
  },
  {
    id: 'belanja',
    name: 'Belanja',
    icon: 'shopping',
    color: 'rose'
  },
  {
    id: 'topup',
    name: 'Top Up Saldo',
    icon: 'piggy',
    color: 'teal'
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_BUDGETS: Budget[] = [];

export const INITIAL_NOTIFICATIONS: Notification[] = [];

export const INITIAL_WALLET_TRANSFER_LOGS: WalletTransferLog[] = [];

export const INITIAL_ACTIVITY_LOG: ActivityLogEntry[] = [];
