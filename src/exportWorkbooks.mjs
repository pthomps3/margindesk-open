import { allocate, expensesForPeriod, jobTotals } from './finance.mjs';
import { fieldLabels, importFields, importTemplateRows, jobRows, reportFor } from './records.mjs';
import { cellAddress } from './workbookExport.mjs';

const amounts = new Set(['price','discount','refund','supplies','labor','vendorCost','other','cash','feeAmount','fixedFee']);
const counts = new Set(['feeBps','ownerMinutes','travelMinutes']);
const date = width => ({ kind: 'date', width: width ?? 16 });
const money = width => ({ kind: 'money', width: width ?? 21 });
const number = width => ({ kind: 'number', width: width ?? 17 });
const percent = { kind: 'percent', width: 16 };
const text = width => ({ kind: 'text', width });
const amount = cents => cents == null ? null : cents / 100;
const value = (input, kind) => ({ value: input, kind });
const formula = (expression, result, kind = 'money') => ({ formula: expression, value: result, kind });

function fieldStyle(field) {
  if (field === 'date' || field === 'cashDate') return date();
  if (amounts.has(field)) return money();
  if (counts.has(field)) return number();
  return text(field === 'service' ? 30 : field === 'reference' ? 22 : undefined);
}

function table(name, columns, rows, currency) {
  return { name, columns, rows, currency };
}

function sum(sheet, column, rows) {
  return rows.length > 1 ? "SUM('" + sheet + "'!" + column + '2:' + column + rows.length + ')' : '0';
}

export function salesWorkbook(jobs, currency) {
  return [table('Sales & work', importFields.map(fieldStyle), jobRows(jobs), currency)];
}

export function originalColumnsWorkbook(source, currency) {
  return [table('Original columns', source.rows[0].map((_, index) =>
    source.fields?.[index] ? fieldStyle(source.fields[index]) : text()), source.rows, currency)];
}

export function templateWorkbook(kind, currency) {
  const rows = importTemplateRows(kind);
  const data = table('Import data', rows[0].map(header => {
    if (header === 'Amount') return money();
    if (header === 'Description') return text(36);
    return fieldStyle(importFields.find(field => fieldLabels[field] === header));
  }), rows, currency);
  const guide = table('Instructions', [text(24), text(76)], [
    ['Step', 'How to use this template'],
    ['Start on Import data', 'Keep the header row. Replace the demonstration row with your own records.'],
    ['Dates', 'Use a calendar date in the Date and Cash received date columns. The file displays dates as YYYY-MM-DD.'],
    ['Amounts', 'Use numbers in ' + currency + '. Leave unknown amounts blank. Enter 0 for a known zero.'],
    ['Import into MarginDesk', kind === 'bank'
      ? 'Negative amounts represent outgoing bank transactions. Review the matches before recording any expense.'
      : 'Save your values as XLSX or CSV and preview the mapping before importing.'],
  ], currency);
  return [data, guide];
}

export function estimateWorkbook(estimate, currency) {
  if (!estimate.complete) throw Error('Complete the job estimate before exporting.');
  const a = estimate.amounts;
  const valid = 'AND(COUNT(B4:B10)=7,MIN(B4:B10)>=0,B5+B6<=B4,MAX(B4:B10)<=10000000)';
  return [{
    name: 'Job estimate', currency, columns: [text(29), money(), text(68)], freeze: 3,
    headerRows: [0, 2], emphasisRows: [10, 12, 13],
    rows: [
      ['MarginDesk job estimate', currency, 'Management estimate before fixed expenses and taxes'],
      ['Editable inputs', null, 'Enter nonnegative amounts up to 10,000,000 with two decimals. Discount and refund together cannot exceed the job price.'],
      ['Item', 'Amount', 'Explanation'],
      ['Job price', amount(a.price), 'Original customer charge.'],
      ['Discount', amount(a.discount), 'Reduction to the original charge.'],
      ['Refund', amount(a.refund), 'Amount returned to the customer.'],
      ['Supplies', amount(a.supplies), 'Materials and products used on the job.'],
      ['Worker pay', amount(a.labor), 'Direct labor for this job.'],
      ['Actual fees', amount(a.fees), 'Actual payment fees retained after any refund.'],
      ['Other direct costs', amount(a.other), 'Travel, vendor or other direct costs.'],
      ['Job revenue', formula('IF(' + valid + ',ROUND(B4-B5-B6,2),"")', amount(estimate.revenue)), 'Job price less discounts and refunds.'],
      ['Direct costs', formula('IF(' + valid + ',ROUND(SUM(B7:B10),2),"")', amount(estimate.direct)), 'Supplies, worker pay, fees and other direct costs.'],
      ['Contribution profit', formula('IF(' + valid + ',ROUND(B11-B12,2),"")', amount(estimate.profit)), 'Job revenue less recorded direct costs.'],
      ['Contribution margin', formula('IF(' + valid + ',IF(B11>0,B13/B11,""),"")', estimate.margin, 'percent'), 'Contribution profit divided by positive revenue. Blank at zero revenue or when inputs are invalid.'],
    ],
  }];
}

function calculationRows(jobs) {
  return [['Reference','Completed date','Recognized revenue','Applied fee','Known direct costs','Contribution','Margin','Cost status','Source'],
    ...jobs.map((job, index) => {
      const row = index + 2;
      const ref = field => "'Sales & work'!" + cellAddress(importFields.indexOf(field), row);
      const r = field => ref(field);
      const t = jobTotals(job);
      const fees = 'IF(' + r('feeMode') + '="amount",IF(ISNUMBER(' + r('feeAmount') + '),' +
        r('feeAmount') + ',""),ROUND(MAX(0,' + r('price') + '-' + r('discount') + ')*' + r('feeBps') + '/10000,2)+' + r('fixedFee') + ')';
      return [job.reference, job.date,
        formula('ROUND(' + r('price') + '-' + r('discount') + '-' + r('refund') + ',2)', amount(t.revenue)),
        formula(fees, amount(t.fees)),
        formula('ROUND(SUM(' + ['supplies','labor','vendorCost','other'].map(r).join(',') + ',D' + row + '),2)', amount(t.direct)),
        formula('ROUND(C' + row + '-E' + row + ',2)', amount(t.profit)),
        formula('IF(AND(H' + row + '="Complete",C' + row + '>0),F' + row + '/C' + row + ',"")',
          t.complete ? t.margin : null, 'percent'),
        t.complete ? 'Complete' : 'Missing: ' + t.missing.map(key => fieldLabels[key] || (key === 'fees' ? 'actual fee' : key)).join(', '),
        job.source?.file || 'Manual entry'];
    })];
}

export function reviewWorkbook(workspace, from, to) {
  const r = reportFor(workspace, from, to);
  const currency = workspace.currency;
  const jobs = calculationRows(r.jobs);
  const cash = [['Type','Reference or plan','Receipt date','Date basis','Amount'],
    ...r.receipts.map(item => [item.type, item.reference, item.date,
      item.estimatedDate ? 'Estimated from completion' : 'Recorded receipt date', amount(item.amount)])];
  const overhead = [['Name','Vendor','Schedule','Amount per occurrence','Occurrences','First due','Last due','Recorded overhead'],
    ...expensesForPeriod(workspace.expenses, from, to).map(({ expense, count, firstDue, lastDue, periodAmount }, index) =>
      [expense.name, expense.vendor || '', expense.recurring ? 'Monthly' : 'One time', amount(expense.amount), count,
        firstDue, lastDue, formula('ROUND(D' + (index + 2) + '*E' + (index + 2) + ',2)', amount(periodAmount))])];
  const prepayments = [['Plan','Payment date','Service start','Service end','Original payment','Revenue in period'],
    ...workspace.plans.flatMap(plan => {
      const recognized = allocate(plan.amount, plan.start, plan.end, from, to);
      return recognized ? [[plan.name, plan.date, plan.start, plan.end, amount(plan.amount), amount(recognized)]] : [];
    })];
  const status = r.incompleteCosts ? ' · known costs only' : '';
  const summary = {
    name: 'Management P&L', columns: [text(36), money(23), text(70)], currency, headerRows: [0, 5, 18],
    emphasisRows: [8, 10, 12, 13], freeze: 6,
    rows: [
      ['Management P&L', currency, workspace.name],
      ['Report scope', null, 'Snapshot of records in the selected period. Export again to change the date range.'],
      ['Period start', value(from, 'date'), 'Inclusive'],
      ['Period end', value(to, 'date'), 'Inclusive'],
      ['Reporting basis', null, 'Accrual-style revenue and recorded overhead. Cash received is shown separately.'],
      ['Metric', 'Amount or count', 'Calculation or source'],
      ['Completed work revenue', formula('ROUND(' + sum('Job calculations', 'C', jobs) + ',2)', amount(r.revenue - r.prepaid)), 'Job sales less discounts and refunds.'],
      ['Prepaid revenue recognized', formula('ROUND(' + sum('Prepaid revenue', 'F', prepayments) + ',2)', amount(r.prepaid)), 'Daily allocation across inclusive service dates, rounded in cents.'],
      ['Total revenue recognized', formula('ROUND(B7+B8,2)', amount(r.revenue)), 'Completed work plus prepaid revenue recognized.'],
      ['Known direct costs', formula('ROUND(' + sum('Job calculations', 'E', jobs) + ',2)', amount(r.direct)), 'Recorded supplies, worker pay, vendor, other and fee costs.'],
      ['Contribution' + status, formula('ROUND(B9-B10,2)', amount(r.contribution)), 'Recognized revenue less known direct costs.'],
      ['Recorded overhead', formula('ROUND(' + sum('Expenses', 'H', overhead) + ',2)', amount(r.overhead)), 'Booked expense occurrences inside the reporting period.'],
      ['Estimated operating profit' + status, formula('ROUND(B11-B12,2)', amount(r.operating)), 'Contribution less recorded overhead.'],
      ['Recorded cash received', formula('ROUND(' + sum('Cash receipts', 'E', cash) + ',2)', amount(r.cash)), 'Recorded receipts dated in this period.'],
      ['Completed jobs missing cash', value(r.cashUnknown, 'number'), 'An unentered amount does not indicate an unpaid job.'],
      ['Estimated receipt dates', value(r.cashDateEstimated, 'number'), 'Receipts without a date use their job completion date.'],
      ['Limitations', null, 'Management estimate before taxes and unrecorded costs. Cash received alone is not a bank balance.'],
      ['Missing information', null, r.missing.length ? 'Review the outstanding fields below.' : 'No missing amounts on the selected records.'],
      ['Record', ' ', 'Missing field'],
      ...r.missing.map(item => [item.reference, null, item.field]),
    ],
  };
  return [summary, ...salesWorkbook(r.jobs, currency),
    table('Job calculations', [text(22),date(),money(),money(),money(),money(),percent,text(38),text(29)], jobs, currency),
    table('Cash receipts', [text(21),text(27),date(),text(30),money()], cash, currency),
    table('Expenses', [text(28),text(26),text(17),money(),number(),date(),date(),money()], overhead, currency),
    table('Prepaid revenue', [text(30),date(),date(),date(),money(),money()], prepayments, currency)];
}
