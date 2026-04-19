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
import { useSettings, useAdminMutations, useAdminStatus, useSettingsMutations } from '../hooks/useData.js';

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar', symbol: '$' },
  { code: 'INR', label: 'INR — Indian Rupee', symbol: '₹' },
  { code: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { code: 'GBP', label: 'GBP — British Pound', symbol: '£' },
];

// Pay schedule options.
// Semi-monthly = 2 fixed dates per month = exactly 24 paychecks/year.
// True biweekly = every 14 days = 26 paychecks/year (2 "bonus" months).
const PAY_SCHEDULES = [
  {
    id: 'semi-monthly',
    label: 'Semi-monthly',
    desc: '2× per month · 24 paychecks/year',
    multiplier: 2
  },
  {
    id: 'biweekly',
    label: 'Biweekly (every 2 weeks)',
    desc: '26 paychecks/year · ~2.17×/month avg',
    multiplier: 26 / 12   // ≈ 2.167
  },
  {
    id: 'monthly',
    label: 'Monthly',
    desc: '1× per month · 12 paychecks/year',
    multiplier: 1
  }
];

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const settings = useSettings();
  const status = useAdminStatus();
  const { reset, migrate } = useAdminMutations();
  const { update } = useSettingsMutations();
  const toast = useToast();

  const [confirm, setConfirm]             = useState(null);
  const [busy, setBusy]                   = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);

  // Edit modal state
  const [editField, setEditField] = useState(null); // 'name'|'currency'|'budget'|'paycheck'|'schedule'
  const [draft, setDraft]         = useState('');
  const [saving, setSaving]       = useState(false);

  const isDemo  = status.data?.isDemo;
  const isLocal = !import.meta.env.VITE_API_BASE;

  const openEdit = (field) => {
    const s = settings.data || {};
    setDraft(
      field === 'name'     ? (s.user?.name || '')
      : field === 'currency' ? (s.currency || 'USD')
      : field === 'paycheck' ? String(s.paycheckAmount || '')
      : field === 'schedule' ? (s.paycheckSchedule || 'semi-monthly')
      : String(s.monthlyBudget || 0)
    );
    setEditField(field);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      let patch = {};
      if (editField === 'name') {
        patch = { user: { ...settings.data?.user, name: draft.trim(), initial: draft.trim()[0]?.toUpperCase() || 'U' } };

      } else if (editField === 'currency') {
        patch = { currency: draft };

      } else if (editField === 'paycheck') {
        const v = Number(draft);
        if (Number.isNaN(v) || v <= 0) { toast.show('Enter a valid amount'); setSaving(false); return; }
        const schedule = settings.data?.paycheckSchedule || 'semi-monthly';
        const sched    = PAY_SCHEDULES.find((s) => s.id === schedule) || PAY_SCHEDULES[0];
        const monthly  = Math.round(v * sched.multiplier);
        // Auto-update monthly budget when income-linked
        patch = {
          paycheckAmount: v,
          ...(settings.data?.budgetFromIncome !== false && { monthlyBudget: monthly })
        };

      } else if (editField === 'schedule') {
        const sched   = PAY_SCHEDULES.find((s) => s.id === draft) || PAY_SCHEDULES[0];
        const amount  = settings.data?.paycheckAmount || 0;
        const monthly = Math.round(amount * sched.multiplier);
        patch = {
          paycheckSchedule: draft,
          ...(settings.data?.budgetFromIncome !== false && amount > 0 && { monthlyBudget: monthly })
        };

      } else if (editField === 'budget') {
        const v = Number(draft);
        if (Number.isNaN(v) || v < 0) { toast.show('Enter a valid amount'); setSaving(false); return; }
        // Manual override — unlink from income auto-calculation
        patch = { monthlyBudget: v, budgetFromIncome: false };
      }

      await update(patch);
      toast.show('Settings saved');
      setEditField(null);
    } catch {
      toast.show('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const performReset = async (mode) => {
    setBusy(true);
    try {
      await reset(mode);
      toast.show(mode === 'seed' ? 'Demo data restored' : 'All data cleared');
      setConfirm(null);
      if (mode === 'clear') navigate('/');
    } catch {
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
    } catch {
      toast.show('Migration failed — check KV env vars are set (vercel env pull)');
    } finally {
      setBusy(false);
    }
  };

  // Derived income numbers for display
  const s              = settings.data || {};
  const currencySymbol = CURRENCIES.find((c) => c.code === (s.currency || 'USD'))?.symbol || '$';
  const paycheckAmt    = s.paycheckAmount || 0;
  const scheduleId     = s.paycheckSchedule || 'semi-monthly';
  const scheduleInfo   = PAY_SCHEDULES.find((p) => p.id === scheduleId) || PAY_SCHEDULES[0];
  const monthlyIncome  = Math.round(paycheckAmt * scheduleInfo.multiplier);
  const annualIncome   = Math.round(paycheckAmt * (scheduleId === 'semi-monthly' ? 24 : scheduleId === 'biweekly' ? 26 : 12));
  const budgetLinked   = s.budgetFromIncome !== false && paycheckAmt > 0;

  // Live preview for paycheck edit modal
  const draftAmt       = Number(draft) || 0;
  const draftMonthly   = Math.round(draftAmt * scheduleInfo.multiplier);

  return (
    <>
      <AppHeader label="Account" title="Settings" />

      {/* ── Profile ── */}
      <SectionHead title="Profile" action="Tap to edit" />
      <AsyncBoundary state={settings}>
        {settings.data && (
          <Card variant="flush" className="settings-list">
            <div className="settings-row" onClick={() => openEdit('name')} style={{ cursor: 'pointer' }}>
              <div>
                <div className="settings-row-label">Name</div>
                <div className="settings-row-sub">Displayed in the dashboard greeting</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="settings-row-value">{s.user?.name || 'Unset'}</span>
                <Icon name="chevron" size={12} style={{ color: 'var(--ink-3)', transform: 'rotate(-90deg)' }} />
              </div>
            </div>
            <div className="settings-row" onClick={() => openEdit('currency')} style={{ cursor: 'pointer' }}>
              <div>
                <div className="settings-row-label">Currency</div>
                <div className="settings-row-sub">All amounts shown in this currency</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="settings-row-value">{s.currency || 'USD'}</span>
                <Icon name="chevron" size={12} style={{ color: 'var(--ink-3)', transform: 'rotate(-90deg)' }} />
              </div>
            </div>
          </Card>
        )}
      </AsyncBoundary>

      {/* ── Income ── */}
      <SectionHead title="Income" action="Tap to edit" />
      <AsyncBoundary state={settings}>
        {settings.data && (
          <>
            {/* Income summary banner */}
            {paycheckAmt > 0 && (
              <div style={{
                margin: '0 20px 10px',
                padding: '14px 16px',
                background: 'var(--primary-soft)',
                borderRadius: 12,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                    {currencySymbol}{paycheckAmt.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--primary)', fontFamily: 'var(--font-mono)', marginTop: 2, opacity: 0.75 }}>
                    PER CHECK
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                    {currencySymbol}{monthlyIncome.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--primary)', fontFamily: 'var(--font-mono)', marginTop: 2, opacity: 0.75 }}>
                    PER MONTH
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                    {currencySymbol}{annualIncome.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--primary)', fontFamily: 'var(--font-mono)', marginTop: 2, opacity: 0.75 }}>
                    PER YEAR
                  </div>
                </div>
              </div>
            )}

            <Card variant="flush" className="settings-list">
              {/* Pay schedule */}
              <div className="settings-row" onClick={() => openEdit('schedule')} style={{ cursor: 'pointer' }}>
                <div>
                  <div className="settings-row-label">Pay schedule</div>
                  <div className="settings-row-sub">{scheduleInfo.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="settings-row-value">{scheduleInfo.label}</span>
                  <Icon name="chevron" size={12} style={{ color: 'var(--ink-3)', transform: 'rotate(-90deg)' }} />
                </div>
              </div>

              {/* Paycheck amount */}
              <div className="settings-row" onClick={() => openEdit('paycheck')} style={{ cursor: 'pointer' }}>
                <div>
                  <div className="settings-row-label">Paycheck (net take-home)</div>
                  <div className="settings-row-sub">Your after-tax amount per paycheck</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="settings-row-value">
                    {paycheckAmt > 0 ? `${currencySymbol}${paycheckAmt.toLocaleString()}` : 'Not set'}
                  </span>
                  <Icon name="chevron" size={12} style={{ color: 'var(--ink-3)', transform: 'rotate(-90deg)' }} />
                </div>
              </div>

              {/* Monthly budget — shows linkage status */}
              <div
                className="settings-row"
                onClick={() => openEdit('budget')}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <div className="settings-row-label">Monthly budget</div>
                  <div className="settings-row-sub">
                    {budgetLinked
                      ? `Auto-set from income · tap to override`
                      : 'Manual override · income link off'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="settings-row-value" style={{ color: budgetLinked ? 'var(--primary)' : 'var(--ink-2)' }}>
                    {currencySymbol}{(s.monthlyBudget || 0).toLocaleString()}
                    {budgetLinked && (
                      <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.7 }}>🔗</span>
                    )}
                  </span>
                  <Icon name="chevron" size={12} style={{ color: 'var(--ink-3)', transform: 'rotate(-90deg)' }} />
                </div>
              </div>

              {/* Re-link button if manually overridden */}
              {!budgetLinked && paycheckAmt > 0 && (
                <div style={{ padding: '10px 18px 14px' }}>
                  <button
                    className="btn-sm primary"
                    style={{ width: '100%', padding: '8px' }}
                    onClick={async () => {
                      await update({ budgetFromIncome: true, monthlyBudget: monthlyIncome });
                      toast.show('Budget re-linked to income');
                    }}
                  >
                    Re-link budget to income ({currencySymbol}{monthlyIncome.toLocaleString()})
                  </button>
                </div>
              )}
            </Card>
          </>
        )}
      </AsyncBoundary>

      {/* ── Appearance ── */}
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

      {/* ── Data ── */}
      <SectionHead title="Data" />
      <Card variant="flush" className="settings-list">
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Storage</div>
            <div className="settings-row-sub">
              {isLocal ? 'Local filesystem (server/data/)' : 'Vercel KV (Redis)'}
            </div>
          </div>
          <div className="settings-row-value">{isDemo ? 'Demo' : 'Live'}</div>
        </div>
      </Card>

      {isLocal && (
        <>
          <SectionHead title="Deploy to Vercel" />
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon name="arrowUp" size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>Copy local data → Vercel KV</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Reads all your local JSONL files and writes them into KV so your real expenses appear on the deployed site. Run{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>vercel env pull</code>{' '}
                  first so KV credentials are available locally.
                </div>
              </div>
            </div>
            {migrateResult && (
              <div style={{ background: 'var(--primary-soft)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary)' }}>
                ✓ Last migration: {migrateResult.transactions} transactions · {migrateResult.months} months · {migrateResult.categories} categories
              </div>
            )}
            <button className="btn-sm primary" style={{ width: '100%', padding: '10px', fontSize: 13 }} onClick={() => setConfirm('migrate')}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon name="arrowUp" size={14} />
                Migrate local data to KV
              </span>
            </button>
          </Card>
        </>
      )}

      <div className="danger-zone">
        <div className="danger-zone-title">Danger zone</div>
        <div className="danger-zone-desc">
          {isDemo
            ? 'Demo data is loaded. Clear it to start tracking real expenses, or restore it anytime.'
            : 'Reset your data. Restoring demo data overwrites whatever is currently saved.'}
        </div>
        <div className="danger-zone-actions">
          <button className="btn-danger" onClick={() => setConfirm('clear')}>Clear all data</button>
          <button className="btn-sm" style={{ background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => setConfirm('seed')}>
            Restore demo data
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          EDIT MODALS
      ═══════════════════════════════════════ */}

      {/* ── Name / Currency / Budget (existing) ── */}
      <Modal
        open={editField === 'name' || editField === 'currency' || editField === 'budget'}
        onClose={() => !saving && setEditField(null)}
        title={
          editField === 'name'     ? 'Edit name'
          : editField === 'currency' ? 'Currency'
          : 'Monthly budget'
        }
        subtitle={editField === 'budget' ? 'Set your total spending target for the month' : undefined}
      >
        {editField === 'name' && (
          <div className="amount-field">
            <div className="amount-label">Display name</div>
            <input
              className="amount-value"
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 16, width: '100%', background: 'var(--surface)', color: 'var(--ink)' }}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              placeholder="Your name"
            />
          </div>
        )}

        {editField === 'currency' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setDraft(c.code)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10, border: '1.5px solid',
                  borderColor: draft === c.code ? 'var(--primary)' : 'var(--border)',
                  background: draft === c.code ? 'var(--primary-soft)' : 'var(--surface)',
                  cursor: 'pointer', fontSize: 14, color: 'var(--ink)', transition: 'all 0.15s'
                }}
              >
                <span>{c.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: draft === c.code ? 'var(--primary)' : 'var(--ink-3)' }}>{c.symbol}</span>
              </button>
            ))}
          </div>
        )}

        {editField === 'budget' && (
          <>
            <div className="amount-field">
              <div className="amount-label">Monthly budget</div>
              <div className="amount-display">
                <span className="amount-currency">{currencySymbol}</span>
                <input
                  className="amount-value"
                  type="number"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  min="0"
                  step="100"
                />
              </div>
            </div>
            {budgetLinked && (
              <div style={{
                padding: '10px 12px', marginBottom: 12,
                background: 'var(--accent-soft)', borderRadius: 10,
                fontSize: 11, color: 'var(--accent)', lineHeight: 1.5
              }}>
                ⚠ This will unlink the budget from your paycheck income. You can re-link later from Settings.
              </div>
            )}
          </>
        )}

        <Button size="md" onClick={saveEdit}>{saving ? 'Saving…' : 'Save'}</Button>
        <button className="btn-sm" style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--ink-3)' }} onClick={() => setEditField(null)} disabled={saving}>
          Cancel
        </button>
      </Modal>

      {/* ── Paycheck amount ── */}
      <Modal
        open={editField === 'paycheck'}
        onClose={() => !saving && setEditField(null)}
        title="Paycheck amount"
        subtitle="Your net (after-tax) take-home per paycheck"
      >
        <div className="amount-field">
          <div className="amount-label">Net per paycheck</div>
          <div className="amount-display">
            <span className="amount-currency">{currencySymbol}</span>
            <input
              className="amount-value"
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              min="0"
              step="100"
            />
          </div>
        </div>

        {/* Live monthly income preview */}
        {draftAmt > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            margin: '0 0 14px',
          }}>
            <div style={{
              padding: '10px 14px',
              background: 'var(--primary-soft)',
              borderRadius: 10,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                {currencySymbol}{draftMonthly.toLocaleString()}
              </div>
              <div style={{ fontSize: 9, color: 'var(--primary)', fontFamily: 'var(--font-mono)', marginTop: 2, opacity: 0.75 }}>
                MONTHLY ({scheduleInfo.label})
              </div>
            </div>
            <div style={{
              padding: '10px 14px',
              background: 'var(--surface-2)',
              borderRadius: 10,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                {currencySymbol}{Math.round(draftAmt * (scheduleId === 'semi-monthly' ? 24 : scheduleId === 'biweekly' ? 26 : 12)).toLocaleString()}
              </div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                ANNUAL
              </div>
            </div>
          </div>
        )}

        {settings.data?.budgetFromIncome !== false && (
          <div style={{
            padding: '10px 12px', marginBottom: 12,
            background: 'var(--primary-soft)', borderRadius: 10,
            fontSize: 11, color: 'var(--primary)', lineHeight: 1.5,
            display: 'flex', gap: 7, alignItems: 'flex-start'
          }}>
            <span style={{ marginTop: 1 }}>🔗</span>
            <span>Monthly budget will auto-update to {currencySymbol}{draftMonthly.toLocaleString()}</span>
          </div>
        )}

        <Button size="md" onClick={saveEdit}>{saving ? 'Saving…' : 'Save paycheck'}</Button>
        <button className="btn-sm" style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--ink-3)' }} onClick={() => setEditField(null)} disabled={saving}>
          Cancel
        </button>
      </Modal>

      {/* ── Pay schedule ── */}
      <Modal
        open={editField === 'schedule'}
        onClose={() => !saving && setEditField(null)}
        title="Pay schedule"
        subtitle="How often you receive a paycheck"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {PAY_SCHEDULES.map((p) => {
            const projMonthly = Math.round(paycheckAmt * p.multiplier);
            return (
              <button
                key={p.id}
                onClick={() => setDraft(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10, border: '1.5px solid',
                  borderColor: draft === p.id ? 'var(--primary)' : 'var(--border)',
                  background: draft === p.id ? 'var(--primary-soft)' : 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: draft === p.id ? 'var(--primary)' : 'var(--ink)' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{p.desc}</div>
                </div>
                {paycheckAmt > 0 && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: draft === p.id ? 'var(--primary)' : 'var(--ink-3)',
                    flexShrink: 0,
                    marginLeft: 12
                  }}>
                    {currencySymbol}{projMonthly.toLocaleString()}/mo
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button size="md" onClick={saveEdit}>{saving ? 'Saving…' : 'Save schedule'}</Button>
        <button className="btn-sm" style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--ink-3)' }} onClick={() => setEditField(null)} disabled={saving}>
          Cancel
        </button>
      </Modal>

      {/* ── Migrate confirmation ── */}
      <Modal open={confirm === 'migrate'} onClose={() => !busy && setConfirm(null)}>
        <div className="confirm-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
          <Icon name="arrowUp" size={22} strokeWidth={2} />
        </div>
        <div className="modal-title" style={{ textAlign: 'center' }}>Copy local data to KV?</div>
        <div className="confirm-text">
          This will overwrite anything currently in Vercel KV with your local data.
          Make sure you've run <code style={{ fontFamily: 'var(--font-mono)' }}>vercel env pull</code> so KV credentials are available. This cannot be undone.
        </div>
        <Button size="md" onClick={performMigrate}>{busy ? 'Migrating…' : 'Yes, copy to KV'}</Button>
        <button className="btn-sm" style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--ink-3)' }} onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
      </Modal>

      {/* ── Reset / seed confirmation ── */}
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
        <button className="btn-sm" style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--ink-3)' }} onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
      </Modal>

      <div style={{ height: 30 }} />
    </>
  );
}
