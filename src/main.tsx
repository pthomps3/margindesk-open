import { salesWorkbook } from './exportWorkbooks.mjs';
import { workbookBlob } from './spreadsheets';
import { downloadBlob, downloadText } from './download.mjs';
import {jobRows,reportFor,toCSV} from './records.mjs';
import {pageFromHash} from './navigation.mjs';
import TargetPrice from './TargetPrice';
import ForecastScenarios from './ForecastScenarios';
import JobForm from './JobForm';
import Estimates, { EstimateForm } from './Estimates.tsx';
import BusinessSetup from './BusinessSetup';
import Reports from './Reports';
import ImportPanel from './ImportPanel';
import './workspace-refresh.css';
import React,{useState as useS,useEffect} from 'react';import{createRoot}from'react-dom/client';import{Layers,Plus,ArrowRight,Download,Upload,X}from'lucide-react';
import Landing from './Landing';import Calculator from './Calculator.tsx';import{initial}from'./data';import{validateWorkspace}from'./validation';import{jobTotals,minor,breakEven,allocate,expenseTotal}from'./finance.mjs';import './style.css';
import './appearance.css';
import {PageHead, PublicSite, WorkspaceShell, pageLabel} from './WorkspaceChrome';
import {Dashboard} from './Dashboard';
import './professional-ui.css';
import { blankWorkspace, useLocalWorkspace } from './localWorkspace';
import WorkspaceData from './WorkspaceData';
import WorkspaceDialog from './WorkspaceDialog';
import { localCalendarDate } from './calendar.mjs';
function Root() {
  const [demo, setDemo] = useS(false);
  return <App key={demo ? "sample" : "workspace"} demo={demo} setDemo={setDemo} />;
}
function App({demo,setDemo}:{demo:boolean;setDemo:(sample:boolean)=>void}){const[page,setPage]=useS(pageFromHash(location.hash)),[modal,setModal]=useS(''),[notice,setNotice]=useS(''),[period,setPeriod]=useS('month'),[forecast,setForecast]=useS({volume:40,price:125,cost:64,fixed:864,mix:50,altPrice:68,altCost:37});
const { data, write, loadError, unreadableBackup } = useLocalWorkspace(demo, initial);
const scenarios=data.scenarios||[];
useEffect(()=>{if(modal)setNotice('')},[modal]);
useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer)},[notice]);

const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:data.currency}).format(n/100);const go=(p:string)=>{setPage(p);location.hash=p;window.scrollTo({top:0,behavior:'auto'})};
useEffect(()=>{const sync=()=>{setPage(pageFromHash(location.hash));window.scrollTo({top:0,behavior:'auto'})};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);

async function save(next: unknown, replaceUnreadable = false) {
  try {
    write(validateWorkspace(next), replaceUnreadable);
    setModal("");
    setNotice("Saved successfully.");
    return true;
  } catch (error) {
    setNotice(error.message);
    return false;
  }
}
function download(name:string,text:string,type?:string){try{downloadText(name,text,type)}catch(error){setNotice(error instanceof Error?error.message:'The download could not be started.')}}
async function exportSales(format: 'xlsx' | 'csv') {
  try {
    const workspace = data;
    
    if (format === 'csv') {
      download('mymargindesk-records.csv', toCSV(jobRows(workspace.jobs)));
    } else {
      const blob = await workbookBlob(salesWorkbook(workspace.jobs, workspace.currency));
      
      downloadBlob('mymargindesk-sales.xlsx', blob);
      setNotice('Download started.');
    }
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Could not export sales.');
  }
}
const now = new Date(), end = localCalendarDate(now), start = period === 'month' ? end.slice(0,8)+'01' : '0001-01-01';
const summary = reportFor(data, start, end), jobs = summary.jobs;
const totals = { revenue: summary.revenue, direct: summary.direct, cash: summary.cash, incomplete: jobs.filter(job => !jobTotals(job).complete).length };
const recognized = summary.prepaid, fixed = summary.overhead, profit = summary.contribution, margin = totals.revenue > 0 ? profit / totals.revenue : null;
const selectedEstimate = data.estimates.find(estimate => estimate.id === modal.split(':')[1]);
const editing=data.jobs.find(j=>j.id===modal.split(':')[1]);


const table=(items:any[])=><>{items.length > 0 && <p className="md-scroll-hint">Scroll to see all columns.</p>}<div className="tablewrap md-table-scroll" role="region" aria-label="Sales and work records" tabIndex={0}><table><thead><tr><th>Sale / completed work</th><th>Date</th><th className="md-numeric">Revenue</th><th className="md-numeric">Direct costs</th><th className="md-numeric">Contribution</th><th className="md-numeric">Margin</th></tr></thead><tbody>{items.map(j=>{const t=jobTotals(j);return <tr key={j.id}><td><strong>{j.service}</strong><small><button className="textbutton" onClick={()=>setModal('Edit:'+j.id)}>{j.reference} · Edit</button></small></td><td>{j.date}</td><td className="md-numeric">{money(t.revenue)}</td><td className="md-numeric">{money(t.direct)}{!t.complete&&' + unknown'}</td><td className={'md-numeric '+(t.profit<0?'negative':'green')}>{money(t.profit)}{!t.complete&&<small>Known costs only</small>}</td><td className="md-numeric"><span className="pill">{!t.complete?'Incomplete':t.margin===null?'N/A':(t.margin*100).toFixed(1)+'%'}</span></td></tr>})}</tbody></table>{!items.length&&<p className="empty">No completed work in this view.</p>}</div></>;
const publicPage=['Home','Calculator','FAQ'].includes(page);
const openWorkspace=(sample=false)=>{go('Overview');setDemo(sample);};
const content=<>
{notice&&!modal&&<div role="status" className="notice">{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={16}/></button></div>}
{!publicPage&&loadError&&<p role="alert" className="card formcard">{loadError}</p>}{!publicPage&&demo&&<div className="preview-strip"><span>Sample data. Changes are discarded when you leave the sample.</span><button onClick={()=>openWorkspace()}>Open my workspace</button></div>}
{page==='Overview'&&<Dashboard name={data.name} retail={data.businessType==='retail'} period={period} setPeriod={setPeriod} now={now}
  totals={totals} recognized={recognized} fixed={fixed} profit={profit} margin={margin} jobs={jobs} money={money}
  recent={table([...jobs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5))}
  onAdd={()=>setModal('Job')} onSetup={()=>setModal('Onboard')} navigate={go}
  hasRecords={Boolean(data.jobs.length||data.expenses.length||data.plans.length)} cashUnknown={summary.cashUnknown} cashNote={summary.cashDateEstimated ? summary.cashDateEstimated + ' payment dates estimated from completion.':undefined}/>}
{page==='Jobs'&&<><PageHead title="Sales &amp; work" text="Record completed work, discounts, refunds, and money received."/><div className="actions"><button className="primary" onClick={()=>setModal('Job')}><Plus size={16}/> {data.businessType==='retail'?'Add sale':'Add completed work'}</button><button onClick={()=>go('Import')}><Upload size={16}/>Import spreadsheet</button><button type="button" onClick={()=>void exportSales('xlsx')}><Download size={16}/>Export Excel</button><button type="button" onClick={()=>void exportSales('csv')}>Export CSV</button></div><section className="card md-records-card">{table(data.jobs)}</section><p>Refunds reduce recognized revenue. Processing fees use the original charge after discounts and are assumed non-refundable.</p></>}
{page==='Estimates'&&<Estimates data={data} money={money} open={setModal}/>}
{page==='Services'&&<><PageHead title={pageLabel('Services',data.businessType)} text="Default costs are copied to new jobs. Existing jobs retain their recorded costs."/><button className="primary" onClick={()=>setModal('Service')}><Plus size={16}/>Add {data.businessType==='retail'?'product':'service / product'}</button><div className="servicegrid">{data.services.map(s=>{let t=jobTotals({...s,discount:0,refund:0});return <section className="card service" key={s.id}><span className="serviceicon"><Layers/></span><h3>{s.name}</h3><h2>{money(s.price)}<small> / job</small></h2><dl><dt>Supplies</dt><dd>{money(s.supplies)}</dd><dt>Worker pay</dt><dd>{money(s.labor)}</dd><dt>Other direct costs</dt><dd>{money(s.other)}</dd><dt>Processing fee</dt><dd>{s.feeBps/100}%</dd></dl><div className="result"><span>Contribution per job</span><b>{money(t.profit)}</b></div><button onClick={()=>setModal('Service:'+s.id)}>Edit service <ArrowRight size={14}/></button></section>})}</div></>}
{page==='Expenses'&&<><PageHead title="Expenses" text="Fixed expenses sit outside job costs. Monthly costs fall on their start day each month, or the last day of shorter months."/><button className="primary" onClick={()=>setModal('Expense')}><Plus size={16}/>Add expense</button><section className="card md-records-card">{data.expenses.length > 0 && <p className="md-scroll-hint">Scroll to see all columns.</p>}<div className="tablewrap md-table-scroll" role="region" aria-label="Expense records" tabIndex={0}><table><thead><tr><th>Expense</th><th>Amount</th><th>Schedule</th><th>Start date</th><th/></tr></thead><tbody>{data.expenses.map(e=><tr key={e.id}><td>{e.name}</td><td>{money(e.amount)}</td><td>{e.recurring?'Monthly':'One time'}{e.endDate&&' · ended '+e.endDate}</td><td>{e.date}</td><td>{e.recurring&&!e.endDate?<button onClick={()=>save({...data,expenses:data.expenses.map(x=>x.id===e.id?{...x,endDate:localCalendarDate()}:x)})}>End recurring expense</button>:<span>Retained in history</span>}</td></tr>)}</tbody></table></div></section></>}
{page==='Calculator'&&<Calculator onNavigate={go}/>}
{page==='Forecast'&&<><PageHead title='Forecast' text="Planning estimates only. These inputs never change your recorded results."/><ForecastScenarios forecast={forecast} onChange={setForecast} currency={data.currency} scenarios={scenarios} onSave={next=>save({...data,scenarios:[...scenarios,next]})}/><TargetPrice currency={data.currency}/>{page==='Forecast'&&<section className="card formcard"><div className="cardhead"><div><h3>Prepaid service periods</h3><p>Straight-line daily allocation, inclusive start and end dates. Rounding remainders carry to the last day.</p></div><button onClick={()=>setModal('Plan')}><Plus size={16}/> Add prepaid plan</button></div>{data.plans.map(p=><div className="forecastline" key={p.id}><span>{p.name} · {p.start} → {p.end}</span><b>{money(p.amount)}</b></div>)}{!data.plans.length&&<p>No prepaid plans recorded.</p>}</section>}</>}
{page==='Reports'&&<Reports data={data} notify={setNotice}/>}{page==='Import'&&<><PageHead title="Import" text="Choose the type of spreadsheet you want to bring into your workspace."/><ImportPanel data={data} save={save} notify={setNotice}/></>}{page==='Settings'&&<><PageHead title="Settings" text="One business, one currency. Keep your details and preferences together."/><div className="twocol"><form className="card formcard" onSubmit={e=>{e.preventDefault();let f=new FormData(e.currentTarget);if(f.get('currency')!==data.currency&&(data.jobs.length||data.plans.length||data.expenses.length||data.estimates.length||data.services.length||scenarios.length)){setNotice('Currency cannot change while records exist. Export and reset first.');return}save({...data,name:f.get('name'),currency:f.get('currency')})}}><h3>Business details</h3><button type="button" onClick={()=>setModal('Onboard')}>Change business type</button><Field label="Business name" name="name" value={data.name}/><label>Currency<select name="currency" defaultValue={data.currency}>{['USD','GBP','EUR','CAD','AUD'].map(c=><option key={c}>{c}</option>)}</select></label><button className="primary">Save business</button></form><WorkspaceData data={data} demo={demo} unreadableBackup={unreadableBackup} download={download} save={save} notify={setNotice} onSample={()=>openWorkspace(true)} onReset={()=>setModal("Delete")}/></div><section className="card formcard"><h3>How MyMarginDesk calculates</h3><p>Revenue = price − discounts − refunds + allocated prepaid revenue. Direct costs = materials / product cost + worker pay + vendor costs + other direct costs + processing fees. Actual fees stay as entered; percentage fees use the original discounted charge. Contribution = revenue − direct costs. Margin = contribution ÷ revenue; unavailable when revenue is zero or negative. Operating profit = contribution − fixed expenses.</p><p>Monthly recurring expenses count on each due date within the reporting period, up to and including the schedule end date. Missing direct costs are flagged and excluded from the subtotal, so profit may be overstated. Estimates exclude taxes, depreciation and unrecorded costs.</p></section></>}
{page==='Home'&&<Landing onNavigate={go} onWorkspace={openWorkspace}/>}

{page==='FAQ'&&<><PageHead title="Frequently asked questions" text="Straightforward answers for business owners."/>{[['Is this accounting software?','MyMarginDesk provides management estimates. It does not file taxes, process payroll, or replace your accountant.'],['Why is cash different from revenue?','Each completed job can record one cash receipt date. When the date is missing, reports use the completion date and flag that estimate. Prepaid revenue is allocated evenly over the service period you specify. Completed jobs recognize revenue on their completed date. Record prepaid services through a plan rather than also charging their jobs, to avoid double counting.'],['What about missing costs?','Unknown costs are explicitly flagged. Margin is unavailable at zero revenue. Negative contribution remains visible. All final displayed amounts round to the currency’s minor unit.'],['Can I connect my bank?','You can review a CSV or Excel bank statement and import selected expense outflows. Deposits are not automatically counted as sales.']].map(([q,a])=><details className="card" key={q}><summary>{q}</summary><p>{a}</p></details>)}</>}

</>;
return <>{publicPage ? <PublicSite page={page} navigate={go} enter={()=>openWorkspace()}>{content}</PublicSite> : <WorkspaceShell page={page} navigate={go} name={data.name} businessType={data.businessType} status={demo ? 'Sample workspace' : 'On this device'} estimates>{content}</WorkspaceShell>}

{modal&&<WorkspaceDialog onDismiss={()=>setModal('')} title={modal.startsWith('CompleteEstimate:')?'Record work from estimate':modal==='Estimate'?'New estimate':modal.startsWith('Estimate:')?'Edit job estimate':modal==='Onboard'?'Welcome to MyMarginDesk':modal.startsWith('Service')?'Service defaults':modal==='Plan'?'Add prepaid service period':modal.startsWith('Edit:')?'Update completed job':modal==='Job'?(data.businessType==='retail'?'Record a sale':'Record completed work'):modal==='Import'?'Import completed jobs':modal==='Delete'?'Delete workspace data':'Add fixed expense'}>
{notice&&<p role="alert" className="warning">{notice}</p>}
{modal==='Onboard'&&<BusinessSetup data={data} save={save}/>}
{(modal==='Estimate'||modal.startsWith('Estimate:'))&&<EstimateForm data={data} editing={selectedEstimate} save={save} notify={setNotice}/>}
{(modal==='Job'||modal.startsWith('Edit:')||modal.startsWith('CompleteEstimate:'))&&<JobForm data={data} editing={modal.startsWith('Edit:')?editing:undefined} estimate={modal.startsWith('CompleteEstimate:')?selectedEstimate:undefined} save={save} notify={setNotice}/>}
{modal.startsWith('Service')&&<form onSubmit={e=>{e.preventDefault();try{let f=new FormData(e.currentTarget),old=data.services.find(s=>s.id===modal.split(':')[1]),s={id:old?.id||crypto.randomUUID(),name:String(f.get('name')),price:minor(f.get('price')),supplies:minor(f.get('supplies')),labor:minor(f.get('labor')),other:minor(f.get('other')),feeBps:Math.round(Number(f.get('fee'))*100)};save({...data,services:old?data.services.map(x=>x.id===old.id?s:x):[...data.services,s]})}catch(e){setNotice(e.message)}}}>{(()=>{let s=data.services.find(s=>s.id===modal.split(':')[1]);return <><Field label="Service name" name="name" value={s?.name||''} maxLength={80}/>{['price','supplies','labor','other'].map(k=><Field key={k} label={k==='labor'?'Worker pay':k} name={k} type="number" min="0" step="0.01" value={(s?.[k]||0)/100}/>)}<Field label="Processing fee (%)" name="fee" type="number" min="0" max="100" step="0.01" value={(s?.feeBps||0)/100}/></>})()}<button className="primary">Save service</button></form>}
{modal==='Expense'&&<form onSubmit={e=>{e.preventDefault();try{let f=new FormData(e.currentTarget);save({...data,expenses:[...data.expenses,{id:crypto.randomUUID(),name:f.get('name'),amount:minor(f.get('amount')),date:f.get('date'),recurring:f.get('recurring')==='on'}]})}catch(e){setNotice(e.message)}}}><Field label="Expense name" name="name"/><Field label="Amount" name="amount" type="number" min="0" step="0.01"/><Field label="Date / recurring start" name="date" type="date" value={localCalendarDate()}/><label className="checkbox"><input name="recurring" type="checkbox"/>Repeat monthly</label><button className="primary">Save expense</button></form>}
{modal==='Plan'&&<form onSubmit={e=>{e.preventDefault();try{let f=new FormData(e.currentTarget);const p={id:crypto.randomUUID(),name:f.get('name'),amount:minor(f.get('amount')),date:f.get('date'),start:f.get('start'),end:f.get('end')};allocate(p.amount,p.start,p.end,p.start,p.end);save({...data,plans:[...data.plans,p]})}catch(e){setNotice(e.message)}}}><Field label="Plan name" name="name"/><Field label="Prepaid amount" name="amount" type="number" min="0" step="0.01"/>{[['date','Cash received date'],['start','Service period start'],['end','Service period end']].map(([k,l])=><Field key={k} label={l} name={k} type="date"/>)}<p>Allocate evenly per calendar day. Do not also include this revenue in a completed job.</p><button className="primary">Save prepaid plan</button></form>}

{modal==='Delete'&&<form onSubmit={e=>{e.preventDefault();if(new FormData(e.currentTarget).get('confirm')!=='DELETE'){setNotice('Type DELETE to confirm.');return;}void save(blankWorkspace(), true);}}><p>This replaces the workspace on this device with an empty one. Export a backup first if you need a copy.</p><Field name="confirm" label="Type DELETE"/><button className="danger">Reset workspace</button></form>}
</WorkspaceDialog>}</>}
const Field=({label,name,value,type='text',required=true,...rest}:any)=><label>{label}<input name={name} defaultValue={value} type={type} required={required} {...rest}/></label>;
createRoot(document.getElementById('root')!).render(<Root/>);
