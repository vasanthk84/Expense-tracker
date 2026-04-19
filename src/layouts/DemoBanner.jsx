import { useState } from 'react';
import { useAdminStatus, useAdminMutations } from '../hooks/useData.js';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/icons/Icon.jsx';

export default function DemoBanner() {
  const status = useAdminStatus();
  const { reset } = useAdminMutations();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (status.loading || !status.data?.isDemo) return null;

  const handleClear = async () => {
    setBusy(true);
    try {
      await reset('clear');
      toast.show('Demo data cleared');
      setConfirming(false);
    } catch (err) {
      toast.show('Failed to clear data');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="demo-banner">
        <span className="demo-banner-text">
          Viewing demo data
        </span>
        <button onClick={() => setConfirming(true)} disabled={busy}>
          Clear &amp; start fresh
        </button>
      </div>

      <Modal open={confirming} onClose={() => !busy && setConfirming(false)}>
        <div className="confirm-icon">
          <Icon name="alert" size={22} strokeWidth={2} />
        </div>
        <div className="modal-title" style={{ textAlign: 'center' }}>
          Clear all demo data?
        </div>
        <div className="confirm-text">
          This removes all 56 demo transactions and resets budgets to empty.
          Your category list stays. This cannot be undone.
        </div>
        <Button size="md" onClick={handleClear}>
          {busy ? 'Clearing…' : 'Yes, clear everything'}
        </Button>
        <button
          className="btn-sm"
          style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--ink-3)' }}
          onClick={() => setConfirming(false)}
          disabled={busy}
        >
          Cancel
        </button>
      </Modal>
    </>
  );
}
