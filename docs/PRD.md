# AccessPilot — Product Requirements Document

**Version:** 3.0 (consolidates PRD v2.0/v2.1 with the decisions of 20 Oct 2026)
**Status:** Source of truth for implementation
**Event:** Microsoft Agentic AI Hackathon, Rungta International Skills University, Bhilai — 22 Oct 2026
**Problem statement:** Automated Accessibility Checker

> **Product principle:** deterministic evidence first; AI suggestions second; human approval before changes; a deterministic re-test decides verification.

Legend: **P0** = required for the hackathon demo · **P1** = add only when P0 is stable · **P2** = after the hackathon.
Markers: 🔶 **Assumption** · ✅ **Decision (approved)** · ❓ **Decision needed**

---

## 1. Problem

Accessibility scanners output long lists of technical violations. They rarely help a developer:

1. understand which person is blocked and from doing what,
2. choose a safe, small fix,
3. prove that the fix worked and broke nothing else,
4. know what the scanner did **not** test.

Generative AI can explain findings and draft fixes, but it can hallucinate rules or produce patches that cause regressions. Teams then either distrust AI output entirely or trust it too much.

**Example story used throughout:** a college scholarship application form that a keyboard-only or screen-reader user cannot complete. The barriers are an unlabelled email field, an image without alternative text, low-contrast helper text, and a "Submit" control that is a clickable `div`.

## 2. Value proposition

> Scanners tell you what is wrong. AccessPilot shows what it checked, has an agent propose a small change you approve, and proves by re-testing whether that change actually helped — and it says clearly what it could not test.

Differentiators:

| # | Differentiator | Why it matters |
|---|----------------|----------------|
| A | **Behavioural evidence** — a recorded keyboard focus path next to rule findings | Shows how a keyboard user actually moves through the page, not just a static list |
| B | **Verified repair** — approval-gated patch in an isolated copy, then the same checks run again plus a regression gate | "Fixed" means observed, not claimed |
| C | **Honest coverage** — what ran, what did not, what needs a person; no score | Avoids false confidence and compliance theatre |
| D | **AI with boundaries** — a tool-using agent that explains and drafts, but cannot apply changes or decide pass/fail | Agentic help without losing trust |
| E | **Local-first** — runs on a laptop, works offline, and works without any AI key | Reliable live demo; no vendor lock-in |
| F | **Multi-Agent Specialist System** — Coordinator orchestrates specialized agents (Scanner, Impact Analyzer, Real-User Simulator, Compliance Lawyer, Code Fixer) | Autonomous triage and specialized analysis beyond a single LLM prompt |
| G | **Lived Experience Assistive Simulation** — Synthesized speech announcement stream (NVDA, TalkBack, JAWS emulation) and friction metrics | Demonstrates what a disabled user actually experiences, with Web Speech audio |
| H | **India Statutory Compliance & Impact** — Direct mapping to RPwD Act 2016, GIGW 3.0, and BIS IS 17802, with demographic reach | Statutory clarity without false compliance claims |
| I | **IDE Integration** — VS Code extension with real-time diagnostics and quick fixes | Bridges the gap between browser audit and developer editor |
| J | **Workspace Rollback** — Snapshot versioning before patch application | Safe trial of repairs with one-click reversibility |

## 3. Target users

| Persona | Need | Primary use |
|---------|------|-------------|
| Frontend developer | A prioritised issue list and small, reviewable fixes | Scan → review → approve fix |
| College or government site maintainer | Plain-language guidance and a shareable report | Scan → read explanations → export |
| QA or accessibility auditor | Repeatable findings and a list of what still needs human judgement | Scan → coverage panel → export |
| Disabled end user (indirect) | Being able to apply, pay, book or study | Benefits from the fixes |
| Hackathon judge or mentor | Real tool usage and a clear line between AI advice and evidence | Watches the demo; inspects the trace |

## 4. User journeys

### J1 — Scan and understand (P0)
1. The developer opens AccessPilot, enters a URL, and confirms they own or are authorised to test it.
2. AccessPilot loads the page in a real browser, runs automated rules, and walks the page with the Tab key.
3. The developer sees counts by impact, findings grouped by rule with evidence, the keyboard path, the coverage panel and the trace of steps that ran.

### J2 — Agent explains and proposes (P0)
1. The developer presses **Run agent**.
2. The agent reads the evidence through tools. It writes a plain-language explanation for each finding, drafts repairs where a supported template exists, and flags the rest for human review.
3. If no model is configured or the model fails, built-in guidance is shown and the UI says why.

### J3 — Approve, apply, verify (P0, bundled demo only)
1. The developer opens a proposal and reads the rationale, files, risk and diff. They can edit wording such as alt text, and then approve or reject.
2. On approval, the patch is applied to a fresh copy of the demo. The same scan runs again, and the control page is scanned as a regression gate.
3. The developer sees one status — Verified by automated re-test, Partially verified, Failed, or Needs human review — with resolved, remaining and new counts.
4. The developer continues from the repaired version and fixes the next issue.

### J4 — Export (P0)
The developer downloads a JSON report with scope, evidence, AI advice (labelled), repairs, results and limitations, and no secrets.

### J5 — Read-only scan of a real page (P1)
The developer scans a permitted public page. Findings and explanations are shown; repair is not offered.

### J6 — Multi-Agent Intelligence & Coordination (P0)
1. On the Dashboard, the developer clicks **Run Multi-Agent Intelligence**.
2. The Coordinator Agent orchestrates 5 specialists (Scanner, Impact Analyzer, Real-User Simulator, Compliance Lawyer, Code Fixer).
3. The developer sees the synthesized triage decision and chronological activity stream.

### J7 — Lived Experience Assistive Audio Simulation (P0)
1. The developer navigates to the **Experience** page.
2. The developer inspects real-time navigation friction metrics (Stuck Points, Unlabeled Controls, Traversed Stops) and the speech synthesizer feed.
3. The developer selects an assistive profile (NVDA, TalkBack, JAWS) and plays speech announcements aloud using the browser's speech synthesizer.

### J8 — India Statutory Compliance & ROI Dashboard (P0)
1. The developer opens the **Dashboard** page and selects the **India Statutory Standards** tab.
2. The developer inspects violation mappings to the RPwD Act 2016, GIGW 3.0, and BIS IS 17802.
3. The developer switches to **Demographic Impact & Effort** to view affected assistive user cohorts and estimated remediation time.

### J9 — In-Editor Remediation via VS Code Extension (P0)
1. The developer opens an HTML or JSX/TSX component in VS Code.
2. The AccessPilot extension highlights accessibility issues in the editor and Problems pane with statutory citations.
3. The developer clicks a Code Action (Quick Fix) to add missing alt text, language attributes, or accessible labels.

## 5. User stories

| ID | Story | Priority | Acceptance |
|----|-------|----------|-----------|
| US-01 | As a developer, I can scan an authorised URL and inspect real findings | P0 | Findings show rule, impact, target, snippet, guidance link |
| US-02 | As a developer, I can see the keyboard focus path | P0 | Ordered stops, ≤ 30, with role/name approximation and repeat flags |
| US-03 | As a reviewer, I can tell what was tested and what needs manual review | P0 | Coverage panel on every result; no score or "compliant" wording |
| US-04 | As a developer, I can get an explanation and a drafted fix from an agent | P0 | Agent output labelled AI; deterministic fallback when unavailable |
| US-05 | As a developer, I can review a diff and approve or reject it | P0 | Nothing changes without explicit approval of that exact proposal |
| US-06 | As a developer, I can see whether the fix worked | P0 | Status comes from re-scan; resolved/remaining/new reconcile |
| US-07 | As a maintainer, I can export a JSON report without secrets | P0 | Report contains scope and limits; no tokens or page source |
| US-08 | As a reviewer, I can see the agent's confidence and when it needs a human | P1 | Confidence shown; < 0.5 marked needs human review |
| US-09 | As a maintainer, I can create a GitHub PR with evidence | P2 | — |
| US-10 | As an auditor, I can listen to simulated screen reader announcements and see navigation friction | P0 | Live audio announcement stream and friction metrics (stuck points, loop cycles) |
| US-11 | As a developer, I can run a multi-agent team for autonomous triage and specialist analysis | P0 | Coordinator orchestrates 5 specialists with activity timeline |
| US-12 | As a government or enterprise maintainer, I can view India statutory citations (RPwD, GIGW, IS 17802) | P0 | Direct statutory sections mapped per rule without false compliance claims |
| US-13 | As a developer, I can view accessibility diagnostics and quick fixes in VS Code | P0 | Packaged VSIX extension provides diagnostics, code actions, and status bar integration |
| US-14 | As a developer, I can roll back an applied patch to the previous working copy version | P0 | Workspace file snapshot restored via rollback API endpoint |

## 6. Features and functional requirements

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|----------|----------------------|
| FR-01 | Accept an http/https URL plus explicit authorisation consent | P0 | Missing consent → `consent_required`; bad scheme → `invalid_url` |
| FR-02 | Block private, link-local, reserved and metadata targets; allow loopback only as a development exception | P0 | Policy unit tests; redirect guard in the browser |
| FR-03 | Run axe-core in Playwright Chromium with WCAG 2.0/2.1/2.2 A/AA and best-practice tags | P0 | Golden Site returns the seeded findings |
| FR-04 | Normalise violations and incomplete results; count passes | P0 | Typed response matches API.md |
| FR-05 | Bounded keyboard walk (≤ 30 stops, ≤ 5 s) with repeated-focus detection | P0 | Golden Site shows the focus cycle in the chat widget |
| FR-06 | Clickable-but-not-focusable heuristic | P0 | Golden Site `div` button flagged as needs review |
| FR-07 | Results UI: summary, grouped findings, filters, details, loading and error states | P0 | Judge can inspect an issue without raw JSON |
| FR-08 | Coverage panel: methods, scanner version, tags, counts, "not tested" list, limitations | P0 | Present in UI and export; wording check passes |
| FR-09 | Remediation agent with bounded tools (list findings, get evidence, list templates, draft repair, mark needs human, submit report) | P0 | Max 8 turns, 14 tool calls, 90 s; trace of real steps |
| FR-10 | Deterministic fallback for explanations and proposals | P0 | Works with no key, provider outage, malformed output or budget overrun |
| FR-11 | Repair templates T1–T5 with a path allowlist | P0 | Unsupported finding → `needs_human`; disallowed path → `path_not_allowed` |
| FR-12 | Require explicit approval with a single-use token tied to the proposal | P0 | Apply without a valid token → `approval_required` |
| FR-13 | Apply only to an isolated working copy; never patch the original | P0 | Original demo files unchanged after any apply |
| FR-14 | Re-scan, compare fingerprints, run the control-page regression gate, derive the status | P0 | Bad patch → Failed; regression → Failed; good patch → Verified |
| FR-15 | JSON export | P0 | No approval tokens, keys or full page source |
| FR-16 | AccessPilot's own UI is keyboard-operable and passes a self-audit | P0 | `scripts/self_audit.py` reports 0 serious or critical findings |
| FR-17 | Bundle axe-core locally | P0 | Scan works with the network off |
| FR-18 | Trace with real durations in every scan and agent response | P0 | Entries match executed steps one to one |
| FR-19 | Replay mode with a persistent "Replay, not live" banner | P1 | Banner cannot be dismissed; export marked replay |
| FR-20 | HTML or print report | P1 | Same content as JSON |
| FR-21 | Live trace streaming (server-sent events) | P1 | Same entries as the response trace |
| FR-22 | Genuine Copilot usage record | P0 (process) | `docs/COPILOT_LOG.md` contains only real entries |
| FR-24 | Multi-page site: Home, How it works, Audit, Findings, Repairs, Report, Accessibility statement, Experience, and Dashboard with deep links, per-page titles, focus to the page heading and an announced route change | P0 (approved 20 Oct) | Every route loads directly and by navigation; self-audit covers every page in light and dark with 0 serious or critical findings |
| FR-23 | Visual evidence: page capture with barrier markers and a tab-order path; before/after element crops and accessible-name change in review and verification | P0 (added 20 Oct) | Markers open their finding; capture kept in memory only and absent from the export (test) |
| FR-25 | Multi-agent specialist team: Coordinator orchestrates Scanner, Impact Analyzer, Real-User Simulator, Compliance Lawyer, and Code Fixer | P0 | Bounded to 12 turns, 20 tool calls, 120 s; trace records specialist steps; fallback when offline/no key |
| FR-26 | Assistive simulation: NVDA/TalkBack/JAWS speech frame stream and navigation friction metrics (stuck points, loop cycles, unlabeled controls) with native Web Speech synthesis | P0 | Audio playback via Web Speech API; friction metrics match observed keyboard walk |
| FR-27 | India statutory compliance mapping: RPwD Act 2016 (Sections 42 & 46), GIGW 3.0, and BIS IS 17802 | P0 | Deterministic mapping per rule; Rule 6 wording check passes (no score, no false compliance claim) |
| FR-28 | Demographic barrier distribution and developer effort estimation | P0 | Counts across visual, motor, cognitive, aging groups; deterministic minutes estimate |
| FR-29 | Working copy versioning and rollback | P0 | File snapshot preserved before patch application; rollback endpoint reverts to previous version |
| FR-30 | IDE Integration: VS Code extension with real-time diagnostics, quick fixes, and dashboard sync | P0 | Packaged VSIX provides in-editor diagnostics, code actions, and status bar button |

## 7. Non-functional requirements

| ID | Area | Target | How measured |
|----|------|--------|--------------|
| NFR-01 | Scan time, local single page | ≤ 30 s p90 (observed about 1.2 s on the Golden Site) | `durationMs` over 10 runs |
| NFR-02 | Keyboard walk | ≤ 30 stops, ≤ 5 s | Trace |
| NFR-03 | Resource cleanup | Browser closed in `finally`; no leftover processes after 20 scans | Process count |
| NFR-04 | AI timeout and fallback | 20 s per call, 90 s per run; fallback shown | Outage test |
| NFR-05 | Setup | ≤ 15 min from README on a second machine | Stopwatch |
| NFR-06 | Export hygiene | No secrets or full page source | Automated test |
| NFR-07 | UI accessibility | Self-audit clean; keyboard-only flow passes | `self_audit.py` |
| NFR-08 | Offline | Core flow works with the network off and AI off | Airplane-mode rehearsal |
| NFR-09 | Portability | Windows first; Linux/macOS supported | README commands |

## 8. Pages and screens

AccessPilot is a multi-page site (FR-24). Session state (the current scan, agent runs, proposals and results) is shared by every page for the life of the browser tab. See DESIGN.md §11.

| Route | Page | Content |
|-------|------|---------|
| `/` | Home | The problem, how a fix is approved and proven, what AccessPilot will not do; real product captures only |
| `/how-it-works` | How it works | The four steps, what each result means, safety rules, agent abilities and limits, what is not tested, questions |
| `/audit` | Audit | Scan form, results header (finding, stages, figures), page view, agent timeline, next step |
| `/findings` | Findings | Filters, findings grouped by rule with evidence and guidance, keyboard focus path |
| `/repairs` | Repairs | Fixes waiting for review, review panel (element, why, editable wording, diff), verification with before/after, decided repairs table |
| `/experience` | Experience | Assistive profile selector (NVDA, TalkBack, JAWS), synthesized speech announcement feed with audio playback, navigation friction metrics (stuck points, loop cycles, unlabeled controls) |
| `/dashboard` | Dashboard | Multi-agent orchestration with Coordinator triage and specialist timeline, India statutory standards panel (RPwD, GIGW 3.0, IS 17802), demographic barrier reach and developer effort estimates |
| `/report` | Report | Results header, repair outcomes table, coverage and limitations, JSON export |
| `/accessibility` | Accessibility statement | Target, how it was tested, what to expect, known limitations, feedback |

Pages that need a scan show an empty state with a link to Audit until one exists.

## 9. Roles and permissions

✅ **Decision:** the MVP is a **local, single-user tool**. There are no accounts, login or roles.

| Actor | Can | Cannot |
|-------|-----|--------|
| Local user (acts as developer and reviewer) | Scan, run agent, propose, approve, apply to the demo copy, export | Apply changes to any site other than the bundled demo; bypass approval |
| Agent (model) | Read evidence, draft proposals, flag for human review, submit explanations | Apply changes, run commands, fetch URLs, set any status |
| Verifier | Decide repair status from re-scans | Use model output |

❓ **Decision needed (post-hackathon):** if AccessPilot is hosted, it needs authentication and roles (for example Owner and Reviewer) plus per-user scan ownership. This is out of MVP scope.

## 10. Data requirements

- **Scan:** id, URLs, title, timestamp, duration, status, scanner and version, findings, incomplete items, pass count, keyboard walk, coverage, trace, repairability, working-copy id, explanations.
- **Finding:** fingerprint, match key, source, rule, impact, description, help, help URL, tags, WCAG criteria, target, snippet (≤ 300 chars), failure summary, repair template, needs-human flag.
- **Repair proposal:** id, scan, finding, template, status, rationale, files, risk, diff, parameters, human-edit fields, single-use approval token, proposer.
- **Apply result:** status, reason, after-scan, working copy, comparison, control gate, approver and time.
- **Agent run:** AI used, model, fallback reason, explanations, proposals, needs-human list, trace.
- **Multi-agent intelligence run:** coordinator status, specialist activity stream (Scanner, Impact Analyzer, Real-User Simulator, Compliance Lawyer, Code Fixer), synthesis summary, chronological timeline.
- **Assistive simulation:** assistive profile (NVDA, TalkBack, JAWS), speech utterance log with spoken announcements, navigation friction metrics (stuck points, loop cycles, unlabeled controls, traversed stops).
- **India statutory mapping & demographic impact:** RPwD Act 2016 (Sections 42 & 46), GIGW 3.0, BIS IS 17802 statutory sections, affected user cohorts (visual, motor, cognitive, aging), estimated developer remediation time.
- **Workspace versioning:** snapshot history, version numbers, rollback targets.

✅ **Decision:** in-memory storage only for the MVP (see DATABASE.md). Nothing is persisted except temporary demo working copies. The page source is never stored, only bounded snippets.

## 11. Integrations

| Integration | Purpose | Required? |
|-------------|---------|-----------|
| Playwright + Chromium | Real-browser scanning and keyboard walk | Yes |
| axe-core 4.10.2 (vendored) | Automated rule engine | Yes |
| Web Speech API (`speechSynthesis`) | Spoken announcement audio emulation for NVDA/JAWS/TalkBack profiles | Yes |
| VS Code Extension API | IDE diagnostic markers, quick-fix code actions, and status bar synchronization | Yes |
| GitHub Models (OpenAI-compatible) | Default model for the agent | No — fallback exists |
| Azure OpenAI | Alternative model provider | No |
| GitHub Copilot | Development assistant (process, not runtime) | Yes for the event narrative |

✅ **Decision:** GitHub Models or Azure OpenAI instead of Gemini, to fit the Microsoft event.

## 12. Loading, empty and error states

| Situation | Behaviour |
|-----------|-----------|
| Scanning | Button reads "Scanning…", controls disabled, spinner plus status text; no fake step-by-step progress |
| Agent running | "Agent working…", status text |
| Applying | "Applying and re-testing…", status text |
| No findings | "No findings match these filters." (filter) or empty groups; coverage panel still shown |
| No keyboard stops | "No element received focus." |
| No model configured | Header chip and agent panel state that built-in guidance is used, and why |
| API unreachable | Alert: "Cannot reach the AccessPilot API. Is the backend running on port 8000?" |
| API error | Alert with message and code (e.g. `consent_required`) |
| Proposal not repairable | Status "Needs human review" with a reason; no Approve button |
| Repair failed | Failed status, reason, counts and control gate shown — never presented as success |

## 13. MVP scope

**In scope (P0/P1):** FR-01 to FR-18, FR-22 to FR-30; Multi-Agent Specialist System (Coordinator + 5 specialized agents), Lived Experience Assistive Audio Simulation, India Statutory Standards Dashboard (RPwD Act 2016, GIGW 3.0, BIS IS 17802), Demographic Barrier Reach & Remediation Effort, Workspace Snapshot Versioning & Rollback, VS Code IDE Extension (`accesspilot-vscode`), Golden Site (D01–D10), control page, templates T1–T5, JSON export, self-audit, setup and start scripts, tests.

**Golden Site defects:**

| ID | Defect | Detection | Repair |
|----|--------|-----------|--------|
| D01 | Email input without label | axe `label` | T1 |
| D02 | Image without alt | axe `image-alt` | T2 (human edits wording) |
| D03 | Low-contrast helper text | axe `color-contrast` | T3 |
| D04 | `<html>` without `lang` | axe `html-has-lang` | T4 |
| D05 | Icon-only button | axe `button-name` | T5 |
| D06 | "Click here" link | Not detected by axe | Manual |
| D07 | Clickable `div` | Keyboard heuristic | Needs human |
| D08 | Focus cycle in widget | Keyboard heuristic | Needs human |
| D09 | No `main` landmark | axe `landmark-one-main`, `region` | Needs human |
| D10 | Heading skip | axe `heading-order` | Needs human |

## 14. Out of scope

Statutory certifications or legal guarantees; exhaustive WCAG coverage or arbitrary numeric scores; overlays that inject fixes into third-party sites; editing arbitrary sites or production environments; multi-page web crawling; authenticated targets; accounts and hosted multi-tenant SaaS; GitHub PR creation; CI gates; SARIF/PDF generation; external OS screen reader binary process drivers (AccessPilot provides in-browser Web Speech API audio emulation); and claims that the focus list is equivalent to screen-reader output.

## 15. Success criteria

| Criterion | Target |
|-----------|--------|
| End-to-end demo | Scan → agent → approve → Verified, in about 3 minutes |
| Evidence | Every violation has rule ID and target |
| Honest status | No repair is shown as verified without a re-scan |
| Negative paths | Bad patch → Failed; regression → Failed (automated tests) |
| Offline | Works with the network off and AI off |
| Reliability | Three consecutive clean rehearsals |
| Self-audit | 0 serious or critical findings in AccessPilot's own UI |

Quote only measured numbers in the pitch.

## 16. Assumptions and open decisions

| # | Item | Type |
|---|------|------|
| 1 | Pre-event building is allowed | ✅ Confirmed by team |
| 2 | Stack: FastAPI + React/Vite/TypeScript | ✅ |
| 3 | Agent is P0; GitHub Models or Azure OpenAI | ✅ |
| 4 | Judges accept a local (not hosted) demo | 🔶 Assumption |
| 5 | A GitHub token with Models access will be available at the venue; otherwise the fallback is demonstrated | 🔶 Assumption |
| 6 | Which Copilot product the organisers expect (Copilot in VS Code vs Microsoft 365 Copilot) | ❓ Confirm with organisers |
| 7 | Whether to show the read-only scan of a real public page (J5) in the demo, and which page | ❓ Team decision |
| 8 | Authentication for any hosted version | ❓ Post-hackathon |
