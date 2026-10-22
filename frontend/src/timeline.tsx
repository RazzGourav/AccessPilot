// Agent timeline (DESIGN.md §5, direction B): every step that actually ran in this session,
// built only from scan traces, agent traces and apply results — never simulated.
import type { ReactNode } from "react";
import { StatusBadge } from "./components";
import { Icon, type IconName } from "./icons";
import type { AgentRun, ApplyResult, RepairProposal, RepairStatus, Scan, TraceEntry } from "./types";

export type SessionEvent =
  | { kind: "scan"; scan: Scan }
  | { kind: "continue"; scan: Scan }
  | { kind: "agent"; run: AgentRun }
  | { kind: "repair"; proposal: RepairProposal; result: ApplyResult };

type State = "done" | "waiting" | "pending" | "failed" | "warn";

interface Step {
  id: string;
  state: State;
  title: ReactNode;
  meta?: string;
  body?: ReactNode;
  actions?: ReactNode;
  minor?: boolean; // low-level step shown as a compact row
  ai?: boolean;
}

interface Group { id: string; label: string; steps: Step[] }

const STATE_TEXT: Record<State, string> = { done: "Done", waiting: "Waiting for you", pending: "Not started", failed: "Failed", warn: "Needs attention" };
const NODE_ICON: Record<State, IconName | null> = { done: "check", waiting: "dot", pending: null, failed: "cross", warn: "alert" };

const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${n} ms`);
const clock = (iso: string) => iso.slice(11, 19);
const ruleOf = (key: string) => key.split("|")[0];
const targetOf = (key: string) => key.split("|").slice(1).join("|");

function scanSteps(scan: Scan): Step[] {
  const label: Record<string, string> = {
    target_validated: "Checked the target and your consent",
    browser_launched: "Opened headless Chromium",
    page_loaded: "Loaded the page",
    page_captured: "Captured the page for the evidence view",
  };
  return scan.trace.map((t, i): Step => {
    const base = { id: `${scan.scanId}-${i}`, meta: ms(t.durationMs), state: (t.status === "ok" ? "done" : t.status === "partial" ? "warn" : "failed") as State };
    if (t.step === "axe_completed") {
      const severe = scan.violations.filter((f) => f.impact === "critical" || f.impact === "serious").length;
      return { ...base, title: "Ran axe-core accessibility rules",
        body: <>{scan.violations.length} findings, {severe} critical or serious · {scan.passesCount} rules passed · {scan.incomplete.length} incomplete</> };
    }
    if (t.step === "keyboard_walk_completed") {
      const kw = scan.keyboardWalk;
      const cycle = kw.endedReason === "repeated_focus_cycle";
      const unreachable = scan.violations.filter((f) => f.ruleId === "kbd-clickable-not-focusable").length;
      return { ...base, state: cycle || unreachable ? "warn" : base.state, title: "Walked the page with the Tab key",
        body: <>{kw.steps.length} focus stops{cycle && " · focus kept cycling in one area"}{unreachable > 0 && ` · ${unreachable} clickable element${unreachable === 1 ? "" : "s"} never reached`}</> };
    }
    return { ...base, minor: true, title: label[t.step] ?? t.step, body: t.detail || undefined };
  });
}

function agentStep(t: TraceEntry, i: number, runId: string): Step {
  const base = { id: `${runId}-${i}`, meta: ms(t.durationMs), state: (t.status === "ok" ? "done" : "failed") as State, ai: true };
  const key = t.detail.split(" · ")[0];
  const on = key.includes("|") ? <> for <code>{ruleOf(key)}</code> on <code>{targetOf(key)}</code></> : null;
  switch (t.step.replace(/^tool:/, "")) {
    case "list_findings": return { ...base, title: "Read the findings list", body: t.detail };
    case "get_evidence": return { ...base, title: <>Read the evidence{on}</>, body: t.status === "failed" ? t.detail : undefined };
    case "list_repair_templates": return { ...base, title: "Looked up the supported repair templates", body: t.detail };
    case "draft_repair": {
      const [tpl, k, status] = t.detail.split(" · ");
      return { ...base, title: <>Drafted a fix{k ? <> for <code>{ruleOf(k)}</code> on <code>{targetOf(k)}</code></> : null}</>,
        body: t.status === "failed" ? t.detail : `Template ${tpl} · ${status === "suggested" ? "ready for review" : "needs a person"}` };
    }
    case "mark_needs_human": return { ...base, state: t.status === "ok" ? "warn" : "failed", title: <>Flagged for a person{on}</> };
    case "submit_report": return { ...base, title: "Wrote plain-language explanations", body: t.detail };
    case "agent_completed": return { ...base, title: "Agent finished", body: t.detail };
    case "agent_error": return { ...base, ai: false, title: "Model call failed", body: t.detail };
    case "deterministic_fallback": return { ...base, ai: false, state: "warn", title: "Used built-in guidance instead of a model", body: t.detail };
    default:
      if (t.step.startsWith("llm_turn_")) return { ...base, minor: true, title: `Model call ${t.step.slice(9)}`, body: t.detail };
      return { ...base, title: t.step, body: t.detail };
  }
}

export interface TimelineProps {
  events: SessionEvent[];
  currentScanId: string;
  status: Record<string, RepairStatus>;
  rejected: Set<string>;
  busy: boolean;
  modelLabel: string;
  onReview: (p: RepairProposal) => void;
  working: boolean;
}

export function Timeline(props: TimelineProps) {
  const { events, currentScanId, status, rejected, busy } = props;
  const scans = new Map<string, Scan>();
  events.forEach((e) => { if (e.kind === "scan" || e.kind === "continue") scans.set(e.scan.scanId, e.scan); });
  const findingHelp = (scanId: string, fp: string) => scans.get(scanId)?.violations.find((f) => f.fingerprint === fp)?.help ?? ruleOf(fp);

  const groups: Group[] = [];
  let repairNo = 0;
  events.forEach((e, idx) => {
    if (e.kind === "scan") {
      groups.push({ id: e.scan.scanId, label: `Scan · ${e.scan.title || e.scan.finalUrl}`, steps: scanSteps(e.scan) });
    } else if (e.kind === "continue") {
      groups.push({ id: `c-${e.scan.scanId}`, label: `Working copy ${e.scan.workspaceId}`, steps: [{
        id: `c-${e.scan.scanId}`, state: "done", title: "Continued with the re-tested version",
        body: <>{e.scan.violations.length} findings remain. The original demo is unchanged.</>,
      }] });
    } else if (e.kind === "agent") {
      const r = e.run;
      const runId = `a${idx}`;
      const steps = r.trace.map((t, i) => agentStep(t, i, runId));
      for (const p of r.proposals) {
        const st = status[p.proposalId] ?? p.status;
        const stale = p.scanId !== currentScanId;
        let state: State = "waiting";
        let actions: ReactNode = null;
        let note: ReactNode = <>{p.needsHumanEdit.length > 0 && <>Check the wording of: {p.needsHumanEdit.join(", ")}. </>}{p.rationale}</>;
        if (rejected.has(p.proposalId)) { state = "pending"; note = "You rejected this change. Nothing was modified."; }
        else if (st !== "suggested") { state = st === "verified" ? "done" : st === "failed" ? "failed" : "warn"; note = <StatusBadge status={st} />; }
        else if (stale) { state = "pending"; note = "Drafted for an earlier version of the page."; }
        else actions = <button type="button" onClick={() => props.onReview(p)} disabled={busy}>Review<span className="sr-only"> fix {p.template} for {findingHelp(p.scanId, p.fingerprint)}</span></button>;
        steps.push({ id: p.proposalId, state, ai: p.proposedBy === "ai", title: <>{state === "waiting" ? "Fix ready" : "Fix drafted"}: {findingHelp(p.scanId, p.fingerprint)} <span className="tag">{p.template}</span></>, body: note, actions });
      }
      if (r.needsHuman.length) {
        steps.push({ id: `${runId}-nh`, state: "warn", title: `${r.needsHuman.length} findings need a person`,
          body: "No safe automatic repair exists for these. They stay in the findings list as Needs human review." });
      }
      groups.push({ id: runId, label: `Agent · ${r.aiUsed ? r.model : "built-in guidance"}`, steps });
    } else {
      repairNo += 1;
      const { proposal: p, result: r } = e;
      const c = r.comparison;
      const steps: Step[] = [
        { id: `${p.proposalId}-ok`, state: "done", meta: clock(r.approvedAt), title: `You approved the change (${r.approvedBy})`, body: <>Template {p.template} on {p.allowedFiles.join(", ")}</> },
      ];
      if (!c) {
        steps.push({ id: `${p.proposalId}-apply`, state: "failed", title: "Patch could not be applied", body: r.reason });
      } else {
        steps.push(
          { id: `${p.proposalId}-apply`, state: "done", title: "Applied to an isolated working copy", body: <>Copy <code>{r.workspaceId}</code>; the original demo was not touched</> },
          { id: `${p.proposalId}-rescan`, state: c.remaining.includes(p.fingerprint.slice(0, p.fingerprint.lastIndexOf("|"))) ? "failed" : "done",
            title: "Re-ran the same checks", body: <>{c.resolved.length} resolved · {c.remaining.length} remaining · {c.new.length} new</> },
        );
        if (r.controlPage) {
          const bad = r.controlPage.newSeriousOrCritical.length > 0;
          steps.push({ id: `${p.proposalId}-gate`, state: bad ? "failed" : "done", title: "Regression gate on the control page",
            body: <>Serious or critical: {r.controlPage.seriousOrCriticalBefore} before → {r.controlPage.seriousOrCriticalAfter} after</> });
        }
      }
      steps.push({
        id: `${p.proposalId}-result`, state: r.status === "verified" ? "done" : r.status === "failed" ? "failed" : "warn",
        title: <StatusBadge status={r.status} />, body: r.reason,
      });
      groups.push({ id: p.proposalId, label: `Repair ${repairNo} · ${p.template} · ${findingHelp(p.scanId, p.fingerprint)}`, steps });
    }
  });

  // Next action for the current version: run the agent if it has not run on it yet.
  const lastScanIdx = events.map((e) => e.kind === "scan" || e.kind === "continue").lastIndexOf(true);
  const agentRan = events.slice(lastScanIdx).some((e) => e.kind === "agent" && e.run.scanId === currentScanId);
  const lastIsRepair = events[events.length - 1]?.kind === "repair";
  if (props.working) {
    // Honest progress: only "the agent is running" is shown; its real steps appear when it returns.
    groups.push({ id: "working", label: `Agent · ${props.modelLabel}`, steps: [{
      id: "working", state: "waiting", title: <span className="tl-working">Agent is reading the evidence<span className="dots" aria-hidden="true"><i /><i /><i /></span></span>,
      body: "Each tool call it makes will be listed here with its measured time.",
    }] });
  } else if (!agentRan && !lastIsRepair) {
    groups.push({ id: "next", label: `Agent · ${props.modelLabel}`, steps: [{
      id: "next-agent", state: "waiting", title: "Remediation Agent Ready",
      body: "Inspects findings and drafts repair proposals.",
    }] });
  }

  return (
    <div className="timeline">
      {groups.map((g) => (
        <section key={g.id} className="tl-group" aria-label={g.label}>
          <h3 className="tl-label">{g.label}</h3>
          <ol className="tl-steps">
            {g.steps.map((s, i) => (
              <li key={s.id} className={`tl-step tl-${s.state}${s.minor ? " tl-minor" : ""}`} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                <span className="tl-node" aria-hidden="true">{!s.minor && NODE_ICON[s.state] && <Icon name={NODE_ICON[s.state]!} size={12} />}</span>
                <div className="tl-content">
                  <div className="tl-head">
                    <span className="sr-only">{STATE_TEXT[s.state]}: </span>
                    <span className="tl-title">{s.title}</span>
                    {s.minor && s.body && <span className="tl-body">{s.body}</span>}
                    {s.ai && <span className="tag tag-ai"><Icon name="spark" size={11} />AI</span>}
                    {s.meta && <span className="tl-meta">{s.meta}</span>}
                  </div>
                  {!s.minor && s.body && <div className="tl-body">{s.body}</div>}
                  {s.actions && <div className="tl-actions">{s.actions}</div>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
