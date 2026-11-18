import {minor} from './finance.mjs';
export function validateExpenseImport(rows,map,existing,kind='expenses'){
 const ids=new Set(existing.map(e=>e.id));
 return rows.map((row,i)=>{try{
  const get=k=>map[k]===undefined||map[k]===''?'':String(row[map[k]]??'').trim();
  const date=get('date'),reference=get('reference'),name=get('name'),raw=get('amount');
  if(!reference||reference.length>80)throw Error('Use a stable transaction reference to avoid duplicate imports.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Use YYYY-MM-DD dates.');
  if(!name||name.length>100)throw Error('Add a description of up to 100 characters.');
  if(!/^-?\d+(\.\d{1,2})?$/.test(raw))throw Error('Use plain signed amounts with up to two decimals.');
  if(kind==='expenses'&&raw.startsWith('-'))throw Error('Use positive expense amounts. Credits need a separate review.');
  if(get('vendor').length>100)throw Error('Vendor name must be at most 100 characters.');
  const amount=minor(raw.replace(/^-/,'').replace(/^0+(?=\d)/,''));
  const id='import-'+reference,duplicate=ids.has(id);ids.add(id);
  const excluded=kind==='bank'&&!raw.startsWith('-');
  return {row:i+2,expense:{id,date,name,amount,recurring:false,vendor:get('vendor')},skip:duplicate||excluded,reason:duplicate?'Already imported':excluded?'Inflow / zero: not imported as revenue. Review against existing sales.':'Review this outflow before recording it as an expense.'};
 }catch(e){return {row:i+2,error:e.message};}});
}
