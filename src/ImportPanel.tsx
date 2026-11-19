import {useRef,useState} from 'react';
import {parseCSV,validateImport,jobTotals} from './finance.mjs';
import {importFields,fieldLabels,guessMapping,importTemplateRows,toCSV} from './records.mjs';
import {validateExpenseImport} from './expenseImport.mjs';
import {readWorkbook} from './spreadsheets';

function receiptSummary(job) {
 if (job.cash == null) return 'Cash not entered';
 const amount = (job.cash / 100).toFixed(2);
 if (job.cash === 0) return 'Cash ' + amount;
 return job.cashDate
  ? 'Cash ' + amount + ' received on ' + job.cashDate
  : 'Cash ' + amount + ' assigned to completion date ' + job.date + ' (estimated)';
}
export default function ImportPanel({data,save,notify}:any){
 const [rows,setRows]=useState<string[][]>(null),[mapping,setMap]=useState<any>({}),[filename,setFile]=useState(''),[kind,setKind]=useState('jobs'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[excluded,setExcluded]=useState<number[]>([]),[duplicate,setDuplicate]=useState('skip');const version=useRef(0);
 const fields=kind==='jobs'?importFields:['reference','date','name','amount','vendor'];
 const preview=rows?(kind==='jobs'?validateImport(rows.slice(1),mapping,data.jobs,duplicate):validateExpenseImport(rows.slice(1),mapping,data.expenses,kind)):[];
 const candidates=preview.filter(r=>!r.error&&!r.skip&&!excluded.includes(r.row));
 function changeKind(k){version.current++;setKind(k);setBusy(false);setRows(null);setMap({});setError('');setConfirmed(false);setExcluded([]);}
 function sample() {
  const csv = toCSV(importTemplateRows(kind));
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mymargindesk-' + kind + '-template.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 return <section className="card formcard import-panel"><h2>Bring your records with you.</h2><p>Preview, correct, then import. Your original spreadsheet stays untouched.</p><div className="actions">{[['jobs','Sales / completed work'],['expenses','Expenses'],['bank','Bank statement']].map(([id,label])=><button key={id} aria-pressed={kind===id} onClick={()=>changeKind(id)}>{label}</button>)}</div>
 {kind==='bank'&&<div className="import-note"><b>Statement import · not a connected bank</b><p>Use negative amounts for money out and positive amounts for money in. Inflows are left out so deposits do not duplicate sales. Exclude transfers, loan payments, tax, inventory purchases already included in job costs, and other non-expenses before importing. </p></div>}
 <div className="actions"><button onClick={sample}>Download a template</button><label className="file-label">Choose CSV or Excel<input key={kind} aria-label="Import spreadsheet" type="file" accept=".csv,.xlsx" disabled={busy} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const current=++version.current;setBusy(true);setRows(null);setError('');setConfirmed(false);try{if(!/\.(csv|xlsx)$/i.test(f.name)||f.size>(f.name.toLowerCase().endsWith('.xlsx')?2000000:500000))throw Error('Choose a CSV up to 500 KB or an Excel workbook up to 2 MB.');const parsed=f.name.toLowerCase().endsWith('.xlsx')?await readWorkbook(f):parseCSV(await f.text());if(current!==version.current)return;if(JSON.stringify(parsed).length>500000||parsed[0].length>40||parsed.flat().some(x=>x.length>1000))throw Error('Use up to 500 rows, 40 columns, and 500 KB of text values.');setRows(parsed);setFile(f.name.slice(0,180));setExcluded([]);setMap(kind==='jobs'?guessMapping(parsed[0]):Object.fromEntries(fields.map(k=>{const aliases=k==='name'?['description','name','expense']:k==='reference'?['reference','transactionid','id']:[k];const i=parsed[0].findIndex(h=>aliases.includes(h.toLowerCase().replace(/[^a-z]/g,'')));return [k,i<0?'':String(i)]})));}catch(e){if(current===version.current)setError(e.message);}finally{if(current===version.current)setBusy(false);}}}/></label></div><small>CSV or .xlsx values, first visible sheet; up to 500 records. Spreadsheet formulas must be converted to values. The file is read on your device. Reviewed records are saved only to your workspace.</small>
 {busy&&<p role="status">Reading or saving your spreadsheet…</p>}{rows&&<><h3>{filename} · {rows.length-1} rows</h3><details className="entry-details"><summary>Column mapping · review or change</summary><div className="formgrid">{fields.map(k=><label key={k}>{fieldLabels[k]||k}<select value={mapping[k]??''} onChange={e=>{setMap({...mapping,[k]:e.target.value});setConfirmed(false);}}><option value="">Not provided</option>{rows[0].map((h,i)=><option key={i} value={i}>{h||'Column '+(i+1)}</option>)}</select></label>)}</div></details>
 {kind==='jobs'&&<label>Duplicate references<select value={duplicate} onChange={e=>{setDuplicate(e.target.value);setConfirmed(false);}}><option value="skip">Skip duplicates</option><option value="reject">Stop the import</option></select></label>}
 <div className="import-rows">{preview.map(r=><div key={r.row} className={r.error?'import-error':'import-row'}><b>Row {r.row}</b><span>{r.error||r.reason||(r.skip?'Duplicate: skipped':r.job.reference+' · '+r.job.date+' · '+r.job.service+' · Sale '+(r.job.price/100).toFixed(2)+' '+data.currency+' · '+(jobTotals(r.job).complete?'Costs complete':'Missing costs: '+jobTotals(r.job).missing.join(', '))+' · Known costs '+(jobTotals(r.job).direct/100).toFixed(2)+' · '+receiptSummary(r.job))}</span>{r.expense&&<small>{r.expense.date} · {r.expense.name} · {(r.expense.amount/100).toFixed(2)} {data.currency}{r.expense.vendor&&' · '+r.expense.vendor}</small>}{kind!=='jobs'&&!r.skip&&!r.error&&<label className="checkbox"><input type="checkbox" checked={!excluded.includes(r.row)} onChange={e=>{setExcluded(e.target.checked?excluded.filter(x=>x!==r.row):[...excluded,r.row]);setConfirmed(false);}}/>Include expense</label>}</div>)}</div>
 <label className="checkbox"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed these {candidates.length} records and the missing information.</label>
 <button className="primary" disabled={busy||!confirmed||preview.some(r=>r.error)||!candidates.length} onClick={async()=>{setBusy(true);setError('');try{


  const next=kind==='jobs'?{...data,jobs:[...candidates.map(r=>({...r.job,id:crypto.randomUUID(),source:{file:filename,headers:rows[0],values:rows[0].map((_,index)=>rows[r.row-1][index]??''),mapping}})),...data.jobs]}:{...data,expenses:[...candidates.map(r=>r.expense),...data.expenses]};if(!await save(next))return;
  notify(candidates.length+' records imported.');setRows(null);setConfirmed(false);
 }catch(e){setError(e.message);}finally{setBusy(false);}}}>{busy?'Working…':'Import '+candidates.length+' records'}</button></>}{error&&<p role="alert" className="import-error">{error}</p>}
 </section>;
}
