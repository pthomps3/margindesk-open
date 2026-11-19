# Financial conventions

## Public single-job calculator

The public calculator is separate from the monthly Forecast. It takes a job price and actual supplies, worker pay and fee amounts, with optional other direct costs, discount and refund. Actual fees are entered in money, not a percentage; the calculator never guesses a processor's rate. Recorded jobs can use actual fees or the rate-and-fixed-fee model below.

`revenue = price - discount - refund`; `direct costs = supplies + worker pay + actual fees + other costs`; `contribution = revenue - direct costs`; `margin = contribution / revenue` only when revenue is positive. Money is parsed to integer cents before adding or subtracting. Discounts plus refunds cannot exceed price. A refund leaves the entered fee unchanged; the owner can reduce fees if the provider returns them. Currency selection labels the amounts without currency conversion.

Synthetic cleaning example: $125 price, $8.50 supplies, $48 worker pay, $3.63 fees, and $5 other costs gives $65.13 direct costs, $59.87 contribution, and 47.9% margin. Reducing price to $50 gives a $15.13 contribution loss and -30.3% margin. A $10 discount plus $115 refund leaves zero revenue, a $65.13 loss, and N/A margin. These are before fixed expenses and taxes.

All four primary fields must be entered; zero is valid. A blank or invalid primary field suppresses the contribution result and disables export. Blank optional fields mean zero. Amounts accept at most two decimal places and are bounded to 10,000,000 currency units each. Leading decimal `.29` and trailing decimal `1.` are normalized; negatives, scientific notation and comma-separated amounts are rejected. The CSV reconciles to the displayed values and neutralizes spreadsheet formulas, including negative cells. Calculator inputs are kept in memory until you leave the calculator.

## Recorded workspace

All persisted amounts are validated safe integers in currency minor units (cents for the five supported currencies). Each input is bounded to 1,000,000,000 cents. No AI performs arithmetic. Percent processing fees are integer basis points. Final values round to cents; ratios display to one decimal percentage point. Decimal inputs reject more than two digits after the decimal point.

For one completed job:

```
revenue = price - discount - refund
processing_fee = actual_fee or round(max(0, price - discount) * fee_basis_points / 10,000) + fixed_fee
direct_cost = supplies + worker_pay + vendor_cost + other_direct_cost + processing_fee
contribution_profit = revenue - direct_cost
contribution_margin = contribution_profit / revenue  (only when revenue > 0)
estimated_operating_profit = total_contribution - fixed_expenses
```

Example: $125 price, $10 discount, $8.50 supplies, $48 worker pay, $5 other costs, 2.9% fee: $115 revenue; $3.34 processing (half-cent rounds up); $64.84 direct cost; $50.16 contribution; 43.6% margin. If overhead is $864, that job contributes $50.16 toward it; $50.16 is not net profit. A full $115 refund leaves zero revenue and a $64.84 contribution loss under the non-refundable fee assumption. Zero revenue margin is N/A. No fixed expense allocation is claimed at job level.

Unknown supply/pay/other costs are null. Known costs still sum, but contribution and operating figures are upper estimates with an explicit incomplete-cost warning. Negative contribution is retained. Discounts plus refunds cannot exceed the original price. This bounded refund model avoids negative revenue per job; it does not support credits beyond original payment.

Each completed job supports one cash amount and one receipt date. Record a positive payment on the date it arrived. For example, a $500 job completed June 30 and paid July 2 contributes $500 of June revenue and $500 of July cash receipts. If the receipt date is missing, the report uses the completion date and identifies that date as estimated, including for older records and imports. A blank amount is unknown. Zero records that no cash was received and requires no receipt date. The cash worksheet lists positive job and prepaid-plan receipts whose actual or estimated receipt dates fall in the selected period. Cash can exceed recognized revenue. This model supports a single net cash amount for a job. Separate installments or refunds on different dates require a separate payment ledger.

Prepaid periods use inclusive UTC calendar days. Recognized revenue for any period equals the rounded cumulative allocation through the period end minus rounded cumulative allocation before the period start. A $1 prepaid plan over three days allocates $0.33, $0.34, $0.33, totaling exactly $1. A $90 plan for Jan 1–Mar 31, 2026 has 90 days: $31 January, $28 February, $31 March. Cash remains $90 on the receipt date. Daily cumulative rounding ensures the entire period always reconciles; remainders settle by the last day. Avoid double counting: prepaid work jobs must have zero price/cash when the plan holds those amounts; keep their direct costs on those jobs. Plan processing fees can be entered as a separately named one-time expense; automatic fee amortization is deferred.

Monthly overhead is recognized in full on each scheduled due date. The start date sets the day of the month. If that day is missing in a shorter month, the expense falls on the month's last day and returns to the original day when possible. A schedule starting January 31 falls on February 28 (February 29 in a leap year), then March 31. An optional end date includes a payment due on that date. The same rule applies to existing schedules.

A $100 expense starting January 19 contributes $200 through March 18 and $300 through March 19. A one-time expense counts in full on its recorded date. The Expenses worksheet shows each schedule with a due date inside the report period, its number of occurrences, and the period amount. Those amounts sum to recorded overhead in the management P&L. The estimate excludes tax, depreciation, inventory accruals, unpaid worker liabilities and anything not entered.

Forecast weighted price/cost = primary amount × primary mix + secondary amount × remaining mix. Contribution = volume × weighted unit contribution. Operating = contribution − fixed overhead. Break-even = ceil(fixed overhead ÷ weighted contribution per job), only when weighted contribution is positive. At $125 price, $64 direct cost and $864 overhead, 15 jobs break even. At zero/negative contribution no finite break-even is shown. Forecasts never write to recorded jobs.
