import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/icons/Icon.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const MAIN = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home',    path: '/' },
  { id: 'expenses',  label: 'Expenses',  icon: 'list',    path: '/expenses' },
  { id: 'analytics', label: 'Analytics', icon: 'chart',   path: '/analytics' },
  { id: 'forecast',  label: 'Forecast',  icon: 'spark',   path: '/forecast' },
  { id: 'reports',   label: 'Reports',   icon: 'report',  path: '/reports' }
];

const PLAN = [
  { id: 'budgets',  label: 'Budgets',  icon: 'savings', path: '/budgets' },
  { id: 'insights', label: 'Insights', icon: 'spark',   path: '/insights' }
];

export default function DesktopSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  const Item = ({ item }) => (
    <div
      className={`sb-item ${isActive(item.path) ? 'active' : ''}`}
      onClick={() => navigate(item.path)}
    >
      <Icon name={item.icon} size={16} />
      {item.label}
    </div>
  );

  return (
    <aside className="desktop-sidebar">
      <div className="sb-brand">
        <div className="sb-brand-logo">L</div>
        <div className="sb-brand-name">Ledger</div>
      </div>

      <div className="sb-section-label">Main</div>
      {MAIN.map((item) => <Item key={item.id} item={item} />)}

      <div className="sb-section-label">Plan</div>
      {PLAN.map((item) => <Item key={item.id} item={item} />)}

      <div className="sb-section-label">Account</div>
      <div
        className={`sb-item ${isActive('/settings') ? 'active' : ''}`}
        onClick={() => navigate('/settings')}
      >
        <Icon name="user" size={16} />
        Settings
      </div>
      <div className="sb-item" onClick={toggleTheme}>
        <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={16} />
        {theme === 'dark' ? 'Dark mode' : 'Light mode'}
      </div>
    </aside>
  );
}
