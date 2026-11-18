export const minor = value => { if(!/^\d+(\.\d{1,2})?$/.test(String(value))) throw Error('Use a positive amount with at most two decimal places.'); const n=Math.round(Number(value)*100); if(!Number.isSafeInteger(n)||n>1000000000)throw Error('Amount is too large.');return n; };
export function jobTotals(j){
 const revenue=j.price-j.discount-j.refund;
 const fees=j.feeMode==='amount'?j.feeAmount:Math.round(Math.max(0,j.price-j.discount)*(j.feeBps??0)/10000)+(j.fixedFee??0);
 const missing=['supplies','labor','other'].filter(k=>j[k]==null);
 if(j.vendorCost===null)missing.push('vendorCost');
 if(fees==null)missing.push('fees');
 const direct=(j.supplies??0)+(j.labor??0)+(j.other??0)+(j.vendorCost??0)+(fees??0);
 const ownerMinutes=j.ownerMinutes??null,travelMinutes=j.travelMinutes??0;
 return {revenue,direct,fees,profit:revenue-direct,margin:revenue>0?(revenue-direct)/revenue:null,complete:missing.length===0,missing,
  cashKnown:j.cash!=null,ownerMinutes,contributionPerHour:missing.length===0&&ownerMinutes!=null&&ownerMinutes+travelMinutes>0?Math.round((revenue-direct)*60/(ownerMinutes+travelMinutes)):null};
}
export function allocate(amount,start,end,from,to){const day=86400000;const s=Date.parse(start),e=Date.parse(end);if(!Number.isFinite(s)||!Number.isFinite(e)||e<s)throw Error('Invalid service period');const total=Math.round((e-s)/day)+1;const a=Math.max(0,Math.min(total,Math.round((Date.parse(from)-s)/day)));const b=Math.max(0,Math.min(total,Math.round((Date.parse(to)-s)/day)+1));return Math.round(amount*b/total)-Math.round(amount*a/total);}
export function breakEven(fixed,price,direct){return price>direct?Math.ceil(fixed/(price-direct)):null;}
export function expenseTotal(expenses,from,to){return expenses.reduce((a,e)=>{if(!e.recurring)return a+(e.date>=from&&e.date<=to?e.amount:0);const start=e.date>from?e.date:from,end=e.endDate&&e.endDate<to?e.endDate:to;if(start>end)return a;const s=new Date(start+'T00:00:00Z'),t=new Date(end+'T00:00:00Z');const months=(t.getUTCFullYear()-s.getUTCFullYear())*12+t.getUTCMonth()-s.getUTCMonth()+1;return a+months*e.amount;},0);}
export function csvCell(v){let s=String(v??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function parseCSV(text){
 if(text.length>500000)throw Error('CSV must be under 500 KB.');
 text=text.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quote=false,closed=false;
 const field=()=>{row.push(cell);cell='';closed=false};
 const line=()=>{field();if(row.some(Boolean))rows.push(row);row=[]};
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quote){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quote=false;closed=true;}}else cell+=c;continue;}
  if(c===','){field();continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line();continue;}
  if(closed)throw Error('Unexpected text after closing quote');
  if(c==='"'){if(cell)throw Error('Invalid quote');quote=true;}else cell+=c;
 }
 if(quote)throw Error('Unclosed quote');line();
 if(rows.length>501)throw Error('Maximum 500 rows.');
 if(rows.length<2)throw Error('Include a header and at least one row.');
 if(rows.some(r=>r.length!==rows[0].length))throw Error('All rows must have the same number of columns.');
 if(new Set(rows[0]).size!==rows[0].length)throw Error('Column headers must be unique.');
 return rows;
}
export function validateImport(rows,map,existing,duplicate='skip'){
 const ids=new Set(existing.map(j=>j.reference));
 return rows.map((r,i)=>{try{
  const val=k=>map[k]===undefined||map[k]===''?'':String(r[map[k]]??'').trim();
  const optional=k=>val(k)===''?null:minor(val(k));
  const reference=val('reference'),date=val('date');
  if(!reference||reference.length>80)throw Error('Reference required (up to 80 characters)');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Use a valid YYYY-MM-DD date');
  const hasRate=val('feeBps')!=='';const mode=val('feeMode');
  if(mode&&!['amount','rate'].includes(mode))throw Error('Fee method must be amount or rate.');
  if(mode==='rate'&&!hasRate)throw Error('Add the fee rate or choose an actual fee amount.');
  const j={reference,date,service:val('service')||'Imported work',price:minor(val('price')),discount:minor(val('discount')||'0'),refund:minor(val('refund')||'0'),
   supplies:optional('supplies'),labor:optional('labor'),other:optional('other'),vendorCost:optional('vendorCost'),vendor:val('vendor'),
   feeMode:mode||(val('feeAmount')!==''?'amount':hasRate?'rate':'amount'),feeBps:hasRate?Number(val('feeBps')):0,feeAmount:optional('feeAmount'),fixedFee:minor(val('fixedFee')||'0'),cash:optional('cash'),
   ownerMinutes:val('ownerMinutes')===''?null:Number(val('ownerMinutes')),travelMinutes:val('travelMinutes')===''?0:Number(val('travelMinutes'))};
  if(!Number.isInteger(j.feeBps)||j.feeBps<0||j.feeBps>10000)throw Error('Fee basis points must be an integer from 0 to 10000');
  for(const k of ['ownerMinutes','travelMinutes'])if(j[k]!==null&&(!Number.isInteger(j[k])||j[k]<0||j[k]>100000))throw Error('Time must be whole minutes from 0 to 100,000');
  if(j.vendor.length>100)throw Error('Vendor name must be at most 100 characters');
  if(j.discount+j.refund>j.price)throw Error('Discount/refund exceeds price');
  const exists=ids.has(reference);ids.add(reference);
  return {row:i+2,job:j,skip:exists&&duplicate==='skip',error:exists&&duplicate==='reject'?'Duplicate reference':null};
 }catch(e){return {row:i+2,error:e.message};}});
}
