---
name: Roadbook
description: A cinematic shared roadbook with useful plans and auditable costs.
colors:
  ink: "#102234"
  amber: "#daa241"
  amber-hover: "#edba62"
  body-ink: "#142a3c"
  muted: "#566878"
  page-bg: "#f8f9fb"
  paper: "#fff"
  task-tint: "#edf1f5"
  line: "#dce3eb"
  field-border: "#a7b8c6"
  focus: "#b77717"
  positive: "#256a50"
  negative: "#ae4b31"
  notice-bg: "#fff2dc"
  notice-text: "#543d1d"
  error-bg: "#fff0eb"
  error-text: "#97432d"
typography:
  display:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "clamp(64px, 6.6vw, 96px)"
    fontWeight: 400
    lineHeight: 1.03
    letterSpacing: "-.018em"
  headline:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "56px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-.01em"
  section:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  field:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 700
  amount:
    fontFamily: "Manrope, sans-serif"
    fontSize: "22px"
    fontWeight: 500
rounded:
  status: "5px"
  motion-control: "6px"
  field: "7px"
  control: "8px"
  inset: "10px"
  surface: "14px"
  avatar: "50%"
spacing:
  "6": "6px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "36": "36px"
  "44": "44px"
components:
  button-amber:
    backgroundColor: "{colors.amber}"
    textColor: "#302511"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "46px"
  button-amber-hover:
    backgroundColor: "{colors.amber-hover}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "46px"
  button-ink-hover:
    backgroundColor: "#29445b"
  button-quiet:
    backgroundColor: "{colors.task-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "46px"
  button-quiet-hover:
    backgroundColor: "#dce5ed"
  text-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
    height: "46px"
  desktop-nav:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.page-bg}"
    height: "72px"
    padding: "0 4%"
  day-status:
    backgroundColor: "#e9eef3"
    textColor: "#425d73"
    rounded: "{rounded.status}"
    padding: "5px 8px"
  task-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.body-ink}"
    rounded: "{rounded.surface}"
    padding: "28px"
  film-day:
    backgroundColor: "#1d3143"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "102px"
  math-toggle:
    textColor: "{colors.body-ink}"
    rounded: "{rounded.field}"
    padding: "8px"
    height: "44px"
---

# Design System: Roadbook

## Overview

**Creative North Star: "The Widescreen Journey"**

Roadbook presents shared travel as a cinematic journey with useful plans and auditable costs. Ink blue frames photographic scenery at blue hour; large Caslon titles establish the trip's character. Manrope carries the dates, controls, plans, and calculations that travelers use.

Atmospheric imagery leads into white workspaces with clear headings, fine dividers, and compact metadata. Expression is concentrated in scenery and title typography. Task surfaces remain readable on phones while preserving detailed plans and cost explanations.

This is the built replacement identity approved October 3, 2026. Evidence: approved A comp, index.html opening contract (seed 0f8eccbb), application CSS/components, and supplied desktop/tablet/phone captures. The existing surface brief holds page strategy. Frontmatter owns primitives; .impeccable/design.json holds extensions and previews. The finish review disposition is ship, with all five opening-contract promises resolved.

**Key Characteristics:**

- Photographic scenery with shallow depth and optional movement.
- Ink-blue navigation and amber actions.
- Caslon titles paired with practical Manrope task text.
- White workspaces, blue-gray insets, and fine structural dividers.
- Explicit dates, certainty labels, currencies, and inspectable calculations.
- Responsive stacking, visible keyboard focus, and usable static imagery.

## Colors

Deep ink and warm amber sit against cool white and blue-gray task surfaces. The frontmatter values are normative.

### Primary

- **Roadbook Ink:** navigation, active itinerary dates, primary ledger/save actions, and strong text.
- **Journey Amber:** Overview actions and the selected scenic date; its lighter variant provides hover feedback.
- **Focus Amber:** the shared visible keyboard outline.

### Secondary

- **Task Blue-Gray / Muted Slate:** tinted progress, rental, connection, and calculation surfaces; explanatory text and metadata.

### Tertiary

- **Collect Green / Owed Terracotta:** financial states paired with signed amounts and text.
- **Warm Notice:** sourced alerts and attention states.
- **Error Terracotta:** validation/save feedback on a pale error surface.

### Neutral

- **Body Ink:** default reading text.
- **Cool Page / Task White:** page background and forms, balances, or expandable day panels.
- **Divider Mist / Field Steel:** structural rules and visible field boundaries.

**The Action Signal Rule.** Amber marks an Overview action or selected scenic date. Ink marks ledger save actions and active itinerary dates.

**The State Has Words Rule.** Pair semantic color with signed amounts, status text, or an icon.

## Typography

**Display Font:** Libre Caslon Display, Georgia, serif. **Body Font:** Manrope, sans-serif; bundled weights are 400, 500, 600, and 700.

Caslon gives identity and section titles a spacious cinematic voice. Manrope keeps operations compact and direct.

- **Display:** the scenic title uses the frontmatter display role; tablet size is 72px. Phones use clamp(44px, 10.5vw, 64px) at 1.06 line height.
- **Headline:** itinerary and money titles use the headline role, reducing to 44px on phones.
- **Section:** ledger headings/form titles use the section role; Overview headings use 30px. Phone headings use 28–29px.
- **Scenic destination:** Caslon (38px, line height 1.05), reducing to 32px on phones.
- **Title:** Manrope day titles reduce from 20px to 18px on phones. Ledger descriptions use 15px.
- **Body:** plans and paragraphs use 13–14px. Contextual line limits are commonly 65–80ch; plan lists use 1.75 line height.
- **Field / Label:** editable values remain 16px, with visible 12px bold labels. Metadata ranges from 10–13px.
- **Amount:** balance values use 22px, reducing to 20px on phones. Transactions use 18px; Overview's total uses 31px. Use tabular numerals and explicit currencies.
- **Wordmark:** Manrope semibold, uppercase, .14em tracking.

**The Two Voices Rule.** Use Caslon for identity and section titles; use Manrope for day titles, controls, editable values, state, and arithmetic.

## Layout

The shell spans the viewport. Desktop navigation is 72px tall with 4% horizontal padding; Overview uses 5% gutters. At 1600px and above, hero content is inset to a centered 1440px area. Itinerary/money pages have a 1260px maximum width; Overview detail sections use 1320px.

The approved Overview places a large left title and 280px right day panel above its date filmstrip, progress ribbon, and unequal planning workspace. The hero is at least 580px tall. The workspace uses a 1.8:1 column relationship and a divider before the expense preview. This is the Overview composition; future task screens inherit the visual system without duplicating the scene.

The current nine dates fit across desktop. At 1100px and below the filmstrip scrolls horizontally with 132px items; phone items use 125px. Itinerary date shortcuts also scroll rather than indefinitely compressing labels.

Itinerary uses a 90px date column and expandable white panel. Open details and editor fields use two columns. At 1000px and below, details become one column, ledger headings stack, and calculation/edit actions move under transaction text.

At 760px and below, the header reduces to 62px and navigation moves to a fixed white bottom bar. The scenic title and day panel stack; workspaces, editors, and forms become one column. Overview gutters become 24px; task-page gutters become 20px. Phone transactions show date/amount, description, then actions. Balance names sit above separate currency figures.

Bottom navigation reserves the safe area; content has 74px plus that inset below it. Controls generally use 44–46px minimum targets, with a 36px scenery-motion control. Repeated spacing in frontmatter records the observed rhythm, including 20–28px panel padding.

## Elevation & Depth

Depth comes from the photo relief, translucent active-day panel, and changes in tone. White task cards use borders and dividers. The scenic panel has a translucent stroke and 12px backdrop blur. Dark directional overlays preserve title/control legibility.

- **Mobile navigation lift:** a soft upward shadow (0 -4px 20px rgba(12, 30, 46, .08)) separates persistent navigation from scrolling content.

**The Quiet Workspace Rule.** Keep plans, forms, and calculations flat; group them with borders or tinted insets.

The Three.js scene is a shallow relief mesh with a photographic texture. Mouse position, slow drift, and selected-day framing produce bounded camera movement. It uses low-power rendering, a 33ms frame gate, and capped device pixel ratio (1 below 700px; 1.5 otherwise). Rendering pauses offscreen and while the document is hidden. A visitor can pause movement; reduced-motion preference starts it paused. A static cover-positioned photo remains during loading or without WebGL. CSS also respects reduced motion.

## Shapes

Use the observed corner roles: surfaces 14px, insets/images 10px, controls/date tiles 8px, fields/calculation buttons 7px, and status labels 5px. Traveler initials use circles. Fine blue-gray strokes separate task panels and inputs.

Selected scenic dates use a 2px amber border. Active itinerary dates use solid ink. Scenery clips to its container; ordinary task sections retain clear rectangular boundaries and dividers.

## Components

### Buttons

Direct, compact labeled actions. Amber appears on View day and Overview's Add expense; ink appears on ledger/save actions; quiet blue-gray appears on secondary actions. Shared buttons use 12px 20px padding, 8px corners, 46px minimum height, and bold 14px Manrope. Text actions use 44px minimum height.

Hover changes color directly. Keyboard focus is a 3px amber outline with 4px offset. Disabled buttons retain their labels with half opacity and a disabled cursor. The implementation adds no decorative button movement.

### Status Labels and Filters

Small status labels sit beside day titles. Preserve Booked stay, Selected stay, Needs confirmation, Needs a check, and Plan in progress. Attention states use warm surfaces and an alert icon where applicable. The All/USD/HKD filter uses a white active segment on a blue-gray track, with pressed state.

### Cards / Containers

White panels use fine borders and 14px corners. Balance/expense panels use 28px desktop padding and 18–22px phone padding. Calculations, rental details, and alerts use tinted 10px insets.

### Inputs / Fields

Visible labels lead fields. White inputs have steel borders, 7px corners, 11px 12px padding, and 46px minimum height. Values remain 16px; textareas resize vertically. Amount and currency form one joined control. Errors are explicit text with alert semantics; pending actions say Saving…. Actor selection remains visibly self-reported.

### Navigation

Desktop uses 14px semibold text inside the ink header; the active page has white text and a 2px amber underline. Mobile uses icons over 10px labels, 54px minimum buttons, a tinted active surface, and the safe-area inset. Both expose the current page. Keep the skip link, labeled source action, and distinct Shared, Local preview, and Check link states; state copy follows actual storage behavior.

### Scenic Journey and Filmstrip

Semantic HTML carries the trip title and controls over decorative scenery. The active panel shows date, destination, short plan title, and View day. Selecting a date updates the panel and planning preview; View day opens that itinerary day. Filmstrip dates remain buttons with pressed state, dark image gradients, and readable date/destination labels. Selected dates get an amber outline and warmer date text.

The photo atlas and scene are labeled Illustrative scenery. Their photographs do not certify routes or booked properties.

### Editable Day Plans

Details reveal the plan, stay, meal ideas, scoped sourced alerts, and relevant rental notes. Edit day opens an inline form. Date/route stay fixed while plan fields and meal ideas are editable. Save/validation feedback remains in the day.

Preserve stay certainty, the original Airbnb invitation as the primary link, the listing as a secondary link, and the sign-in note. Meal ideas remain labeled as ideas. Alerts retain sources, checked dates, and day scope.

### Expense Ledger and Exact Split

Ruled transaction rows expose date, description, payer, beneficiaries, currency, calculation disclosure, and labeled edit/remove actions. Show the math opens base share, each person's share/paid/net effect, rounding, and change history in a tinted inset with table semantics.

Preserve integer-cent arithmetic: split over selected beneficiaries, allocate leftover cents in stable traveler-list order, and credit the payer before subtracting their own share. USD/HKD totals and balances remain independent. Pair values with to collect, owes, or settled.

Real trip facts remain in the private fixture/shared Sheet; private invitations and tokens stay outside public source. Samples remain labeled. The visual system preserves existing storage, sync behavior, and app-managed Sheet tabs.

## Do's and Don'ts

### Do:

- **Do** use ink-blue framing, amber actions, Caslon titles, and Manrope task text.
- **Do** keep task content on readable white or blue-gray surfaces.
- **Do** label scenery as illustrative and preserve the static fallback.
- **Do** expose selection, expansion, progress, focus, and save feedback semantically.
- **Do** preserve certainty, source links, alert dates, self-reported actors, and separate currencies.
- **Do** make every expense's split and remainder inspectable.
- **Do** stack phone task layouts and reserve bottom-navigation space.

### Don't:

- **Don't** reintroduce the discarded pine/green identity, lime accents, or condensed display type.
- **Don't** replace the photo world with a cartoon globe, neon route, or topographic grid.
- **Don't** treat atmospheric photos or meal ideas as booking evidence.
- **Don't** hide certainty or financial meaning in color alone.
- **Don't** combine USD/HKD totals or imply automatic conversion.
- **Don't** put private fixtures, invite tokens, or booking details in public source or previews.
- **Don't** add heavy card shadows or compulsory scenery motion.

