# AccessPilot — Implementation Plan

Based on `docs/PRD.md`, `DESIGN.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md` and `AGENTS.md`. Today is **20 Oct 2026**; the event is **22 Oct, 9:00–17:00**.

Status: ✅ done and verified · 🔜 next · ⏳ later · ⛔ post-hackathon

| Phase | Name | Status |
|-------|------|--------|
| 0 | Foundations and setup | ✅ |
| 1 | Golden Site and control page | ✅ |
| 2 | Deterministic scan core | ✅ |
| 3 | Results UI | ✅ |
| 4 | Fixer and verifier | ✅ |
| 5 | Remediation agent | ✅ (fake-model tested; live model not yet run) |
| 6 | Self-audit and hardening | ✅ |
| 7 | Baseline commit and live-model verification | 🔜 |
| 8 | NFR measurement and reliability | 🔜 |
| 9 | Demo readiness | 🔜 |
| 10 | P1 features (only if 7–9 are green) | ⏳ |
| 11 | P2 roadmap | ⛔ |

---

## Phase 0 — Foundations ✅
- **Goal:** runnable skeleton on Windows.
- **Tasks:** git init; Python venv with pinned requirements; Chromium; vendored axe-core 4.10.2; Vite + React + TS; `.env.example`; `.gitignore`; `scripts/setup.ps1`, `scripts/start.ps1`.
- **Files:** `backend/requirements.txt`, `backend/vendor/axe.min.js`, `frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `scripts/*`.
- **Done when:** `GET /api/health` returns `axeBundled: true`. ✔

## Phase 1 — Golden Site and control page ✅
- **Goal:** reproducible test target with seeded defects D01–D10 and a clean control page sharing the stylesheet.
- **Files:** `demo/demo.html`, `demo/demo.css`, `demo/control.html`, `demo/campus.svg`.
- **Done when:** the first scan detects every defect PRD §13 expects (D06 manual); control page has 0 serious/critical. ✔

## Phase 2 — Deterministic scan core ✅
- **Goal:** FR-01–FR-06, FR-08, FR-17, FR-18.
- **Modules:** `policy.py`, `scanner.py`, `keyboard.py`, `coverage.py`, `fingerprint.py`, `models.py`, `store.py`, `errors.py`, `main.py`.
- **API:** `GET /api/health`, `POST /api/scan`, `GET /api/scans/{id}`.
- **Tests:** policy (scheme, private, metadata, consent, loopback flag), fingerprint, WCAG parsing, Golden Site and control-page integration.
- **Done when:** a scan returns normalised findings, keyboard path and trace. ✔ (about 1.2 s)

## Phase 3 — Results UI ✅
- **Goal:** FR-07 and DESIGN.md screens.
- **Files:** `frontend/src/App.tsx`, `components.tsx`, `api.ts`, `types.ts`, `styles.css`.
- **Done when:** a judge can scan and inspect evidence without raw JSON; dark mode works; filters work. ✔

## Phase 4 — Fixer and verifier ✅
- **Goal:** FR-11–FR-14.
- **Modules:** `fixer/templates.py` (T1–T5), `fixer/workspace.py`, `fixer/service.py`, `verifier.py`.
- **API:** `POST /api/repair/propose`, `POST /api/repair/apply`, `POST /api/scan/compare`, `GET /api/repair/templates`.
- **Tests:** approval required, single-use token, unsupported → needs_human, allowlist, original refused, bad patch → Failed, regression gate → Failed, count reconciliation.
- **Done when:** D01–D03 reach Verified via the API. ✔ (D04, D05 also)

## Phase 5 — Remediation agent ✅
- **Goal:** FR-09, FR-10.
- **Modules:** `agent/llm.py`, `agent/tools.py`, `agent/runner.py`, `agent/fallback.py`.
- **API:** `POST /api/agent/run`.
- **Tests:** scripted fake client — tool loop, injected tool names refused, bad args, low confidence, outage, never submits, no credentials.
- **Done when:** fallback path works end to end in the UI. ✔ The live-model path is verified in Phase 7.

## Phase 6 — Self-audit and hardening ✅
- **Goal:** FR-15, FR-16, NFR-06, NFR-07.
- **Files:** `scripts/self_audit.py`, `frontend/scripts/check-wording.mjs`, `GET /api/reports/{id}`.
- **Done when:** keyboard-only journey completes; 0 axe findings in four UI states; export has no tokens; 35 tests pass. ✔

---

## Phase 7 — Baseline commit and live-model verification 🔜

**Goal:** a safe restore point, and proof that the real agent path works with GitHub Models.

| # | Task | Files | Done when |
|---|------|-------|-----------|
| 7.1 | Review all generated code as a team (each member reads one area) | — | Each area owner can explain their modules |
| 7.2 | First commit on `main`, then work on branches | git | `git log` shows baseline; `.env` not tracked |
| 7.3 | Create a fine-grained GitHub token with *Models: read*; add to `backend/.env` | `backend/.env` (local only) | `/api/health` shows `configured: true` |
| 7.4 | Run the agent on the Golden Site; check the trace shows `llm_turn_*` and `tool:*` steps; review the AI alt-text proposal and apply it | — | Verified result with `proposedBy: ai` |
| 7.5 | Prompt tuning only if 7.4 shows problems (skipped findings, generic alt text) | `agent/runner.py` (SYSTEM) | Fake-client tests still pass |
| 7.6 | Add an opt-in live test (`@pytest.mark.live`, skipped without a token) | `backend/tests/test_live_agent.py`, `pytest.ini` | Passes locally with a token; skipped otherwise |
| 7.7 | Log the Copilot usage from this phase | `docs/COPILOT_LOG.md` | Real entries only |

- **Prerequisites:** none.
- **DB/API changes:** none.
- **Tests:** existing suite plus 7.6.

## Phase 8 — NFR measurement and reliability 🔜

**Goal:** measured numbers for the pitch and confidence the demo will not break.

| # | Task | Done when |
|---|------|-----------|
| 8.1 | NFR-01: scan the Golden Site 10 times; record p50/p90 `durationMs` in README | Numbers recorded |
| 8.2 | NFR-03: after 20 scans, no leftover `chrome-headless-shell` processes | Checked and recorded |
| 8.3 | NFR-04: block the network to the provider; agent falls back within budget | Fallback reason shown |
| 8.4 | NFR-05: a teammate sets up from README on a second laptop; time it | ≤ 15 min, or README fixed |
| 8.5 | NFR-08: airplane mode — full scan → repair → verify works | Pass recorded |
| 8.6 | Responsive check at 320, 768 and 1366 px; dark mode; 200% zoom | No horizontal page scroll; readable |
| 8.7 | Fix any defects found (Feature/Debug prompts) | Tests added for each fix |

- **Files likely affected:** `README.md`; fixes only where defects appear.
- **DB/API changes:** none.

## Phase 9 — Demo readiness 🔜

**Goal:** a three-minute live demo that survives questions.

| # | Task | Done when |
|---|------|-----------|
| 9.1 | Write the demo script: barrier story → scan → keyboard path → agent → review AI alt text → approve → Verified → show a Failed example (explain the regression gate) → coverage panel | Script in `docs/DEMO.md` |
| 9.2 | Slides: problem, principle, architecture diagram (ARCHITECTURE.md §3), measured numbers, limits, Copilot usage | Deck ready |
| 9.3 | Q&A prep: "how is this different?", "can the AI break things?", "is this WCAG compliance?", "what about real sites?" | Answers in `docs/DEMO.md` |
| 9.4 | Three consecutive clean rehearsals; record a backup video | Video saved locally |
| 9.5 | Event-day checklist: clean start, health check, token present, ports free, browser zoom | Checklist in `docs/DEMO.md` |
| 9.6 | ❓ Decide whether to show J5 (read-only scan of a real permitted page) and which page | Decision recorded |

## Phase 10 — P1 features ⏳ (only if Phases 7–9 are green)

Build in this order; each is independent and shippable.

| # | Feature | PRD | Files | API/DB | Tests | Done when |
|---|---------|-----|-------|--------|-------|-----------|
| 10.1 | Replay mode with a persistent "Replay, not live" banner | FR-19 | `main.py`, `App.tsx`, `components.tsx`, `scripts/` (capture) | `replay: true` in export; load-from-file endpoint or static JSON | Banner cannot be dismissed; export marked | Demo works from a saved scan with no browser |
| 10.2 | HTML or print report | FR-20 | new `report_html.py` or print CSS in `styles.css` | `GET /api/reports/{id}?format=html` | Same content as JSON; self-audit on report | Prints cleanly |
| 10.3 | SSE trace stream | FR-21 | `scanner.py` (callback), `main.py`, `App.tsx` | `GET /api/scans/{id}/events` | Entries equal response trace | Live steps visible during scan |
| 10.4 | Agent confidence surfaced in the proposals list | US-08 | `App.tsx` | none | UI check | Low-confidence items flagged |

## Phase 11 — P2 roadmap ⛔
Same-origin crawl (≤ 10 pages); SQLite scan history (DATABASE.md §4); repository intake and GitHub PR creation; CI/SARIF; MCP server; criterion catalogue and GIGW/IS 17802 mapping (specialist-reviewed); authentication and hosting (ARCHITECTURE.md §14); real screen-reader driver.

---

## Recommended first task

**Phase 7.2 + 7.3 + 7.4:** commit the baseline, add a GitHub Models token to `backend/.env`, and run the agent on the Golden Site through the UI. The live AI path is the only P0 path not yet exercised against a real model, and it is the centre of the "agentic" story for judges. Do it in VS Code with Copilot Chat open, and log the session in `docs/COPILOT_LOG.md`.
