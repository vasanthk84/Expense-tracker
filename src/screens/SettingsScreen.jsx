import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader.jsx';
import Card from '../components/ui/Card.jsx';
import SectionHead from '../components/ui/SectionHead.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/icons/Icon.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSettings, useAdminMutations, useAdminStatus } from '../hooks/useData.js';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const settings = useSettings();
  const status = useAdminStatus();
  const { reset } = useAdminMutations();
  const toast = useToast();

  const [confirm, setConfirm] = useState(null); // 'clear' | 'seed' | null
  const [busy, setBusy] = useState(false);

  const isDemo = status.data?.isDemo;

  const performReset = async (mode) => {
    setBusy(true);
    try {
      await reset(mode);
      toast.show(mode === 'seed' ? 'Demo data restored' : 'All data cleared');
      setConfirm(null);
      if (mode === 'clear') navigate('/');
    } catch (err) {
      toast.show('Failed to reset');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader
        label="Account"
        title="Settings"
      />

      <SectionHead title="Profile" />
      <AsyncBoundary state={settings}>
        {settings.data && (
          <Card variant="flush" className="settings-list">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Name</div>
                <div className="settings-row-sub">Displayed in the dashboard greeting</div>
              </div>
              <div className="settings-row-value">{settings.data.user?.name || 'Unset'}</div>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Currency</div>
                <div className="settings-row-sub">All amounts shown in this currency</div>
              </div>
              <div className="settings-row-value">{settings.data.currency || 'USD'}</div>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Monthly budget</div>
                <div className="settings-row-sub">Total target for the dashboard hero</div>
              </div>
              <div className="settings-row-value">
                ${(settings.data.monthlyBudget || 0).toLocaleString()}
              </div>
            </div>
          </Card>
        )}
      </AsyncBoundary>

      <SectionHead title="Appearance" />
      <Card variant="flush" className="settings-list">
        <div className="settings-row" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          <div>
            <div className="settings-row-label">Theme</div>
            <div className="settings-row-sub">Tap to switch light / dark</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={16} />
            <span className="settings-row-value">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </div>
        </div>
      </Card>

      <SectionHead title="Data" />
      <Card variant="flush" className="settings-list">
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Storage</div>
            <div className="settings-row-sub">JSONL files in <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>server/data/</code></div>
          </div>
          <div className="settings-row-value">
            {isDemo ? 'Demo' : 'Live'}
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <div className="danger-zone">
        <div className="danger-zone-title">Danger zone</div>
        <div className="danger-zone-desc">
          {isDemo
            ? 'Demo data is loaded. Clear it to start tracking real expenses, or restore it anytime to play with the prototype.'
            : 'Reset your data. Restoring demo data overwrites whatever is currently saved.'}
        </div>
        <div className="danger-zone-actions">
          <button className="btn-danger" onClick={() => setConfirm('clear')}>
            Clear all data
          </button>
          <button
            className="btn-sm"
            style={{ background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={() => setConfirm('seed')}
          >
            Restore demo data
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      <Modal open={!!confirm} onClose={() => !busy && setConfirm(null)}>
        <div className="confirm-icon">
          <Icon name="alert" size={22} strokeWidth={2} />
        </div>
        <div className="modal-title" style={{ textAlign: 'center' }}>
          {confirm === 'clear' ? 'Clear all data?' : 'Restore demo data?'}
        </div>
        <div className="confirm-text">
          {confirm === 'clear'
            ? 'Deletes all transactions, budgets, and savings goals. Categories are preserved. This cannot be undone.'
            : 'Replaces all current data with the demo dataset (56 transactions across 3 months). This cannot be undone.'}
        </div>
        <Button size="md" onClick={() => performReset(confirm)}>
          {busy ? 'Working…' : confirm === 'clear' ? 'Yes, clear everything' : 'Yes, restore demo'}
        </Button>
        <button
          className="btn-sm"
          style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--ink-3)' }}
          onClick={() => setConfirm(null)}
          disabled={busy}
        >
          Cancel
        </button>
      </Modal>

      <div style={{ height: 30 }} />
    </>
  );
}
