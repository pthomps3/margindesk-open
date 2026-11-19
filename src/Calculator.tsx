import { downloadText } from './download.mjs';
import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Download, Info, Leaf, Receipt, RotateCcw, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { estimateJob, estimateCSV } from './jobEstimate.mjs';
import './calculator.css';

type Inputs = { price: string; supplies: string; labor: string; fees: string; other: string; discount: string; refund: string };
const examples: { name: string; values: Inputs }[] = [
  { name: 'Cleaning', values: { price: '125.00', supplies: '8.50', labor: '48.00', fees: '3.63', other: '5.00', discount: '0', refund: '0' } },
  { name: 'Laundry', values: { price: '68.00', supplies: '6.50', labor: '24.00', fees: '1.97', other: '4.50', discount: '0', refund: '0' } },
  { name: 'Maintenance', values: { price: '175.00', supplies: '22.00', labor: '70.00', fees: '5.08', other: '12.00', discount: '0', refund: '0' } },
];
const empty: Inputs = { price: '', supplies: '', labor: '', fees: '', other: '0', discount: '0', refund: '0' };
const currencies = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'];
const costKeys = ['supplies', 'labor', 'fees', 'other'] as const;
const labels = { price: 'Job price', supplies: 'Supplies', labor: 'Worker pay', fees: 'Fees', other: 'Other direct costs', discount: 'Discount', refund: 'Refund' };

function AmountField({ name, value, hint, symbol, error, onChange }: {
  name: keyof Inputs; value: string; hint: string; symbol: string; error?: string; onChange: (key: keyof Inputs, value: string) => void;
}) {
  return <div className={'calc-field ' + (name === 'price' ? 'calc-price-field' : '')}>
    <label htmlFor={'calc-' + name}>{labels[name]}</label>
    <div className={'calc-input-wrap ' + (error ? 'has-error' : '')}><span aria-hidden="true">{symbol}</span>
      <input id={'calc-' + name} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={15}
        value={value} placeholder="0.00" aria-invalid={!!error} aria-describedby={'calc-' + name + '-hint'}
        onChange={event => onChange(name, event.target.value)} />
    </div>
    <small id={'calc-' + name + '-hint'} className={error ? 'calc-error' : ''}>{error || hint}</small>
  </div>;
}

export default function Calculator({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [inputs, setInputs] = useState<Inputs>({ ...examples[0].values });
  const [currency, setCurrency] = useState('USD');
  const [sample, setSample] = useState<string | null>('Cleaning');

  const [exportStatus, setExportStatus] = useState('');
  const estimate = estimateJob(inputs);
  const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100);
  const symbol = new Intl.NumberFormat('en-US', { style: 'currency', currency }).formatToParts(0).find(part => part.type === 'currency')?.value || '$';
  const loss = estimate.complete && estimate.profit < 0;
  const errorCount = Object.keys(estimate.errors).length;
  const totalForBar = estimate.complete ? Math.max(estimate.revenue, estimate.direct) : 0;

  const change = (key: keyof Inputs, value: string) => {
    setInputs(current => ({ ...current, [key]: value })); setSample(null); setExportStatus('');
  };
  const field = (name: keyof Inputs, hint: string) => <AmountField key={name} name={name} value={inputs[name]} hint={hint} symbol={symbol} error={estimate.errors[name]} onChange={change} />;
  function downloadEstimate() {
    if (!estimate.complete) return;
    try {
      downloadText('margindesk-job-estimate.csv', estimateCSV(estimate, currency));
      setExportStatus('Estimate download started.');
    } catch {
      setExportStatus('Could not download the estimate. Try again.');
    }
  }

  return <div className="calculator-page">
    <section className="calculator-intro">
      <span className="pricing-kicker"><span /> A LITTLE CLARITY, ON THE HOUSE</span>
      <h1>What does this job<br /><em>actually earn?</em></h1>
      <p>Start with your price. Add what it costs to do the work.<br />See what’s left from one job, in a few simple numbers.</p>
      <div className="calc-assurance"><Check size={13} /> Free to use <i /> No account needed <i /> Your numbers stay in this browser</div>
    </section>

    <div className="calc-example-strip">
      <span><Leaf size={15} /> Try an example</span>
      <div className="calc-examples" role="group" aria-label="Synthetic job examples">{examples.map(example => <button key={example.name} aria-pressed={sample === example.name}
        onClick={() => { setInputs({ ...example.values }); setCurrency('USD'); setSample(example.name); setExportStatus(''); }}>{example.name}</button>)}</div>
      <span className="calc-example-note">Illustrative numbers. Make them your own.</span>
    </div>

    <div className="calc-workspace">
      <section className="calc-entry" aria-labelledby="calc-entry-title">
        <div className="calc-card-heading"><div><span className="calc-step">01 / THE JOB</span><h2 id="calc-entry-title">A few numbers. A clearer picture.</h2></div><Receipt size={22} /></div>
        <div className="calc-entry-meta"><span>{sample ? sample + ' example · editable' : 'Your job estimate'}</span><label htmlFor="calc-currency">Currency<select id="calc-currency" aria-label="Currency" title="Choose a currency. Amounts are not converted." value={currency} onChange={event => { setCurrency(event.target.value); setSample(null); setExportStatus(''); }}>{currencies.map(code => <option key={code}>{code}</option>)}</select></label></div>
        <div className="calc-fields">
          {field('price', 'What you charge for this job, before any discount or refund.')}
          <div className="calc-cost-heading"><span>What it costs to do the job</span><small>Enter 0 if a cost doesn’t apply.</small></div>
          <div className="calc-direct-fields">{field('supplies', 'Materials and products used for this job.')}
          {field('labor', 'Actual worker pay. Track unpaid owner time separately in saved work.')}
          {field('fees', 'Actual payment or platform fees you pay.')}</div>
        </div>
        <details className="calc-extras"><summary><span><SlidersHorizontal size={15} /> Other costs, discounts & refunds</span><ChevronDown size={15} /></summary>
          {field('other', 'Travel, subcontractors, or other costs tied to this job.')}
          <div className="calc-adjustments">{field('discount', 'Reduces the original job price.')}{field('refund', 'Returned to the customer after any discount.')}</div>
          <p>Fees stay as entered when you add a refund. Update them if your provider returns any fees. Empty optional fields count as 0.</p>
        </details>
        {Number(inputs.other) > 0 && !estimate.errors.other && <p className="calc-extra-note">Includes {money(estimate.amounts.other)} in other direct costs. Edit above.</p>}
        <div className="calc-entry-footer"><span><ShieldCheck size={14} /> Entries stay on this page. Export to keep a copy.</span><button onClick={() => { setInputs({ ...empty }); setSample(null); setExportStatus(''); }}><RotateCcw size={13} /> Clear</button></div>
      </section>

      <section id="calc-results" className={'calc-results ' + (loss ? 'calc-loss' : '')} aria-labelledby="calc-result-title">
        <div className="calc-result-top"><span className="calc-step">02 / WHAT’S LEFT</span><span className="calc-live"><span /> Updates as you type</span></div>
        <div className="calc-profit-summary" role="status" aria-live="polite" aria-atomic="true">
          <h2 id="calc-result-title">{loss ? 'This job has a contribution loss' : 'Your contribution profit'}</h2>
          <strong className="calc-profit">{estimate.complete ? money(estimate.profit) : '—'}</strong>
          <p>{!estimate.complete ? errorCount ? 'Check the highlighted amounts to finish your estimate.' : 'Enter the job price and each cost. Use 0 for any cost that doesn’t apply.' : loss ? 'Direct costs are higher than revenue. This job does not contribute toward your fixed expenses.' : estimate.profit === 0 ? 'This job covers its direct costs, but leaves nothing toward fixed expenses.' : 'What’s left after this job’s direct costs, to cover fixed expenses and help your business earn a profit.'}</p>
          {!estimate.complete && estimate.missing.length > 0 && <span className="calc-missing">Still needed: {estimate.missing.map(key => labels[key]).join(', ')}</span>}
          {errorCount > 0 && <span className="calc-missing">Check: {Object.keys(estimate.errors).map(key => labels[key]).join(', ')}. Adjustments are in “Other costs, discounts & refunds.”</span>}
          {estimate.complete && <div className="calc-margin"><span>Contribution margin</span><b>{estimate.margin === null ? 'N/A' : (estimate.margin * 100).toFixed(1) + '%'}</b><small>{estimate.margin === null ? 'No percentage when revenue is zero.' : 'The share of job revenue left after direct costs.'}</small></div>}
        </div>

        <div className="calc-breakdown">
          <div className="calc-breakdown-title"><h3>Where the money goes</h3><span>{currency}</span></div>
          <dl><div className="calc-revenue-row"><dt>Job revenue <small>Price − discounts − refunds</small></dt><dd>{estimate.complete ? money(estimate.revenue) : '—'}</dd></div>
            {costKeys.map(key => <div key={key}><dt><i className={'calc-dot calc-' + key} />{labels[key]}</dt><dd>{estimate.amounts[key] === undefined ? 'Not entered' : money(estimate.amounts[key])}</dd></div>)}
            <div className="calc-total-row"><dt>Total direct costs</dt><dd>{estimate.complete ? money(estimate.direct) : 'Incomplete'}</dd></div>
          </dl>
          {estimate.complete && totalForBar > 0 && <><div className="calc-money-bar" role="img" aria-label={loss ? `Direct costs ${money(estimate.direct)} exceed job revenue ${money(estimate.revenue)}.` : `${money(estimate.direct)} in direct costs and ${money(estimate.profit)} in contribution profit.`}>
            {costKeys.map(key => <span key={key} className={'calc-' + key} style={{ width: (estimate.amounts[key] / totalForBar * 100) + '%' }} />)}
            {estimate.profit > 0 && <span className="calc-contribution" style={{ width: (estimate.profit / totalForBar * 100) + '%' }} />}
          </div><div className="calc-bar-legend"><span><i className="calc-contribution" /> Contribution</span><span><i className="calc-labor" /> Direct costs</span></div></>}
          <button className="calc-download" disabled={!estimate.complete} onClick={downloadEstimate}><Download size={14} /> Export this estimate <span>CSV</span></button>
          {exportStatus && <small className="calc-export-status" role="status">{exportStatus}</small>}
        </div>
        <div className="calc-estimate-note"><Info size={15} /><p>A management estimate, before fixed expenses and taxes. It’s not take-home pay or cash received.</p></div>
      </section>
    </div>

    <section className="calc-explainer" aria-label="Understanding your job profit">
      <div><span>THE SIMPLE MATH</span><h2>Revenue − direct costs<br />= <em>contribution profit.</em></h2></div>
      <p><strong>Every job helps keep the lights on.</strong> Supplies, worker pay, and fees come first. What remains helps cover rent, insurance, software, and other fixed expenses. Only after those expenses do you have an estimate of operating profit.</p>
    </section>
<section className="calc-next"><div><h2>Track the jobs you finish.</h2><p>Open a free workspace to keep job history and compare your work on this device.</p></div><button className="primary" onClick={()=>onNavigate("Overview")}>Open workspace</button></section>
    <footer className="calc-footer"><span>MarginDesk · See what each job actually earns.</span><button onClick={() => onNavigate('FAQ')}>Questions? Visit the FAQ <ArrowUpRight size={12} /></button></footer>
    <div className={'calc-mobile-result ' + (loss ? 'is-loss' : '')}><div><span>{estimate.complete ? 'Contribution · before fixed expenses' : 'Finish your job amounts above'}</span><strong>{estimate.complete ? money(estimate.profit) : 'Estimate incomplete'}</strong></div><button onClick={() => document.getElementById('calc-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Breakdown <ChevronDown size={14} /></button></div>
  </div>;
}
