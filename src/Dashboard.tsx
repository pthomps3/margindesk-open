import { ArrowRight, Plus } from 'lucide-react';
import { jobTotals } from './finance.mjs';
import { PageHead } from './WorkspaceChrome';
import type {ReactNode} from 'react';

type Job = {date: string; service: string; [key: string]: unknown};
type Money = (cents: number) => string;

function ServiceResults({jobs, money, retail, onServices}: {jobs: Job[]; money: Money; retail: boolean; onServices: () => void}) {
  const byService = new Map<string, {revenue: number; contribution: number; incomplete: boolean}>();
  for (const job of jobs) {
    const item = byService.get(job.service) ?? {revenue: 0, contribution: 0, incomplete: false};
    const totals = jobTotals(job);
    item.revenue += totals.revenue;
    item.contribution += totals.profit;
    item.incomplete ||= !totals.complete;
    byService.set(job.service, item);
  }
  const services = [...byService].sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 5);
  const values = services.flatMap(([, item]) => [item.revenue, item.contribution]);
  const low = Math.min(0, ...values), high = Math.max(0, ...values), range = Math.max(1, high - low);
  const zero = -low / range * 100;
  const bar = (value: number, kind: 'revenue' | 'contribution') =>
    <div className="md-bar" aria-hidden="true">
      <i className="md-bar-zero" style={{left: zero + '%'}}/>
      <i className={kind + (value < 0 ? ' loss' : '')} style={{left: (Math.min(value, 0) - low) / range * 100 + '%', width: Math.abs(value) / range * 100 + '%'}}/>
    </div>;
  return <section className="card md-panel md-service-results" aria-labelledby="md-service-title">
    <header className="md-panel-head"><div><h2 id="md-service-title">Revenue and contribution by {retail ? 'product' : 'service'}</h2>
      {services.length > 0 && <p>{byService.size > 5 ? 'Top 5 by sales revenue' : 'Completed work only'} · excludes prepaid allocations</p>}</div>
      <button type="button" className="md-text-action" onClick={onServices}>{retail ? 'Products' : 'Services & products'} <ArrowRight size={15} aria-hidden="true"/></button>
    </header>
    {services.length ? <ul>{services.map(([label, item]) => <li key={label}>
      <h3>{label}</h3>
      <div className="md-series"><span>Revenue</span>{bar(item.revenue, 'revenue')}<strong>{money(item.revenue)}</strong></div>
      <div className="md-series"><span>{item.incomplete ? 'Est. contribution' : 'Contribution'}</span>{bar(item.contribution, 'contribution')}<strong>{money(item.contribution)}</strong></div>
    </li>)}</ul> : <p className="md-empty-note">No completed work in this period.</p>}
  </section>;
}

export function Dashboard({name, retail, period, setPeriod, now, totals, recognized, fixed, profit, margin, jobs,
  money, recent, onAdd, onSetup, navigate, hasRecords, cashUnknown, cashNote}: {
  name: string; retail: boolean; period: string; setPeriod: (period: string) => void; now: Date;
  totals: {revenue: number; direct: number; cash: number; incomplete: number};
  recognized: number; fixed: number; profit: number; margin: number | null; jobs: Job[]; money: Money;
  recent: ReactNode; onAdd: () => void; onSetup: () => void; navigate: (page: string) => void;
  hasRecords: boolean; cashUnknown: number; cashNote?: string;
}) {
  const add = <button className="primary" type="button" onClick={onAdd}><Plus size={17} aria-hidden="true"/> {retail ? 'Add sale' : 'Add completed work'}</button>;
  return <>
    <PageHead title="Overview" text={name + ' · Sales, costs, and profit'}>{add}</PageHead>
    {!hasRecords ? <section className="card md-panel md-empty">
      <h2>Get started with your first record</h2><p>Enter completed work to see its costs and profit, or import records from a spreadsheet.</p>
      <div className="actions"><button type="button" onClick={() => navigate('Import')}>Import a spreadsheet</button><button type="button" onClick={onSetup}>Set up business details</button></div>
    </section> : <>
      <div className="toolbar md-period"><div className="period-selector" role="group" aria-label="Overview date range">
        <button type="button" aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>This month</button>
        <button type="button" aria-pressed={period === 'all'} onClick={() => setPeriod('all')}>All recorded</button>
      </div><span>{period === 'month' ? now.toLocaleString('en-US', {month: 'long', year: 'numeric'}) : 'All records through today'}</span></div>
      <dl className="stats md-metrics" aria-label="Key financial figures">
        <div className="stat"><dt>Recognized revenue</dt><dd><strong>{money(totals.revenue)}</strong><small>{jobs.length} completed {jobs.length === 1 ? 'record' : 'records'}{recognized !== 0 && ' · includes ' + money(recognized) + ' prepaid'}</small></dd></div>
        <div className="stat"><dt>Direct costs</dt><dd><strong>{money(totals.direct)}</strong><small>{totals.incomplete ? 'Known costs only' : 'Costs of delivering the work'}</small></dd></div>
        <div className="stat"><dt>Contribution</dt><dd><strong>{money(profit)}</strong><small>{totals.incomplete ? 'Incomplete costs' : margin !== null ? (margin * 100).toFixed(1) + '% contribution margin' : 'Revenue less direct costs'}</small></dd></div>
        <div className="stat md-key-stat"><dt>Est. operating profit</dt><dd><strong>{money(profit - fixed)}</strong><small>After {money(fixed)} in fixed expenses</small></dd></div>
      </dl>
      {totals.incomplete > 0 && <div className="warning md-data-warning"><span>{totals.incomplete} {totals.incomplete === 1 ? 'record has' : 'records have'} missing costs. Profit may be overstated.</span><button className="md-text-action" type="button" onClick={() => navigate('Jobs')}>Review records <ArrowRight size={15} aria-hidden="true"/></button></div>}
      <div className="md-analysis">
        <ServiceResults jobs={jobs} money={money} retail={retail} onServices={() => navigate('Services')}/>
        <section className="card md-panel md-cash" aria-labelledby="md-cash-title">
          <header className="md-panel-head"><h2 id="md-cash-title">Cash and revenue</h2></header>
          <dl><div><dt>Recorded cash received</dt><dd>{money(totals.cash)}</dd></div><div><dt>Recognized revenue</dt><dd>{money(totals.revenue)}</dd></div></dl>
          <p>Prepaid revenue is spread over the dates you provide the service.</p>
          {cashUnknown > 0 && <p>{cashUnknown} {cashUnknown === 1 ? 'record has' : 'records have'} no cash amount entered.</p>}
          {cashNote && <p>{cashNote}</p>}
          <button type="button" className="md-text-action" onClick={() => navigate('Reports')}>View reports <ArrowRight size={15} aria-hidden="true"/></button>
        </section>
      </div>
      <section className="card md-recent" aria-labelledby="md-recent-title">
        <header className="md-panel-head"><h2 id="md-recent-title">Recent completed work</h2><button type="button" className="md-text-action" onClick={() => navigate('Jobs')}>View sales & work <ArrowRight size={15} aria-hidden="true"/></button></header>
        {recent}
      </section>
      <p className="footnote">Management estimates, before tax.</p>
    </>}
  </>;
}
