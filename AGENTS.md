# AGENTS.md — Rules for coding agents

These rules apply to every AI coding agent (GitHub Copilot, Claude Code, others) and every human working in this repository.

**Source of truth, in order:** `docs/PRD.md` (what) → `docs/DESIGN.md` (look and UX) → `docs/ARCHITECTURE.md` (how) → `docs/DATABASE.md` (data) → `docs/API.md` (contracts) → this file (how to work). If code and documents disagree, stop and report the conflict; do not silently pick one.

**Product principle:** deterministic evidence first; AI suggestions second; human approval before changes; a deterministic re-test decides verification.

---

## 0. Before you change anything

1. Read the files you will touch and the modules that call them. Search for an existing helper before writing one.
2. Confirm the task is in `docs/PRD.md` scope (P0/P1). If it is P2 or not listed, ask first.
3. Run the existing tests so you know the baseline: `cd backend; .\.venv\Scripts\python -m pytest -q`.
4. State a short plan: files affected, contract changes, tests to add.

## 1. Hard rules (never break)

1. **`backend/app/verifier.py` never imports** `app.agent`, `openai`, or any model code. Verification status comes only from re-running scans. A unit test enforces this.
2. **Patches only through the fixer:** `fixer/templates.py` + `fixer/workspace.py`. Only `demo.html` and `demo.css`, only in working copies, only on an exact single match. Never write to `demo/` at runtime. Never execute model-generated commands.
3. **Approval:** `/api/repair/apply` requires `approved: true` and the proposal's single-use `approvalToken`. Do not add bypasses, "auto-approve" flags or test-only shortcuts in production code.
4. **Untrusted page content:** HTML, alt text, titles and snippets reach the model only inside tool results marked `untrustedPageData`. Never interpolate page content into the system prompt.
5. **Agent tools draft, never act.** Do not add agent tools that apply patches, set statuses, run shells, fetch URLs or read files.
6. **No false claims in the UI or reports:** no score, percentage, "compliant", "fully accessible", "100% accessible" or "WCAG certified". `npm run check:wording` must pass.
7. **Trace honesty:** a trace entry is recorded only for a step that actually ran, with its measured duration.
8. **Secrets:** keys only in `backend/.env` (gitignored). Never log, return, export or commit them. Never put secrets or provider calls in the frontend.
9. **Bounded work:** keep the limits in `app/config.py` (30 stops, 5 s walk, 15 s navigation, 300-char snippets, 8 turns, 14 tool calls, 20 s per model call, 90 s per run). Change them only with a documented reason.
10. **Original demo is fixture data.** Changing `demo/*.html|css` changes expected test results; update `docs/PRD.md` §13 and tests in the same change.

## 2. Code quality and naming

- Python: PEP 8, type hints on all public functions, `snake_case` functions, `PascalCase` models, module docstring stating the module's single responsibility. No wildcard imports. Keep functions short; extract when a block needs a comment to explain *what* it does.
- TypeScript: strict mode stays on; `camelCase` variables, `PascalCase` components, no `any` (use the types in `src/types.ts`), no unused locals or parameters.
- API field names are camelCase on the wire (Pydantic field names match). Error codes are `snake_case`.
- Comments explain *why* (constraints, trade-offs), not *what*. Match the existing comment density.
- User-facing text: plain language, sentence case, verb-first button labels.

## 3. Project and folder structure

Follow `docs/ARCHITECTURE.md` §5 exactly:
- New backend logic goes into the module that owns that responsibility (see the module table in ARCHITECTURE.md §3). New modules need a reason in the PR description.
- Frontend: pages in `pages/` (one component per route, wrapped in `Page` from `router.tsx`); session state and actions only in `session.tsx`; routes only in `router.tsx` `ROUTES` and `main.py` `SITE_PAGES` (change both); shared visual pieces go in `components.tsx`; icons in `icons.tsx`; the page view and crops in `evidence.tsx`; the agent timeline and its session-event model in `timeline.tsx`; API calls only in `api.ts`; types only in `types.ts`; styles only in `styles.css`.
- Scripts in `scripts/`; docs in `docs/`; tests in `backend/tests/`.
- Home's numbers and pictures are never typed by hand: regenerate `src/data/demo.json` and `public/shots/` with `scripts/site_shots.py`. Photographs need an open licence, a credit on the page and an entry in `public/shots/credits.json`.

## 4. Component and pattern reuse

- UI: use `Icon`, `ImpactBadge`, `StatusBadge`, `Summary`, `Timeline`, `Diff`, `button.primary` (one per context), `.card`, `.tag`, `.row`, `button.secondary` before creating anything new. New colours become tokens in both themes (DESIGN.md §2).
- Backend: raise `APIError(code, message, status)` for domain errors; use `fingerprint.make`; use `store.new_id`; run browser work through `scanner.run_scan`; new repair types become entries in `TEMPLATES`.
- Agent: new capabilities are new tool schemas + `ToolBox.t_<name>` methods that pass through existing validation, plus a `ToolBox.describe` summary and a timeline label in `timeline.tsx`.

## 5. Dependencies

- Do not add a dependency if the standard library or an existing dependency covers the need.
- Every new dependency needs: why, alternatives considered, licence, and a pinned exact version (`requirements.txt` uses `==`; `package.json` uses exact versions).
- Never upgrade axe-core, Playwright or the `openai` SDK casually: re-run the full test suite and the self-audit, and update `docs/ARCHITECTURE.md` §2.
- Not allowed without approval: ORMs, state-management libraries, CSS/component frameworks, agent frameworks, Docker, databases.

## 6. Type safety and contracts

- `backend/app/models.py` and `frontend/src/types.ts` change **together** in the same commit, with `docs/API.md`.
- Validate all external input with Pydantic models; validate template parameters with their regex; never `eval` or `exec`.
- Model output is untrusted: parse JSON defensively and validate through Pydantic before use.

## 7. Error handling

- Use the single error shape (`docs/API.md` §5). Add new codes to the table in API.md.
- Close resources in `finally` (the browser is always closed).
- Agent and provider failures become a fallback with a reason, never an HTTP 500.
- Never swallow exceptions silently; either convert to `APIError`, record a failed trace entry, or re-raise.
- The UI keeps previous results on error and shows `message` + `code`.

## 8. Security

- Keep `policy.check_url` on every user-supplied URL and the route guard on every navigation.
- HTML-escape all values inserted into templates (`Template.render`).
- Do not widen the patch allowlist, loopback exception or CSP bypass scope without approval.
- Exports exclude approval tokens and page source; add a test when the export shape changes.
- Before anything is hosted: follow ARCHITECTURE.md §14 (auth, DNS-rebinding defence, rate limits).

## 9. Data and API access

- Only `store.py` holds state; access it through the helpers, not ad hoc globals elsewhere.
- Only `api.ts` calls `fetch`. Components never build URLs.
- New endpoints: add them to `main.py`, `models.py`, `types.ts`, `api.ts`, `docs/API.md` and a test.
- Long-running work (browser, model) runs via `run_in_threadpool`; keep Playwright on the sync API.

## 10. Testing

- Every behaviour change ships with tests. Minimums:
  - new rule, template or status path → integration test against the live app (port 8765);
  - new policy rule → unit test;
  - new agent tool or prompt change → scripted fake-client test (no network in tests);
  - UI change → `npm run build`, `npm run check:wording`, `scripts/self_audit.py` and `scripts/self_audit.py --theme dark` with 0 serious/critical on every page (add new pages to the audit), and the design gate: `node .agents/skills/design-taste-frontend/scripts/lint.mjs --app frontend/src` (0 FAIL), then `scripts/ui_snapshot.py` and `inspect.mjs --app` on each snapshot (0 FAIL; every WARN defended in one sentence).
- A deliberately failing patch must stay **Failed**. Never edit a test to make a real failure pass; fix the cause or report it.
- Tests must not need a model key or internet access.

## 11. Documentation

- Update the relevant doc in `docs/` in the same change as the code: requirements (PRD), visuals (DESIGN), modules (ARCHITECTURE), data (DATABASE), contracts (API).
- Update `README.md` when commands, setup, or the "implemented" table change.
- Record real Copilot usage in `docs/COPILOT_LOG.md`. Never invent entries.
- Only quote measured numbers; mark targets as targets.

## 12. Git and change discipline

- One task per branch and commit series; keep diffs focused. No drive-by refactors, reformatting or renames outside the task.
- Do not rewrite working code for style alone.
- Commit messages: imperative summary (≤ 72 chars), then why. Reference the FR or US id when relevant.
- Never commit `.env`, `node_modules/`, `.venv/`, `dist/`, logs or working copies.
- Before committing: backend tests pass, frontend builds, wording check passes. Report anything you could not run.
- Do not push, open PRs, or deploy unless asked.

## 13. Definition of done

- [ ] Requirement and acceptance criterion met (cite FR/US id)
- [ ] Tests added and the full suite passes
- [ ] Frontend builds; wording check and self-audit pass (if UI touched)
- [ ] Docs and contracts updated together
- [ ] No secrets, no new unapproved dependencies, no unrelated changes
- [ ] Short report: files changed, tests run, open issues
