import { useState } from 'react';
import AppHeader from '../components/layout/AppHeader.jsx';
import Card from '../components/ui/Card.jsx';
import SectionHead from '../components/ui/SectionHead.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import Icon from '../components/icons/Icon.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import { useReports } from '../hooks/useData.js';
import { useToast } from '../context/ToastContext.jsx';

const RANGE_OPTIONS = [
  { id: 'monthly',   label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'annual',    label: 'Annual' }
];

export default function ReportsScreen() {
  const [range, setRange] = useState('monthly');
  const reports = useReports(range);
  const toast = useToast();

  const handleExport = (report) => {
    // UI placeholder — wire to real export later
    toast.show(`Export queued: ${report.title}`, { icon: 'download' });
  };

  return (
    <>
      <AppHeader
        label="Archive"
        title="Reports"
        right={<button className="icon-btn"><Icon name="download" size={16} /></button>}
      />

      <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />

      <SectionHead title={titleFor(range)} />
      <AsyncBoundary
        state={reports}
        emptyTitle="No reports yet"
        emptySub="Reports appear here as you accumulate transactions."
        emptyIcon="report"
      >
        {reports.data && reports.data.length > 0 && (
          <Card variant="flush">
            {reports.data.map((r) => (
              <ReportItem key={r.id} report={r} onExport={() => handleExport(r)} thumbTone={range === 'monthly' ? 'default' : range === 'quarterly' ? 'primary' : 'accent'} />
            ))}
          </Card>
        )}
      </AsyncBoundary>

      <div style={{ height: 30 }} />
    </>
  );
}

function ReportItem({ report, onExport, thumbTone = 'default' }) {
  const thumbClass = thumbTone === 'primary' ? 'primary' : thumbTone === 'accent' ? 'accent' : '';
  return (
    <div className="report-item">
      <div className={`report-thumb ${thumbClass}`}><span /></div>
      <div className="report-body">
        <div className="report-title">{report.title}</div>
        <div className="report-meta">{report.meta}</div>
      </div>
      <button className="btn-icon" onClick={onExport}>
        <Icon name="download" size={14} />
      </button>
    </div>
  );
}

function titleFor(range) {
  if (range === 'monthly') return 'Monthly reports';
  if (range === 'quarterly') return 'Quarterly reports';
  return 'Annual reports';
}
