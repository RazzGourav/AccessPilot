# AccessPilot — API

How the UI talks to the backend and how the backend talks to external services. Contracts are defined in `backend/app/models.py` and mirrored in `frontend/src/types.ts`; this document must stay in sync with both.

Status markers: **[impl]** implemented and tested · **[planned]** agreed but not built.

## 1. Conventions

- Base path `/api`; JSON request and response bodies; UTF-8; field names in camelCase.
- Same origin: the UI is served by the API process (`http://127.0.0.1:8000/`). In development, Vite proxies `/api` to port 8000. No CORS is configured or needed.
- Long operations (scan, agent run, apply) are synchronous requests that run in a server threadpool. Clients should allow up to 120 s.
- Ids are opaque strings (`scan_…`, `prop_…`, `ws…`).
- Timestamps are ISO-8601 UTC with seconds.

## 2. Authentication and authorisation

There are no user accounts in the MVP (local, single-user; see ARCHITECTURE.md §7). Server-side controls replace identity:

| Control | Where enforced |
|---------|----------------|
| `authorized: true` consent on every scan | `policy.check_request` |
| Target host policy, including every browser navigation and redirect | `policy.check_url`, `scanner` route guard |
| Repairs only for the bundled demo and its working copies | `workspace.resolve_target`, `service.propose` |
| Single-use approval token per proposal | `service.apply` (constant-time compare) |
| Patch file allowlist and copy-only writes | `workspace.apply` |

The client is never trusted for authorisation. Hiding a button in the UI is convenience only.

## 3. Endpoints

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET | `/api/health` | Liveness, axe bundle present, AI provider status, demo URLs | [impl] |
| POST | `/api/scan` | Scan one page | [impl] |
| GET | `/api/scans/{scanId}` | Fetch a stored scan | [impl] |
| GET | `/api/scans/{scanId}/screenshot` | JPEG capture of the page as scanned, for the evidence view (in memory only; never exported) | [impl] |
| POST | `/api/agent/run` | Run the remediation agent on a scan | [impl] |
| POST | `/api/agent/run-multi` | Run the multi-agent coordinator and specialists on a scan | [impl] |
| GET | `/api/scans/{scanId}/experience` | Assistive technology simulation (screen reader frames, frustration metrics) | [impl] |
| GET | `/api/scans/{scanId}/compliance` | India compliance mappings (RPwD Act, GIGW 3.0, IS 17802) | [impl] |
| GET | `/api/scans/{scanId}/impact` | Barrier impact breakdown, affected user groups, remediation effort | [impl] |
| GET | `/api/repair/templates` | Repair template catalogue | [impl] |
| POST | `/api/repair/propose` | Create a proposal (diff) or a needs-human result | [impl] |
| POST | `/api/repair/apply` | Apply an approved proposal to a copy, re-test, return status | [impl] |
| POST | `/api/repair/rollback` | Rollback an applied proposal to the prior working copy version | [impl] |
| POST | `/api/scan/compare` | Compare two scans | [impl] |
| GET | `/api/reports/{scanId}` | JSON export (download) | [impl] |
| GET | `/api/scans/{scanId}/events` | SSE trace stream | [planned P1] |
| GET | `/demo/*`, `/ws/{workspaceId}/{file}` | Golden Site and working copies (scan targets) | [impl] |
| GET | `/` | Built UI (Home) | [impl] |
| GET | `/how-it-works`, `/audit`, `/findings`, `/repairs`, `/report`, `/accessibility`, `/dashboard`, `/experience` | The UI's `index.html`, so deep links and reloads work | [impl] |

### 3.1 `GET /api/health`
```json
{ "status": "ok", "axeBundled": true,
  "ai": { "configured": true, "provider": "github-models", "model": "openai/gpt-4.1-mini" },
  "demoUrl": "http://127.0.0.1:8000/demo/demo.html",
  "controlUrl": "http://127.0.0.1:8000/demo/control.html" }
```
`ai.configured` is `false` (provider and model `null`) when no credentials are set. Keys are never returned.

### 3.2 `POST /api/scan`
Request:
```json
{ "url": "http://127.0.0.1:8000/demo/demo.html", "authorized": true }
```
Validation: `url` ≤ 2048 chars, http/https with a host, resolvable, not private/link-local/reserved/multicast; loopback only when `ACCESSPILOT_ALLOW_LOCALHOST=1`.

Response `200` — `Scan`:

| Field | Type | Notes |
|-------|------|-------|
| `scanId` | string | |
| `status` | `completed` \| `partial` \| `failed` | `partial` if the keyboard walk errored |
| `requestedUrl`, `finalUrl`, `title`, `createdAt` | string | |
| `durationMs` | int | Measured |
| `scanner`, `scannerVersion` | string | `axe-core`, e.g. `4.10.2` |
| `violations` | Finding[] | Sorted by impact; includes keyboard-heuristic findings |
| `incomplete` | Finding[] | axe could not decide; always needs human review |
| `passesCount` | int | |
| `keyboardWalk` | `{steps: FocusStop[], limit, truncated, endedReason, notes[]}` | `endedReason`: `wrapped_to_start`, `left_document`, `repeated_focus_cycle`, `no_focusable_stops`, `limit_reached`, `time_budget_reached`, `not_run` |
| `coverage` | Coverage | methods, tags, counts, `notTested[]` |
| `trace` | TraceEntry[] | `{step, status, durationMs, detail}` for steps that ran |
| `limitations` | string[] | |
| `repairable` | bool | true only for the bundled demo and its copies |
| `workspaceId` | string \| null | null for the original demo and external pages |
| `explanations` | Explanation[] | filled after an agent run |
| `page` | `{width, height, truncated}` \| null | Capture metadata; `null` if the capture step failed |

`Finding`: `fingerprint` (`rule|target|hash8`), `key` (`rule|target`), `source` (`axe` \| `keyboard-heuristic` \| `ai-advice`), `ruleId`, `impact` (`critical`…`minor` or `null` for heuristics), `description`, `help`, `helpUrl`, `tags[]`, `wcag[]` (e.g. `1.1.1`), `target`, `snippet` (≤ 300), `failureSummary` (≤ 600), `repairTemplate` (`T1`–`T5` or null), `needsHumanReview`, `box` (`{x, y, w, h}` in capture pixels, or null when not located). `FocusStop` also carries `box`.

### 3.3 `POST /api/agent/run`
Request `{ "scanId": "scan_…" }` → `AgentRun`:
```json
{ "scanId": "scan_…", "aiUsed": true, "model": "openai/gpt-4.1-mini", "fallbackReason": "",
  "explanations": [{ "fingerprint": "…", "explanation": "…", "userImpact": "…", "suggestedAction": "…",
                     "confidence": 0.9, "needsHumanReview": false, "generatedBy": "ai", "suggestedCode": "…" }],
  "proposals": [ /* RepairProposal[] */ ],
  "needsHuman": [{ "fingerprint": "…", "reason": "…", "by": "ai" }],
  "trace": [{ "step": "llm_turn_1", "status": "ok", "durationMs": 812, "detail": "1 tool call(s)" },
            { "step": "tool:list_findings", "status": "ok", "durationMs": 0, "detail": "" }] }
```
Model failures never return an HTTP error: `aiUsed: false`, `fallbackReason` set, deterministic content returned, `deterministic_fallback` trace entry.

### 3.4 `GET /api/repair/templates`
`{ "templates": [{ "id": "T2", "ruleId": "image-alt", "title": "…", "file": "demo.html", "risk": "low", "params": [{ "name": "altText", "label": "Alt text", "default": "…", "humanEdit": true }] }] }`

### 3.5 `POST /api/repair/propose`
Request `{ "scanId": "scan_…", "fingerprint": "image-alt|img|e377b052", "params": { "altText": "…" } }` (`params` optional).

Response `RepairProposal`:
```json
{ "proposalId": "prop_…", "scanId": "scan_…", "fingerprint": "…", "template": "T2", "status": "suggested",
  "rationale": "…", "allowedFiles": ["demo/demo.html"], "risk": "low",
  "diff": "--- a/demo/demo.html\n+++ b/demo/demo.html\n@@ …", "params": { "altText": "…" },
  "needsHumanEdit": ["Alt text"], "approvalToken": "…", "proposedBy": "user" }
```
Returns `status: "needs_human"` (no diff, no token) when the scan is not repairable, no template matches, or the template no longer matches the source. Parameter errors → `invalid_params`.

### 3.6 `POST /api/repair/apply`
Request:
```json
{ "proposalId": "prop_…", "approved": true, "approvalToken": "…", "approvedBy": "reviewer", "params": { "altText": "edited by human" } }
```
Response `ApplyResult`:
```json
{ "proposalId": "prop_…", "status": "verified",
  "reason": "Verified by automated re-test: …",
  "afterScanId": "scan_…", "workspaceId": "ws1a2b3c4d",
  "comparison": { "beforeId": "…", "afterId": "…", "resolved": ["image-alt|img"], "remaining": ["…"], "new": [], "beforeCount": 19, "afterCount": 18 },
  "controlPage": { "seriousOrCriticalBefore": 0, "seriousOrCriticalAfter": 0, "newSeriousOrCritical": [] },
  "approvedBy": "reviewer", "approvedAt": "2026-10-20T10:32:40+00:00" }
```
`status`: `verified` \| `partially_verified` \| `failed` (rules in ARCHITECTURE.md §4). The token is single use; a second apply → `not_applicable` (409).

### 3.7 `POST /api/scan/compare`
`{ "beforeId": "scan_a", "afterId": "scan_b" }` → `Comparison` (as above). Invariants: `resolved + remaining = beforeCount`, `remaining + new = afterCount` (unique keys).

### 3.8 `GET /api/reports/{scanId}`
`Content-Disposition: attachment`. Body:
`{ report, replay: false, disclaimer, scan, agent (without proposals), repairs: [{ proposal (without approvalToken), result }] }`. It never contains approval tokens, API keys or full page source.

## 4. Pagination and filtering

Not needed: one scan returns at most tens of findings for a single page. Filtering by impact and source is client-side. If scan history (P1) is added: `GET /api/scans?limit=20&before=<createdAt>` with cursor pagination.

## 5. Validation and errors

Every error has the same shape:
```json
{ "error": { "code": "consent_required", "message": "Confirm that you own this site or are authorised to test it.", "requestId": "3f9c1a2b7d4e" } }
```

| Code | HTTP | When |
|------|------|------|
| `invalid_request` | 422 | Body fails schema validation |
| `consent_required` | 400 | `authorized` missing or false |
| `invalid_url` | 422 | Bad scheme, no host, unresolvable |
| `target_not_allowed` | 403 | Private/link-local/reserved target, loopback disabled, or a blocked redirect |
| `scan_timeout` | 504 | Page did not load within 15 s |
| `scan_failed` | 502 | Page could not be loaded |
| `not_found` | 404 | Unknown scan, finding, proposal or workspace (scans are in memory only) |
| `invalid_params` | 422 | Unknown template parameter or value fails its pattern |
| `approval_required` | 403 | `approved` false or token wrong |
| `not_applicable` | 409 | Proposal is not in `suggested` state |
| `path_not_allowed` | 403 | Patch outside the allowlist or targeting the original demo |

Clients show `message` and `code`, and keep prior results on screen.

## 6. External services

### 6.1 GitHub Models (default agent provider)
- Endpoint: `POST {LLM_BASE_URL}/chat/completions`, default base `https://models.github.ai/inference`, through the `openai` SDK.
- Auth: `Authorization: Bearer <GITHUB_TOKEN>` (fine-grained PAT with *Models: read*).
- Request: `model`, `messages`, `tools` (six function schemas), `tool_choice: "auto"`, `temperature: 0.2`.
- Limits: timeout 20 s, 1 SDK retry (connection errors and 429/5xx only, which is safe because the call has no side effects); free-tier rate limits apply, and on 429 the run falls back.

### 6.2 Azure OpenAI (alternative)
Used when `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_DEPLOYMENT` are all set (takes precedence). Same request shape; `api-version` from `AZURE_OPENAI_API_VERSION`.

### 6.3 Data sent to providers
The page capture is never sent. Only: the scan title (≤ 100 chars), compact findings (≤ 25), requested evidence (snippet ≤ 300 chars, failure summary), and the template catalogue. Never sent: full page source, screenshots, API keys, approval tokens, local file paths.

### 6.4 Webhooks
None. AccessPilot receives no inbound calls from third parties.

## 7. Rate limiting and abuse

- MVP (local-only, bound to 127.0.0.1): no rate limit. Natural limits: navigation 15 s, keyboard walk 5 s, agent 90 s and 14 tool calls, request body ≤ 2048-char URL.
- [planned] Before any shared or hosted use: at most 2 concurrent scans (semaphore) returning `429 busy`, and 30 scans per hour per client.

## 8. Privacy and failure handling

- Scans and proposals are in memory and disappear on restart.
- Working copies contain only demo files.
- Logs: Uvicorn access logs only (method, path, status); no bodies, no keys.
- Provider down, slow or rate-limited → fallback; the scan is unaffected.
- Target slow → `scan_timeout`; the browser is always closed.
- Export is generated on demand from memory; a missing scan → `not_found`.

## 9. Environment variables

| Variable | Default | Purpose | Secret |
|----------|---------|---------|--------|
| `GITHUB_TOKEN` | — | GitHub Models auth | Yes |
| `LLM_API_KEY` | — | Overrides `GITHUB_TOKEN` for any OpenAI-compatible endpoint | Yes |
| `LLM_BASE_URL` | `https://models.github.ai/inference` | Provider base URL | No |
| `LLM_MODEL` | `openai/gpt-4.1-mini` | Model id | No |
| `AZURE_OPENAI_ENDPOINT` | — | Azure resource URL | No |
| `AZURE_OPENAI_API_KEY` | — | Azure key | Yes |
| `AZURE_OPENAI_DEPLOYMENT` | — | Azure deployment name | No |
| `AZURE_OPENAI_API_VERSION` | `2024-10-21` | Azure API version | No |
| `ACCESSPILOT_HOST` | `127.0.0.1` | Bind and base host | No |
| `ACCESSPILOT_PORT` | `8000` | Port | No |
| `ACCESSPILOT_PUBLIC_BASE` | `http://{host}:{port}` | Base for demo and working-copy URLs | No |
| `ACCESSPILOT_ALLOW_LOCALHOST` | `1` | Loopback dev exception; `0` for hosted | No |

Secrets live only in `backend/.env` (gitignored); `backend/.env.example` documents them with empty values. The frontend has no environment variables.
