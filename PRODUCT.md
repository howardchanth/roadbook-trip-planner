# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, and Vite, as chosen by the user; Three.js for the route visualization. Eventual public hosting target: GitHub Pages. This implementation remains local and unpublished.

## Users

Travel groups planning a shared trip, then recording common costs while traveling. A group can start with a few people and add travelers as plans change.

## Product Purpose

Show the trip plan, route, timing, and progress in one place, and let the group record shared expenses with a visible, auditable calculation for each transaction.

## Positioning

The trip map and schedule share the same place and date model as the expense ledger, so the group can coordinate travel and understand who paid and who owes from one reusable trip page.

## Operating Context

The site is a responsive trip workspace used on phones, tablets, and laptops. A trip has a dated itinerary, route stops, traveler roster, optional travel notes, and a shared expense ledger. Real trip details are kept in a private local fixture or the linked spreadsheet, outside the public source code.

## Capabilities and Constraints

- Overview, dated itinerary, trip progress, route visualization, and shared-expense ledger.
- A linked Google Sheet is the intended shared store through a user-deployed Google Apps Script endpoint. The local build uses clearly labeled demo expenses until that endpoint is deployed and configured.
- No sign-in is intended. Live access uses a private invite link as a bearer credential; anyone who receives the link can read and edit the trip ledger. Editor names are self-reported.
- Transactions can be paid by any traveler and assigned to everyone or a chosen set of travelers. Show the exact split and cent-rounding method for every transaction.
- Keep USD and HKD balances separate. Do not convert currencies automatically.
- The current sheet roster has three people; the site must support adding travelers for groups of four to five or more.
- Keep the existing spreadsheet tabs intact; the integration should use app-managed tabs.
- Build and preview locally only. Do not publish the site, deploy Apps Script, or mutate the live spreadsheet without a later explicit instruction.
- The first version focuses on this trip but should store itinerary, group, and ledger data in reusable structures for future trips.

## Evidence on Hand

- User-provided schedule and expense spreadsheet, a planning conversation, and a flight-search screenshot. The source materials are private inputs and must not be committed to a public repository.
- Sample ledger entries in the website are synthetic and must remain labeled as demo data.

## Product Principles

- Make the current trip state and next useful detail easy to scan.
- Keep tentative plans distinct from confirmed bookings.
- Make expense calculations inspectable and deterministic.
- Keep shared balances clear across currencies and people.
- Preserve a safe local demo path before connecting external data.
