export type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'housing'
  | 'utilities'
  | 'entertainment'
  | 'health'
  | 'shopping'
  | 'travel'
  | 'other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food',
  'transport',
  'housing',
  'utilities',
  'entertainment',
  'health',
  'shopping',
  'travel',
  'other',
];

export type Expense = {
  id: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseListResponse = {
  items: Expense[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DashboardSummary = {
  total: number;
  count: number;
  byCategory: Array<{ category: string; amount: number }>;
  byMonth: Array<{ month: string; amount: number }>;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};
