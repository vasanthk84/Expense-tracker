import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../icons/Icon.jsx';

const NAV_ITEMS = [
  { id: 'home',      label: 'Home',      icon: 'home',   path: '/' },
  { id: 'expenses',  label: 'Expenses',  icon: 'list',   path: '/expenses' },
  { id: 'analytics', label: 'Analytics', icon: 'chart',  path: '/analytics' },
  { id: 'reports',   label: 'Reports',   icon: 'report', path: '/reports' },
  { id: 'account',   label: 'Account',   icon: 'user',   path: '/settings' }
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <div
          key={item.id}
          className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <Icon name={item.icon} size={20} />
          {item.label}
        </div>
      ))}
    </nav>
  );
}
