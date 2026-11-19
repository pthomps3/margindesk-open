import {test} from 'node:test';import assert from 'node:assert/strict';
import {jobTotals,validateImport,expenseTotal,parseCSV} from '../src/finance.mjs';
import {estimateJob} from '../src/jobEstimate.mjs';
import {jobRows,guessMapping,importTemplateRows,toCSV,reportFor,reportRows,originalRows,targetPrice} from '../src/records.mjs';
import {validateWorkspace} from '../src/validation.ts';
import {validateExpenseImport} from '../src/expenseImport.mjs';
import {workbookBlob,readWorkbook} from '../src/spreadsheets.ts';
import {inspectWorkbookZip} from '../src/workbookSafety.mjs';
const job={id:'j',reference:'R1',date:'2026-10-30',service:'Laundry',price:12500,discount:0,refund:0,cash:null,supplies:850,labor:4800,other:500,vendorCost:0,vendor:'Vendor',feeMode:'amount',feeAmount:363,feeBps:0,fixedFee:0,ownerMinutes:60,travelMinutes:30};
const workspace=()=>({name:'Synthetic only',businessType:'retail',currency:'USD',jobs:[job],services:[],expenses:[],plans:[]});
test('actual fees reconcile calculator, stored work, CSV round trip and P&L to cents',()=>{
 const expected=estimateJob({price:'125',supplies:'8.50',labor:'48',fees:'3.63',other:'5'});assert.equal(jobTotals(job).profit,expected.profit);
 const rows=parseCSV(toCSV(jobRows([job])));const result=validateImport(rows.slice(1),guessMapping(rows[0]),[])[0];assert.equal(result.error,null);assert.equal(result.job.cash,null);assert.equal(jobTotals(result.job).profit,expected.profit);assert.equal(reportFor(workspace(),'2026-10-01','2026-10-31').operating,expected.profit);
});
test('missing cash and costs remain unknown through validation, reports and imports',()=>{
 const w=workspace();w.jobs=[{...job,labor:null}];const clean=validateWorkspace(w);assert.equal(clean.jobs[0].cash,null);const r=reportFor(clean,'2026-10-01','2026-10-31');assert.equal(r.cashUnknown,1);assert.equal(r.incompleteCosts,true);assert.ok(r.missing.some(x=>x.field==='Cash received'));
 const rows=[['X','2026-10-30','10']];const imported=validateImport(rows,{reference:0,date:1,price:2},[])[0].job;assert.equal(imported.cash,null);assert.equal(imported.feeAmount,null);assert.equal(jobTotals(imported).complete,false);
});
test('known zero cash differs from blank; owner hours include travel without double cost',()=>{assert.equal(jobTotals({...job,cash:0}).cashKnown,true);assert.equal(jobTotals(job).cashKnown,false);assert.equal(jobTotals(job).contributionPerHour,3991);assert.equal(jobTotals({...job,ownerMinutes:null}).contributionPerHour,null);});
test('percentage and fixed fee use original discounted charge after refunds',()=>{const j={...job,feeMode:'rate',feeBps:290,fixedFee:30,discount:1000,refund:100};assert.equal(jobTotals(j).fees,364);assert.equal(jobTotals({...j,refund:11500}).fees,364);assert.equal(targetPrice({cost:6400,feeBps:290,fixedFee:30,margin:20}),8340);assert.equal(targetPrice({cost:100,feeBps:10000,margin:1}),null);});
test('ending a recurring expense retains prior periods and stops later months',()=>{const e=[{date:'2026-01-01',endDate:'2026-03-12',amount:1000,recurring:true}];assert.equal(expenseTotal(e,'2026-01-01','2026-12-31'),3000);assert.equal(expenseTotal(e,'2026-04-01','2026-12-31'),0);});
test('original column export preserves extra values and updates mapped amounts only',()=>{const j={...job,price:13000,source:{file:'sales.xlsx',headers:['Note','Price','Ref'],values:['hello','125','R1'],mapping:{price:'1',reference:'2'}}};const result=originalRows([j]);assert.deepEqual(result.rows,[['Note','Price','Ref'],['hello','130.00','R1']]);const clean=validateWorkspace({...workspace(),jobs:[{...j,source:{...j.source,admin:true}}]});assert.equal(clean.jobs[0].source.admin,undefined);});
test('bank import excludes inflows, retains explicit outflows, and detects duplicates',()=>{const map={reference:0,date:1,name:2,amount:3,vendor:4},rows=[['T1','2026-10-30','Supplies','-25','Vendor'],['T2','2026-10-30','Deposit','100','']];const r=validateExpenseImport(rows,map,[],'bank');assert.equal(r[0].expense.amount,2500);assert.equal(r[0].skip,false);assert.equal(r[1].skip,true);assert.equal(validateExpenseImport(rows,map,[r[0].expense],'bank')[0].skip,true);});
test('Excel round trip preserves values and treats formula-like text as text',async()=>{const rows=[['Reference','Date','Price','Note'],['R1','2026-10-30','125.00','=HYPERLINK("bad")']];const blob=await workbookBlob([{name:'Records',rows}]);const file=new File([blob],'records.xlsx');assert.deepEqual(await readWorkbook(file),rows);assert.throws(()=>inspectWorkbookZip(new ArrayBuffer(100)));});

import {pageFromHash} from '../src/navigation.mjs';
import {validateScenarios} from '../src/scenarios.mjs';
test('encoded sign-in routes and malformed fragments always resolve to a screen',()=>{
 assert.equal(pageFromHash('#Sign%20in'),'Home');assert.equal(pageFromHash('#%E0%A4%A'),'Home');assert.equal(pageFromHash('#not-real'),'Home');
});
test('saved scenarios validate numeric bounds and exclude injected fields',()=>{
 const s={volume:10,price:100,cost:50,fixed:100,mix:100,altPrice:0,altCost:0};
 assert.deepEqual(validateScenarios([{...s,owner:'other'}]),[s]);assert.throws(()=>validateScenarios([{...s,mix:101}]));
 assert.throws(()=>validateScenarios(Array(21).fill(s)));
});

import {sourceGroups} from '../src/records.mjs';
test('original-column exports can select each imported file without mixing its rows',()=>{
 const one={reference:'A',price:100,source:{file:'one.xlsx',headers:['Ref','Amount','Note'],values:['A','1','First'],mapping:{reference:'0',price:'1'}}};
 const two={reference:'B',price:250,source:{file:'two.xlsx',headers:['Amount','Ref'],values:['2','B'],mapping:{reference:'1',price:'0'}}};
 const groups=sourceGroups([one,two]);assert.equal(groups.length,2);
 const out=originalRows([one,two],groups[1].key);assert.deepEqual(out.rows,[['Amount','Ref'],['2.50','B']]);assert.equal(out.count,1);
});

test('an entered actual fee takes priority unless the imported method explicitly selects rate',()=>{
 const headers=['Reference','Date','Sale price','Actual fee','Fee rate (basis points)'];
 const rows=[['F-1','2026-10-30','100','2.50','300']];
 const out=validateImport(rows,guessMapping(headers),[]);assert.equal(out[0].job.feeMode,'amount');assert.equal(jobTotals(out[0].job).fees,250);
});
test('negative values in a general expense file cannot silently become positive costs',()=>{
 const out=validateExpenseImport([['E-1','2026-10-30','Refund','-25']],{reference:'0',date:'1',name:'2',amount:'3'},[],'expenses');assert.match(out[0].error,/positive expense/);
});

test('every downloadable template passes the import preview', () => {
 const sales = parseCSV(toCSV(importTemplateRows('jobs')));
 const [sale] = validateImport(sales.slice(1), guessMapping(sales[0]), []);
 assert.equal(sale.error, null);
 assert.equal(sale.job.price, 12500);
 assert.equal(sale.job.cashDate, '2026-11-03');
 for (const kind of ['expenses', 'bank']) {
  const rows = parseCSV(toCSV(importTemplateRows(kind)));
  const [result] = validateExpenseImport(rows.slice(1), {reference:0,date:1,name:2,amount:3,vendor:4}, [], kind);
  assert.equal(result.error, undefined);
  assert.equal(result.skip, false);
  assert.equal(result.expense.amount, 2500);
 }
});

test('CSV distinguishes numeric values from formula-like text and preserves ordinary quoted fields', () => {
 const rows = [['Number', 'Reference', 'Note'], [-25, '-00123', 'North, "main"\nCafé']];
 const parsed = parseCSV(toCSV(rows));
 assert.deepEqual(parsed[1], ['-25', "'-00123", 'North, "main"\nCafé']);
});

test('workbook sales and profit are numeric cells even when the business makes a loss', async () => {
 const data = workspace();
 data.jobs[0] = {...job, price: 100};
 const report = reportRows(data, '2026-10-01', '2026-10-31');
 const sales = jobRows(data.jobs);
 const blob = await workbookBlob([{name:'Profit',rows:report}, {name:'Sales',rows:sales}]);
 const {readSheet} = await import('read-excel-file/universal');
 const buffer = await blob.arrayBuffer();
 const profitSheet = await readSheet(buffer, 1);
 const salesSheet = await readSheet(buffer, 2);
 assert.equal(profitSheet.find(row => row[0].startsWith('Estimated operating profit'))[1], -64.13);
 assert.equal(salesSheet[1][salesSheet[0].indexOf('Sale price')], 1);
});
