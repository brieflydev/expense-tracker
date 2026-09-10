import { apiRequest } from './client';
import type { Expense, ExpenseListResponse } from '../types';

export type ExpenseFilters = {
  q?: string;
  category?: string;
  from?: string;
  to?: string;
  sort?: 'date' | 'amount' | 'createdAt';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type ExpenseInput = {
  amount: number;
  currency?: string;
  category: string;
  description?: string | null;
  date: string;
};

function toQuery(filters: ExpenseFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function listExpenses(
  filters: ExpenseFilters = {},
): Promise<ExpenseListResponse> {
  return apiRequest<ExpenseListResponse>(`/api/expenses${toQuery(filters)}`);
}

export async function createExpense(
  input: ExpenseInput,
): Promise<{ expense: Expense }> {
  return apiRequest<{ expense: Expense }>('/api/expenses', {
    method: 'POST',
    body: input,
  });
}

export async function updateExpense(
  id: string,
  input: Partial<ExpenseInput>,
): Promise<{ expense: Expense }> {
  return apiRequest<{ expense: Expense }>(`/api/expenses/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteExpense(id: string): Promise<void> {
  return apiRequest<void>(`/api/expenses/${id}`, { method: 'DELETE' });
}
