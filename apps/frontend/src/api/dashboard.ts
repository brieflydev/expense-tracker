import { apiRequest } from './client';
import type { DashboardSummary } from '../types';

export async function fetchDashboardSummary(params?: {
  from?: string;
  to?: string;
}): Promise<DashboardSummary> {
  const search = new URLSearchParams();
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  const qs = search.toString();
  return apiRequest<DashboardSummary>(
    `/api/dashboard/summary${qs ? `?${qs}` : ''}`,
  );
}
