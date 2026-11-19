import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jobRows, guessMapping, reportFor, reportRows, originalRows, toCSV} from '../src/records.mjs';
import {parseCSV, validateImport} from '../src/finance.mjs';
import {decodeWorkspace, encodeWorkspace} from '../src/localWorkspace.ts';

const website = {
 id:'site', reference:'WEB-001', service:'Website', date:'2026-06-30',
 price:50000, discount:0, refund:0, cash:50000, cashDate:'2026-07-02',
 supplies:0, labor:0, other:0, feeMode:'rate', feeBps:300,
};
const workspace = (jobs,plans=[]) => ({name:'Example',currency:'USD',services:[],jobs,expenses:[],plans});

test('job income and dated receipts land in independent periods and reconcile to the summary',()=>{
 const plan={id:'plan',name:'Laundry',amount:9000,date:'2026-07-01',start:'2026-08-01',end:'2026-08-31'};
 const data=workspace([website],[plan]);
 const june=reportFor(data,'2026-06-01','2026-06-30');
 const july=reportFor(data,'2026-07-01','2026-07-31');
 assert.equal(june.revenue,50000);
 assert.equal(june.cash,0);
 assert.equal(july.revenue,0);
 assert.equal(july.cash,59000);
 assert.deepEqual(july.receipts.map(r=>[r.date,r.amount,r.estimatedDate]),[
  ['2026-07-01',9000,false],['2026-07-02',50000,false],
 ]);
 assert.equal(new Map(reportRows(data,'2026-07-01','2026-07-31')).get('Recorded cash received'),590);
});

test('legacy cash uses completion date while known zero and unknown cash stay distinct',()=>{
 const {cashDate,...legacy}=website;
 const data=workspace([legacy,{...legacy,id:'zero',reference:'ZERO',cash:0},{...legacy,id:'unknown',reference:'UNKNOWN',cash:null}]);
 const restored=decodeWorkspace(encodeWorkspace(data));
 const report=reportFor(restored,'2026-06-30','2026-06-30');
 assert.equal(report.cash,50000);
 assert.equal(report.cashDateEstimated,1);
 assert.equal(report.cashUnknown,1);
 assert.equal(report.receipts.length,1);
 assert.equal(report.receipts[0].date,'2026-06-30');
 assert.equal(report.receipts[0].estimatedDate,true);
});

test('receipt dates survive CSV, original columns and backup, including payments before completion',()=>{
 const deposit={...website,cash:10000,cashDate:'2026-05-15'};
 const [headers,...rows]=parseCSV(toCSV(jobRows([deposit])));
 const mapping=guessMapping(headers);
 const entry=validateImport(rows,mapping,[])[0];
 assert.equal(entry.error,null);
 assert.equal(entry.job.cashDate,deposit.cashDate);
 const tracked={...entry.job,id:'deposit',source:{file:'payments.csv',headers,values:rows[0],mapping}};
 const data=decodeWorkspace(encodeWorkspace(workspace([tracked])));
 assert.equal(data.jobs[0].cashDate,'2026-05-15');
 const edited={...data.jobs[0],cashDate:'2026-05-16'};
 assert.equal(originalRows([edited]).rows[1][mapping.cashDate],'2026-05-16');
 assert.equal(reportFor(data,'2026-05-15','2026-05-15').cash,10000);
});

test('positive receipts with missing dates are allowed, contradictory or invalid receipt dates are rejected',()=>{
 const mapping={reference:0,date:1,price:2,cash:3,cashDate:4};
 const row=(cash,date)=>['WEB-001','2026-06-30','500',cash,date];
 assert.equal(validateImport([row('500','')],mapping,[])[0].job.cashDate,null);
 for(const [cash,date] of [['','2026-07-02'],['0','2026-07-02'],['500','2026-02-30']]){
  assert.match(validateImport([row(cash,date)],mapping,[])[0].error,/receipt date/);
  assert.throws(()=>encodeWorkspace(workspace([{...website,cash:cash===''?null:Number(cash)*100,cashDate:date}])));
 }
});
