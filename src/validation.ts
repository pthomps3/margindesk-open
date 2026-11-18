import {validateScenarios} from './scenarios.mjs';
import {jobTotals} from './finance.mjs';
function fail(message:string):never{throw Error(message)}
function text(v:unknown,max=100){if(typeof v!=='string'||!v.trim()||v.length>max)fail('Invalid text field');}
function amount(n:unknown,nullable=false){if(nullable&&n===null)return;if(!Number.isSafeInteger(n)||Number(n)<0||Number(n)>1000000000)fail('Invalid amount');}
function date(v:unknown){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v).toISOString().slice(0,10)!==v)fail('Invalid date');}
export function validateWorkspace(w:any):any{if(!w||typeof w!=='object')fail('Invalid workspace');text(w.name,100);if(!['USD','EUR','GBP','CAD','AUD'].includes(w.currency))fail('Unsupported currency');for(const key of ['services','jobs','expenses','plans']){if(!Array.isArray(w[key])||w[key].length>10000)fail('Invalid records');const ids=new Set();for(const x of w[key]){text(x.id,100);if(ids.has(x.id))fail('Duplicate ID');ids.add(x.id);}}
 const serviceNames=new Set();for(const s of w.services){text(s.name,80);const normalized=s.name.trim().toLowerCase();if(serviceNames.has(normalized))fail('Service names must be unique');serviceNames.add(normalized);for(const k of ['price','supplies','labor','other'])amount(s[k]);amount(s.feeBps);if(s.feeBps>10000)fail('Invalid fee');}
 const refs=new Set();for(const j of w.jobs){text(j.reference,80);if(refs.has(j.reference))fail('Duplicate reference');refs.add(j.reference);text(j.service,80);date(j.date);for(const k of ['price','discount','refund','feeBps'])amount(j[k]);for(const k of ['supplies','labor','other','cash'])amount(j[k],true);if(j.feeBps>10000||j.discount+j.refund>j.price)fail('Invalid discount, refund, or fee');
  if(j.feeMode!==undefined&&!['amount','rate'].includes(j.feeMode))fail('Invalid fee model');
  if(j.feeMode==='amount')amount(j.feeAmount,true);
  for(const k of ['fixedFee','vendorCost'])if(j[k]!==undefined)amount(j[k],k==='vendorCost');
  for(const k of ['ownerMinutes','travelMinutes'])if(j[k]!=null&&(!Number.isInteger(j[k])||j[k]<0||j[k]>100000))fail('Invalid working time');
  if(j.vendor!==undefined&&(typeof j.vendor!=='string'||j.vendor.length>100))fail('Invalid vendor');
  if(j.source!==undefined){if(!j.source||typeof j.source!=='object'||typeof j.source.file!=='string'||j.source.file.length>180||!Array.isArray(j.source.headers)||!Array.isArray(j.source.values)||j.source.headers.length>40||j.source.headers.length!==j.source.values.length||[...j.source.headers,...j.source.values].some(v=>typeof v!=='string'||v.length>1000))fail('Invalid source record');
   if(j.source.mapping!==undefined&&(!j.source.mapping||typeof j.source.mapping!=='object'||Array.isArray(j.source.mapping)||Object.entries(j.source.mapping).some(([k,v])=>!['reference','date','service','price','discount','refund','cash','supplies','labor','other','feeBps','feeMode','feeAmount','fixedFee','vendorCost','vendor','ownerMinutes','travelMinutes'].includes(k)||(v!==''&&(!/^\d{1,2}$/.test(String(v))||Number(v)>=j.source.headers.length)))))fail('Invalid source mapping');}
  jobTotals(j);}
 for(const e of w.expenses){text(e.name);date(e.date);amount(e.amount);if(typeof e.recurring!=='boolean')fail('Invalid schedule');if(e.endDate){date(e.endDate);if(e.endDate<e.date)fail('End date precedes start');}if(e.vendor!==undefined&&(typeof e.vendor!=='string'||e.vendor.length>100))fail('Invalid vendor');}
 for(const p of w.plans){text(p.name);amount(p.amount);for(const k of ['date','start','end'])date(p[k]);if(p.end<p.start)fail('Invalid service period');}
 // Whitelist fields; discard injected totals, roles and entitlement flags.
 if(w.businessType!==undefined&&!['service','retail','other'].includes(w.businessType))fail('Invalid business type');
 const allowed={services:['id','name','price','supplies','labor','other','feeBps'],jobs:['id','reference','date','service','price','discount','refund','cash','supplies','labor','other','feeBps','feeMode','feeAmount','fixedFee','vendorCost','vendor','ownerMinutes','travelMinutes','source'],expenses:['id','name','date','amount','recurring','endDate','vendor'],plans:['id','name','amount','date','start','end']};
 return {name:w.name,currency:w.currency,businessType:w.businessType||'service',setupComplete:w.setupComplete===true,scenarios:validateScenarios(w.scenarios),...Object.fromEntries(Object.entries(allowed).map(([key,fields])=>[key,w[key].map((x:any)=>Object.fromEntries(fields.filter(f=>x[f]!==undefined).map(f=>[f,f==='source'?{file:x.source.file,headers:x.source.headers,values:x.source.values,mapping:x.source.mapping||{}}:x[f]])))]))};
}
