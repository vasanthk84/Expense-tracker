/**
 * endpoints.js — typed-ish wrappers around the API client.
 * One function per endpoint. Components and hooks call these, never `api` directly.
 */
import { api } from './client.js';

/* ---- Transactions ---- */
export const transactionsApi = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== 'all')
    ).toString();
    return api.get(`/transactions${qs ? `?${qs}` : ''}`);
  },
  get:    (id)       => api.get(`/transactions/${id}`),
  create: (txn)      => api.post('/transactions', txn),
  update: (id, patch) => api.patch(`/transactions/${id}`, patch),
  remove: (id)       => api.delete(`/transactions/${id}`)
};

/* ---- Budgets ---- */
export const budgetsApi = {
  list:        ()                     => api.get('/budgets'),
  setAll:      (budgets)              => api.put('/budgets', budgets),
  setCategory: (categoryId, amount)   => api.patch(`/budgets/${categoryId}`, { amount })
};

/* ---- Categories ---- */
export const categoriesApi = {
  list: () => api.get('/categories')
};

/* ---- Savings goals ---- */
export const savingsApi = {
  list:   ()      => api.get('/savings-goals'),
  setAll: (goals) => api.put('/savings-goals', goals)
};

/* ---- Settings ---- */
export const settingsApi = {
  get:    ()      => api.get('/settings'),
  update: (patch) => api.patch('/settings', patch)
};

/* ---- Analytics ---- */
export const analyticsApi = {
  summary:           (month)                    => api.get(`/analytics/summary${month ? `?month=${month}` : ''}`),
  budgetUtilization: (month)                    => api.get(`/analytics/budget-utilization${month ? `?month=${month}` : ''}`),
  categoryBreakdown: (from, to)                 => api.get(`/analytics/category-breakdown${from ? `?from=${from}&to=${to}` : ''}`),
  trend:             (endMonth, count = 6)      => api.get(`/analytics/trend?endMonth=${endMonth}&count=${count}`),
  comparison:        (month)                    => api.get(`/analytics/comparison${month ? `?month=${month}` : ''}`),
  forecast:          (endMonth, past, future)   => {
    const qs = new URLSearchParams({ endMonth, past: past || 6, future: future || 6 }).toString();
    return api.get(`/analytics/forecast?${qs}`);
  },
  insights:       (month) => api.get(`/analytics/insights${month ? `?month=${month}` : ''}`),
  weeklyPattern:  (month) => api.get(`/analytics/weekly-pattern${month ? `?month=${month}` : ''}`)
};

/* ---- Reports ---- */
export const reportsApi = {
  list: (type = 'monthly') => api.get(`/reports?type=${type}`)
};

/* ---- Admin ---- */
export const adminApi = {
  status: ()      => api.get('/admin/status'),
  reset:  (mode)  => api.post('/admin/reset', { mode })
};
