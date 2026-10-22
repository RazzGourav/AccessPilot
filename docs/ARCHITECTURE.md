# AccessPilot — Architecture

How AccessPilot is built. Product scope: `PRD.md`. Visual rules: `DESIGN.md`. Data: `DATABASE.md`. Contracts: `API.md`.

## 1. Guiding choices

- **One process, one machine.** A single FastAPI process serves the API, the built UI, the Golden Site and its working copies on `127.0.0.1:8000`. There are no microservices, queues or containers in the MVP.
- **Deterministic core, optional model.** Scanning, repair and verification never depend on an AI provider.
- **The verifier is model-free.** `verifier.py` must not import any agent or model code.
- **Bounded everything.** Time, steps, snippet sizes, tool calls and patchable files all have explicit limits.

## 2. Tech stack

| Layer | Choice | Reason |
|-------|--------|--------|
| API | Python 3.12+ (3.13 tested), FastAPI 0.115, Pydantic 2.10, Uvicorn 0.34 | Typed request/response schemas; fast to build; team familiarity |
| Browser automation | Playwright 1.49 (Python, **sync API in a threadpool**), Chromium headless shell | Real browser; reliable keyboard events. The sync API avoids the Windows event-loop problem where async Playwright cannot spawn a subprocess under Uvicorn |
| Rule engine | axe-core 4.10.2, vendored as `backend/vendor/axe.min.js` | Industry-standard rules; works offline (no CDN) |
| AI client | `openai` 1.58 SDK against GitHub Models (`https://models.github.ai/inference`) or Azure OpenAI | One OpenAI-compatible adapter covers both Microsoft-ecosystem providers |
| Config | `python-dotenv`, environment variables | Secrets stay server-side |
| Frontend | React 18.3, TypeScript 5.6, Vite 5.4, plain CSS with tokens | Small bundle; no UI library needed; full control over accessibility |
| Tests | pytest 8, httpx; Playwright for the self-audit | Unit + live-browser integration in one runner |
| Storage | In-memory dictionaries; temp directories for working copies | No database needed for a single-session demo (see DATABASE.md) |

Deliberately **not** used: a database server, an ORM, Redux or other state libraries, CSS frameworks, component libraries, LangChain or agent frameworks, Docker, and a task queue.

## 3. Components

```
┌──────────────────────┐   HTTP/JSON (/api/*)   ┌───────────────────────────────────────────────┐
│ React UI (Vite build)│ ─────────────────────▶ │ FastAPI  app/main.py                           │
│ App.tsx, components  │ ◀───────────────────── │  error handler · request models · static mounts│
└──────────────────────┘                        └──┬──────────┬───────────┬──────────┬─────────┘
                                                   │          │           │          │
                                       ┌───────────▼───┐ ┌────▼──────┐ ┌──▼───────┐ ┌▼──────────────┐
                                       │ policy.py     │ │ scanner.py│ │ agent/   │ │ fixer/        │
                                       │ consent, URL, │ │ Playwright│ │ runner   │ │ templates T1–5│
                                       │ host checks   │ │ axe, norm.│ │ tools    │ │ workspace     │
                                       └───────────────┘ │ keyboard  │ │ llm      │ │ service       │
                                                         │ coverage  │ │ fallback │ └──────┬────────┘
                                                         └─────▲─────┘ └──────────┘        │ approved only
                                                               │                    ┌──────▼────────┐
                                                               └────────────────────│ verifier.py   │
                                                                re-scan copy+control│ (no model)    │
                                                                                    └───────────────┘
                                         store.py (in-memory)  ·  fingerprint.py  ·  models.py
```

| Module | Responsibility |
|--------|----------------|
| `main.py` | Routes, error shape, threadpool dispatch, static mounts (`/demo`, `/ws/{id}/{file}`, `/`) |
| `models.py` | All Pydantic contracts; mirrored by `frontend/src/types.ts` |
| `policy.py` | Consent; scheme; DNS resolution; block private, link-local, reserved and multicast addresses; loopback dev exception; navigation guard |
| `scanner.py` | Launch browser → route guard → load → inject axe → run → normalise → keyboard walk → build Scan; always closes the browser |
| `keyboard.py` | Tab walk with repeat detection; clickable-not-focusable heuristic |
| `scanner._capture` | After the checks: grow the viewport to the page height, locate every finding and focus stop, take one JPEG (in memory) |
| `coverage.py` | Coverage panel content, "not tested" list, limitations |
| `fingerprint.py` | `rule|target|hash` fingerprint and `rule|target` match key |
| `fixer/templates.py` | Template catalogue: rule + target pattern, exact find/replace, validated and escaped parameters |
| `fixer/workspace.py` | Working-copy registry, path allowlist, diff rendering, apply |
| `fixer/service.py` | Propose / apply workflow, approval-token check |
| `verifier.py` | Copy → apply → re-scan → compare → control gate → status |
| `agent/llm.py` | Provider selection (Azure > GitHub Models > none) |
| `agent/tools.py` | Six tools; the only interface between model and system |
| `agent/runner.py` | Bounded loop, trace, validation, fallback, run_multi export |
| `agent/prompts.py` | Role definitions and prompts for Coordinator and 5 specialists |
| `agent/specialists.py` | Specialist worker implementations (Scanner, Impact, Simulator, Compliance, Fixer) |
| `agent/coordinator.py` | Multi-agent orchestration loop and synthesis |
| `agent/fallback.py` | Deterministic explanations and proposals |
| `compliance/india.py` | Statutory mappings for RPwD Act 2016, GIGW 3.0, and IS 17802 |
| `impact.py` | Demographic barrier reach and developer remediation effort calculation |
| `ux_simulator.py` | Assistive technology speech emulation and navigation friction metrics |
| `store.py` | In-memory scans, proposals, results, agent runs, multi-agent runs |

## 4. Data flow

**Scan:** UI → `POST /api/scan` → `policy.check_request` → `workspace.resolve_target` (is this the bundled demo?) → `scanner.run_scan` in a thread → Scan stored → response.

**Agent:** UI → `POST /api/agent/run` → `runner.run` → model call with tool schemas → tool calls run against the stored scan → proposals created through `service.propose` → `submit_report` → explanations attached to the scan. On any failure → `fallback.run`.

**Repair:** UI → `POST /api/repair/propose` → template matched → diff preview against the scan's working copy → proposal with a single-use token. UI → `POST /api/repair/apply` with the token → `verifier.verify`: new copy of the source version → apply → scan copy → compare with the before-scan → scan the control page in source and copy → status.

**Pages:** `router.tsx` is a dependency-free History-API router; `session.tsx` holds the session state and actions in one React context shared by every page; `main.py` serves `index.html` for the seven site routes (`SITE_PAGES`).

**Timeline:** the UI keeps a client-side list of session events (scan, agent run, repair result, continue) and renders the agent timeline from their traces. Agent tool trace entries carry a short, page-content-free summary (`rule|target`, template, counts) produced by `ToolBox.describe`.

**Status rules (verifier):**

| Condition | Status |
|-----------|--------|
| Patch did not apply (find string not exactly once) | Failed |
| Target key still present after re-scan | Failed |
| A new serious or critical finding on the page, or a new one on the control page | Failed |
| Target gone; new moderate or minor findings only | Partially verified |
| Target gone; nothing new | Verified by automated re-test |
| No template / not the demo | Needs human review (at propose time) |

## 5. Folder structure

```
AccessPilot/
├─ AGENTS.md                      coding-agent rules
├─ README.md
├─ .github/copilot-instructions.md  short pointer to AGENTS.md rules
├─ docs/  PRD.md · DESIGN.md · ARCHITECTURE.md · DATABASE.md · API.md · IMPLEMENTATION_PLAN.md · PROMPT_PLAYBOOK.md · COPILOT_LOG.md
├─ backend/
│  ├─ app/  main.py config.py errors.py models.py policy.py scanner.py keyboard.py coverage.py
│  │        fingerprint.py verifier.py store.py
│  │        agent/  llm.py tools.py runner.py fallback.py
│  │        fixer/  templates.py workspace.py service.py
│  ├─ vendor/axe.min.js
│  ├─ tests/  conftest.py test_unit.py test_agent.py test_integration.py
│  ├─ requirements.txt  pytest.ini  .env.example
├─ demo/      demo.html demo.css control.html campus.svg   (never modified at runtime)
├─ frontend/
│  ├─ src/  main.tsx App.tsx (shell) router.tsx session.tsx theme.tsx components.tsx icons.tsx timeline.tsx evidence.tsx api.ts types.ts styles.css
│  │        pages/  HomePage HowPage AuditPage FindingsPage RepairsPage ReportPage A11yPage shared
│  ├─ public/shots/  real product captures and two credited photographs (credits.json)
│  ├─ public/fonts/  Stack Sans Headline + Text (OFL 1.1, self-hosted)
│  ├─ src/data/demo.json  one recorded run on the demo, the data behind Home (scripts/site_shots.py)
│  ├─ scripts/check-wording.mjs
│  ├─ index.html vite.config.ts tsconfig.json package.json
├─ scripts/  setup.ps1 start.ps1 self_audit.py ui_snapshot.py site_shots.py
└─ .agents/skills/design-taste-frontend/   third-party design skill (reviewed 20 Oct 2026); its output goes to .taste-skill/ (gitignored)
```

## 6. Database interaction

There is no database in the MVP. `store.py` keeps module-level dictionaries guarded by a lock. Everything is lost on restart, which is acceptable and expected for a demo. Working copies live in `%TEMP%/accesspilot-workspaces/<id>/`. A future SQLite design is in `DATABASE.md`. Introducing it must not change API contracts.

## 7. Authentication and authorisation

- **MVP:** no authentication; the server binds to `127.0.0.1` only. Authorisation is expressed as **policy**, not identity:
  - consent flag required for every scan;
  - target policy (no private networks; loopback only with `ACCESSPILOT_ALLOW_LOCALHOST=1`);
  - repairs only for the bundled demo (`workspace.resolve_target`);
  - apply requires the proposal's single-use approval token;
  - patches only to `demo.html` and `demo.css`, in copies, never in `demo/`.
- **Hosted (future):** add login (for example GitHub OAuth), per-user ownership of scans and proposals, CSRF protection, and set `ACCESSPILOT_ALLOW_LOCALHOST=0`. Requires approval before work starts.

## 8. API architecture

REST over JSON under `/api`, a synchronous request per operation, long operations run in FastAPI's threadpool. One error shape for everything. See `API.md`.

## 9. AI architecture

- **Pattern:** a single tool-calling agent with a fixed toolset. There is no planner or sub-agents, and no memory across runs.
- **Budgets:** 8 model turns, 14 tool calls, 90 s per run, 20 s per call, 1 SDK retry, temperature 0.2.
- **Inputs:** only data returned by tools — compact findings (≤ 25), bounded evidence (snippet ≤ 300 chars), template catalogue. Page data is wrapped in JSON with `untrustedPageData: true`; the system prompt forbids following instructions in it.
- **Outputs:** proposals go through the same `service.propose` validation as a human request; explanations go through Pydantic validation; confidence < 0.5 → needs human review; fingerprints not in the scan are dropped.
- **Cannot:** apply patches, set statuses, run shell commands, fetch URLs, read files.
- **Fallback:** no credentials, exception, budget overrun, or no `submit_report` → deterministic explanations and template proposals; the response says `aiUsed: false` and why.

## 10. Environment configuration

All configuration is read in `app/config.py` from the environment and `backend/.env` (gitignored). See `API.md` §9 for the full list. The frontend has **no** environment variables and no secrets; it talks to the same origin, or to the Vite proxy in development.

## 11. Error handling

- Domain errors raise `APIError(code, message, status)`; a single handler returns `{"error": {"code", "message", "requestId"}}`.
- Validation errors → `invalid_request` (422).
- Playwright timeout → `scan_timeout` (504); load failure → `scan_failed` (502); blocked redirect → `target_not_allowed` (403).
- The browser always closes in `finally`.
- Agent errors never surface as HTTP errors; they become a fallback with a recorded reason.
- The UI shows message plus code, keeps previous results, and re-enables controls.

## 12. Security boundaries

| Boundary | Trust | Control |
|----------|-------|---------|
| Browser user → API | Local user | Consent flag, input validation, approval token |
| API → target site | Untrusted | Host policy before load and on every navigation; time limits; `bypass_csp` only inside the isolated headless context |
| Page content → agent | Untrusted | Tool-wrapped data, no tools with side effects beyond drafting |
| Agent → fixer | Untrusted | Same validation as a human request; params regex-validated and HTML-escaped |
| Fixer → filesystem | Controlled | Allowlist, exact match, copies only, original refused |
| Server → model provider | Third party | Only bounded evidence leaves the machine; keys in env |
| Export → user | Shared outward | Tokens excluded; no full page source |

## 13. Testing

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | pytest | Policy, fingerprints, WCAG parsing, templates, escaping, allowlist, coverage wording, verifier import rule |
| Agent | pytest + scripted fake client | Tool loop, injection refusal, low confidence, outage, no submit, no credentials |
| Integration | pytest + live app on port 8765 + Chromium | Golden Site detection, control page clean, approval, verified, failed, regression gate, export hygiene |
| UI | `npm run build` (tsc), `npm run check:wording` | Types; banned wording |
| Accessibility / E2E | `scripts/self_audit.py` | Keyboard-only journey + axe on four UI states |

## 14. Deployment

- **MVP (hackathon):** local only. `scripts/setup.ps1` then `scripts/start.ps1`; the UI is served from `frontend/dist` by FastAPI. The offline fallback is the same build with no token.
- **Future:** one container (Python + Chromium + built UI) behind HTTPS on Azure Container Apps or App Service. Before any public deployment: authentication, `ACCESSPILOT_ALLOW_LOCALHOST=0`, DNS-rebinding defence (resolve once and pin the IP for navigation), rate and concurrency limits, workspace cleanup, and structured logging.

## 15. MVP vs future scalability

| Concern | MVP | Future (only when needed) |
|---------|-----|---------------------------|
| Concurrency | One browser per request in threadpool | Semaphore (e.g. 2 concurrent scans), then a worker pool |
| Storage | In memory | SQLite (DATABASE.md), then Postgres if multi-user |
| Working copies | Temp dir, never cleaned | TTL cleanup job |
| Multi-page | No | Same-origin crawl ≤ 10 pages |
| Repairs | 5 fixed templates on the demo | Repository intake + PR creation |
| Trace | In response | SSE stream |
