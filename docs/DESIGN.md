# AccessPilot — Design System and UX

Source of truth for visual design and interaction. Product scope comes from `PRD.md`. The implementation lives in `frontend/src/styles.css` (tokens and classes), `frontend/src/components.tsx` (shared components), `frontend/src/icons.tsx` (icon set), `frontend/src/timeline.tsx` (agent timeline) and `frontend/src/evidence.tsx` (page view and crops).

**Style:** *achromatic ledger*, dealt by the `design-taste-frontend` skill's app-screen rules (`.agents/skills/design-taste-frontend/references/app-screens.md`) on 20 Oct 2026 (seed 723138511), with our typeface kept. Where the skill and this document disagree, this document and `AGENTS.md` win (accessibility and honesty rules first).

## 1. Visual direction

AccessPilot is an **evidence instrument**, not a marketing dashboard. It should feel like a careful ledger: calm, dense enough to inspect, and honest about uncertainty.

**Principles**

1. **The answer first.** After a scan the intake shrinks to one row; the results open with one finding sentence ("5 critical or serious barriers found by automated rules. Keyboard users cannot reach “Submit application”."), then the figures.
2. **Evidence before opinion.** Rule IDs, selectors, snippets and diffs are shown as code. AI text is always labelled (spark icon + "AI") and set on a raised tone.
3. **Status in words.** Every status and impact is written out next to an outline icon. Colour only reinforces it.
4. **No colour in the chrome.** Ink and greys for everything structural; one data hue for the step that waits for the person; status colours only as small signals.
5. **No false confidence.** No scores, gauges, percentages of "accessibility", "compliant" badges, or celebratory animation.
6. **Practise what we preach.** The UI must pass its own audit and be fully keyboard-operable.

**Avoid:** gradients, glass, glows, shadows on resting surfaces, emoji or dingbat glyphs as UI, icons in tinted squares, eyebrow labels, uppercase tracked labels, a brand-coloured primary button, placeholder-only inputs, icon-only buttons.

## 2. Colour

CSS custom properties on `:root`. **Light is the default.** A Light / Dark switch in the header (`ThemeSwitch`, `theme.tsx`) sets `data-theme` on `<html>` and remembers the choice in `localStorage` (`accesspilot-theme`, wrapped in try/catch); an inline script in `index.html` applies it before first paint. `[data-theme="dark"]` redefines the tokens. Never use raw hex values in components.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--ground` | `#f2f4f7` | `#0b0c0e` | Page ground. The product's face: a blue-grey ledger tone |
| `--surface` | `#ffffff` | `#141518` | Cards, inputs |
| `--raised` | `#f6f7f9` | `#1b1d21` | One tone step: AI explanations, the waiting step |
| `--active` | `#eceef1` | `#24262b` | Hover on secondary controls |
| `--border` / `--rule` | `#e3e6ea` / `#eef0f3` | `#26282d` / `#1f2125` | Card edges / row and group rules |
| `--control` | `#c9ced6` | `#464a52` | Input borders, node rings (one step stronger) |
| `--text` | `#111418` | `#f2f3f5` | Ink |
| `--muted` / `--faint` | `#5b6168` / `#6b7079` | `#b4b8be` / `#969ba3` | Secondary text, meta (≥ 4.5:1) |
| `--primary` / `--on-primary` | `#1d1f20` / `#ffffff` | `#ffffff` / `#0b0c0e` | The one primary action per context |
| `--secondary` | `#e5e7ea` | `#2a2d33` | Grey secondary buttons |
| `--accent` | `#1d5fbf` | `#6ea8ff` | The one data hue: the waiting step, the AI tag; also the focus ring |
| `--positive` / `--negative` / `--warning` | `#1f7a4a` / `#c4242a` / `#92400e` | `#3fc07a` / `#ff7a85` / `#f0b45a` | Signals on figures and timeline nodes |
| `--pill-*-bg` / `--pill-*-ink` | pale tint / dark ink | dark tint / light ink | Impact and status pills (positive, negative, warning, neutral) |
| `--code-bg`, `--add-bg`, `--del-bg` | | | Code, diff lines |

Rules:
- Text reaches 4.5:1 and meaningful non-text 3:1 against its surface, in both themes.
- Pills are a pale tint with dark ink of the same hue, never a saturated fill with white text.
- A severity count is coloured only when it is above zero; a zero stays ink.
- Under about 1% of the screen is coloured. New colours need a token in both themes.

## 3. Typography

- **UI font:** `"Segoe UI", system-ui, -apple-system, sans-serif` (native, works offline). One family.
- **Code font:** `Consolas, "Cascadia Mono", monospace` at 13px, only for literal code: selectors, rule IDs, URLs, IDs, snippets and diffs.
- **Figures:** `font-variant-numeric: tabular-nums` (`.num`) on every count and duration.
- **Base:** 15px, line-height 1.55.

| Role | Size | Weight |
|------|------|--------|
| Page title (h1 "Page audit"; 18px once compact) | 24px | 600 |
| Card title (h2) | 16px | 600 |
| Finding sentence | 16px | 400 |
| Timeline step title | 15px | 600 |
| Body, cells, controls | 14px | 400–500 |
| Meta, labels, pills | 12–13px | 400–500 |
| Strip figures | 22px | 500 |

One `h1`; heading levels never skip; sentence case everywhere; no uppercase tracking.

## 4. Spacing and layout

- **Spacing:** 4px base; 16px between cards; 20px card padding; 8px between related controls.
- **Content width:** max 1240px; 24px side margins (16px on phones).
- **Radius (tight pair):** 8px cards and the strip, 6px controls and code blocks, 4px pills and chips.
- **Results layout:** main column `3fr` (agent timeline, then findings) and a sticky context column `2fr` (next-step hint, review, verification). This is the right-rail pattern for the selected object's details, so a height difference between the columns is intended.
- **Breakpoints:** ≤ 900px one column, context column after the main one and not sticky, strip in 4 columns; ≤ 760px compact intake stacks; ≤ 480px strip in 2 columns.
- No horizontal page scroll at any width ≥ 320px. Code and diffs wrap.

## 5. Components

Reuse these; do not restyle per page.

| Component | Class or name | Rules |
|-----------|---------------|-------|
| Card | `.card` | Surface, 1px `--border`, 8px radius, no shadow. Each card is a `<section>` with `aria-labelledby` |
| Primary button | `button.primary` | Near-black fill (white on dark). **One per context:** Scan (before results), Run agent, Approve and apply, Continue |
| Secondary button | `button` | Grey fill, ink label: Review, Propose fix, Update diff, Reject, Close, Scan again |
| Inline link button | `button.link` | Underlined ink text, for in-text actions (demo URLs) |
| Text input | `input` | 36px, 1px `--control` border; visible `<label>` always |
| Icon | `Icon` (`icons.tsx`) | 14px outline, 1.75 stroke, `currentColor`, always `aria-hidden` beside words: check, cross, alert, dot, ring, clock, spark, question, mark |
| Product mark | `Icon name="mark"` | A focus ring around a check, in ink, before the wordmark |
| Impact badge | `ImpactBadge` | Pill + icon + word: Critical (negative pair), Serious (warning pair), Moderate / Minor / Needs review (neutral pair) |
| Status badge | `StatusBadge` | Pill + icon + words: Verified by automated re-test (positive), Failed (negative), Partially verified (warning), Needs human review / Suggested only (neutral) |
| Tag | `.tag` | Neutral chip for source or context; `.tag-ai` = spark icon + "AI" in the data hue |
| Finding sentence | `.finding` | One sentence under the results title: the screen's one finding |
| Summary strip | `Summary`, `.strip` | One container split by 1px dividers; label over value; 8 → 4 → 2 columns |
| Finding group | `.group` (`<details>`) | Impact badge, rule help (bold), rule ID and element count (muted) |
| Finding node | `.node` (`<article>`) | Target, source tag, snippet, failure summary, explanation, action |
| Explanation | `.explain` | Raised tone, no border; header "AI-generated advice · confidence N%" or "Built-in guidance" |
| Diff | `Diff` | Code, wrapped, focusable (`tabIndex=0`); +/- kept as text |
| Agent timeline | `Timeline` (`timeline.tsx`) | See §5.1 |
| Page view | `PageView` (`evidence.tsx`) | See §5.2 |
| Element crop | `Crop` | A crop of one element from a scan's capture, outlined (negative = before, positive = after), at least 420 page px wide so small controls render near 1:1 |
| Stage tracker | `.stages` | Scanned → Explained → Approved (n of m fixes) → Verified by re-test (n). The current stage carries the data-hue ring |
| Next step panel | `.next` | The context column's default: the one next action as the primary button (Run agent, then Review the first fix) |
| Why this needs you | `.why` | In the review panel: why the step is escalated to a person (a wording judgement, or a code change) |
| Accessible-name change | `.name-change` | In verification: the name the keyboard walk measured before and after, labelled approximate |
| Alert | `.error` (`role="alert"`) | Negative pill pair; message and code |
| Status line | `.status-line` (`aria-live="polite"`) | One short muted line; spinner is decorative |

### 5.1 Agent timeline (primary results view)

The timeline tells the session as one story: **Scan → Agent → Repair n → Working copy → Agent …**. It is built only from real data (scan trace, agent trace, apply results). Nothing is simulated or animated.

- **Groups:** a small muted label with a hairline, for example `Scan · <title>`, `Agent · <model or built-in guidance>`, `Repair 1 · T2 · <rule help>`, `Working copy <id>`.
- **Steps:** a 22px node on a 2px rail, a semibold title, a right-aligned tabular duration (measured), a muted body, and optional actions.
- **Node states (icon + colour + visually hidden word):** check in ink = done; dot in the data hue with a 2px ring = waiting for you (its content sits on the raised tone); cross in `--negative` = failed; alert in `--warning` = needs attention; dashed empty ring = not started or superseded.
- **Minor steps** (browser launch, page load, consent check, model calls) are 8px-dot rows in muted 13px text, so the major steps stand out.
- **AI provenance:** steps that came from the model carry a spark icon + "AI" in the data hue; deterministic steps carry none.
- **Actions:** waiting steps hold the only timeline controls: **Run agent** (primary) and **Review** (secondary). Results and details open in the right column.
- **Wording:** "Fix ready" only while it is waiting for review; afterwards "Fix drafted" with the real status badge.

### 5.2 Page view and before/after (visual evidence)

The research behind this: reviewers trust an approval when they see the real payload and its evidence, not a bare Approve button; Microsoft Accessibility Insights' numbered tab-stops path is the reference visual for keyboard order.

- **Page as scanned:** the capture of the scanned page (1280 px wide, up to 2400 px tall) with an overlay toggle (`.seg`, `aria-pressed`):
  - **Barriers:** numbered markers on critical, serious and keyboard findings only, each box outlined in its severity colour. Markers are real buttons named "Marker n: <rule help>, <impact>. Open in findings."; selecting one opens and focuses that finding in the list. Colliding markers are pushed apart so every target is at least 24 px clear (WCAG 2.5.8).
  - **Tab order:** a dashed path in the data hue through numbered focus stops; repeated stops in amber; elements that respond to clicks but were never reached get a dashed negative box labelled "Never reached by Tab".
  - The overlay is decorative to assistive technology (`aria-hidden`); the Findings list and Keyboard focus path list carry the same information.
- **Before / after:** the review panel shows the element now; verification shows Before and After crops from the two captures, plus the accessible-name change when the element is focusable. Fixes with no visual change (alt text, `lang`, `aria-label`) say so in the caption instead of implying a visible difference.
- **First run:** before any scan, a four-step "How AccessPilot works" (Scan, Explain, Approve, Re-test) states the limits plainly.
- **Narrow screens:** the context column (what to do now) moves above the evidence.

## 6. Navigation and forms

- Single page; no router. A **skip link** ("Skip to main content") is the first focusable element.
- Focus management: after a scan, focus moves to the Results heading. After opening a proposal, focus moves to "Review proposed change". Both headings use `tabIndex=-1`.
- Forms: the label is always visible above the field; required consent is a real checkbox; Enter in the URL field submits; errors appear in the alert and are announced.
- Buttons that act on a specific item include visually hidden context (for example "Propose fix (T1) *for label on #email*").
- External links say "(opens in new tab)" to screen readers.

## 7. Loading, empty and error states

| State | Pattern |
|-------|---------|
| Loading | Button label changes ("Scanning…"), all action buttons disabled, spinner plus text in the status line. Never invent progress steps. |
| Empty | Plain sentence in place of the list ("No findings match these filters.", "None."). |
| Error | `role="alert"` box with a human message and the error code. Previous results stay visible. |
| Fallback | A warning-coloured sentence explains why the model was not used. |
| Negative result | Failed or Partially verified is shown with the same prominence as Verified. |

## 8. Interactions and animation

Motion is feedback, never decoration (app-screen rule): it confirms an action, shows something arriving, or shows that work is running. Nothing performs an entrance for its own sake, and every animation sits inside `@media (prefers-reduced-motion: no-preference)` so it disappears for people who ask for less motion.

| Moment | Motion | Why |
|--------|--------|-----|
| Pressing any button | 0.97 scale for 100 ms; background eases 150 ms | The press is felt |
| Agent running | "Agent is reading the evidence" row with three pulsing dots | Honest progress: no invented steps |
| Agent steps return | Each new timeline step rises 6 px and fades in, 45 ms apart, in order | The agent's real work arrives in sequence |
| Tab order overlay | Stops pop in in Tab order, 70 ms apart; the path fades in | Replays the keyboard journey |
| Barrier markers | Pop in in number order | Reading order of the evidence |
| Review / verification / next-step panels | Rise in 250 ms | A panel opening |
| Verdict | The status pill lands (scale 0.85 → 1, slight overshoot) | The decisive moment of the flow |
| Marker → finding | The finding flashes a 14% data-hue tint once, after a smooth scroll | The eye finds it |
| Stage tracker | Background and ring ease 300 ms as stages complete | Progress moves forward |

Rules: transform and opacity only; arrival animations use `animation-fill-mode: backwards` so they never override hover or press states afterwards; no infinite animation except the working indicator; the self-audit waits for one-shot animations to settle before measuring contrast. `<details>` groups expand natively. Disabled controls use 0.55 opacity plus `cursor: progress`.

## 9. Responsive behaviour

| Width | Behaviour |
|-------|-----------|
| > 900px | Two-column results; sticky action column |
| 700–900px | One column; action column after findings |
| < 700px | Coverage panel columns stack; URL row wraps the Scan button below the input |
| 320px | Everything readable without horizontal page scroll |

## 10. Accessibility requirements (non-negotiable)

1. WCAG 2.2 AA for AccessPilot's own UI; `scripts/self_audit.py` must report 0 serious or critical findings.
2. The full journey (consent → scan → agent → review → approve → verification) is keyboard-only operable. The self-audit drives it with Tab, Space and Enter.
3. Visible focus: 3px `--focus` outline with 2px offset on every focusable element.
4. Colour is never the only carrier of meaning.
5. Live regions: progress in `aria-live="polite"`; errors in `role="alert"`.
6. Landmarks: header, main and footer; each section labelled by its heading.
7. Touch targets ≥ 40px high for buttons.
8. No banned wording: score, compliant, "fully accessible", "100% accessible", "WCAG certified" (`npm run check:wording`).

## 11. Page-level layout

```
┌ Header: AccessPilot · tagline · [Agent model: …] ─────────────────────────┐
├ Card: Scan a page  (URL [Scan] · demo shortcuts · ☐ consent) ─────────────┤
│ status line (live) · error alert                                           │
├ Card: Results — title, URL, meta, summary grid, Export JSON ──────────────┤
├───────────────────────────────┬────────────────────────────────────────────┤
│ Card: What AccessPilot did    │ Context column (sticky), one at a time:    │
│  Scan · …                     │  Card: Next step (hint)                    │
│   ○ checked · ○ opened · ○ …  │  Card: Review proposed change (diff)       │
│   ✓ Ran axe-core   133 ms     │  Card: Verification (counts, gate,         │
│   ! Walked with Tab  49 ms    │        [Continue with this version])       │
│  Agent · model                │                                            │
│   ✓ Read evidence … ✦AI       │                                            │
│   … Fix ready: … [Review]     │                                            │
│  Repair 1 · T2 · …            │                                            │
│   ✓ approved ✓ applied ✓ re-  │                                            │
│     tested ✓ gate ✓ Verified  │                                            │
│ Card: Findings (detail view)  │                                            │
├───────────────────────────────┴────────────────────────────────────────────┤
├ Card: Keyboard focus path (heuristic) ─────────────────────────────────────┤
├ Card: What was checked — and what was not ─────────────────────────────────┤
└ Footer: principle · "Not a compliance certificate" ────────────────────────┘
```

Order of importance in the demo: summary → timeline (scan, agent, Review) → review panel → Verified step → coverage.

## 11. Multi-page site (FR-24)

**Shell.** Skip link → sticky header (wordmark to Home; nav: How it works, Audit, Findings, Repairs, Report; agent status; Light/Dark) → `main` → footer (Home, How it works, Audit, Accessibility statement). The header and footer are separated from the page by a tone step, not a line. Nav links show `aria-current="page"`; Findings shows its count and Repairs shows "n waiting" only when fixes wait. Under 860 px the nav folds behind a **Menu** disclosure button (`aria-expanded`, `aria-controls`) with 44 px rows.

**Route changes (`router.tsx`).** Real `<a href>` links intercepted for client navigation (modifier keys still open new tabs). On each change: the document title becomes "<Page> · AccessPilot", focus moves to the page's `h1` (or to a `#hash` target, such as a finding opened from a marker), and a polite live region announces "<Page> page". The first load does not move focus. The server returns `index.html` only for the seven routes, so deep links and reloads work and unknown paths stay 404.

**Content pages.**
- *Home*: hero with a 34–68 px headline (two lines at every width), one sentence, primary "Start an audit" and secondary "How it works", beside the largest real capture (the Tab order view). Then four bands, alternating picture side with the heading always first in reading order (`band-flip` moves the picture visually only): the problem, approving the exact change, proof by re-test, what it will not do; then a closing call to action. Every picture is a real capture made by `scripts/site_shots.py`, with alt text describing what it shows.
- *How it works* and *Accessibility statement*: a 760 px text column with a sticky right-hand panel (contents, or "At a glance"), so the frame is used evenly; it stacks above the text under 960 px.
- *Findings, Repairs, Report*: a page heading with a one-sentence lede, then the app components of §5.

**Scroll reveal (Home only).** Section parts rise 24 px and fade in, staggered 80 ms, as they enter. The hidden start state is added by script only, never in CSS alone, so content is visible with no script, with reduced motion, and when printing.

**Accessibility statement.** Its facts must stay true: the date and results change only when `scripts/self_audit.py` (both themes, every page) is re-run.

## 12. Brand layer: "The product performs" (20 Oct 2026)

Dealt by the `design-taste-frontend` page draw (sector dev-tool, seed 1382590712). Where it conflicts with accessibility or honesty, this document wins.

**Idea.** Software is most convincing doing its job: the site shows small, true, working fragments of AccessPilot with real data instead of describing features. The one live element is the **keyboard stepper** on Home: press Tab and walk the real 11-stop path recorded on the scholarship form, ending on "Submit application was never reached".

**Type.** Stack Sans Headline (display, weight 300, tracking about -0.03em) and Stack Sans Text (body and interface), SIL Open Font License 1.1, self-hosted in `frontend/public/fonts/` (with `OFL.txt`) so the site works offline. Steps: small 13–14px, body 17–19px on content pages (16px minimum), lead 20–26px, head 36–72px, hero 44–96px. App pages keep their 13–16px interface sizes and a compact 32px page title.

**Colour.** Brand fields, independent of the Light/Dark switch: forest `#0f1f10` (header, page heroes, Home hero and timing chart), night `#000000` (findings board, feature cells), and a light field that follows the theme. Pale lime `#c6f19d` only on the primary action of a brand field, the current nav item's underline, the open board row and the accented bar. Text on forest uses `#ffffff` and `#a9b3a9` (7.4:1); on night `#a3aaa3` (8.1:1). Inside the app, the achromatic ledger of §2 still holds, with forest as the primary button.

**Shell.** Forest header on every page; every page except Home opens with a forest `PageHero` band (h1, one sentence, live scan figures when a scan exists). Working pages use the compact `app` variant. Footer: one quiet line (what this is, three links, year and "Not a compliance certificate").

**Home, in order.** Forest hero with the keyboard stepper → night findings board (rows open to explain who each barrier blocks; the Submit row is open by default) → full-bleed braille-display photograph with the statement "A display can only show what the page names" → light "Three steps, one proof" call-and-response (scan form → figures; Run agent → drafted fixes; diff → verification with before/after crops) → forest timing chart (measured total and step bars, with a fine-print note on what was measured) → night cells (six fragments) → closing with the Tab-key photograph.

**Data and pictures.** Every number, finding, stop, diff and crop on Home comes from `frontend/src/data/demo.json`, written by `scripts/site_shots.py` from one recorded run; re-run it (server up) whenever the demo or UI changes, then rebuild. Interface captures live in `frontend/public/shots/`. The two photographs are openly licensed and credited on the page and in `frontend/public/shots/credits.json`: a refreshable braille display (Eddau, CC0) and a keyboard's Tab key (JoshFarron, public domain), both via Wikimedia Commons. Neither is presented as a user or a customer.

**Gate.** `inspect.mjs` page mode on Home and How it works, app mode on the other pages: 0 FAIL. Remaining warnings and why: no video (no honest clip of this subject), font-size count (the interface fragments keep their true sizes), How it works motion just under the advisory 16.
