import {jobTotals,expenseTotal,allocate,csvCell} from './finance.mjs';
export const importFields=['reference','date','service','price','discount','refund','supplies','labor','vendorCost','vendor','other','cash','cashDate','feeMode','feeAmount','feeBps','fixedFee','ownerMinutes','travelMinutes'];
export const fieldLabels={reference:'Reference',date:'Date',service:'Service or product',price:'Sale price',discount:'Discount',refund:'Refund',supplies:'Materials / product cost',labor:'Worker pay',vendorCost:'Vendor cost',vendor:'Vendor',other:'Other direct cost',cash:'Cash received',cashDate:'Cash received date',feeMode:'Fee method',feeAmount:'Actual fee',feeBps:'Fee rate (basis points)',fixedFee:'Fixed fee',ownerMinutes:'Owner work (minutes)',travelMinutes:'Travel (minutes)'};
const cents=new Set(['price','discount','refund','supplies','labor','vendorCost','other','cash','feeAmount','fixedFee']);
const normalize=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
export function guessMapping(headers){
 const aliases={reference:['reference','ref','jobid','orderid'],date:['date','completeddate'],service:['service','product','description'],price:['price','saleprice','sales','revenue'],supplies:['supplies','materials','productcost','cogs'],labor:['labor','labour','workerpay'],cash:['cash','cashreceived','amountreceived'],cashDate:['receiptdate','paymentdate','datereceived'],vendorCost:['vendorcost','subcontractorcost'],feeAmount:['feeamount','actualfee','fees']};
 return Object.fromEntries(importFields.map(k=>{const i=headers.findIndex(h=>[k,fieldLabels[k],...(aliases[k]||[])].some(v=>normalize(h)===normalize(v)));return [k,i<0?'':String(i)]}));
}
export function jobRows(jobs) {
 const rows = jobs.map(job => importFields.map(field => {
  const value = job[field];
  if (value == null) return '';
  return cents.has(field) ? value / 100 : value;
 }));
 return [importFields.map(field => fieldLabels[field]), ...rows];
}

export function importTemplateRows(kind) {
 if (kind === 'jobs') {
  return [
   ['Reference', 'Date', 'Service or product', 'Sale price', 'Materials / product cost', 'Worker pay', 'Vendor cost', 'Other direct cost', 'Actual fee', 'Cash received', 'Cash received date'],
   ['ORDER-100', '2026-10-30', 'Example sale', 125, 8.5, 48, 0, 5, 3.63, 125, '2026-11-03'],
  ];
 }
 return [
  ['Reference', 'Date', 'Description', 'Amount', 'Vendor'],
  ['BANK-100', '2026-10-30', 'Example supplies', kind === 'bank' ? -25 : 25, 'Example vendor'],
 ];
}
export const toCSV=rows=>'\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
export function reportFor(workspace,from,to){
 const jobs=workspace.jobs.filter(j=>j.date>=from&&j.date<=to), totals=jobs.map(jobTotals);
 const inPeriod = date => date >= from && date <= to;
 const receipts = [
  ...workspace.jobs.filter(job => job.cash > 0 && inPeriod(job.cashDate || job.date)).map(job => ({
   type: 'Completed work', reference: job.reference, date: job.cashDate || job.date,
   amount: job.cash, estimatedDate: !job.cashDate,
  })),
  ...workspace.plans.filter(plan => plan.amount > 0 && inPeriod(plan.date)).map(plan => ({
   type: 'Prepaid plan', reference: plan.name, date: plan.date, amount: plan.amount, estimatedDate: false,
  })),
 ].sort((a,b) => a.date.localeCompare(b.date) || a.reference.localeCompare(b.reference));
 const prepaid=workspace.plans.reduce((n,p)=>n+allocate(p.amount,p.start,p.end,from,to),0);
 const revenue=totals.reduce((n,t)=>n+t.revenue,prepaid),direct=totals.reduce((n,t)=>n+t.direct,0),overhead=expenseTotal(workspace.expenses,from,to);
 const missing=jobs.flatMap((j,i)=>[...totals[i].missing.map(k=>({reference:j.reference,field:fieldLabels[k]||k})),...(j.cash==null?[{reference:j.reference,field:'Cash received'}]:[])]);
 return {jobs,revenue,direct,overhead,contribution:revenue-direct,operating:revenue-direct-overhead,prepaid,missing,incompleteCosts:totals.some(t=>!t.complete),
  receipts, cash: receipts.reduce((total, receipt) => total + receipt.amount, 0),
  cashDateEstimated: receipts.filter(receipt => receipt.estimatedDate).length,
  cashUnknown:jobs.filter(j=>j.cash==null).length};
}
export function reportRows(workspace,from,to){const r=reportFor(workspace,from,to);return [['Management P&L',workspace.name],['Period',from+' to '+to],['Currency',workspace.currency],['Basis','Completed work plus daily prepaid allocation; entered expenses only'],['Revenue recognized',r.revenue/100],['Known direct costs',r.direct/100],['Contribution '+(r.incompleteCosts?'(incomplete)':''),r.contribution/100],['Recorded overhead',r.overhead/100],['Estimated operating profit'+(r.incompleteCosts?' (incomplete)':''),r.operating/100],['Recorded cash received',r.cash/100],['Completed jobs missing a cash amount',r.cashUnknown],['Receipt dates estimated from completion',r.cashDateEstimated],['Important','Not a bank balance or audited/tax financial statement. Missing amounts are not zero or confirmed unpaid work.'],['Missing information','Record'],...r.missing.map(x=>[x.field,x.reference])];}
export function sourceGroups(jobs){return [...new Map(jobs.filter(j=>j.source).map(j=>{const key=JSON.stringify([j.source.file,j.source.headers]);return [key,{key,name:j.source.file}];})).values()];}
export function originalRows(jobs,sourceKey=''){
 const first=jobs.find(j=>j.source&&(!sourceKey||JSON.stringify([j.source.file,j.source.headers])===sourceKey));if(!first)return null;
 const matching=jobs.filter(j=>j.source?.file===first.source.file&&JSON.stringify(j.source.headers)===JSON.stringify(first.source.headers));
 const fields=Object.fromEntries(Object.entries(first.source.mapping||{}).filter(([field,index])=>index!==''&&importFields.includes(field)).map(([field,index])=>[Number(index),field]));
 return {name:first.source.file,fields,rows:[first.source.headers,...matching.map(j=>{const values=[...j.source.values];for(const [k,index] of Object.entries(j.source.mapping||{})){if(index!==''&&importFields.includes(k))values[Number(index)]=j[k]==null?'':cents.has(k)?(j[k]/100).toFixed(2):String(j[k]);}return values;})],count:matching.length};
}
export function targetPrice({cost,feeBps=0,fixedFee=0,margin=0}){const denominator=1-feeBps/10000-margin/100;return denominator>0?Math.ceil((cost+fixedFee)/denominator):null;}
