/**
 * Smoke test: exercise the storage + analytics services directly,
 * without needing a long-running HTTP server.
 */
import {
  monthSummary,
  budgetUtilization,
  categoryBreakdown,
  monthlyTrend,
  categoryComparison,
  forecast,
  insights,
  weeklyPattern
} from '../services/analytics.js';
import { readTransactions } from '../services/storage.js';

const log = (label, data) => {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(data, null, 2).slice(0, 600));
};

const txns = await readTransactions({ from: '2025-11-01', to: '2025-11-30' });
console.log(`Found ${txns.length} November transactions`);

log('Summary',         await monthSummary('2025-11'));
log('Budget util',     (await budgetUtilization('2025-11')).slice(0, 3));
log('Donut',           await categoryBreakdown({ from: '2025-11-01', to: '2025-11-30' }));
log('Trend',           await monthlyTrend('2025-11', 6));
log('Comparison',      await categoryComparison('2025-11'));
log('Forecast (clip)', { ...await forecast('2025-11', 6, 6), actual: '...', forecast: '...', upper: '...', lower: '...' });
log('Insights',        await insights('2025-11'));
log('Weekly pattern',  await weeklyPattern('2025-11'));

console.log('\n✅ All services returned data');
