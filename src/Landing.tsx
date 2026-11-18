import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, Receipt, Layers, TrendingUp, Leaf, Wallet, SlidersHorizontal } from 'lucide-react';
import { jobTotals } from './finance.mjs';
import './landing.css';

const examples = [
  { label: 'Cleaning', name: 'Standard home clean', price: 12500, supplies: 850, labor: 4800, other: 500, feeBps: 290 },
  { label: 'Laundry', name: 'Laundry pickup & delivery', price: 6800, supplies: 650, labor: 2400, other: 450, feeBps: 290 },
  { label: 'Maintenance', name: 'Routine maintenance visit', price: 17500, supplies: 2200, labor: 7000, other: 1200, feeBps: 290 },
];
const dollars = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export default function Landing({ onNavigate, onWorkspace }: { onNavigate: (page: string) => void; onWorkspace: (sample?: boolean) => void }) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const example = examples[exampleIndex];
  const totals = jobTotals({ ...example, discount: 0, refund: 0 });
  const fee = totals.direct - example.supplies - example.labor - example.other;
  const costs = [['Supplies', example.supplies], ['Worker pay', example.labor], ['Processing fees', fee], ['Other direct costs', example.other]] as const;

  return <div className="landing-page">
    <section className="landing-hero">
      <div className="landing-hero-copy">
        <span className="pricing-kicker"><span /> FOR THE BUSINESS YOU’RE BUILDING</span>
        <h1>See what each job<br />actually <em>earns.</em></h1>
        <p className="landing-lead">You know what you charge.<br />Know what’s left, too.</p>
        <p className="landing-description">Bring materials, product costs, worker pay, vendor costs, and fees into one clear picture. Understand each job’s contribution, spot your strongest services, and price your next job with confidence.</p>
<div className="landing-actions"><button className="primary" onClick={()=>onWorkspace()}>Open free workspace <ArrowRight size={17}/></button><button className="landing-demo-link" onClick={()=>onWorkspace(true)}>Explore sample data <ArrowUpRight size={16}/></button></div>
        <div className="landing-assurance"><Check size={13} /> Open source. No account required.</div>
      </div>

      <div className="job-example-wrap">
        <div className="example-switch" aria-label="Choose a sample service">{examples.map((item, index) => <button key={item.label} aria-pressed={exampleIndex === index} className={exampleIndex === index ? 'selected' : ''} onClick={() => setExampleIndex(index)}>{item.label}</button>)}</div>
        <article className="job-example" aria-label="Illustrative job profit calculation">
          <div className="example-heading"><span className="example-icon"><Receipt size={20} strokeWidth={1.6} /></span><div><span className="example-eyebrow">ONE COMPLETED JOB</span><h2>{example.name}</h2></div><CheckCircle2 size={18} className="example-check" /></div>
          <div className="example-revenue"><span>What you charged</span><strong>{dollars(example.price)}</strong></div>
          <div className="example-costs"><span className="example-eyebrow">WHAT IT TOOK TO DO THE WORK</span><dl>{costs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>−{dollars(value)}</dd></div>)}</dl><div className="example-cost-total"><span>Total direct costs</span><b>{dollars(totals.direct)}</b></div></div>
          <div className="example-profit" aria-live="polite" aria-atomic="true"><div><span>What this job contributes</span><strong>{dollars(totals.profit)}</strong></div><span className="example-margin">{(totals.margin * 100).toFixed(1)}% margin <ArrowUpRight size={13} /></span></div>
          <p className="example-explainer">Money left after direct costs, to cover your overhead and build profit. Before fixed expenses and tax.</p>
        </article>
        <div className="example-caption"><span className="sample-dot" /> Illustrative sample · USD <span>Try a different service above ↑</span></div>
      </div>
    </section>

    <div className="business-strip"><span>Made for hands-on businesses</span><span>Cleaning</span><i /><span>Laundry</span><i /><span>Home services</span><i /><span>Maintenance</span><i /><span>And your next idea</span></div>

    <section className="landing-workflow">
      <div className="section-heading"><span className="pricing-kicker"><span /> FROM COMPLETED WORK TO CLEAR NUMBERS</span><h2>A little less guessing.<br />A better feel for your business.</h2><p>Start with the work you already do. MarginDesk helps you see it clearly.</p></div>
      <div className="workflow-grid">{[
        { number: '01', icon: Layers, title: 'Set up your services.', text: 'Add what you charge and what each job usually costs. Your supplies, worker pay, and fees are ready for the next entry.' },
        { number: '02', icon: Receipt, title: 'Record a finished job.', text: 'Enter the completed work, adjust costs, and add any discount or refund. See its contribution profit as soon as you save.' },
        { number: '03', icon: TrendingUp, title: 'Know what to do next.', text: 'Compare services, account for overhead, and explore how a different price or workload could change your results.' },
      ].map(step => <article key={step.number}><div className="workflow-top"><span className="workflow-icon"><step.icon size={22} strokeWidth={1.5} /></span><span>{step.number}</span></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
    </section>

    <section className="landing-clarity">
      <div className="clarity-copy"><span className="pricing-kicker"><span /> THE NUMBERS BEHIND THE BUSY DAYS</span><h2>Busy is good.<br />Knowing what it earns is better.</h2><p>A full schedule is only part of the picture. See how job costs, overhead, and prepaid work affect the money in your business.</p><button className="landing-text-link" onClick={() => onWorkspace(true)}>Take a look inside <ArrowRight size={16} /></button></div>
      <div className="clarity-list">{[
        { icon: Receipt, title: 'Revenue is the starting point.', text: 'Subtract supplies, pay, fees, and other direct costs to see the contribution each job makes.' },
        { icon: Wallet, title: 'Cash and revenue have their own timelines.', text: 'A prepaid plan brings in cash today. Allocate its revenue across the days you provide the service.' },
        { icon: SlidersHorizontal, title: 'Try the change before you make it.', text: 'Explore volume, prices, costs, and customer mix in a forecast, separate from your recorded results.' },
      ].map(item => <article key={item.title}><item.icon size={20} strokeWidth={1.6} /><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div>
    </section>

    <section className="landing-origin"><div className="origin-mark"><Leaf size={25} strokeWidth={1.3} /></div><div><span className="example-eyebrow">BUILT FROM THE REALITIES OF RUNNING A BUSINESS</span><h2>Practical experience. A clearer perspective.</h2><p>Paul Thompson, co-founder of The Wrinkle Ninjas, knows how supplies, worker pay, recurring revenue, and cash flow shape a laundry business. MarginDesk brings those practical needs into a configurable workspace for small service businesses.</p></div></section>

    <section className="landing-final"><span className="pricing-kicker"><span /> START WITH YOUR NEXT JOB</span><h2>Good work deserves<br /><em>clear numbers.</em></h2><p>See what’s left after the work is done.</p><button className="primary" onClick={() => onNavigate('Calculator')}>Calculate a job’s profit <ArrowRight size={17} /></button><span className="landing-assurance">Free calculator. No account required.</span></section>
<footer className="landing-footer"><span className="footer-wordmark">MarginDesk</span><div><a href="https://github.com/pthomps3/margindesk-open">GitHub</a> · <a href="https://github.com/pthomps3/margindesk-open/archive/refs/heads/main.zip">Download source</a></div><small>Management estimates, before tax.</small></footer>
  </div>;
}
