import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateJob, estimateCSV } from '../src/jobEstimate.mjs';
import { parseCSV } from '../src/finance.mjs';
const job = { price: '125.00', supplies: '8.50', labor: '48', fees: '3.63', other: '5', discount: '0', refund: '0' };

test('public calculator itemizes a job with actual fees in integer cents', () => {
  const result = estimateJob(job);
  assert.equal(result.complete, true);
  assert.equal(result.revenue, 12500); assert.equal(result.direct, 6513);
  assert.equal(result.profit, 5987); assert.equal(result.margin, 5987 / 12500);
  assert.equal(estimateJob({ ...job, price: '135' }).profit, 6987);
});
test('missing required costs never show a complete or inflated profit', () => {
  for (const key of ['price', 'supplies', 'labor', 'fees']) {
    const result = estimateJob({ ...job, [key]: '' });
    assert.equal(result.complete, false); assert.equal(result.profit, null);
    assert.ok(result.missing.includes(key)); assert.throws(() => estimateCSV(result, 'USD'));
  }
});
test('explicit zero costs, zero revenue, loss and full refunds stay distinct', () => {
  const zero = { price: '0', supplies: '0', labor: '0', fees: '0' };
  assert.equal(estimateJob(zero).complete, true); assert.equal(estimateJob(zero).profit, 0);
  assert.equal(estimateJob(zero).margin, null);
  const loss = estimateJob({ ...job, price: '50' });
  assert.equal(loss.profit, -1513); assert.equal(loss.margin, -1513 / 5000);
  const refunded = estimateJob({ ...job, discount: '10', refund: '115' });
  assert.equal(refunded.revenue, 0); assert.equal(refunded.direct, 6513);
  assert.equal(refunded.profit, -6513); assert.equal(refunded.margin, null);
});
test('invalid amounts and excessive adjustments cannot produce results', () => {
  for (const value of ['-1', '1e3', '1.234', 'NaN', '10,000', '10000001']) {
    const result = estimateJob({ ...job, price: value });
    assert.equal(result.complete, false); assert.ok(result.errors.price);
  }
  assert.ok(estimateJob({ ...job, discount: '126' }).errors.discount);
  assert.ok(estimateJob({ ...job, discount: '10', refund: '115.01' }).errors.refund);
  assert.equal(estimateJob({ ...job, supplies: '.29', fees: '1.' }).amounts.supplies, 29);
  assert.equal(estimateJob({ ...job, other: '' }).direct, 6013);
});
test('export preserves numeric losses and margin percentages for spreadsheet calculations', () => {
  const result = estimateJob({ ...job, price: '50' });
  const csv = estimateCSV(result, 'GBP');
  const rows = parseCSV(csv);
  assert.deepEqual(rows.find(row => row[0] === 'Contribution profit'), ['Contribution profit', '-15.13', 'GBP']);
  assert.deepEqual(rows.find(row => row[0] === 'Contribution margin (%)'), ['Contribution margin (%)', '-30.3', '']);
  assert.deepEqual(rows.find(row => row[0] === 'Direct costs'), ['Direct costs', '65.13', 'GBP']);
  const zero = parseCSV(estimateCSV(estimateJob({...job, price: '0'}), 'USD'));
  assert.deepEqual(zero.find(row => row[0] === 'Contribution margin (%)'), ['Contribution margin (%)', 'N/A (zero revenue)', '']);
  assert.ok(csv.includes('Management estimate before fixed expenses'));
  assert.throws(() => estimateCSV(result, '=HYPERLINK("x")'));
});
