# Roadbook design

## Visual direction

Roadbook treats the trip as a shared field guide: a calm map table for orientation, a clear day-by-day plan, and an expense ledger whose arithmetic can be inspected. The interface uses a deep pine frame, warm paper surfaces, a small signal-yellow accent, and restrained coral for costs owed or plans that need attention.

## Foundations

- **Display type:** Barlow Condensed for trip titles, dates, totals, and short wayfinding labels.
- **Reading type:** IBM Plex Sans for itinerary copy, controls, ledger details, and explanations.
- **Core colors:** pine `#19312e`, deep pine `#142725`, paper `#f1f4ee`, white `#fbfcf9`, acid `#deed87`, and coral `#bd5947`.
- **Surfaces:** use thin green-gray borders and soft off-white panels to separate information without stacking heavy shadows.
- **Numbers:** use tabular numerals for money and dates; keep currencies explicit and separate.
- **Motion:** animate small state changes with transform and opacity. Respect `prefers-reduced-motion` and keep the map usable if WebGL is unavailable.

## Layout and behavior

- **Overview:** trip identity and dates lead into an interactive, north-up Three.js map beside a progress card. OpenStreetMap cartography sits on a shallow relief board; the planned route, traveled segment, active stop, and ordered stop list stay distinct. Keep map attribution visible and preserve a local relief fallback when tiles cannot load.
- **Trip details:** each date expands in place to reveal its plan, stay, meal suggestions, and any relevant alert. Tentative ideas remain visibly distinct from bookings.
- **Money pool:** balances sit above a filterable ledger. Every expense can expand to show each traveler’s share, amount paid, net effect, and rounding rule.
- **Responsive shell:** laptop layouts use a compact left rail; small screens switch to a bottom navigation bar and stacked cards. Forms and ledger details reflow for touch widths.
- **Accessibility:** controls keep visible focus, labels describe their purpose, progress is exposed semantically, and key information does not rely on color alone.

## Data and calculation rules

- Keep private trip details in the ignored `.local/` fixture or in the user-configured shared spreadsheet. The public sample is fictional.
- A shared edit is attributed to a self-reported traveler name; a private invite link grants access to anyone who receives it.
- Store money in integer minor units. Split each amount evenly over the selected beneficiaries and assign leftover cents in stable traveler-list order.
- Credit the payer for the full payment, then subtract their share if they are included as a beneficiary.
- Calculate USD and HKD balances independently. Never imply an exchange rate or automatic conversion.
- Keep the existing workbook tabs intact; shared app data belongs in the dedicated `App*` tabs created by the optional Apps Script integration.

## Responsive review

Reviewed the overview and itinerary at phone width and the dashboard and ledger at desktop width. The route labels remain visible at close stops, the calculation table fits without page-level horizontal overflow at 390 px, and mobile navigation stays reachable at the bottom of the screen.
