import { createContext, useCallback, useContext, useState } from 'react';
import Icon from '../components/icons/Icon.jsx';

const ToastContext = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, opts = {}) => {
    setToast({ message, icon: opts.icon || 'check' });
    setTimeout(() => setToast(null), opts.duration || 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="toast">
          <Icon name={toast.icon} size={14} strokeWidth={2.2} />
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
