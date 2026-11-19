import { jobTotals } from './finance.mjs';

export const estimateCosts = [
  ['supplies', 'Materials and supplies'],
  ['labor', 'Worker pay'],
  ['vendorCost', 'Vendor or subcontractor'],
  ['other', 'Other direct costs'],
  ['feeAmount', 'Payment fees'],
];

export function jobFromEstimate(estimate, completedDate) {
  return {
    estimateId: estimate.id, reference: estimate.reference, service: estimate.service,
    date: completedDate, price: estimate.price, supplies: estimate.supplies, labor: estimate.labor,
    vendorCost: estimate.vendorCost, other: estimate.other, feeAmount: estimate.feeAmount,
    feeMode: 'amount', feeBps: 0, fixedFee: 0, discount: 0, refund: 0,
    cash: null, cashDate: null, ownerMinutes: null, travelMinutes: 0, vendor: '',
  };
}

export function compareEstimate(estimate, actualJob) {
  const quoted = jobTotals(jobFromEstimate(estimate, estimate.date));
  const actual = actualJob ? jobTotals(actualJob) : null;
  return { quoted, actual, variance: actual?.complete ? actual.profit - quoted.profit : null };
}
