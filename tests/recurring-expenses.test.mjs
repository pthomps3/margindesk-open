import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expensesForPeriod, expenseTotal} from '../src/finance.mjs';
import {reportFor} from '../src/records.mjs';

const rent = {name: 'Studio rent', date: '2026-01-19', recurring: true, amount: 10000};

test('disjoint report periods include each monthly fee once and do not anticipate the due date', () => {
  assert.equal(expenseTotal([rent], '2026-01-01', '2026-02-18'), 10000);
  assert.equal(expenseTotal([rent], '2026-02-19', '2026-02-28'), 10000);
  assert.equal(expenseTotal([rent], '2026-01-01', '2026-02-28'), 20000);
  assert.equal(expenseTotal([rent], '2026-02-20', '2026-03-18'), 0);
});

test('a month-end schedule clamps in February and returns to its original day in March', () => {
  for (const [year, lastDay] of [['2024', '29'], ['2025', '28'], ['2000', '29'], ['2100', '28']]) {
    const expense = {...rent, date: year + '-01-31'};
    const februaryDue = year + '-02-' + lastDay;
    const [detail] = expensesForPeriod([expense], year + '-02-01', year + '-03-30');
    assert.equal(detail.firstDue, februaryDue);
    assert.equal(detail.lastDue, februaryDue);
    assert.equal(detail.count, 1);
    assert.equal(expenseTotal([expense], year + '-03-31', year + '-03-31'), 10000);
  }
});

test('end dates include that day and preserve previously earned expense occurrences', () => {
  const ended = {...rent, endDate: '2026-03-18'};
  assert.equal(expenseTotal([ended], '2026-01-01', '2026-12-31'), 20000);
  assert.equal(expenseTotal([{...ended, endDate: '2026-03-19'}], '2026-01-01', '2026-12-31'), 30000);
  assert.equal(expenseTotal([ended], '2026-04-01', '2026-04-30'), 0);
});

test('period detail includes only due expenses and reconciles to the management report', () => {
  const expenses = [
    rent,
    {name: 'Fuel', date: '2026-03-18', recurring: false, amount: 750},
    {name: 'Past', date: '2026-02-18', recurring: false, amount: 12},
    {name: 'Future', date: '2026-03-19', recurring: false, amount: 15}
  ];
  const from = '2026-02-19', to = '2026-03-18';
  const detail = expensesForPeriod(expenses, from, to);
  assert.deepEqual(detail.map(({expense, count, firstDue, lastDue, periodAmount}) =>
    [expense.name, count, firstDue, lastDue, periodAmount]), [
    ['Studio rent', 1, '2026-02-19', '2026-02-19', 10000],
    ['Fuel', 1, '2026-03-18', '2026-03-18', 750]
  ]);
  const report = reportFor({jobs: [], plans: [], expenses}, from, to);
  assert.equal(report.overhead, 10750);
  assert.equal(report.overhead, detail.reduce((sum, line) => sum + line.periodAmount, 0));
  assert.equal(report.operating, -10750);
});
