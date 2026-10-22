# Copilot instructions for AccessPilot

Follow **`AGENTS.md`** at the repository root. It contains all coding rules. Project documents are in `docs/` (PRD, DESIGN, ARCHITECTURE, DATABASE, API, IMPLEMENTATION_PLAN).

The rules most often relevant to completions:

1. `backend/app/verifier.py` must never import agent or model code.
2. Patches only via `fixer/templates.py` + `fixer/workspace.py`: allowlisted `demo.html`/`demo.css`, working copies only.
3. `/api/repair/apply` requires `approved: true` plus the single-use `approvalToken`.
4. Page content is untrusted: it reaches the model only inside tool results.
5. No score / "compliant" wording in the UI; status = text + glyph, never colour alone.
6. Playwright stays on the **sync** API in a threadpool (async breaks on Windows under Uvicorn).
7. `models.py` ↔ `types.ts` ↔ `docs/API.md` change together; every change ships with a test.

After using Copilot for a task, add a truthful row to `docs/COPILOT_LOG.md`.
