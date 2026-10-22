import { Icon, type IconName } from "./icons";
import type { ApplyResult, Coverage, Impact, RepairStatus, Scan } from "./types";

const IMPACT_LABEL: Record<string, string> = { critical: "Critical", serious: "Serious", moderate: "Moderate", minor: "Minor" };
const IMPACT_ICON: Record<string, IconName> = { critical: "cross", serious: "alert", moderate: "dot", minor: "ring" };

export function ImpactBadge({ impact }: { impact: Impact }) {
  if (!impact) return <span className="badge badge-review"><Icon name="question" size={12} />Needs review</span>;
  return <span className={`badge badge-${impact}`}><Icon name={IMPACT_ICON[impact]} size={12} />{IMPACT_LABEL[impact]}</span>;
}

const STATUS: Record<RepairStatus, [IconName, string]> = {
  verified: ["check", "Verified by automated re-test"],
  partially_verified: ["alert", "Partially verified"],
  failed: ["cross", "Failed"],
  needs_human: ["question", "Needs human review"],
  suggested: ["clock", "Suggested only"],
  applied: ["clock", "Applied, not yet verified"],
};

export function StatusBadge({ status }: { status: RepairStatus }) {
  const [icon, text] = STATUS[status];
  return <span className={`status status-${status}`}><Icon name={icon} size={12} />{text}</span>;
}

/** One divided strip (app-screens §5): label over value, figures in ink, a severity count in its signal colour only when above zero. */
export function Summary({ scan }: { scan: Scan }) {
  const count = (i: Impact) => scan.violations.filter((f) => f.impact === i).length;
  const cells: [string, number, string][] = [
    ["Critical", count("critical"), "negative"],
    ["Serious", count("serious"), "warning"],
    ["Moderate", count("moderate"), ""],
    ["Minor", count("minor"), ""],
    ["Needs review", count(null), ""],
    ["Incomplete", scan.incomplete.length, ""],
    ["Rules passed", scan.passesCount, ""],
    ["Tab stops", scan.keyboardWalk.steps.length, ""],
  ];
  return (
    <dl className="strip">
      {cells.map(([label, n, tone]) => (
        <div key={label} className="strip-cell">
          <dt>{label}</dt>
          <dd className={`num${n > 0 && tone ? ` tone-${tone}` : ""}`}>{n}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CoveragePanel({ coverage, limitations }: { coverage: Coverage; limitations: string[] }) {
  return (
    <section aria-labelledby="coverage-h" className="card">
      <h2 id="coverage-h">What was checked, and what was not</h2>
      <p className="muted">There is no overall rating: automated checks find only some barriers.</p>
      <div className="two-col">
        <div>
          <h3>Checked</h3>
          <ul>
            {coverage.methods.map((m) => <li key={m}>{m}</li>)}
            <li>{coverage.scanner} {coverage.scannerVersion}, rule tags: {coverage.tags.join(", ")}</li>
            <li>{coverage.violations} findings, {coverage.incomplete} incomplete, {coverage.passes} rules passed, {coverage.keyboardStops} keyboard stops</li>
          </ul>
        </div>
        <div>
          <h3>Not tested, needs a person</h3>
          <ul>{coverage.notTested.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      </div>
      <h3>Limitations</h3>
      <ul>{limitations.map((l) => <li key={l}>{l}</li>)}</ul>
    </section>
  );
}

export function KeyboardPath({ scan }: { scan: Scan }) {
  const kw = scan.keyboardWalk;
  const ended: Record<string, string> = {
    wrapped_to_start: "Focus wrapped back to the first stop.",
    left_document: "Focus left the page after the last stop.",
    repeated_focus_cycle: "Focus kept cycling among the same elements. Inspect manually.",
    no_focusable_stops: "No element received focus.",
    limit_reached: `Stopped at the ${kw.limit}-stop limit.`,
    time_budget_reached: "Stopped at the time budget.",
    not_run: "Keyboard walk was not run.",
  };
  return (
    <section aria-labelledby="kbd-h" className="card">
      <div className="section-header">
        <h2 id="kbd-h">Keyboard Focus Path</h2>
        <span className="chip">{ended[kw.endedReason] ?? kw.endedReason}</span>
      </div>
      {kw.notes.map((n) => <p key={n} className="note">{n}</p>)}
      {kw.steps.length > 0 && (
        <ol className="kbd">
          {kw.steps.map((s) => (
            <li key={s.order} className={s.repeated ? "repeated" : ""}>
              <code>{s.selector}</code>
              <span className="muted"> {s.role || s.tag}</span>
              {s.name ? <span> — “{s.name}”</span> : <span className="warn"> — no name found</span>}
              {s.repeated && <span className="tag tag-warn">repeat, inspect manually</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function Diff({ text }: { text: string }) {
  return (
    <pre className="diff" tabIndex={0} aria-label="Proposed diff">
      {text.split("\n").map((line, i) => {
        const cls = line.startsWith("+++") || line.startsWith("---") ? "meta" : line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : line.startsWith("@@") ? "meta" : "";
        return <span key={i} className={cls}>{line + "\n"}</span>;
      })}
    </pre>
  );
}

export function Verification({ result, onContinue, headingRef, busy, children }: {
  result: ApplyResult; onContinue: () => void; headingRef: React.RefObject<HTMLHeadingElement>; busy: boolean; children?: React.ReactNode;
}) {
  const c = result.comparison;
  return (
    <section aria-labelledby="verify-h" className="card verify">
      <h2 id="verify-h" tabIndex={-1} ref={headingRef}>Verification</h2>
      <p className="stamp"><StatusBadge status={result.status} /></p>
      <p>{result.reason}</p>
      {children}
      {c && (
        <dl className="strip strip-3">
          <div className="strip-cell"><dt>Resolved</dt><dd className={`num${c.resolved.length ? " tone-positive" : ""}`}>{c.resolved.length}</dd></div>
          <div className="strip-cell"><dt>Remaining</dt><dd className="num">{c.remaining.length}</dd></div>
          <div className="strip-cell"><dt>New</dt><dd className={`num${c.new.length ? " tone-negative" : ""}`}>{c.new.length}</dd></div>
        </dl>
      )}
      {c && c.resolved.length > 0 && <p>Resolved: {c.resolved.map((k) => <code key={k} className="chip">{k}</code>)}</p>}
      {c && c.new.length > 0 && <p>New: {c.new.map((k) => <code key={k} className="chip">{k}</code>)}</p>}
      {result.controlPage && (
        <p>
          Control page regression gate: serious or critical findings {result.controlPage.seriousOrCriticalBefore} before,{" "}
          {result.controlPage.seriousOrCriticalAfter} after.{" "}
          {result.controlPage.newSeriousOrCritical.length ? `New: ${result.controlPage.newSeriousOrCritical.join(", ")}.` : "No regression."}
        </p>
      )}
      <p className="muted">Approved by {result.approvedBy} at {result.approvedAt}. Applied to isolated working copy {result.workspaceId}; the original demo was not changed.</p>
      {result.afterScanId && (
        <button type="button" className="primary" onClick={onContinue} disabled={busy}>Continue with this version</button>
      )}
    </section>
  );
}
