# AccessPilot — Workspace Context & Status Dossier

> **File:** `workspace.md`  
> **Last Updated:** 21 October 2026  
> **Workspace Root:** `c:\Users\JATIN\Desktop\Projects\AccessPilot`  
> **Event Target:** Microsoft Agentic AI Hackathon (RUVERSE TechFest 2026, 22 Oct 2026)  
> **Problem Statement:** Automated Accessibility Checker  
> **Core Principle:** Deterministic evidence first; AI suggestions second; human approval before changes; deterministic re-test decides verification.

---

## 1. Project Overview & Value Proposition

AccessPilot is an **agentic accessibility auditor and verified fixer**. Rather than simply listing technical violations or presenting misleading "compliance scores", AccessPilot:
1. **Captures Behavioral Evidence**: Combines static rule engine checks (axe-core 4.10.2) with a real browser keyboard walk (Playwright Chromium, $\le 30$ stops, $\le 5$ s) to observe how keyboard-only and screen-reader users navigate the page.
2. **Bounds AI Assistance**: Employs an agent running against GitHub Models or Azure OpenAI (or an offline deterministic fallback) strictly for plain-language explanations and drafting repair proposals. The agent **never** executes code, writes files, or decides pass/fail.
3. **Enforces Human-in-the-Loop Approval**: Every proposed patch is presented as a diff with editable wording (e.g., alt text) and requires an explicit human click and a cryptographic single-use approval token.
4. **Performs Isolated Verification & Regression Gating**: Patches are applied strictly to ephemeral working copies on disk (`tempfile.mkdtemp`). AccessPilot re-scans the repaired copy with the same test suite and runs a control-page gate (`control.html`) to ensure the patch resolved the target issue without introducing any new serious or critical regressions.
5. **Maintains Honest Coverage**: Forbids scores, percentages, or "100% compliant" claims. Explicitly categorizes what was tested, what was skipped, and what requires human evaluation.

---

## 2. Source of Truth & Governance

All work in this repository is strictly bound by a documented precedence chain:

$$\text{docs/PRD.md} \longrightarrow \text{docs/DESIGN.md} \longrightarrow \text{docs/ARCHITECTURE.md} \longrightarrow \text{docs/DATABASE.md} \longrightarrow \text{docs/API.md} \longrightarrow \text{AGENTS.md}$$

### Non-Negotiable Hard Rules (`AGENTS.md`)
- **Model-Free Verifier:** `backend/app/verifier.py` must **never** import `app.agent`, `openai`, or any AI code. Verification status is strictly derived from deterministic automated re-scans.
- **Isolated Fixer & Path Allowlist:** Patches modify only `demo.html` and `demo.css` inside isolated working copies. `demo/` is never modified at runtime.
- **No Auto-Approve:** `/api/repair/apply` requires `approved: true` and the proposal's single-use `approvalToken`.
- **Untrusted Page Data:** Page content (HTML snippets, alt text, titles) is passed to the LLM only via tool outputs flagged as untrusted data—never injected directly into system prompts.
- **Agent Boundaries:** Agent tools can only inspect findings, fetch evidence, list templates, draft proposals, and flag for human review. They cannot apply changes, run commands, or set statuses.
- **Zero Compliance Theatre:** No scores, percentages, or claims like "compliant" or "WCAG certified" (`npm run check:wording` actively enforces this).
- **Offline / Local-First:** All core features (Playwright, vendored axe-core, deterministic fallback) run without internet access or API keys.

---

## 3. System Architecture & Tech Stack

```
┌────────────────────────────────┐   HTTP / REST (/api/*)   ┌────────────────────────────────────────────────────────┐
│ React 18 + TS UI (Vite Build)  │ ───────────────────────▶ │ FastAPI Backend (app/main.py on :8000)                │
│ History Router · Shared Session│ ◀─────────────────────── │  Endpoints · Static Mounts · Error Handling            │
└────────────────────────────────┘                          └──┬───────────┬────────────┬───────────┬───────────────┘
                                                               │           │            │           │
                                                   ┌───────────▼──┐  ┌─────▼──────┐ ┌───▼───────┐  ┌▼──────────────┐
                                                   │ policy.py    │  │ scanner.py │ │ agent/    │  │ fixer/        │
                                                   │ Scheme, SSRF,│  │ Playwright │ │ runner    │  │ templates T1-5│
                                                   │ Consent, DNS │  │ axe-core   │ │ tools     │  │ workspace     │
                                                   └──────────────┘  │ keyboard   │ │ fallback  │  │ service       │
                                                                     │ coverage   │ └───────────┘  └──────┬────────┘
                                                                     └─────▲──────┘                       │ approved
                                                                           │                    ┌─────────▼─────┐
                                                                           └────────────────────│ verifier.py   │
                                                                            re-scan copy + gate │ (no model)    │
                                                                                                └───────────────┘
                                                         store.py (in-memory)  ·  models.py  ·  fingerprint.py
```

### Technology Breakdown
- **Backend:** Python 3.12+ (tested on 3.13), FastAPI 0.115, Pydantic 2.10, Uvicorn 0.34.
- **Browser Automation:** Playwright 1.49 (Python **synchronous API running in `fastapi.concurrency.run_in_threadpool`** to prevent Windows asyncio subprocess deadlocks under Uvicorn).
- **Accessibility Engine:** Vendored axe-core 4.10.2 (`backend/vendor/axe.min.js`).
- **AI Integration:** OpenAI Python SDK 1.58 targeting GitHub Models (`https://models.github.ai/inference`, `openai/gpt-4.1-mini`) or Azure OpenAI, with deterministic offline fallback (`agent/fallback.py`).
- **Frontend:** React 18.3, TypeScript 5.6, Vite 5.4, Vanilla CSS design token system (Achromatic Ledger theme, Light/Dark mode).
- **Routing & State:** Zero-dependency History API router (`router.tsx`) supporting 7 routes with accessible live announcements, and an in-memory session context (`session.tsx`).
- **Database / Persistence:** MVP is in-memory (`backend/app/store.py`). Temporary working copies live in OS temp directories. Page source code is never permanently persisted.

---

## 4. Golden Site & Repair Templates

The test fixture lives in `demo/demo.html`, `demo/demo.css`, and `demo/control.html`. It simulates a college scholarship portal with 10 seeded defects:

| Defect ID | Description | Detection Engine | Remediation Template |
|-----------|-------------|------------------|----------------------|
| **D01** | Missing `<label>` for `#email` | axe-core (`label`) | **T1**: Injects `<label for="email">{labelText}</label>` |
| **D02** | Hero image missing `alt` | axe-core (`image-alt`) | **T2**: Adds `alt="{altText}"` (requires human review) |
| **D03** | Low contrast on `.helper` text | axe-core (`color-contrast`) | **T3**: Darkens color from `#b4b4b4` to `#57606a` in CSS |
| **D04** | Missing `lang` on `<html>` | axe-core (`html-has-lang`) | **T4**: Injects `<html lang="{lang}">` |
| **D05** | Icon-only button (`#help-btn`) | axe-core (`button-name`) | **T5**: Adds `aria-label="{ariaLabel}"` |
| **D06** | "Click here" vague link | Manual heuristic | Needs human intervention |
| **D07** | Clickable `div` submit button | Keyboard heuristic (`clickable-not-focusable`) | Needs human intervention |
| **D08** | Focus trap cycling in chat widget | Keyboard walk (`repeated_focus_cycle`) | Needs human intervention |
| **D09** | Missing `<main>` landmark | axe-core (`landmark-one-main`) | Needs human intervention |
| **D10** | Heading skip (`h1` to `h4`) | axe-core (`heading-order`) | Needs human intervention |

---

## 5. Repository File Map

```
AccessPilot/
├── AGENTS.md                          # Mandatory agent & contributor engineering rules
├── README.md                          # Public documentation, quickstart & defect catalog
├── skills-lock.json                   # Skill lockfile for design-taste-frontend
├── .agents/skills/                    # Local skill definitions (design-taste-frontend v2)
├── .github/
│   └── copilot-instructions.md        # Copilot prompt instructions pointing to AGENTS.md
├── backend/
│   ├── requirements.txt               # Pinned dependencies (FastAPI, Playwright, pydantic, openai, pytest)
│   ├── pytest.ini                     # Pytest configuration
│   ├── .env.example                   # Environment configuration template
│   ├── vendor/axe.min.js              # Bundled offline axe-core 4.10.2
│   ├── app/
│   │   ├── main.py                    # FastAPI entrypoint, route handlers, error handling, static mounts
│   │   ├── config.py                  # Environment vars, operational limits, timeouts, model config
│   │   ├── models.py                  # Pydantic schemas (mirrored in frontend types.ts)
│   │   ├── policy.py                  # URL validation, SSRF defense, loopback guard, consent check
│   │   ├── scanner.py                 # Playwright orchestration, axe injection, screenshots, normalization
│   │   ├── keyboard.py                # Bounded Tab-walk traversal & focus trap/heuristic detection
│   │   ├── coverage.py                # Rule coverage calculation, limitation disclosures
│   │   ├── fingerprint.py             # Stable finding hashing (`rule|target|hash`)
│   │   ├── store.py                   # In-memory dictionary stores (scans, proposals, results, runs)
│   │   ├── verifier.py                # Deterministic re-scan engine & control-page regression gate
│   │   ├── errors.py                  # Standardized APIError domain model
│   │   ├── agent/
│   │   │   ├── llm.py                 # OpenAI / Azure / GitHub Models client factory
│   │   │   ├── tools.py               # Bounded tool definitions for LLM (6 inspection tools)
│   │   │   ├── runner.py              # LLM tool loop execution engine (turns <= 8, tools <= 14)
│   │   │   └── fallback.py            # Offline deterministic template & explanation generator
│   │   └── fixer/
│   │       ├── templates.py           # Catalog of exact find/replace templates (T1-T5)
│   │       ├── workspace.py           # Disk workspace generator, allowlisted diff & patch engine
│   │       └── service.py             # Propose & apply workflows, token generation & verification
│   └── tests/
│       ├── conftest.py                # Pytest fixtures and test environment setup
│       ├── test_unit.py               # Unit tests (policy, fingerprint, templates, models)
│       ├── test_agent.py              # Mocked & scripted fake-client LLM agent tests
│       └── test_integration.py       # Live browser integration tests against running test server
├── demo/                              # Fixture test site (NEVER modified at runtime)
│   ├── demo.html                      # Golden Site with defects D01–D10
│   ├── demo.css                       # Golden Site styles (including contrast defect)
│   ├── control.html                   # Clean control page for regression testing
│   └── campus.svg                     # Hero image asset
├── docs/                              # Comprehensive project documentation
│   ├── PRD.md                         # Product Requirements Document (V3.0)
│   ├── DESIGN.md                      # UI/UX design tokens, components, layout specs
│   ├── ARCHITECTURE.md                # System component interactions & operational bounds
│   ├── DATABASE.md                    # Data structures (in-memory & future SQLite schema)
│   ├── API.md                         # Detailed API contract specification
│   ├── IMPLEMENTATION_PLAN.md         # Phased roadmap, verification milestones & status
│   ├── PROMPT_PLAYBOOK.md             # Standardized prompts 8–20 for AI-assisted development
│   └── COPILOT_LOG.md                 # Real-time log of AI assistance & human reviews
├── frontend/
│   ├── package.json                   # React, Vite, TypeScript dependencies
│   ├── vite.config.ts                 # Vite setup with `/api` proxy to port 8000
│   ├── tsconfig.json                  # Strict TypeScript configuration
│   ├── index.html                     # Entry HTML with early theme script & accessible root
│   ├── public/
│   │   ├── fonts/                     # Self-hosted Stack Sans OFL fonts
│   │   └── shots/                     # Static captures and credited photo assets
│   ├── scripts/
│   │   └── check-wording.mjs          # AST/regex lint check ensuring no score or compliance claims
│   └── src/
│       ├── main.tsx                   # React root mount
│       ├── App.tsx                    # Top-level shell, header, theme switch, router outlet
│       ├── router.tsx                 # Zero-dependency History API router with live announcement
│       ├── session.tsx                # Context provider for scan state, events, proposals, results
│       ├── theme.tsx                  # Light / Dark theme toggling logic
│       ├── api.ts                     # Strict Fetch client mapping backend endpoints
│       ├── types.ts                   # TypeScript interfaces matching backend models.py
│       ├── styles.css                 # Comprehensive CSS design tokens and component styling
│       ├── components.tsx             # Badges, Summary, Diff viewer, Cards, Buttons, Banners
│       ├── icons.tsx                  # SVG outline icon collection
│       ├── evidence.tsx               # Screenshot viewer with barrier markers & tab order overlay
│       ├── timeline.tsx               # Agent execution trace & session event timeline
│       ├── data/demo.json             # Seeded snapshot of golden scan data for landing display
│       └── pages/
│           ├── HomePage.tsx           # Product overview, value prop, proof of verification
│           ├── HowPage.tsx            # Explanation of the 4 steps, safety rules, limitations
│           ├── AuditPage.tsx          # Scan form, page view, timeline, next step recommendations
│           ├── FindingsPage.tsx       # Grouped violation inspection, keyboard walk trace
│           ├── RepairsPage.tsx        # Proposal review, editable wording, diff, verification result
│           ├── ReportPage.tsx         # Executive summary, outcomes table, JSON export
│           ├── A11yPage.tsx           # AccessPilot's own accessibility statement
│           └── shared.tsx             # Shared page headers, stat summary bars, breadcrumbs
└── scripts/
    ├── setup.ps1                      # Windows environment setup (venv, npm, playwright install)
    ├── start.ps1                      # Launch script for single-process server (:8000)
    ├── self_audit.py                  # Playwright + axe-core keyboard-only self-audit of UI
    ├── ui_snapshot.py                 # Automated UI snapshot taker for visual linting
    └── site_shots.py                  # Generates demo data and captures for HomePage
```

---

## 6. Implementation Status & Progress Audit

| Phase | Milestone | Scope | Verified Status |
|:-----:|:----------|:------|:---------------:|
| **0** | Foundations & Setup | Python venv, axe-core vendoring, Vite React TS, scripts | ✅ **Done** |
| **1** | Golden Site & Control | `demo/demo.html`, `demo.css`, `control.html` with D01–D10 | ✅ **Done** |
| **2** | Deterministic Scan Core | Policy, Playwright scanner, axe injection, keyboard walk | ✅ **Done** |
| **3** | Results UI | 7 pages, router, dark/light themes, evidence overlays | ✅ **Done** |
| **4** | Fixer & Verifier | Templates T1–T5, workspace cloning, control gate | ✅ **Done** |
| **5** | Remediation Agent | Tool loop, agent runner, fallback engine, fake-client tests | ✅ **Done** |
| **6** | Hardening & Self-Audit | 37 tests passing, `self_audit.py` 0 severe axe issues, wording check passed | ✅ **Done** |
| **7** | Baseline Commit & Live Model | Initial git commit, GitHub Models live verification (`.env`) | 🔜 **Current Stage** |
| **8** | NFR & Reliability | Performance benchmarks, process leak checks, offline mode verification | 🔜 **Next** |
| **9** | Demo Readiness | Demo script (`docs/DEMO.md`), rehearsal, pitch deck | 🔜 **Next** |
| **10**| P1 Enhancements | Replay mode (FR-19), HTML print report (FR-20), SSE stream (FR-21) | ⏳ **Optional / Buffer** |

### Test Verification Summary (21 Oct 2026)
- **Backend Tests:** `pytest -q` ran 37 tests in 25.08 seconds $\longrightarrow$ **37 passed (100%)**.
- **UI Wording Audit:** `npm run check:wording` $\longrightarrow$ **Passed (0 compliance/score claims found)**.
- **Frontend Build:** `tsc -b && vite build` $\longrightarrow$ **Passed cleanly (bundle optimized to 218kB)**.
- **UI Experience:** Streamlined all pages to an action-first minimal layout: removed editorial/marketing copy, replaced with visual metric chips, interactive keyboard path visualizer, concise findings table, patch diff viewer, and latency charts.

---

## 7. Operational Workflows & Commands

### Setup & Run
```powershell
# Initial machine setup (creates .venv, installs wheels, downloads Chromium, builds frontend)
.\scripts\setup.ps1

# Launch the unified server on http://127.0.0.1:8000/
.\scripts\start.ps1

# Frontend development mode with live hot reloading (proxies /api to :8000)
cd frontend
npm run dev
```

### Validation & Test Commands
```powershell
# Run backend test suite (unit, agent fake-client, live browser integration)
cd backend
.\.venv\Scripts\python -m pytest -q

# Run frontend checks
cd frontend
npm run check:wording
npm run build

# Run keyboard-only self-audit against running UI (:8000)
backend\.venv\Scripts\python scripts\self_audit.py
backend\.venv\Scripts\python scripts\self_audit.py --theme dark
```

---

## 8. Immediate Action Items (Next Steps)

1. **Phase 7.2 (Git Baseline Commit):**
   - Stage all core files and commit the initial clean baseline on `master` or `main`.
   - Ensure `backend/.env` remains untracked.
2. **Phase 7.3 & 7.4 (Live Model Test):**
   - Provide a fine-grained GitHub Personal Access Token with *Models: read* permissions in `backend/.env` as `GITHUB_TOKEN=...`.
   - Perform a live agent scan on the Golden Site (`http://127.0.0.1:8000/demo/demo.html`) through the UI.
   - Verify `llm_turn_*` and `tool:*` steps populate in the trace, and test the AI-generated alt text for D02.
3. **Phase 7.6 & 7.7:**
   - Add the live opt-in agent test (`backend/tests/test_live_agent.py` marked `@pytest.mark.live`).
   - Log the live session truthfully in `docs/COPILOT_LOG.md`.
4. **Phase 8 & 9:**
   - Execute NFR benchmark runs (10 scan duration averages, process cleanup check).
   - Prepare demo presentation notes and rehearsed flows for the hackathon presentation.
