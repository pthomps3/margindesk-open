# MarginDesk Open

MarginDesk Open is a free, open-source job-costing and profit tracker for small service businesses. It grew out of the work of pricing jobs, tracking worker pay, and accounting for overhead at The Wrinkle Ninjas, a student-run laundry pickup business.

[Open the local-data workspace in your browser](https://pthomps3.github.io/margindesk-open/) · [Download the offline app](https://pthomps3.github.io/margindesk-open/margindesk-offline.zip) · [Download source ZIP](https://github.com/pthomps3/margindesk-open/archive/refs/heads/main.zip)

## What you can do

- Calculate what a job contributes after materials, labor, vendor costs, fees, discounts, and refunds.
- Save and edit job estimates, record completed work from a quote, and compare expected contribution with the actual result.
- Use service defaults and report revenue by completion date, cash by receipt date, and monthly overhead by its scheduled due date.
- Compare two prices to see how many jobs you need to earn the same contribution, estimate break-even volume, and calculate a target price.
- Preview imports from CSV or Excel and export reports and workspace backups.
- Try a separate sample workspace with fictional records.

The downloaded app is free to run and needs no account, API key, or database. Workspace records stay in the browser where you enter them. You can use the full workspace online or run your own copy. The planned managed web workspace at MyMarginDesk.com is a separate $10/month offer.

## Use the offline app

Download the offline app above, extract the ZIP, then open **MarginDesk.html** in a desktop browser. The workspace, calculator, and spreadsheet tools run without an internet connection.

Your records live in your browser profile. Local-file storage varies between browsers and may depend on the file's location. Keep using the same browser and file path. Download a JSON backup in **Settings** before moving or updating the file, clearing browser data, or switching devices. Open the new copy and restore the backup under **Settings**.

## Run from source

Install [Node.js 24 or later](https://nodejs.org/). Extract the [source ZIP](https://github.com/pthomps3/margindesk-open/archive/refs/heads/main.zip) or clone this repository, open the project directory in a terminal, and run:

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

The build writes the static site and **margindesk-offline.zip** to **dist/**. Serve that folder over HTTPS or use the local preview. The application uses browser storage, and no financial data is sent to a server.

Issues and pull requests are welcome. For calculation changes, include a small example with the expected result and run the test suite. Use fictional numbers when reporting import or calculation issues.

[Financial conventions](docs/FORMULAS.md) · [Product research and next questions](docs/PRODUCT-RESEARCH.md) · [MIT License](LICENSE)
