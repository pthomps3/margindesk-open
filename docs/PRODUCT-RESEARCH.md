# MarginDesk Open product research

The public workspace is for an owner who quotes a job, completes it, then checks how much it contributed toward overhead. This review tested the existing app against that sequence and against the needs of people running a downloaded copy.

| Research focus | Product decision | How to check it |
| --- | --- | --- |
| Owner workflow | Keep a quoted price and cost snapshot separate from the job's actual figures. | Quote a $300 project with $90 of costs. Record $120 of actual costs. The quote shows a $30 shortfall and the report includes the completed job once. |
| Financial accuracy | Recognize job revenue on completion, cash on its receipt date and monthly overhead on scheduled due dates. | A job finished June 30 and paid July 2 has June revenue and July cash. Two adjacent reports add to the full-period overhead. |
| Competitive positioning | Let an owner compare how much extra volume a price change requires. | A $50 job with $15 of costs contributes $35. At $45 it contributes $30. Matching ten jobs at the original price takes twelve at the proposed price. |
| Accessibility | Use local calendar defaults and keyboard-operable dialogs. | Enter work late on the last day of the month. Check its report period, then reopen the record and close it with Escape. |
| Data portability | Keep spreadsheet amounts numeric and offer a complete, versioned JSON backup. | Import the downloaded bank template, inspect a loss in Excel and restore a workspace with Unicode text. |
| Open-source distribution | Offer an offline build for owners and source with automated checks for contributors. | Launch the downloadable app with the network disconnected. Run the tests and production build from a clean checkout. |

## Questions for the next release

- **Payment installments.** A job currently supports one cash amount and receipt date. Test the model with owners who collect a deposit and final payment in different months before introducing a payment ledger.
- **Prepaid service delivery.** Observe a subscription business entering a monthly plan and each delivery. See whether linking those jobs directly to the plan would reduce duplicate revenue entry.
- **Quote turnaround.** Time how long it takes a new owner to enter a quote and close the resulting job. Use this to decide whether reusable quote templates or a customer-facing export should come next.

## Sources

- [Harvest's estimate-to-actual workflow](https://support.getharvest.com/hc/en-us/articles/360048686031-Forecast-How-do-I-use-Harvest-and-Forecast-to-view-estimates-vs-actuals) and [Wave's invoice bookkeeping](https://support.waveapps.com/hc/en-us/articles/115000202863-Invoice-bookkeeping)
- [U.S. Small Business Administration break-even calculator](https://bec.www.sba.gov/) and [Jobber's service price calculator](https://www.getjobber.com/free-tools/pricing-calculator/)
- [W3C keyboard interaction for modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [MDN browser storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Actual Budget file backups](https://actualbudget.org/docs/backup-restore/backup/) and [RFC 4180 CSV format](https://www.rfc-editor.org/rfc/rfc4180)
