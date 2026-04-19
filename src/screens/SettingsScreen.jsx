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
  const { reset, migrate } = useAdminMutations();
  const toast = useToast();

  const [confirm, setConfirm]       = useState(null); // 'clear' | 'seed' | 'migrate' | null
  const [busy, setBusy]             = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);

  const isDemo = status.data?.isDemo;
  // Show migrate section only in local dev (no VITE_API_BASE means we're proxying locally)
  const isLocal = !import.meta.env.VITE_API_BASE;

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

  const performMigrate = async () => {
    setBusy(true);
    try {
      const result = await migrate();
      setMigrateResult(result.migrated);
      toast.show(`Migrated ${result.migrated.transactions} transactions to KV ✓`, { icon: 'check' });
      setConfirm(null);
    } catch (err) {
      toast.show('Migration failed — check KV env vars are set (vercel env pull)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader label="Account" title="Settings" />

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
            <div className="settings-row-sub">
              {isLocal
                ? 'Local filesystem (server/data/)'
                : 'Vercel KV (Redis)'}
            </div>
          </div>
          <div className="settings-row-value">{isDemo ? 'Demo' : 'Live'}</div>
        </div>
      </Card>

      {/* ── Migrate to KV — only shown in local dev ── */}
      {isLocal && (
        <>
          <SectionHead title="Deploy to Vercel" />
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--primary-soft)', color: 'var(--primary)',
                display: 'grid', placeItems: 'center', flexShrink: 0
              }}>
                <Icon name="arrowUp" size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>
                  Copy local data → Vercel KV
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Reads all your local JSONL files and writes them into KV so your
                  real expenses appear on the deployed site. Run{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>vercel env pull</code>{' '}
                  first so KV credentials are available locally.
                </div>
              </div>
            </div>

            {migrateResult && (
              <div style={{
                background: 'var(--primary-soft)', borderRadius: 8,
                padding: '10px 14px', marginBottom: 12,
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary)'
              }}>
                ✓ Last migration: {migrateResult.transactions} transactions ·{' '}
                {migrateResult.months} months · {migrateResult.categories} categories
              </div>
            )}

            <button
              className="btn-sm primary"
              style={{ width: '100%', padding: '10px', fontSize: 13 }}
              onClick={() => setConfirm('migrate')}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon name="arrowUp" size={14} />
                Migrate local data to KV
              </span>
            </button>
          </Card>
        </>
      )}

      {/* ── Danger zone ── */}
      <div className="danger-zone">
        <div className="danger-zone-title">Danger zone</div>
        <div className="danger-zone-desc">
          {isDemo
            ? 'Demo data is loaded. Clear it to start tracking real expenses, or restore it anytime.'
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

      {/* ── Confirmation modals ── */}

      {/* Migrate confirmation */}
      <Modal open={confirm === 'migrate'} onClose={() => !busy && setConfirm(null)}>
        <div className="confirm-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
          <Icon name="arrowUp" size={22} strokeWidth={2} />
        </div>
        <div className="modal-title" style={{ textAlign: 'center' }}>
          Copy local data to KV?
        </div>
        <div className="confirm-text">
          This will overwrite anything currently in Vercel KV with your local data.
          Make sure you've run <code style={{ fontFamily: 'var(--font-mono)' }}>vercel env pull</code> so
          KV credentials are available. This cannot be undone.
        </div>
        <Button size="md" onClick={performMigrate}>
          {busy ? 'Migrating…' : 'Yes, copy to KV'}
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

      {/* Reset / seed confirmation */}
      <Modal open={confirm === 'clear' || confirm === 'seed'} onClose={() => !busy && setConfirm(null)}>
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
