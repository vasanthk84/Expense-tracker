import { useCallback } from 'react';
import { useApi } from './useApi.js';
import {
  transactionsApi,
  budgetsApi,
  categoriesApi,
  savingsApi,
  settingsApi,
  analyticsApi,
  reportsApi,
  adminApi
} from '../api/endpoints.js';
import { bus, EVENTS } from '../utils/eventBus.js';

/* ---- Reads ---- */

export function useTransactions(params = {}) {
  const key = JSON.stringify(params);
  return useApi(
    () => transactionsApi.list(params),
    [key],
    { refetchOn: [EVENTS.TXN_CHANGED, EVENTS.DATA_RESET] }
  );
}

export function useCategories() {
  return useApi(() => categoriesApi.list(), [], {
    refetchOn: [EVENTS.DATA_RESET]
  });
}

export function useBudgets() {
  return useApi(() => budgetsApi.list(), [], {
    refetchOn: [EVENTS.BUDGET_CHANGED, EVENTS.DATA_RESET]
  });
}

export function useSavingsGoals() {
  return useApi(() => savingsApi.list(), [], {
    refetchOn: [EVENTS.DATA_RESET]
  });
}

export function useSettings() {
  return useApi(() => settingsApi.get(), [], {
    refetchOn: [EVENTS.SETTINGS_CHANGED, EVENTS.DATA_RESET]
  });
}

export function useAdminStatus() {
  return useApi(() => adminApi.status(), [], {
    refetchOn: [EVENTS.DATA_RESET, EVENTS.SETTINGS_CHANGED]
  });
}

/* ---- Analytics ---- */

export function useMonthSummary(month) {
  return useApi(() => analyticsApi.summary(month), [month], {
    refetchOn: [EVENTS.TXN_CHANGED, EVENTS.BUDGET_CHANGED, EVENTS.DATA_RESET]
  });
}

export function useBudgetUtilization(month) {
  return useApi(() => analyticsApi.budgetUtilization(month), [month], {
    refetchOn: [EVENTS.TXN_CHANGED, EVENTS.BUDGET_CHANGED, EVENTS.DATA_RESET]
  });
}

export function useCategoryBreakdown(from, to) {
  return useApi(() => analyticsApi.categoryBreakdown(from, to), [from, to], {
    refetchOn: [EVENTS.TXN_CHANGED, EVENTS.DATA_RESET]
  });
}

export function useTrend(endMonth, count = 6) {
  return useApi(() => analyticsApi.trend(endMonth, count), [endMonth, count], {
    refetchOn: [EVENTS.TXN_CHANGED, EVENTS.DATA_RESET]
  });
}

export function useComparison(month) {
  return useApi(() => analyticsApi.comparison(month), [month], {
    refetchOn: [EVENTS.TXN_CHANGED, EVENTS.DATA_RESET]
  });
}

export function useForecast(endMonth, past, future) {
  return useApi(
    () => analyticsApi.forecast(endMonth, past, future),
    [endMonth, past, future],
    { refetchOn: [EVENTS.TXN_CHANGED, EVENTS.DATA_RESET] }
  );
}

export function useInsights(month) {
  return useApi(() => analyticsApi.insights(month), [month], {
    refetchOn: [EVENTS.TXN_CHANGED, EVENTS.BUDGET_CHANGED, EVENTS.DATA_RESET]
  });
}

export function useWeeklyPattern(month) {
  return useApi(() => analyticsApi.weeklyPattern(month), [month], {
    refetchOn: [EVENTS.TXN_CHANGED, EVENTS.DATA_RESET]
  });
}

export function useReports(type = 'monthly') {
  return useApi(() => reportsApi.list(type), [type], {
    refetchOn: [EVENTS.TXN_CHANGED, EVENTS.DATA_RESET]
  });
}

/* ---- Mutations ---- */

export function useTransactionMutations() {
  const create = useCallback(async (txn) => {
    const result = await transactionsApi.create(txn);
    bus.emit(EVENTS.TXN_CHANGED);
    return result;
  }, []);

  const update = useCallback(async (id, patch) => {
    const result = await transactionsApi.update(id, patch);
    bus.emit(EVENTS.TXN_CHANGED);
    return result;
  }, []);

  const remove = useCallback(async (id) => {
    await transactionsApi.remove(id);
    bus.emit(EVENTS.TXN_CHANGED);
  }, []);

  return { create, update, remove };
}

export function useBudgetMutations() {
  const setCategory = useCallback(async (categoryId, amount) => {
    const result = await budgetsApi.setCategory(categoryId, amount);
    bus.emit(EVENTS.BUDGET_CHANGED);
    return result;
  }, []);

  const setAll = useCallback(async (budgets) => {
    const result = await budgetsApi.setAll(budgets);
    bus.emit(EVENTS.BUDGET_CHANGED);
    return result;
  }, []);

  return { setCategory, setAll };
}

export function useAdminMutations() {
  const reset = useCallback(async (mode) => {
    const result = await adminApi.reset(mode);
    bus.emit(EVENTS.DATA_RESET);
    bus.emit(EVENTS.SETTINGS_CHANGED);
    return result;
  }, []);

  return { reset };
}
