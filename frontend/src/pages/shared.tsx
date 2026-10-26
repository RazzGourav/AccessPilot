// Pieces shared by the app pages: live status, empty state, and the results header.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api";
import { Summary } from "../components";
import { Icon } from "../icons";
import { Link } from "../router";
import { useSession } from "../session";
import type { Explanation, Scan } from "../types";

export function StatusArea() {
  const { busy, status, error } = useSession();
  return (
    <>
      <div aria-live="polite" className="status-line">{busy ? <span className="spinner" aria-hidden="true" /> : null}{status}</div>
      {error && <div role="alert" className="error">{error}</div>}
    </>
  );
}

/** Shown on Findings, Repairs and Report before any scan exists. */
export function NoScan({ what }: { what: string }) {
  return (
    <section className="card empty" aria-labelledby="empty-h">
      <div className="empty-lead">
        <div className="empty-icon" aria-hidden="true">
          <Icon name="clock" size={20} />
        </div>
        <div className="empty-body">
          <h2 id="empty-h">Nothing to show yet</h2>
          <p>{what} appear here after a scan. Scans and verified working copies are kept in memory for this session.</p>
          <div className="empty-actions">
            <Link to="/audit" className="btn primary">Start an audit</Link>
            <Link to="/how" className="btn">How it works</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The screen's one finding (app-screens §2.2): severe barriers, and the keyboard blocker if there is one. */
export function findingSentence(scan: Scan): string {
  const severe = scan.violations.filter((f) => f.impact === "critical" || f.impact === "serious").length;
  const blocked = scan.violations.find((f) => f.ruleId === "kbd-clickable-not-focusable")?.description.match(/^"(.+?)"/)?.[1];
  const head = severe ? `${severe} severe barriers detected` : "No severe barriers detected";
  return blocked ? `${head} · Keyboard trapped before “${blocked}”` : head;
}

export function ResultsHeader({ scan }: { scan: Scan }) {
  const { agentRan, repairs, waiting, verifiedCount } = useSession();
  const finding = useMemo(() => findingSentence(scan), [scan]);
  return (
    <section aria-labelledby="results-h" className="card">
      <h2 id="results-h">Target: {scan.title || scan.finalUrl}</h2>
      <p className="finding">{finding}</p>
      <ol className="stages" aria-label="Progress">
        <li className="done"><Icon name="check" size={12} /><span>Scanned</span><span className="stage-n">{scan.violations.length} findings</span></li>
        <li className={agentRan ? "done" : "now"}><Icon name={agentRan ? "check" : "dot"} size={12} /><span>Explained</span><span className="stage-n">{agentRan ? "by the agent" : "next"}</span></li>
        <li className={repairs.length ? "done" : agentRan ? "now" : "todo"}><Icon name={repairs.length ? "check" : agentRan ? "dot" : "ring"} size={12} /><span>Approved</span><span className="stage-n">{agentRan ? `${repairs.length} of ${repairs.length + waiting.length} fixes` : "after the agent"}</span></li>
        <li className={verifiedCount ? "done" : "todo"}><Icon name={verifiedCount ? "check" : "ring"} size={12} /><span>Verified by re-test</span><span className="stage-n">{verifiedCount}</span></li>
      </ol>
      <Summary scan={scan} />
      <p className="meta-line muted">
        <code>{scan.finalUrl}</code> · {(scan.durationMs / 1000).toFixed(1)}s · {scan.scanner} {scan.scannerVersion}
        {scan.workspaceId && <> · working copy <code>{scan.workspaceId}</code></>}
        {" · "}<a href={api.reportUrl(scan.scanId)} download>Export JSON report</a>
      </p>
    </section>
  );
}

/** The forest band that opens every page except Home: the page's h1, one sentence, optional live facts. */
export function PageHero({ title, lede, children, app }: { title: string; lede?: string; children?: ReactNode; app?: boolean }) {
  return (
    <div className={`page-hero${app ? " page-hero-app" : ""}`}>
      <div className="wrap">
        <h1 tabIndex={-1}>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
    </div>
  );
}

/** Live facts for a page hero, from the current scan. */
export function ScanFacts({ scan }: { scan: Scan }) {
  const severe = scan.violations.filter((f) => f.impact === "critical" || f.impact === "serious").length;
  return (
    <p className="hero-meta">
      <span><strong>{scan.violations.length}</strong> findings</span>
      <span><strong>{severe}</strong> critical or serious</span>
      <span><strong>{scan.passesCount}</strong> rules passed</span>
      <span><strong>{scan.keyboardWalk.steps.length}</strong> Tab stops</span>
    </p>
  );
}

/** Scroll reveal for content pages: parts of each section rise in as they enter. The hidden start state
 *  is added by script only, so with no script, reduced motion or print everything is simply visible. */
export function useReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    els.forEach((el) => el.classList.add("reveal-pending"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("reveal-in");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** Stagger delay for a revealed element. */
export const delay = (n: number) => ({ "--d": `${n * 80}ms` } as React.CSSProperties);

/** Generates a complete AI prompt tailored for Copilot, Cursor, or Claude Code to fix all detected barriers. */
export function generateAiFixPrompt(scan: Scan, explanations: Map<string, Explanation>): string {
  const critical = scan.violations.filter((f) => f.impact === "critical").length;
  const serious = scan.violations.filter((f) => f.impact === "serious").length;
  const moderate = scan.violations.filter((f) => f.impact === "moderate").length;
  const minor = scan.violations.filter((f) => f.impact === "minor").length;

  const header = `# Accessibility Remediation Request (WCAG 2.2 AA Compliance)

Target: ${scan.title || scan.finalUrl}
URL: ${scan.finalUrl}
Audit Scope: ${scan.violations.length} total barriers (${critical} critical, ${serious} serious, ${moderate} moderate, ${minor} minor)
Engine: ${scan.scanner} ${scan.scannerVersion} (WCAG 2.0/2.1/2.2 AA)

## Objective:
Refactor the affected components to resolve all ${scan.violations.length} barriers listed below according to WCAG 2.2 Level AA guidelines and statutory accessibility standards. Preserve existing layout, design tokens, and application behavior while fixing the code.

---

## Detailed List of Issues to Fix:
`;

  const items = scan.violations.map((f, idx) => {
    const ex = explanations.get(f.fingerprint);
    let item = `### Barrier [${idx + 1}]: ${f.help} (${f.ruleId})
- Impact: ${f.impact ? f.impact.toUpperCase() : "Review"}
- Standards: WCAG ${f.wcag.join(", ") || "Best practice"}
- Target DOM Selector: \`${f.target}\``;

    if (f.snippet) {
      item += `\n- Current Code Snippet:\n\`\`\`html\n${f.snippet.trim()}\n\`\`\``;
    }
    if (f.failureSummary) {
      item += `\n- Issue Diagnostic: ${f.failureSummary.replace(/\n+/g, " ").trim()}`;
    }
    if (ex) {
      item += `\n- User Impact: ${ex.userImpact}\n- Recommended Action: ${ex.suggestedAction}`;
      if (ex.suggestedCode) {
        item += `\n- Suggested Code Replacement:\n\`\`\`html\n${ex.suggestedCode.trim()}\n\`\`\``;
      }
    }
    return item;
  }).join("\n\n---\n\n");

  const footer = `
---

## Required Code Adjustments:
1. Ensure all form controls have explicitly associated visible \`<label for="...">\` tags.
2. Provide concise, descriptive \`alt\` text for informative images; use \`alt=""\` for decorative assets.
3. Ensure color contrast reaches at least 4.5:1 for standard text and 3:1 for large text/icons.
4. Ensure interactive controls use native elements (\`<button>\`, \`<a>\`) or proper \`role\` with keyboard event handlers (Enter/Space).
5. Prevent keyboard focus cycling traps and ensure clear focus visibility.
6. Provide complete replacement snippets for the affected files.`;

  return `${header}\n${items}\n${footer}`;
}

/** Card providing a 1-click copyable prompt for AI assistants (Copilot, Cursor, Claude Code) to fix all findings. */
export function AiFixPromptCard({ scan }: { scan: Scan }) {
  const { explanations } = useSession();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const promptText = useMemo(() => generateAiFixPrompt(scan, explanations), [scan, explanations]);

  function handleCopy() {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (scan.violations.length === 0) return null;

  return (
    <section className="card ai-prompt-card" aria-labelledby="prompt-card-h">
      <div className="ai-prompt-header">
        <div className="ai-prompt-title-group">
          <span className="badge badge-ai"><Icon name="spark" size={13} /> AI Developer Fix Prompt</span>
          <h2 id="prompt-card-h" className="ai-prompt-title">Master Prompt to Fix All {scan.violations.length} Issues</h2>
          <p className="ai-prompt-desc">
            {scan.repairable
              ? "Copy this complete prompt directly into Cursor, GitHub Copilot, or Claude Code to refactor your codebase."
              : "For public URLs: AccessPilot cannot directly modify external code. Copy this complete prompt into your AI assistant to apply all recommended fixes."}
          </p>
        </div>
        <div className="ai-prompt-actions">
          <button type="button" className="btn primary" onClick={handleCopy}>
            <Icon name={copied ? "check" : "spark"} size={14} />
            {copied ? "Copied to clipboard!" : "Copy prompt for AI assistants"}
          </button>
          <button type="button" className="btn" onClick={() => setOpen(!open)}>
            {open ? "Hide prompt preview" : "Preview prompt"}
          </button>
        </div>
      </div>
      {open && (
        <div className="ai-prompt-preview">
          <pre className="code-fix-snippet">{promptText}</pre>
        </div>
      )}
    </section>
  );
}
