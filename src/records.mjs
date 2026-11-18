import {jobTotals,expenseTotal,allocate,csvCell} from './finance.mjs';
export const importFields=['reference','date','service','price','discount','refund','supplies','labor','vendorCost','vendor','other','cash','feeMode','feeAmount','feeBps','fixedFee','ownerMinutes','travelMinutes'];
export const fieldLabels={reference:'Reference',date:'Date',service:'Service or product',price:'Sale price',discount:'Discount',refund:'Refund',supplies:'Materials / product cost',labor:'Worker pay',vendorCost:'Vendor cost',vendor:'Vendor',other:'Other direct cost',cash:'Cash received',feeMode:'Fee method',feeAmount:'Actual fee',feeBps:'Fee rate (basis points)',fixedFee:'Fixed fee',ownerMinutes:'Owner work (minutes)',travelMinutes:'Travel (minutes)'};
const cents=new Set(['price','discount','refund','supplies','labor','vendorCost','other','cash','feeAmount','fixedFee']);
const normalize=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
export function guessMapping(headers){
 const aliases={reference:['reference','ref','jobid','orderid'],date:['date','completeddate'],service:['service','product','description'],price:['price','saleprice','sales','revenue'],supplies:['supplies','materials','productcost','cogs'],labor:['labor','labour','workerpay'],cash:['cash','cashreceived','amountreceived'],vendorCost:['vendorcost','subcontractorcost'],feeAmount:['feeamount','actualfee','fees']};
 return Object.fromEntries(importFields.map(k=>{const i=headers.findIndex(h=>[k,fieldLabels[k],...(aliases[k]||[])].some(v=>normalize(h)===normalize(v)));return [k,i<0?'':String(i)]}));
}
export function jobRows(jobs){return [importFields.map(k=>fieldLabels[k]),...jobs.map(j=>importFields.map(k=>j[k]==null?'':cents.has(k)?(j[k]/100).toFixed(2):String(j[k])))];}
export const toCSV=rows=>'\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
export function reportFor(workspace,from,to){
 const jobs=workspace.jobs.filter(j=>j.date>=from&&j.date<=to), totals=jobs.map(jobTotals);
 const prepaid=workspace.plans.reduce((n,p)=>n+allocate(p.amount,p.start,p.end,from,to),0);
 const revenue=totals.reduce((n,t)=>n+t.revenue,prepaid),direct=totals.reduce((n,t)=>n+t.direct,0),overhead=expenseTotal(workspace.expenses,from,to);
 const missing=jobs.flatMap((j,i)=>[...totals[i].missing.map(k=>({reference:j.reference,field:fieldLabels[k]||k})),...(j.cash==null?[{reference:j.reference,field:'Cash received'}]:[])]);
 return {jobs,revenue,direct,overhead,contribution:revenue-direct,operating:revenue-direct-overhead,prepaid,missing,incompleteCosts:totals.some(t=>!t.complete),cash:jobs.reduce((n,j)=>n+(j.cash??0),0)+workspace.plans.filter(p=>p.date>=from&&p.date<=to).reduce((n,p)=>n+p.amount,0),cashUnknown:jobs.filter(j=>j.cash==null).length};
}
export function reportRows(workspace,from,to){const r=reportFor(workspace,from,to);return [['Management P&L',workspace.name],['Period',from+' to '+to],['Currency',workspace.currency],['Basis','Completed work plus daily prepaid allocation; entered expenses only'],['Revenue recognized',(r.revenue/100).toFixed(2)],['Known direct costs',(r.direct/100).toFixed(2)],['Contribution '+(r.incompleteCosts?'(incomplete)':''),(r.contribution/100).toFixed(2)],['Recorded overhead',(r.overhead/100).toFixed(2)],['Estimated operating profit'+(r.incompleteCosts?' (incomplete)':''),(r.operating/100).toFixed(2)],['Recorded cash received',(r.cash/100).toFixed(2)],['Cash records missing',r.cashUnknown],['Important','Not a bank balance or audited/tax financial statement. Missing amounts are not zero or confirmed unpaid work.'],['Missing information','Record'],...r.missing.map(x=>[x.field,x.reference])];}
export function sourceGroups(jobs){return [...new Map(jobs.filter(j=>j.source).map(j=>{const key=JSON.stringify([j.source.file,j.source.headers]);return [key,{key,name:j.source.file}];})).values()];}
export function originalRows(jobs,sourceKey=''){
 const first=jobs.find(j=>j.source&&(!sourceKey||JSON.stringify([j.source.file,j.source.headers])===sourceKey));if(!first)return null;
 const matching=jobs.filter(j=>j.source?.file===first.source.file&&JSON.stringify(j.source.headers)===JSON.stringify(first.source.headers));
 return {name:first.source.file,rows:[first.source.headers,...matching.map(j=>{const values=[...j.source.values];for(const [k,index] of Object.entries(j.source.mapping||{})){if(index!==''&&importFields.includes(k))values[Number(index)]=j[k]==null?'':cents.has(k)?(j[k]/100).toFixed(2):String(j[k]);}return values;})],count:matching.length};
}
export function targetPrice({cost,feeBps=0,fixedFee=0,margin=0}){const denominator=1-feeBps/10000-margin/100;return denominator>0?Math.ceil((cost+fixedFee)/denominator):null;}
