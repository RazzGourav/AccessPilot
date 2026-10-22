# AccessPilot — Agentic Accessibility Auditor & Verified Fixer

> Don’t just detect barriers. Fix them, verify them, and prove the difference.

Built for the Microsoft Agentic AI Hackathon (RUVERSE TechFest 2026), problem statement **Automated Accessibility Checker**.

**Principle:** deterministic evidence first; AI suggestions second; human approval before changes; deterministic re-test decides verification.

```
PLAN → AUDIT (axe-core) → BEHAVIOUR (keyboard walk) → EXPLAIN + PROPOSE (agent, optional model)
     → HUMAN APPROVAL → APPLY IN ISOLATED COPY → VERIFY (same checks + control-page gate) → REPORT
```

## Project documents

| Document | Purpose |
|----------|---------|
| [docs/PRD.md](docs/PRD.md) | Product requirements (source of truth) |
| [docs/DESIGN.md](docs/DESIGN.md) | Visual design and UX rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it is built |
| [docs/DATABASE.md](docs/DATABASE.md) | Data model (in-memory MVP; SQLite design for P1) |
| [docs/API.md](docs/API.md) | Endpoints, errors, external services, env vars |
| [AGENTS.md](AGENTS.md) | Rules for coding agents and contributors |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Phases, status and next task |
| [docs/PROMPT_PLAYBOOK.md](docs/PROMPT_PLAYBOOK.md) | Ready-to-use prompts 8–20 for this project |
| [docs/COPILOT_LOG.md](docs/COPILOT_LOG.md) | Truthful AI-assistance log |

## Quick start (Windows)

Requires Python 3.12+ and Node 20+.

```powershell
.\scripts\setup.ps1     # venv, packages, Chromium, frontend build
.\scripts\start.ps1     # http://127.0.0.1:8000/
```

Open http://127.0.0.1:8000/ and press **Start an audit**. On Audit, tick the consent box and press **Scan** (the Golden Site URL is pre-filled), then **Run agent** → **Review the first fix** (opens Repairs) → **Approve**. Pages: Home, How it works, Audit, Findings, Repairs, Report, Accessibility statement.

To enable the AI agent, put a GitHub token with *Models: read* in `backend/.env` as `GITHUB_TOKEN=` (or the `AZURE_OPENAI_*` variables). Without it, everything works and the agent uses built-in guidance; the UI says so.

Frontend development with hot reload: `cd frontend; npm run dev` → http://localhost:5173 (proxies `/api` to :8000).

## What is implemented

| Area | Status |
|------|--------|
| `POST /api/scan` — Playwright Chromium + axe-core 4.10.2 bundled locally (works offline), WCAG 2.0/2.1/2.2 A/AA + best-practice tags | Done |
| Consent, scheme and host policy (private/link-local/metadata blocked; loopback only as dev exception), redirect guard | Done |
| Keyboard walk ≤ 30 stops / 5 s, repeated-focus detection, clickable-not-focusable heuristic | Done |
| Coverage panel (checked / not tested / limitations), no score | Done |
| Remediation agent: bounded tool loop (≤ 8 turns, ≤ 14 tool calls), GitHub Models / Azure OpenAI, deterministic fallback | Done |
| Repair templates T1–T5, path allowlist, single-use approval token, isolated working copies | Done |
| Verification: fingerprint compare, resolved/remaining/new, control-page regression gate | Done |
| JSON export without tokens or page source | Done |
| Keyboard-only self-audit of the UI (`scripts/self_audit.py`) | Done — 0 axe findings |
| Replay mode, HTML report, SSE trace, criterion catalogue | Not yet (P1) |

## Golden Site defects

| ID | Defect | Detected by | Repair |
|----|--------|-------------|--------|
| D01 | Email input without label | axe `label` | T1 |
| D02 | Hero image without alt | axe `image-alt` | T2 (human edits wording) |
| D03 | Low-contrast helper text | axe `color-contrast` | T3 |
| D04 | `<html>` without `lang` | axe `html-has-lang` | T4 |
| D05 | Icon-only button | axe `button-name` | T5 |
| D06 | “Click here” link | Not detected by axe — manual | — |
| D07 | `div` with click handler | Keyboard heuristic | Needs human |
| D08 | Focus cycling in chat widget | Keyboard heuristic | Needs human |
| D09 | No `main` landmark | axe `landmark-one-main`, `region` | Needs human |
| D10 | `h1` → `h4` skip | axe `heading-order` | Needs human |

Measured on 20 Oct 2026 (one laptop, local): Golden Site scan ≈ 1.2 s; repair + re-test + control gate ≈ 2–4 s. Re-measure before quoting.

## Tests

```powershell
cd backend; .\.venv\Scripts\python -m pytest          # 35 tests: unit, agent (fake model), live-browser integration
cd frontend; npm run check:wording                     # no score / compliance wording in the UI
backend\.venv\Scripts\python scripts\self_audit.py     # keyboard-only flow + axe on AccessPilot's own UI (server must be running)
```

## API

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Status, AI provider, demo URLs |
| `POST /api/scan` `{url, authorized}` | Scan one page |
| `POST /api/agent/run` `{scanId}` | Agent explanations + drafted proposals + trace |
| `GET /api/repair/templates` | Template catalogue |
| `POST /api/repair/propose` `{scanId, fingerprint, params?}` | Proposal with diff, or `needs_human` |
| `POST /api/repair/apply` `{proposalId, approved, approvalToken, params?}` | Apply to a copy, re-test, return status |
| `POST /api/scan/compare` `{beforeId, afterId}` | Resolved / remaining / new |
| `GET /api/reports/{scanId}` | JSON export |

Errors: `{"error": {"code", "message", "requestId"}}` with codes `consent_required`, `invalid_url`, `target_not_allowed`, `scan_timeout`, `approval_required`, `path_not_allowed`, `not_found`, `not_applicable`, `invalid_params`.

## Security and limits

- Scan only sites you own or are authorised to test. Loopback is allowed only for the bundled demo; set `ACCESSPILOT_ALLOW_LOCALHOST=0` for any hosted use. DNS rebinding defences are **not** implemented — do not host publicly as is.
- The agent has no tool that applies changes, runs commands, fetches URLs or sets a status. Page content reaches it only as tool data marked untrusted.
- Not a compliance certificate or legal advice. Automated checks find only part of WCAG.

## Layout

```
backend/app/  main.py · scanner.py · keyboard.py · policy.py · coverage.py · fingerprint.py · verifier.py
              agent/ (llm, tools, runner, fallback) · fixer/ (templates, workspace, service)
demo/         demo.html + demo.css (Golden Site), control.html, campus.svg
frontend/src/ App.tsx · components.tsx · api.ts · types.ts · styles.css
scripts/      setup.ps1 · start.ps1 · self_audit.py
```
