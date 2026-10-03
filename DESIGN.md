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

- **Overview:** trip identity and dates lead into an interactive Three.js route field beside a progress card. The scene is a dark instrument inset into the paper frame: low relief, restrained contour loops, one luminous route signal, stop beacons, pointer parallax, and a motion toggle give the roadbook a sense of depth without turning the planner into a decorative map. The active marker and ordered stop list stay distinct. If WebGL is unavailable, the ordered stop rail and route readout remain usable.
- **Trip details:** each date expands in place to reveal its plan, stay, meal suggestions, and any relevant alert. Tentative ideas remain visibly distinct from bookings.
- **Money pool:** balances sit above a filterable ledger. Every expense can expand to show each traveler’s share, amount paid, net effect, and rounding rule.
- **Responsive shell:** laptop layouts use a compact left rail; small screens switch to a bottom navigation bar and stacked cards. Forms and ledger details reflow for touch widths.
- **Accessibility:** controls keep visible focus, labels describe their purpose, progress is exposed semantically, and key information does not rely on color alone.

## Data and calculation rules

- Keep private trip details in the ignored `.local/` fixture or in the user-configured shared spreadsheet. The public sample is fictional.
- Lodging uses the original traveler invitation as `stayUrl`; optional `stayListingUrl` opens the public property listing separately. Label invitations and listings by their destination, and explain that Airbnb may require sign-in.
- Travel alerts can include `dayIds` to limit their appearance in the itinerary and additional source links. Show the date checked. Keep warnings consistent with the booked overnight base; an in-park service closure does not imply an outside-park booking is canceled.
- A shared edit is attributed to a self-reported traveler name; a private invite link grants access to anyone who receives it.
- Store money in integer minor units. Split each amount evenly over the selected beneficiaries and assign leftover cents in stable traveler-list order.
- Credit the payer for the full payment, then subtract their share if they are included as a beneficiary.
- Calculate USD and HKD balances independently. Never imply an exchange rate or automatic conversion.
- Keep the existing workbook tabs intact; shared app data belongs in the dedicated `App*` tabs created by the optional Apps Script integration.

## Responsive review

On October 2, 2026, reviewed the actual application in browser viewports at 320 px, 390 px, 768 px, and 1440 px. The phone overview uses one full-width column with compact trip progress before the route. Tablet expense forms use two flexible columns; phone transactions put the date and amount above the description and actions. Currency filters wrap and split-calculation columns shrink without page-level horizontal overflow at 320 px. Mobile controls use 44 px tap targets, and bottom navigation reserves the device safe area.

Desktop-only breakpoint overrides must include a minimum width. The previous unrestricted 1180 px override reinstated the desktop overview columns on phones; the same cascade also reinstated fixed ledger and flight columns. Keep final responsive rules for every grid whose desktop dimensions change, rather than reducing only its font sizes.
