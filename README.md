# Roadbook

A responsive trip overview, itinerary, flat route schematic, and shared-expense ledger built with React, TypeScript, Vite, and Lucide.

## Run the local preview

```powershell
pnpm install
pnpm dev
```

Open the local URL Vite prints. The current trip fixture lives in `.local/trip.json`; `.local/` is ignored by Git and served only by the local Vite development server. The production build contains a separate fictional sample trip and fictional sample expenses. Local sample transactions are saved in this browser only.

The itinerary editor is on **Trip details → Edit day**. It updates a day's title, plan, travel note, lodging, meal ideas, and editor attribution. Dates and mapped cities stay fixed so the route and progress views remain aligned. Local edits stay in this browser; shared edits write to the Sheet and appear for everyone.

The Overview uses a lightweight SVG route schematic that keeps the booked overnight sequence readable on phones, tablets, and laptops. It shows the covered segment, planned segment, current marker, stop labels, and date strip without external map tiles or a network dependency.

This workspace is connected to the existing trip spreadsheet through an owner-authorized Apps Script endpoint. The initial trip plan and traveler list are in the app-managed tabs; sample expenses remain in this browser until travelers submit real entries. `.env.local`, `.local/`, and invite tokens are private and ignored by Git. The website itself has not been published.

## Connect the shared spreadsheet later

The Apps Script code creates app-managed tabs in the existing workbook and leaves the planning tabs in place. It stores trip details, dates, travelers, ledger entries, and change history in `AppConfig`, `AppItinerary`, `AppMembers`, `AppExpenses`, and `AppHistory`.

1. Open the existing spreadsheet and use **Extensions → Apps Script**. Add the contents of `apps-script/Code.gs`.
2. In Apps Script **Project Settings → Script Properties**, add `SPREADSHEET_ID` with the ID from the spreadsheet URL. Keep the ID out of the public repository.
3. Run `setupRoadbook()` once and authorize the spreadsheet access. It creates only the five `App*` tabs and prints a private invite token to the execution log. Copy that token somewhere private.
4. Deploy the script as a web app that executes as the spreadsheet owner and allows anonymous access. The app still checks the private invite token on every read and write. Use your account’s current Apps Script deployment options; an organization policy may restrict anonymous access.
5. Copy the deployment URL ending in `/exec` to `.env.local`:

   ```text
   VITE_LEDGER_ENDPOINT=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```

6. Restart Vite and open the local app with `#invite=YOUR_PRIVATE_TOKEN` at the end of the URL. The private token is read from the URL fragment and removed from the address bar. If the app tabs are empty, choose **Initialize shared Sheet** from the local trip preview. This copies the private local trip plan and traveler list into the app-managed tabs; demo expenses are not copied.
7. Once connected, use **Copy invite link** in the money pool to share the private link with the group. Travelers do not need to open the Sheet or manually sync; edits write to the Sheet when submitted, and open pages check for updates automatically every 30 seconds (or when a tab becomes active).

The invite link is a bearer credential: anyone who receives it can view and edit the trip data. Names entered in “Recording as” are self-reported. The original spreadsheet’s sharing setting is separate from this app invite, so review the workbook’s own link-sharing access before using it for private trip details. To revoke the app links, replace the `INVITE_TOKEN` Apps Script property with a fresh random token and distribute a new invite.

## Public hosting later

The repository is safe to make public only when it contains no private `.local/` files, `.env.local`, invite tokens, spreadsheet IDs, or generated build output. Keep those paths ignored. The published app will show the synthetic sample until a traveler opens a private invite link connected to the Apps Script web app. GitHub Pages serves only the static interface; the Apps Script deployment performs spreadsheet reads and writes.

## Calculation rules

- Each expense is split evenly among its selected beneficiaries.
- Amounts are stored as integer cents; any remainder cent is assigned in traveler-list order and shown in the expandable calculation.
- The payer receives credit for the amount paid and still owes their own share if they were included as a beneficiary.
- USD and HKD balances are calculated independently, with no automatic exchange-rate conversion.
- Adds, edits, and removals are recorded in the history tab with the self-reported editor name and before/after values.
