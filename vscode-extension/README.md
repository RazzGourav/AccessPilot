# AccessPilot VS Code Extension

**Multi-Agent Accessibility Intelligence, India Statutory Compliance, and Auto-Remediation right inside your IDE.**

---

## Features

- **Real-Time Accessibility Diagnostics**: Analyzes HTML, React (JSX/TSX) on save, flagging accessibility barriers directly in the Problems pane.
- **India Statutory Citations**: Every warning includes references to:
  - Rights of Persons with Disabilities (RPwD) Act 2016
  - Guidelines for Indian Government Websites (GIGW 3.0)
  - Bureau of Indian Standards IS 17802
- **Quick Fixes & Code Actions**: One-click remediation for missing alt text, missing HTML lang codes, unlabelled form controls, and ARIA attributes.
- **Status Bar Integration**: Real-time barrier counter and instant link to the AccessPilot Web Dashboard.
- **Multi-Agent Sync**: Trigger the Coordinator and 5 Specialist agents (Scanner, Impact Analyzer, Real-User Simulator, Compliance Lawyer, Code Fixer) directly from VS Code.

---

## Extension Commands

| Command | Action |
|---------|--------|
| `AccessPilot: Scan Active Document` | Run full accessibility check on the active editor file |
| `AccessPilot: Run Multi-Agent Analysis` | Trigger Coordinator and Specialist agents via API |
| `AccessPilot: Open Web Dashboard` | Open the interactive impact & compliance dashboard |

---

## Extension Settings

- `accesspilot.apiUrl`: Base URL of the AccessPilot server (default: `http://127.0.0.1:8000`).
- `accesspilot.autoScanOnSave`: Run accessibility linter automatically on file save (default: `true`).

---

## Requirements

Requires the local AccessPilot server running:
```bash
powershell ./scripts/start.ps1
```
*(The extension also operates in local heuristic mode when the backend is offline).*
