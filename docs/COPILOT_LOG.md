# AI-assisted development log

Record real usage only (PRD §14, FR-16). Do not back-fill or invent entries.

## Disclosure

| Date | Tool | What it did | Human review |
|------|------|-------------|--------------|
| 2026-10-20 | Claude Code (Anthropic) with the `design-taste-frontend` skill | Brand redesign in the skill's "product performs" direction: self-hosted Stack Sans, forest and lime fields, live keyboard stepper, findings board, call-and-response, measured timing chart, fragment cells, two credited open-licence photographs, page heroes. | Inspector 0 FAIL on every page; self-audit 0 serious/critical on every page in both themes; 37 tests; screenshots reviewed at desktop and phone. |
| 2026-10-20 | Claude Code (Anthropic) | Light-by-default theme with a switch, feedback motion; then the multi-page site (FR-24): router, shared session, seven pages, deep-link routes, real product captures for Home, accessibility statement. | Self-audit on every page in light and dark (0 serious/critical), 37 tests, taste lint and inspector, screenshots reviewed. Team approved scope via questions. |
| 2026-10-20 | Claude Code (Anthropic) | Researched agent-approval UX and accessibility-tool visuals; added page capture with element boxes (backend), the Page view with Barriers / Tab order overlays, before/after crops, accessible-name change, stage tracker, Next step panel and first-run explainer. | Self-audit (caught and fixed a WCAG 2.5.8 target-size issue in the new markers), 36 tests, taste lint and inspector, light/dark screenshots reviewed. |
| 2026-10-20 | Claude Code (Anthropic) with the `design-taste-frontend` skill (Leonxlnx/taste-skill) | Installed and reviewed the skill; inspected the UI; restyled it to the skill's achromatic-ledger app style (tokens, outline icon set, one primary per context, finding sentence, compact intake). | Before/after inspector runs (0 FAIL), self-audit, tests, light/dark/phone screenshots reviewed. |
| 2026-10-20 | Claude Code (Anthropic) | Generated docs (PRD, DESIGN, ARCHITECTURE, DATABASE, API, AGENTS, IMPLEMENTATION_PLAN, PROMPT_PLAYBOOK) and UI direction B: agent timeline (`timeline.tsx`), tool-call summaries in the agent trace. | Team chose direction B; tests, wording check and keyboard self-audit run. |
| 2026-10-20 | Claude Code (Anthropic) | Generated the initial foundation from the PRD: FastAPI backend (scanner, keyboard walk, policy, fixer, verifier, agent), Golden Site, React UI, tests, setup scripts. | Plan reviewed and approved by the team before generation; test suite and self-audit run. Team to review all code before the event. |

## GitHub Copilot entries

Add one row per meaningful Copilot session (Copilot Chat, inline completions, Copilot agent mode, or Copilot code review).

| Date | Who | Task | Prompt summary | What Copilot produced | Tests run | Human edits |
|------|-----|------|----------------|-----------------------|-----------|-------------|
| 2026-10-26 | Copilot SDK in VS Code | Documentation and release preparation | Push the current AccessPilot changes with an updated README and Mermaid system architecture | Added aligned Mermaid architecture diagrams to README and ARCHITECTURE; reviewed the existing worktree and prepared the complete change set for commit/push | 43 backend tests passed; frontend build passed; wording check passed; `git diff --check` passed | Human requested the GitHub push and reviewed the release scope |

### Suggested Copilot tasks (good evidence, real value)
- Agent mode: "Add template T6 for `link-name`…" following `.github/copilot-instructions.md`, including the demo defect and a test.
- Copilot Chat `/tests`: edge cases for `policy.check_url` (IPv6 loopback, DNS names resolving to private IPs, redirects).
- Copilot Chat `/explain` on `verifier.verify` for the pitch's architecture slide.
- Copilot code review on the event-day branch.
- P1 features: replay mode banner (FR-22), HTML report, SSE trace stream (FR-24 P1).
