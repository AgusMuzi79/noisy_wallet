export type TransactionType = 'expense' | 'income' | 'recurring_credit';

export type Author = 'agus' | 'novia';

export interface Category {
  id: string;
  name: string;
  icon: string;
  is_default: boolean;
  active: boolean;
  created_at: string;
}

export interface RecurringSource {
  id: string;
  name: string;
  amount: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  category?: Category;
  author: Author | null;
  note: string | null;
  date: string;
  recurring_source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: 1;
  notification_enabled: boolean;
  notification_hour: number;
  notification_minute: number;
  initial_balance: number;
  lock_enabled: boolean;
}

export interface MonthlyCredit {
  id: string;
  year: number;
  month: number;
  total_amount: number;
  credited_at: string;
}
