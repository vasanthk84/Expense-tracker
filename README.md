# Ledger — Household Budget Portal

A full-stack household budgeting app. React frontend, Express backend, file-based persistence (no database required).

- **Frontend:** React 18 + Vite + React Router
- **Backend:** Node + Express
- **Persistence:** Month-grouped JSONL for transactions, plain JSON for everything else
- **Theming:** Light + dark, persisted to `localStorage`
- **Responsive:** Mobile-first with a desktop sidebar layout above 900px

## Quick start

```bash
npm install
npm run dev
```

That runs the API server (port 3001) and the Vite dev server (port 5173) together. Open <http://localhost:5173> — Vite proxies `/api/*` to the backend automatically.

On first launch, the backend seeds 56 demo transactions across September–November 2025. A "Viewing demo data · Clear & start fresh" banner appears at the top of every screen until you clear it.

### Other scripts

```bash
npm run build      # production build of the frontend
npm run preview    # preview the production build
npm start          # run the API server only
npm run dev:api    # API server only (port 3001)
npm run dev:web    # Vite dev server only (port 5173)
```

## How data is stored

```
server/data/
├── transactions/
│   ├── 2025-09.jsonl      ← one JSON object per line, sorted newest-first
│   ├── 2025-10.jsonl
│   └── 2025-11.jsonl
├── budgets.json           ← { categoryId: amount }
├── categories.json        ← [{ id, name, icon, tone }, ...]
├── savings-goals.json     ← [{ id, label, target, current, deadline }, ...]
└── settings.json          ← { user, currency, monthlyBudget, isDemo }
```

A single transaction line looks like:

```json
{"id":"txn_abc123","date":"2025-11-18","merchant":"Whole Foods Market","amount":84.32,"category":"groceries","note":"","isIncome":false,"createdAt":"2025-11-18T14:23:11.000Z"}
```

**Why this layout:**
- Month-grouped means a year of monthly reports reads 12 small files instead of 365 daily ones
- JSONL means new transactions append in O(1) — one line at the end of the current month's file
- Edits and deletes rewrite a single monthly file (~200 lines max for typical households)
- Atomic writes via temp-file + rename — no half-written corruption
- Fully human-readable; you can `cat`, `grep`, or hand-edit any file

The whole `server/data/` folder is gitignored. Back it up by copying the folder.

## Resetting / clearing data

There are two ways to wipe the demo data and start fresh:

1. **Demo banner** — appears at the top of every screen while demo data is loaded. One click on "Clear & start fresh" with a confirmation modal.
2. **Settings → Danger zone** — also accessible from the bottom-nav "Account" tab.
   - **Clear all data** — removes every transaction, budget, and goal. Categories preserved.
   - **Restore demo data** — wipes whatever is there and re-seeds the 56 demo transactions.

Both actions hit `POST /api/admin/reset` with `{ mode: "clear" | "seed" }`.

## API reference

All routes live under `/api`. Errors return `{ error, message?, details? }` with appropriate HTTP status.

### Transactions

| Method | Path | Body / Query |
|---|---|---|
| `GET`    | `/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&category=&limit=` | List transactions in a date range |
| `GET`    | `/transactions/:id` | Fetch one |
| `POST`   | `/transactions` | `{ date, merchant, amount, category, note?, isIncome? }` |
| `PATCH`  | `/transactions/:id` | Partial update; if date moves to a new month, the file is migrated |
| `DELETE` | `/transactions/:id` | 204 on success |

### Config

| Method | Path | Notes |
|---|---|---|
| `GET`   | `/categories` | All categories |
| `GET`   | `/budgets` | `{ categoryId: amount }` |
| `PUT`   | `/budgets` | Replace all |
| `PATCH` | `/budgets/:categoryId` | `{ amount }` for one category |
| `GET`   | `/savings-goals` | List |
| `PUT`   | `/savings-goals` | Replace all |
| `GET`   | `/settings` | User name, currency, monthly budget, demo flag |
| `PATCH` | `/settings` | Partial update |

### Analytics (server-side aggregations over the JSONL)

| Path | Returns |
|---|---|
| `/analytics/summary?month=YYYY-MM` | `{ spent, budget, remaining, daysLeft, txnCount }` |
| `/analytics/budget-utilization?month=` | Per-category budget vs spent with % |
| `/analytics/category-breakdown?from=&to=` | Donut-ready slices with colors |
| `/analytics/trend?endMonth=&count=6` | Monthly totals for last N months |
| `/analytics/comparison?month=` | This month vs last month per category |
| `/analytics/forecast?endMonth=&past=6&future=6` | Linear regression projection with ±10% uncertainty band |
| `/analytics/insights?month=` | Pattern detection — spikes, over-budget, day-of-week patterns |
| `/analytics/weekly-pattern?month=` | Day-of-week spending shape |

### Reports

| Path | Notes |
|---|---|
| `/reports?type=monthly` | One report per JSONL file present on disk |
| `/reports?type=quarterly` | Auto-grouped by calendar quarter |
| `/reports?type=annual` | Auto-grouped by year |

### Admin

| Method | Path | Body |
|---|---|---|
| `GET`  | `/admin/status` | `{ ok, isDemo, hasSettings }` |
| `POST` | `/admin/reset` | `{ mode: "clear" \| "seed" }` |

### Health

`GET /api/health` → `{ ok: true }`

## Project structure

```
ledger-app/
├── package.json                         # backend + frontend deps, concurrently runs both
├── vite.config.js                       # /api proxy to backend
├── index.html                           # Vite entry
├── README.md
├── .gitignore
│
├── server/                              # ───── BACKEND ─────
│   ├── index.js                         # Express app, auto-seed on first run
│   ├── routes/
│   │   ├── transactions.js              # CRUD with validation
│   │   ├── config.js                    # budgets, categories, goals, settings
│   │   ├── analytics.js                 # 8 analytics endpoints
│   │   ├── reports.js                   # monthly/quarterly/annual rollups
│   │   └── admin.js                     # reset endpoint
│   ├── services/
│   │   ├── storage.js                   # ★ file I/O (JSONL + JSON, atomic writes)
│   │   ├── analytics.js                 # ★ aggregation math + forecast regression
│   │   └── seed.js                      # demo data
│   ├── test/
│   │   └── smoke.js                     # `node server/test/smoke.js` to test the stack
│   └── data/                            # gitignored — created on first boot
│
└── src/                                 # ───── FRONTEND ─────
    ├── main.jsx                         # ThemeProvider + ToastProvider + Router
    ├── App.jsx                          # <Routes> mapping URLs → screens
    │
    ├── api/
    │   ├── client.js                    # fetch wrapper with ApiError
    │   └── endpoints.js                 # one fn per endpoint, by resource
    │
    ├── hooks/
    │   ├── useApi.js                    # generic data hook with refetch + invalidation
    │   └── useData.js                   # 13 domain hooks (useTransactions, useMonthSummary, ...)
    │
    ├── context/
    │   ├── ThemeContext.jsx             # light/dark with localStorage
    │   └── ToastContext.jsx             # transient feedback after mutations
    │
    ├── utils/
    │   ├── eventBus.js                  # pub/sub for cross-hook invalidation
    │   └── date.js                      # formatMoney, groupByDate, currentMonth, ...
    │
    ├── layouts/
    │   ├── AppShell.jsx                 # responsive: bottom nav (mobile) or sidebar (desktop)
    │   ├── DesktopSidebar.jsx           # ≥900px navigation
    │   └── DemoBanner.jsx               # "Viewing demo data · Clear & start fresh"
    │
    ├── components/
    │   ├── icons/Icon.jsx               # central icon registry (~25 icons)
    │   ├── layout/                      # AppHeader, BottomNav, FAB
    │   ├── ui/                          # Card, Button, Chip, Modal, ProgressBar, Insight,
    │   │                                # SearchBar, Segmented, SectionHead, TxnRow,
    │   │                                # CategoryIcon, AsyncStates (Loading/Error/Empty)
    │   └── charts/                      # SavingsRing, DonutChart, LineChart, BarChart, ForecastChart
    │
    ├── screens/
    │   ├── DashboardScreen.jsx          # /
    │   ├── ExpensesScreen.jsx           # /expenses
    │   ├── AddExpenseModal.jsx          # FAB-triggered modal (lives in AppShell)
    │   ├── AnalyticsScreen.jsx          # /analytics
    │   ├── ForecastScreen.jsx           # /forecast
    │   ├── ReportsScreen.jsx            # /reports
    │   ├── BudgetPlanningScreen.jsx     # /budgets
    │   ├── InsightsScreen.jsx           # /insights
    │   └── SettingsScreen.jsx           # /settings — includes danger zone
    │
    └── styles/
        ├── tokens.css                   # ★ design tokens (colors, fonts, radius, shadows)
        ├── globals.css                  # resets
        ├── components.css               # all component styles
        └── app.css                      # app shell layout (mobile + desktop)
```

## How the front-end talks to the back-end

```
┌─────────────────────────────────────────────────────────────────┐
│  Screen component (e.g. DashboardScreen)                         │
│    │                                                              │
│    ├─ useMonthSummary(month) ─────────────┐                      │
│    ├─ useBudgetUtilization(month) ────────┤                      │
│    └─ useTransactionMutations() → create  │                      │
│                                            │                      │
│  hooks/useData.js                          │                      │
│    │                                       │                      │
│    └─ useApi(fn, deps, refetchOn) ────────┤                      │
│                                            │                      │
│  api/endpoints.js → api/client.js          │                      │
│                                            ▼                      │
└──────────────────────────── HTTP /api/* ──────────────────────────┘
                              │
┌──────────────────────────── ▼ ────────────────────────────────────┐
│  Express                                                           │
│    └─ services/analytics.js  ←──  services/storage.js              │
│                                          │                         │
│                                          ▼                         │
│                              server/data/transactions/*.jsonl       │
└────────────────────────────────────────────────────────────────────┘
```

Mutations emit events on a tiny pub/sub (`utils/eventBus.js`); query hooks subscribe to relevant events and refetch automatically. Add a transaction → dashboard summary, budget utilization, trend, donut, insights all refetch without you wiring anything.

## Adding your own features

### A new analytics calculation
1. Add a function in `server/services/analytics.js`
2. Expose it in `server/routes/analytics.js`
3. Add a wrapper in `src/api/endpoints.js`
4. Add a hook in `src/hooks/useData.js`
5. Use it in a screen with `<AsyncBoundary>` for loading/error states

### A new screen
1. Create `src/screens/MyScreen.jsx`
2. Add a route in `src/App.jsx`
3. Add a nav item in `src/components/layout/BottomNav.jsx` and `src/layouts/DesktopSidebar.jsx`

### A new field on transactions
1. Update `validateTxn` in `server/routes/transactions.js`
2. Update `seed.js` if you want demo data with the field
3. Add the input in `src/screens/AddExpenseModal.jsx`
4. Existing JSONL files stay valid — JSON is forgiving about missing fields

## Things to add later

This is a real working app, but it's intentionally focused. Easy wins:

- **CSV / PDF export** in the Reports screen (stub UI exists)
- **Budget editing** in `/budgets` (read-only currently — the API endpoint exists)
- **Recurring transaction support** (subscriptions, rent, salary)
- **Multi-currency** (settings already has a `currency` field)
- **Authentication** — currently single-user; add a session middleware if you put this on the open internet
- **Backups** — cron job that copies `server/data/` somewhere safe

## License

Use freely.
