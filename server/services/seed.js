/**
 * seed.js — initial demo data.
 * Run on first start (no data dir) or via admin reset endpoint.
 */
import {
  writeJSON,
  appendTransaction,
  clearAllData
} from './storage.js';

function id() {
  return 'txn_' + Math.random().toString(36).slice(2, 10);
}

const now = () => new Date().toISOString();

/* --------- Static reference data --------- */

const CATEGORIES = [
  { id: 'housing',    name: 'Housing',           icon: 'housing',      tone: 'default' },
  { id: 'groceries',  name: 'Groceries',         icon: 'food',         tone: 'primary' },
  { id: 'dining',     name: 'Dining out',        icon: 'fun',          tone: 'accent'  },
  { id: 'transport',  name: 'Transport',         icon: 'transport',    tone: 'default' },
  { id: 'utilities',  name: 'Utilities',         icon: 'utilities',    tone: 'default' },
  { id: 'subs',       name: 'Subscriptions',     icon: 'subscription', tone: 'default' },
  { id: 'shopping',   name: 'Shopping',          icon: 'shop',         tone: 'accent'  },
  { id: 'health',     name: 'Health & wellness', icon: 'health',       tone: 'default' },
  { id: 'income',     name: 'Income',            icon: 'arrowUp',      tone: 'primary' }
];

const BUDGETS = {
  housing:   1500,
  groceries: 800,
  dining:    350,
  transport: 400,
  utilities: 250,
  subs:      150,
  shopping:  200,
  health:    200
};

const SAVINGS_GOALS = [
  {
    id: 'goal_india',
    label: 'India trip',
    target: 10000,
    current: 7000,
    deadline: '2026-04-30'
  }
];

const SETTINGS = {
  user: { name: 'Vasanth', initial: 'V' },
  currency: 'USD',
  monthlyBudget: 4200
};

/* --------- Transactions: 3 months of demo data --------- */
/* Helper: build a transaction record */
function txn(date, merchant, amount, category, note = '') {
  return {
    id: id(),
    date,
    merchant,
    amount,
    category,
    note,
    isIncome: category === 'income',
    createdAt: now()
  };
}

const TRANSACTIONS = [
  /* ---- November 2025 (current month - matches prototype) ---- */
  txn('2025-11-18', 'Whole Foods Market', 84.32, 'groceries'),
  txn('2025-11-18', 'Spotify Family',     16.99, 'subs', 'Recurring'),
  txn('2025-11-17', 'Izakaya Kuma',       62.40, 'dining'),
  txn('2025-11-17', 'Shell Gas Station',  48.10, 'transport'),
  txn('2025-11-17', 'Salary · Payroll', 4820.00, 'income', 'Direct deposit'),
  txn('2025-11-15', 'ComEd Electric',    142.55, 'utilities', 'Autopay'),
  txn('2025-11-15', "Trader Joe's",       51.88, 'groceries'),
  txn('2025-11-15', 'Target',             73.21, 'shopping'),
  txn('2025-11-12', 'Rent',             1450.00, 'housing'),
  txn('2025-11-10', 'Costco',            186.40, 'groceries'),
  txn('2025-11-09', 'Chipotle',           14.20, 'dining'),
  txn('2025-11-08', 'Netflix',            22.99, 'subs', 'Recurring'),
  txn('2025-11-07', 'CVS Pharmacy',       38.45, 'health'),
  txn('2025-11-06', 'Sweetgreen',         16.50, 'dining'),
  txn('2025-11-05', 'Uber',               24.30, 'transport'),
  txn('2025-11-04', 'Whole Foods',        67.10, 'groceries'),
  txn('2025-11-03', 'AT&T Internet',      85.00, 'utilities', 'Autopay'),
  txn('2025-11-02', 'Blue Bottle Coffee',  6.75, 'dining'),
  txn('2025-11-01', 'Joe Fortes Steakhouse', 187.40, 'dining'),
  txn('2025-11-01', 'New Balance',        129.99, 'shopping'),
  txn('2025-11-01', 'Equinox',            89.00, 'health', 'Monthly membership'),
  txn('2025-11-01', 'MasterClass',        15.00, 'subs', 'Recurring'),

  /* ---- October 2025 ---- */
  txn('2025-10-29', 'Halloween Decor — Target', 42.30, 'shopping'),
  txn('2025-10-28', 'Whole Foods Market', 92.15, 'groceries'),
  txn('2025-10-26', 'Pizza Hut',          28.50, 'dining'),
  txn('2025-10-25', 'Uber',               19.40, 'transport'),
  txn('2025-10-22', 'Shell Gas Station',  52.10, 'transport'),
  txn('2025-10-20', 'Netflix',            22.99, 'subs'),
  txn('2025-10-18', 'Salary · Payroll', 4820.00, 'income'),
  txn('2025-10-17', "Trader Joe's",       64.20, 'groceries'),
  txn('2025-10-15', 'ComEd Electric',    156.80, 'utilities'),
  txn('2025-10-15', 'Chipotle',           17.85, 'dining'),
  txn('2025-10-12', 'Rent',             1450.00, 'housing'),
  txn('2025-10-10', 'Costco',            174.30, 'groceries'),
  txn('2025-10-08', 'Spotify Family',     16.99, 'subs'),
  txn('2025-10-05', 'Blue Bottle Coffee',  7.25, 'dining'),
  txn('2025-10-03', 'AT&T Internet',      85.00, 'utilities'),
  txn('2025-10-02', 'Sephora',            68.40, 'shopping'),
  txn('2025-10-01', 'Equinox',            89.00, 'health'),
  txn('2025-10-01', 'MasterClass',        15.00, 'subs'),

  /* ---- September 2025 ---- */
  txn('2025-09-29', 'Whole Foods Market', 78.90, 'groceries'),
  txn('2025-09-27', 'Local Diner',        32.40, 'dining'),
  txn('2025-09-25', 'Uber',               21.10, 'transport'),
  txn('2025-09-22', 'Shell Gas Station',  47.30, 'transport'),
  txn('2025-09-20', 'Netflix',            22.99, 'subs'),
  txn('2025-09-18', 'Salary · Payroll', 4820.00, 'income'),
  txn('2025-09-17', "Trader Joe's",       58.45, 'groceries'),
  txn('2025-09-15', 'ComEd Electric',    132.20, 'utilities'),
  txn('2025-09-14', 'Sushi Bar',          54.80, 'dining'),
  txn('2025-09-12', 'Rent',             1450.00, 'housing'),
  txn('2025-09-10', 'Costco',            162.55, 'groceries'),
  txn('2025-09-08', 'Spotify Family',     16.99, 'subs'),
  txn('2025-09-05', 'Blue Bottle Coffee',  6.50, 'dining'),
  txn('2025-09-03', 'AT&T Internet',      85.00, 'utilities'),
  txn('2025-09-01', 'Equinox',            89.00, 'health'),
  txn('2025-09-01', 'MasterClass',        15.00, 'subs')
];

/* --------- Public seed function --------- */

export async function seed() {
  await clearAllData();
  await writeJSON('categories.json',    CATEGORIES);
  await writeJSON('budgets.json',       BUDGETS);
  await writeJSON('savings-goals.json', SAVINGS_GOALS);
  await writeJSON('settings.json',      { ...SETTINGS, isDemo: true });

  for (const t of TRANSACTIONS) {
    await appendTransaction(t);
  }

  return {
    transactions: TRANSACTIONS.length,
    categories: CATEGORIES.length,
    budgets: Object.keys(BUDGETS).length,
    goals: SAVINGS_GOALS.length
  };
}

export async function clearAndInit() {
  // Clean slate but with empty defaults so the app doesn't crash
  await clearAllData();
  await writeJSON('categories.json',    CATEGORIES);
  await writeJSON('budgets.json',       {});
  await writeJSON('savings-goals.json', []);
  await writeJSON('settings.json',      { ...SETTINGS, isDemo: false });
  return { cleared: true };
}
