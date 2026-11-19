import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareEstimate, jobFromEstimate } from '../src/estimates.mjs';
import { blankWorkspace, encodeWorkspace, decodeWorkspace } from '../src/localWorkspace.ts';
import { reportFor } from '../src/records.mjs';
import { validateWorkspace } from '../src/validation.ts';

const quote = { id: 'e1', reference: 'Q-12', service: 'Website update', date: '2026-06-02',
  price: 30000, supplies: 0, labor: 9000, vendorCost: 0, other: 0, feeAmount: 0 };

test('a quote is excluded from reports until completed and stays separate from actual costs', () => {
  const workspace = { ...blankWorkspace(), estimates: [quote] };
  assert.equal(reportFor(workspace, '2026-06-01', '2026-06-30').revenue, 0);
  const job = { ...jobFromEstimate(quote, '2026-06-30'), id: 'j1', labor: 12000 };
  const saved = decodeWorkspace(encodeWorkspace({ ...workspace, jobs: [job] }));
  const result = compareEstimate(saved.estimates[0], saved.jobs[0]);
  assert.deepEqual([result.quoted.profit, result.actual.profit, result.variance], [21000,18000,-3000]);
  assert.equal(reportFor(saved, '2026-06-01', '2026-06-30').contribution, 18000);
  assert.equal(compareEstimate(quote, { ...job, labor: null }).variance, null);
});

test('old workspaces open with no estimates and linked jobs cannot be counted twice', () => {
  const { estimates, ...legacy } = blankWorkspace();
  assert.deepEqual(validateWorkspace(legacy).estimates, []);
  const job = { ...jobFromEstimate(quote, '2026-06-30'), id: 'j1' };
  assert.throws(() => validateWorkspace({ ...legacy, jobs: [job] }), /linked estimate/);
  assert.throws(() => validateWorkspace({ ...legacy, estimates: [quote], jobs: [job, { ...job, id:'j2', reference:'SECOND' }] }), /already has/);
  assert.throws(() => validateWorkspace({ ...legacy, estimates: [{...quote, price: -1}] }), /amount/);
});
