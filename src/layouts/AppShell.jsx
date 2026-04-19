import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DesktopSidebar from './DesktopSidebar.jsx';
import DemoBanner from './DemoBanner.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import FAB from '../components/layout/FAB.jsx';
import AddExpenseModal from '../screens/AddExpenseModal.jsx';

export default function AppShell() {
  const [addOpen, setAddOpen] = useState(false);
  const { pathname } = useLocation();

  // Hide FAB on settings & some screens that don't need it
  const showFab = !['/settings'].includes(pathname);

  return (
    <div className="app">
      <div className="app-content">
        <DesktopSidebar />
        <main className="desktop-main">
          <DemoBanner />
          {/* Outlet provides the active route component (each screen passes
              `setAddOpen` to its FAB-equivalent if it needs to trigger this). */}
          <Outlet context={{ openAddExpense: () => setAddOpen(true) }} />
        </main>
        <BottomNav />
        {showFab && <FAB onClick={() => setAddOpen(true)} />}
        <AddExpenseModal open={addOpen} onClose={() => setAddOpen(false)} />
      </div>
    </div>
  );
}
