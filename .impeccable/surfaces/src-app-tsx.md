---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/components/Overview.tsx","src/components/Itinerary.tsx","src/components/MoneyPool.tsx","src/components/ScenicJourney.tsx"]
---

# Roadbook application

Scope: complete replacement of Overview, Itinerary and Money pool. Overview mode Experience; editing and ledger mode Operate.

The group uses phones while travelling and tablets or laptops while planning. Select a trip date, inspect the day, edit the shared itinerary, add an expense and inspect the exact split. The private invite and Google Sheet remain the source of real trip facts.

Chosen direction: user-approved A, widescreen journey. Approved comp `.impeccable/mocks/widescreen-journey.png`. The scenic opening, serif trip title, right day panel and date filmstrip establish the world; practical white workspaces carry it across all screens. Three.js moves a photographic relief scene with bounded camera motion. Scenery is labelled illustrative and never used as booking evidence.

Constraints: preserve all shared editing and ledger mathematics; no private invite, booking data or local fixture in public source; USD and HKD remain independent. Phone layouts stack rather than squeeze. Motion is optional, respects reduced motion, and pauses offscreen; a static scene works without WebGL. No unresolved design choice: user approved implementation October 3, 2026.
