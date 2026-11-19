import { useState } from 'react';
import { Plus } from 'lucide-react';
import { localCalendarDate } from './calendar.mjs';
import { minor } from './finance.mjs';
import { compareEstimate, estimateCosts } from './estimates.mjs';
import './estimates.css';

type Props = { data: any; open: (modal: string) => void; money: (cents: number) => string };

export default function Estimates({ data, open, money }: Props) {
  const jobs = new Map<string, any>(data.jobs.filter(job => job.estimateId).map(job => [job.estimateId, job]));
  return <>
    <div className="heading">
      <div><h1>Job estimates</h1><p>Save a quote, then compare it with what you earned when the work is complete.</p></div>
      <button className="primary" onClick={() => open('Estimate')}><Plus size={16}/> New estimate</button>
    </div>
    {data.estimates.length === 0 && <section className="card formcard">
      <h3>Your first estimate</h3><p>Enter a price and your expected costs. The estimate appears in your sales reports once you record the completed work.</p>
    </section>}
    <div className="estimate-list">{data.estimates.map(estimate => {
      const job = jobs.get(estimate.id);
      const { quoted, actual, variance } = compareEstimate(estimate, job);
      return <article className="card formcard" key={estimate.id}>
        <div className="estimate-title"><div><h3>{estimate.service}</h3><small>{estimate.reference} · {estimate.date}</small></div>
          <span className="pill">{job ? 'Completed' : 'Quoted'}</span></div>
        <dl className="estimate-amounts">
          <div><dt>Quoted price</dt><dd>{money(estimate.price)}</dd></div>
          <div><dt>Estimated costs</dt><dd>{money(quoted.direct)}</dd></div>
          <div><dt>Quoted contribution</dt><dd>{money(quoted.profit)}</dd></div>
          {actual && <div><dt>Actual contribution</dt><dd>{actual.complete ? money(actual.profit) : 'Costs incomplete'}</dd></div>}
        </dl>
        {actual && <p className="estimate-variance">{variance === null ? 'Enter the remaining job costs to compare the result.' :
          variance === 0 ? 'Actual contribution matched the quote.' :
          money(Math.abs(variance)) + (variance > 0 ? ' above' : ' below') + ' quoted contribution.'}</p>}
        <div className="actions">{job
          ? <button onClick={() => open('Edit:' + job.id)}>Review completed job</button>
          : <><button className="primary" onClick={() => open('CompleteEstimate:' + estimate.id)}>Record completed work</button>
            <button onClick={() => open('Estimate:' + estimate.id)}>Edit estimate</button></>}</div>
      </article>;
    })}</div>
  </>;
}

export function EstimateForm({ data, editing, save, notify }: any) {
  const [reference] = useState(() => editing?.reference ?? 'EST-' + crypto.randomUUID().slice(0, 8).toUpperCase());
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const entry: any = {
        id: editing?.id ?? crypto.randomUUID(), reference: String(fields.get('reference')).trim(),
        service: String(fields.get('service')).trim(), date: String(fields.get('date')), price: minor(fields.get('price')),
      };
      for (const [key] of estimateCosts) entry[key] = minor(fields.get(key));
      const estimates = editing ? data.estimates.map(item => item.id === editing.id ? entry : item) : [entry, ...data.estimates];
      await save({ ...data, estimates });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The estimate could not be saved.');
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit}>
    <label>Service or project<input name="service" maxLength={80} defaultValue={editing?.service} required /></label>
    <div className="formgrid">
      <label>Estimate reference<input name="reference" maxLength={80} defaultValue={reference} required /></label>
      <label>Quote date<input name="date" type="date" defaultValue={editing?.date ?? localCalendarDate()} required /></label>
    </div>
    <label>Quoted price ({data.currency})<input name="price" inputMode="decimal" type="number" min="0" step="0.01" max="10000000" defaultValue={editing ? editing.price / 100 : ''} required /></label>
    <h3 className="form-section">Estimated direct costs</h3>
    <p>Enter the expected cost in {data.currency}. Leave zero for costs that do not apply.</p>
    <div className="formgrid">{estimateCosts.map(([key, label]) => <label key={key}>{label}
      <input name={key} inputMode="decimal" type="number" min="0" max="10000000" step="0.01" defaultValue={(editing?.[key] ?? 0) / 100} required /></label>)}</div>
    <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save estimate'}</button>
  </form>;
}
