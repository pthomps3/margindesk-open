# MarginDesk Open

MarginDesk Open is a free, open-source job-costing and profit tracker for small service businesses. It grew out of the work of pricing jobs, tracking worker pay, and accounting for overhead at The Wrinkle Ninjas, a student-run laundry pickup business.

[Open the full workspace online](https://pthomps3.github.io/margindesk-open/) · [Try the calculator and sample at MyMarginDesk.com](https://mymargindesk.com/) · [Download the source ZIP](https://github.com/pthomps3/margindesk-open/archive/refs/heads/main.zip)

## What you can do

- Calculate what a job contributes after materials, labor, vendor costs, fees, discounts, and refunds.
- Save service defaults, record completed jobs, and separate revenue, contribution, and fixed expenses.
- Compare prices and job volume, estimate a break-even point, and calculate a target price.
- Preview imports from CSV or Excel and export reports and workspace backups.
- Try a separate sample workspace with fictional records.

The downloaded app is free to run and needs no account, API key, or database. Workspace records stay in the browser where you enter them. You can use the full workspace online or run your own copy. MyMarginDesk.com also offers a free calculator and sample workspace.

## Run locally

Install [Node.js 24 or later](https://nodejs.org/). Extract the source ZIP or clone this repository, open the project directory in a terminal, and run:

~~~sh
npm ci
npm run dev
~~~

Open the local URL printed by Vite and choose **Open free workspace**. Keep using the same browser profile and URL for your records. Under **Settings**, you can download a JSON backup and restore it on another device or browser. Clearing site data removes this browser's copy. Use a browser profile you control when entering business records.

## Develop or self-host

~~~sh
npm test
npm run build
npm run preview
~~~

The build writes a static site to **dist/**. Serve that folder over HTTPS or use the local preview. The application uses browser storage, and no financial data is sent to a server.

Issues and pull requests are welcome. For calculation changes, include a small example with the expected result and run the test suite. Use fictional numbers when reporting import or calculation issues.

[MIT License](LICENSE)
