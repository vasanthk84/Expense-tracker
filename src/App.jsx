import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './layouts/AppShell.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import ExpensesScreen from './screens/ExpensesScreen.jsx';
import AnalyticsScreen from './screens/AnalyticsScreen.jsx';
import ForecastScreen from './screens/ForecastScreen.jsx';
import ReportsScreen from './screens/ReportsScreen.jsx';
import BudgetPlanningScreen from './screens/BudgetPlanningScreen.jsx';
import InsightsScreen from './screens/InsightsScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/"          element={<DashboardScreen />} />
        <Route path="/expenses"  element={<ExpensesScreen />} />
        <Route path="/analytics" element={<AnalyticsScreen />} />
        <Route path="/forecast"  element={<ForecastScreen />} />
        <Route path="/reports"   element={<ReportsScreen />} />
        <Route path="/budgets"   element={<BudgetPlanningScreen />} />
        <Route path="/insights"  element={<InsightsScreen />} />
        <Route path="/settings"  element={<SettingsScreen />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
