import test from 'node:test';
import assert from 'node:assert/strict';
import * as packed from 'fflate';
import { readSheet } from 'read-excel-file/universal';
import writeExcel from 'write-excel-file/universal';
import { estimateJob } from '../src/jobEstimate.mjs';
import { reportFor, toCSV, importTemplateRows } from '../src/records.mjs';
import { csvBlob } from '../src/download.mjs';
import { estimateWorkbook, reviewWorkbook, templateWorkbook, originalColumnsWorkbook } from '../src/exportWorkbooks.mjs';
import { renderExportWorkbook } from '../src/workbookExport.mjs';

const xmlFile = (archive, path) => packed.strFromU8(archive[path]);
const make = async sheets => {
  const book = await renderExportWorkbook(sheets, writeExcel, packed);
  return packed.unzipSync(new Uint8Array(await book.arrayBuffer()));
};
const estimate = estimateJob({price: '125.00', supplies: '8.50', labor: '48', fees: '3.63', other: '5', discount: '10', refund: '2'});
const jobs = [
  {reference:'00125',date:'2026-11-02',service:'Standard clean',price:12500,discount:1000,refund:200,
    supplies:850,labor:4800,vendorCost:0,other:500,cash:11300,cashDate:'2026-11-05',
    feeMode:'amount',feeAmount:363,feeBps:0,fixedFee:0},
  {reference:'LATE-1',date:'2026-11-04',service:'Laundry',price:1000,discount:0,refund:0,supplies:null,
    labor:300,other:0,feeMode:'rate',feeBps:290,fixedFee:30,cash:null}
];
const fixture = { name:'Café Studio',currency:'EUR',jobs,
  expenses:[{name:'Software',amount:1000,date:'2026-10-31',recurring:true},{name:'Rent',date:'2026-11-01',amount:2300}],
  plans:[{name:'Advance plan',date:'2026-11-01',amount:1100,start:'2026-11-01',end:'2026-11-05'}] };

test('the estimate exports styled formulas and correct stored results', async () => {
  const a = await make(estimateWorkbook(estimate,'USD'));
  const sheet = xmlFile(a,'xl/worksheets/sheet1.xml'), styles = xmlFile(a,'xl/styles.xml');
  assert.match(sheet, /<c r="B11"[^>]*><f>IF\(AND/);
  assert.match(sheet, /<c r="B13"[^>]*><f>[^<]*<\/f><v>47\.87<\/v><\/c>/);
  assert.match(sheet, /ySplit="3"/);
  assert.match(styles, /183D35/i);
  assert.match(styles, /0\.0%/);
  const zero = estimateJob({price:'0',supplies:'0',labor:'0',fees:'0'});
  const empty = xmlFile(await make(estimateWorkbook(zero,'GBP')),'xl/worksheets/sheet1.xml');
  assert.match(empty, /<c r="B14"[^>]* t="str"><f>[^<]+<\/f><v><\/v><\/c>/);
});

test('period summaries tie to the existing finance engine and preserve blanks', async () => {
  const from = '2026-11-01', to = '2026-11-08';
  const model = reviewWorkbook(fixture,from,to), expected = reportFor(fixture,from,to);
  for (const [row,key] of [[8,'revenue'],[9,'direct'],[10,'contribution'],[11,'overhead'],[12,'operating'],[13,'cash']])
    assert.equal(model[0].rows[row][1].value, expected[key] / 100);
  assert.equal(expected.overhead, 2300); // A month-end subscription is not due during November 1–8.
  const archive = await make(model);
  const p = xmlFile(archive,'xl/worksheets/sheet1.xml'), g = xmlFile(archive,'xl/worksheets/sheet3.xml');
  assert.match(p, /<f>ROUND\(B11-B12,2\)<\/f>/);
  assert.match(g, /<f>IF\(/);
  assert.match(g, /<c r="G3"[^>]* t="str">/);
  assert.match(xmlFile(archive,'xl/styles.xml'), /yyyy-mm-dd/);
  assert.equal(model[2].rows[2][7], 'Missing: Materials / product cost');
  assert.equal(model[3].rows.reduce((n,row,index)=>n+(index?row[4]:0),0), expected.cash/100);
});

test('import templates put the importable sheet first with typed dates and signed amounts', async () => {
  for (const kind of ['jobs','expenses','bank']) {
    const model = templateWorkbook(kind,'CAD');
    const blob = await renderExportWorkbook(model,writeExcel,packed);
    const raw = await blob.arrayBuffer();
    const data = await readSheet(blob);
    assert.equal(data[1][1].toISOString().slice(0,10), '2026-10-30');
    assert.equal(data[1][3], kind==='jobs' ? 125 : kind==='bank' ? -25 : 25);
    const archive = packed.unzipSync(new Uint8Array(raw));
    assert.match(xmlFile(archive,'xl/workbook.xml'), /name="Import data"/);
    assert.doesNotMatch(xmlFile(archive,'xl/worksheets/sheet1.xml'), /<f>/);
  }
});

test('mapped original values retain types, leading zeros, and literal source text', async () => {
  const books = originalColumnsWorkbook({
    rows:[['External ID','Original note','Paid'],['00125','=SUM(A1:A5)','7.25']],
    fields:{2:'cash'}
  },'AUD');
  const blob = await renderExportWorkbook(books,writeExcel,packed);
  assert.deepEqual((await readSheet(blob))[1], ['00125','=SUM(A1:A5)',7.25]);
});

test('CSV contains a single UTF-8 BOM and bank template negatives stay numeric', async () => {
  const blob = csvBlob(toCSV(importTemplateRows('bank')));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0,4)], [239,187,191,34]);
  assert.match(await blob.text(), /,-25,/);
});
