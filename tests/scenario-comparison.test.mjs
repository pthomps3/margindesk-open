import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareScenarioPrices, scenarioOutlook, validateScenarios } from '../src/scenarios.mjs';
import { blankWorkspace, decodeWorkspace, encodeWorkspace } from '../src/localWorkspace.ts';

const example = {
  volume: 10, price: 50, cost: 15, fixed: 350, mix: 100, altPrice: 40, altCost: 20,
};

test('a five-dollar discount needs two more jobs to cover the same contribution', () => {
  const result = compareScenarioPrices({...example, proposedPrice: 45});
  assert.equal(result.current.contribution, 35000);
  assert.equal(result.proposed.contribution, 30000);
  assert.equal(result.changeAtCurrentVolume, -5000);
  assert.equal(result.jobsToMatch, 12);
  assert.equal(result.current.breakEvenJobs, 10);
  assert.equal(result.proposed.operatingProfit, -5000);
});

test('the proposed primary price only affects its share of the jobs', () => {
  const result = compareScenarioPrices({...example, mix: 50, proposedPrice: 40});
  assert.equal(result.current.contribution, 27500);
  assert.equal(result.proposed.contribution, 22500);
  assert.equal(result.jobsToMatch, 13);
  const secondaryOnly = compareScenarioPrices({...example, mix: 0, proposedPrice: 0});
  assert.equal(secondaryOnly.changeAtCurrentVolume, 0);
  assert.equal(secondaryOnly.jobsToMatch, 10);
});

test('price increases reduce the sales target and a zero or negative contribution cannot fund it', () => {
  assert.equal(compareScenarioPrices({...example, proposedPrice: 65}).jobsToMatch, 7);
  assert.equal(compareScenarioPrices({...example, proposedPrice: 15}).jobsToMatch, null);
  assert.equal(compareScenarioPrices({...example, proposedPrice: 0}).jobsToMatch, null);
  assert.equal(compareScenarioPrices({...example, volume: 0, proposedPrice: 0}).jobsToMatch, 0);
});

test('fractional weighted cents accumulate before rounding and equal prices preserve the current volume', () => {
  const fractional = {...example, volume: 20, price: 0.01, cost: 0, mix: 25, altPrice: 0, altCost: 0, fixed: 0.05};
  assert.equal(scenarioOutlook(fractional).contribution, 5);
  assert.equal(scenarioOutlook(fractional).breakEvenJobs, 20);
  assert.equal(compareScenarioPrices({...fractional, proposedPrice: 0.01}).jobsToMatch, 20);
});

test('saved old and new scenarios reopen from a workspace backup with zero prices preserved', () => {
  const scenarios = [example, {...example, proposedPrice: 0}];
  const original = {...blankWorkspace(), scenarios};
  const restored = decodeWorkspace(encodeWorkspace(original));
  assert.deepEqual(restored.scenarios, scenarios);
  assert.equal(compareScenarioPrices(restored.scenarios[0]), null);
  assert.equal(compareScenarioPrices(restored.scenarios[1]).proposed.contribution, -15000);
  for (const proposedPrice of [null, -1, Infinity, 100001, 45.001]) {
    assert.throws(() => validateScenarios([{...example, proposedPrice}]));
  }
});
