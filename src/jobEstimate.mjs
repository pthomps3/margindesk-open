import { minor, jobTotals, csvCell } from './finance.mjs';

const required = ['price', 'supplies', 'labor', 'fees'];
const optional = ['other', 'discount', 'refund'];

// This public estimate uses actual fees in money, not a guessed processing rate.
export function estimateJob(input) {
  const amounts = {}, errors = {}, missing = [];
  for (const key of [...required, ...optional]) {
    let value = String(input[key] ?? '').trim();
    if (!value && required.includes(key)) { missing.push(key); continue; }
    if (!value) value = '0';
    if (/^\.\d{1,2}$/.test(value)) value = '0' + value;
    if (/^\d+\.$/.test(value)) value = value.slice(0, -1);
    try { amounts[key] = minor(value); }
    catch { errors[key] = 'Enter 0 or more, with up to 2 decimal places (maximum 10,000,000).'; }
  }
  if (amounts.discount > amounts.price) errors.discount = 'The discount cannot be more than the job price.';
  else if (amounts.refund > amounts.price - amounts.discount) errors.refund = 'The refund cannot exceed the price after discount.';
  const complete = missing.length === 0 && Object.keys(errors).length === 0;
  if (!complete) return { amounts, errors, missing, complete, revenue: null, direct: null, profit: null, margin: null };
  const totals = jobTotals({ ...amounts, feeMode:'amount',feeAmount:amounts.fees,feeBps:0 });
  return { ...totals, amounts, errors, missing, complete };
}

export function estimateCSV(estimate, currency) {
  if (!estimate.complete) throw Error('Complete the job estimate before exporting.');
  if (!['USD', 'GBP', 'EUR', 'CAD', 'AUD'].includes(currency)) throw Error('Unsupported currency.');
  const labels = { price: 'Job price', supplies: 'Supplies', labor: 'Worker pay', fees: 'Fees', other: 'Other direct costs', discount: 'Discount', refund: 'Refund' };
  const rows = [['MarginDesk job estimate', 'Amount', 'Currency'],
    ...Object.entries(labels).map(([key, label]) => [label, estimate.amounts[key] / 100, currency]),
    ['Job revenue', estimate.revenue / 100, currency],
    ['Direct costs', estimate.direct / 100, currency],
    ['Contribution profit', estimate.profit / 100, currency],
    ['Contribution margin (%)', estimate.margin === null ? 'N/A (zero revenue)' : Number((estimate.margin * 100).toFixed(1)), ''],
    ['Management estimate before fixed expenses and taxes. Fees are entered as an actual amount retained after any refund.', '', '']];
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
