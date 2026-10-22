# AccessPilot — Prompt Playbook (prompts 8–20)

Prompts 1–7 produced the project documents: `docs/PRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `AGENTS.md`, and `docs/IMPLEMENTATION_PLAN.md`.

Prompts 8–20 are actions. Below, each has its placeholders filled in for AccessPilot, a status, and what applies to this project. Paste the **Prompt** block into GitHub Copilot Chat (agent mode) or another coding agent. Log every real use in `docs/COPILOT_LOG.md`.

| # | Prompt | Status for AccessPilot | When |
|---|--------|------------------------|------|
| 8 | Project setup | ✅ Done (Phase 0) — use only to re-verify | — |
| 9 | Feature development | 🔜 Use per task | Phases 7–10 |
| 10 | Database & backend | ⏸ Backend done; database deferred by decision | Only if scan history is approved |
| 11 | Authentication | ⛔ Not in MVP (local single-user, by decision) | Before any hosting |
| 12 | MCP connection | ◻ Optional (Playwright MCP / GitHub MCP for the coding agent) | If useful for development |
| 13 | External API integration | 🔜 Verify GitHub Models live | Phase 7 |
| 14 | Testing & QA | 🔜 | Phase 8 |
| 15 | Debugging | As needed | Any time |
| 16 | Security audit | 🔜 | Before demo (Phase 8) |
| 17 | Code review | 🔜 | After Phase 7 |
| 18 | Deployment | ⏸ Local "production" only for the hackathon | Event day / post-hackathon |
| 19 | Monitoring | ⏸ Minimal (health + logs) for local demo | Post-hackathon |
| 20 | Final audit | 🔜 | Evening of 21 Oct |

Common context line (prepend to every prompt):

> Project: AccessPilot (agentic accessibility auditor and verified fixer). Read `AGENTS.md` first; documents are in `docs/`. Backend: FastAPI in `backend/app`; frontend: React/Vite in `frontend/src`. Run backend tests with `cd backend; .\.venv\Scripts\python -m pytest -q`.

---

## 8. Project setup — ✅ done

Already created: folder structure, pinned dependencies, vendored axe-core, `.env.example`, `.gitignore`, `scripts/setup.ps1`, `scripts/start.ps1`, design tokens, shared components, `npm run build` (type check), `npm run check:wording`.

Not set up (deliberately, to avoid new dependencies without approval): a Python linter/formatter (ruff) and ESLint/Prettier. ❓ Approve ruff (one dev dependency) if wanted.

**Prompt (re-verification only):**
```
You are a senior full-stack engineer. Read AGENTS.md, docs/ARCHITECTURE.md §5 and README.md.
Do not create a new project. Verify the existing setup on this machine: run scripts/setup.ps1,
start with scripts/start.ps1, check GET /api/health, run the backend tests, npm run build and
npm run check:wording. Report what passed, what failed, and any README step that was wrong.
Fix only README or setup-script errors; do not change application code.
```

## 9. Feature development — per task

Fill `[TASK]` with one row from `docs/IMPLEMENTATION_PLAN.md` (e.g. "10.1 Replay mode (FR-19)").

**Prompt:**
```
You are a senior full-stack engineer working inside the existing AccessPilot codebase.
Follow docs/PRD.md, DESIGN.md, ARCHITECTURE.md, DATABASE.md, API.md and AGENTS.md.
Implement only this approved task: [TASK — e.g. "Phase 10.1: Replay mode with a persistent
'Replay, not live' banner (FR-19). A saved scan JSON can be loaded and shown; the banner cannot
be dismissed; the export is marked replay: true."]
First inspect the relevant code (main.py, models.py, App.tsx, components.tsx, api.ts, types.ts)
and state your approach in a few lines. Then implement it completely:
- reuse existing components (StatusBadge, .card, Trace) and the APIError pattern;
- handle loading, empty, success and error states as in DESIGN.md §7;
- keep models.py, types.ts and docs/API.md in sync;
- add tests (pytest; UI: npm run build, npm run check:wording, scripts/self_audit.py).
Do not rewrite unrelated code or add dependencies. If something is ambiguous, stop and ask.
Report changed files, tests run and remaining issues.
```

Ready-made tasks for this prompt: 7.6 live agent test · 9.1 `docs/DEMO.md` · 10.1 Replay · 10.2 HTML report · 10.3 SSE trace · 10.4 confidence in the proposals list.

## 10. Database & backend connection — ⏸ deferred

The backend is complete. ✅ Decision: no database in the MVP (DATABASE.md §1). Run this prompt only if the team approves P1 scan history.

**Prompt (only after approval):**
```
You are a senior backend engineer. Follow docs/DATABASE.md §4–§10, ARCHITECTURE.md, API.md and
AGENTS.md. Replace the in-memory store in backend/app/store.py with SQLite using the stdlib
sqlite3 module (no ORM), keeping the same public helper functions so no other module changes.
Create backend/migrations/0001_init.sql exactly as DATABASE.md §4 with the indexes in §5, apply
migrations at startup, store only the SHA-256 hash of approval tokens, enable foreign keys.
Add GET /api/scans?limit=&before= (API.md §4). Database path from env ACCESSPILOT_DB_PATH.
Add tests for migrations, persistence across restart, token hashing and cascade deletes.
Report migrations, endpoints, tests and anything needing approval.
```

## 11. Authentication & authorisation — ⛔ not in MVP

ARCHITECTURE.md §7: AccessPilot binds to 127.0.0.1 and is single-user. Authorisation is enforced as **policy** (consent, target policy, demo-only repairs, single-use approval token, patch allowlist), and all of this is already implemented and tested. Adding login now would add risk with no demo value.

**Prompt (post-hackathon, only after the hosting decision):**
```
You are a senior security engineer. Follow ARCHITECTURE.md §7 and §14, DATABASE.md §7 and AGENTS.md.
Add GitHub OAuth login for a hosted AccessPilot: server-side sessions in HttpOnly, Secure,
SameSite=Lax cookies; CSRF token on state-changing requests; users table; owner_id on scans;
every scan/proposal/apply/report endpoint checks ownership server-side (403 forbidden otherwise);
401 for unauthenticated; session expiry 8h. Keep all existing policy controls. Add tests for
unauthenticated, wrong-owner, expired session and CSRF failure. Report the flow and residual risks.
```

## 12. MCP connection — optional, for the coding environment

AccessPilot itself does not need MCP at runtime (MCP distribution is P2). Two MCP servers can help **development** in VS Code with Copilot agent mode:

| MCP server | Why | Least-privilege setup |
|------------|-----|-----------------------|
| Playwright MCP (`@playwright/mcp`) | Let the coding agent open the local UI and check flows | Restrict to `http://127.0.0.1:8000`; headless; no file uploads |
| GitHub MCP | Issues and PRs for the team repo | Read-only token scoped to this repository |

**Prompt:**
```
You are a senior AI engineer. Follow AGENTS.md. Configure the Playwright MCP server for VS Code
Copilot agent mode in .vscode/mcp.json for local development of AccessPilot. First list what tools
it exposes and which we need (navigate, snapshot, click, type, keyboard). Restrict it to
http://127.0.0.1:8000, headless. Do not commit credentials. Verify by asking it to open the UI,
tick the consent checkbox, scan the Golden Site and read the summary counts. Report status, tools,
config and manual steps.
```

## 13. External API / service integration — GitHub Models

`[SERVICE]` = **GitHub Models (OpenAI-compatible chat completions with tool calling) for the remediation agent; Azure OpenAI as the alternative.** The integration exists (`agent/llm.py`, `agent/runner.py`) and is tested with a fake client. It has **not** yet been run against the live service.

**Prompt:**
```
You are a senior integration engineer. Follow docs/API.md §6, ARCHITECTURE.md §9 and AGENTS.md.
Verify and harden the existing GitHub Models integration in backend/app/agent/ (do not rewrite it):
1. With GITHUB_TOKEN set in backend/.env, run POST /api/agent/run on a Golden Site scan and check
   the trace contains llm_turn_* and tool:* entries and aiUsed is true.
2. Confirm behaviour on 401 (bad token), 429 (rate limit) and timeout: each must fall back with a
   clear fallbackReason and never return HTTP 500.
3. Confirm no key appears in logs, /api/health or /api/reports.
4. Add an opt-in live test marked @pytest.mark.live that is skipped when no token is set.
Do not add retries beyond the SDK's single retry. Report config, env vars, files changed, tests.
```

## 14. Testing & QA

Current: 35 pytest tests (unit, fake-model agent, live-browser integration), a TypeScript build, the wording check, and the keyboard-only self-audit (0 axe findings). Gaps: NFR measurements, responsive checks, process cleanup, real-model tests.

**Prompt:**
```
You are a senior QA engineer. Read docs/PRD.md (§4 journeys, §6–7 requirements), docs/API.md,
ARCHITECTURE.md and the current code. Run the existing suite first. Then add tests for the gaps:
- NFR-03: no leftover chrome-headless-shell processes after 20 scans;
- edge cases: page with zero focusable elements, page that redirects to 127.0.0.1 from a public
  host (mock), unicode in alt text, template find-string missing (needs_human), scan of 404 page;
- UI: error alert on consent_required, network failure message, filters with no matches;
- responsive: self_audit at 375px and 1366px viewports.
Do not change production behaviour to make tests pass; investigate failures.
Report tests created/run, pass/fail, bugs found with severity and recommended fixes.
```

## 15. Debugging / root cause

**Prompt template** (fill in `[PROBLEM]` with the exact error, log lines, or screenshot description):
```
You are a senior debugging engineer. Follow AGENTS.md and the existing architecture.
PROBLEM: [PROBLEM — e.g. "POST /api/scan returns scan_failed for http://localhost:8000/demo/demo.html
but works for 127.0.0.1"]
1. Reproduce it (command or test). 2. Inspect the relevant code/logs (policy.py, scanner.py,
workspace.resolve_target, server log). 3. Identify the root cause and explain why it happens.
4. Implement the smallest correct fix. 5. Add a regression test and run the full suite.
Do not weaken validation, hide errors, or delete tests. If evidence is insufficient, say what is missing.
Report root cause, fix, files changed, tests, remaining risk.
```

Known Windows pitfalls to check first: async Playwright under Uvicorn (we use sync on purpose); `--reload` on Windows; console encoding of `✓` (use UTF-8); port 8000 already in use.

## 16. Security audit & hardening

Known items to verify: SSRF policy and redirect guard; DNS rebinding (not defended — local only); `bypass_csp` scope; template escaping; workspace path traversal on `/ws/{id}/{file}`; approval-token handling; prompt injection via page content; export contents; dependency versions; no rate limit (acceptable while bound to localhost).

**Prompt:**
```
You are a senior application security engineer. Audit AccessPilot against docs/ARCHITECTURE.md §12,
docs/API.md §2/§5/§7 and AGENTS.md §1/§8. Check in priority order:
1. SSRF: policy.check_url, IPv6/IPv4-mapped addresses, DNS names resolving to private IPs, redirects
   (scanner route guard), subresource requests to private hosts.
2. Path traversal on GET /ws/{wid}/{name} and in fixer/workspace.py.
3. Injection/XSS: template parameter validation and escaping; React rendering of snippets and model text.
4. Prompt injection: can page content or model output cause any side effect beyond a drafted proposal?
5. Approval bypass: token reuse, missing token, other proposals' tokens.
6. Sensitive data: logs, /api/health, exports.
7. Dependencies: known CVEs for pinned versions.
Fix exploitable, high-impact issues with minimal changes and add a test for each. Do not weaken
controls. Report findings by severity, fixes, tests, and residual risks (e.g. DNS rebinding, no auth).
```

## 17. Code review & refactoring

Known technical debt: working copies in `%TEMP%` are never cleaned; `verifier._control_cache` grows without a limit; `store` keeps every scan in memory; `fixer/service.apply` imports `TEMPLATES` inside the function; `region` findings can be noisy (10 elements on the Golden Site).

**Prompt:**
```
You are a senior engineer reviewing AccessPilot before the demo. Review against docs/* and AGENTS.md
for architecture violations (especially verifier/model separation and patch path rules), bugs,
dead code, inconsistent patterns, poor error handling and performance concerns.
Fix only issues that are clearly justified and safe; preserve behaviour; no new dependencies.
Known debt to evaluate (fix only if low-risk): workspace cleanup, control-page cache bound,
in-function import in fixer/service.py. Run the full suite, npm run build, check:wording and
scripts/self_audit.py after changes. Report critical findings, refactors, files, tests, remaining debt.
```

## 18. Deployment & production setup — ⏸ local only for the hackathon

For the event, "production" means the built UI served by FastAPI on the demo laptop, started by `scripts/start.ps1`, with the token in `backend/.env`. A public deployment is blocked until the items in ARCHITECTURE.md §14 are done.

**Prompt (event "production" build):**
```
You are a senior DevOps engineer. Follow ARCHITECTURE.md §14 and AGENTS.md. Prepare the demo laptop:
run scripts/setup.ps1 from a clean clone, confirm frontend/dist is served at http://127.0.0.1:8000/,
confirm backend/.env has a working token and is not tracked by git, confirm /api/health,
run the full test suite and scripts/self_audit.py, and confirm the app works with Wi-Fi off
(AI falls back). Do not deploy anywhere public. Report results and manual steps for event day.
```

**Prompt (post-hackathon hosting, after auth and hardening):**
```
Containerise AccessPilot as one image (Python + Playwright Chromium + built UI) for Azure Container
Apps. HTTPS only, ACCESSPILOT_ALLOW_LOCALHOST=0, secrets from Azure Key Vault/Container Apps secrets,
health probe on /api/health, concurrency limit 2 scans, no public access until auth (prompt 11)
is merged. Verify the production build before deploying and report URL, env vars and manual steps.
```

## 19. Production monitoring & maintenance — ⏸ minimal

For the local demo, monitoring = `/api/health`, the Uvicorn console, and the scan/agent traces in each response. Nothing more is justified at this scale.

**Prompt (post-hackathon, hosted):**
```
You are a senior SRE. Review ARCHITECTURE.md and the deployed AccessPilot. Add simple monitoring:
structured JSON logs (request id, route, status, duration; never bodies, URLs' query strings or keys);
counters for scans, scan failures by error code, agent fallbacks by reason, repair statuses;
uptime check on /api/health; alerts only for: health failing 3x, scan failure rate > 20% over
15 min, agent fallback rate > 50% over 1 h (provider issue). Workspace disk usage alert.
No user content in telemetry. Report what is tracked, alert rules and gaps.
```

## 20. Final production audit — evening of 21 Oct

**Prompt:**
```
You are a senior engineering lead approving AccessPilot for the hackathon demo (local deployment).
Audit against docs/PRD.md (§5 stories, §6 FR, §7 NFR, §15 success criteria), DESIGN.md, ARCHITECTURE.md,
API.md and AGENTS.md. Do not assume anything works because code exists — run it:
- full journey J1–J4 in the UI, keyboard only, light and dark mode, 375px and 1366px;
- agent with live model and with Wi-Fi off;
- negative paths: consent missing, private IP, bad patch → Failed, regression → Failed;
- backend tests, npm run build, check:wording, scripts/self_audit.py;
- README setup on a second machine; export contains no secrets;
- docs/COPILOT_LOG.md contains only real entries.
Authentication, database, deployment and monitoring are intentionally out of MVP scope — check they
are documented as such rather than flagging them as missing.
Give a verdict: READY, READY WITH WARNINGS, or NOT READY, with findings by severity, required fixes,
tests performed and what must be manually checked on event day.
```
