// Session state shared by every page: the current scan, the agent runs, proposals and repair results.
// Held in memory for the browser tab, like the backend's store (DATABASE.md §2).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";
import { useRouter } from "./router";
import type { SessionEvent } from "./timeline";
import type {
  ApplyResult, ComplianceMapping, ExperienceSimulation, Explanation, Finding, Health,
  ImpactSummary, MultiAgentRun, RepairProposal, RepairStatus, Scan, TemplateInfo,
} from "./types";

export type Busy = null | "scan" | "agent" | "propose" | "apply" | "experience" | "multiAgent";

function useSessionState() {
  const { navigate } = useRouter();
  const [health, setHealth] = useState<Health | null>(null);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [url, setUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [scan, setScan] = useState<Scan | null>(null);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [repairStatus, setRepairStatus] = useState<Record<string, RepairStatus>>({});
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [proposal, setProposal] = useState<RepairProposal | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [afterScan, setAfterScan] = useState<Scan | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Multi-agent & simulation state
  const [multiAgentRun, setMultiAgentRun] = useState<MultiAgentRun | null>(null);
  const [experience, setExperience] = useState<ExperienceSimulation | null>(null);
  const [compliance, setCompliance] = useState<ComplianceMapping[]>([]);
  const [impact, setImpact] = useState<ImpactSummary | null>(null);

  useEffect(() => {
    api.health().then((h) => { setHealth(h); setUrl((u) => u || h.demoUrl); }).catch((e) => setError(e.message));
    api.templates().then((t) => setTemplates(t.templates)).catch(() => undefined);
  }, []);

  async function run<T>(kind: Busy, message: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(kind); setError(""); setStatus(message);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message} (${e.code})` : String(e));
      setStatus("");
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  async function startScan() {
    const s = await run("scan", "Scanning in a real browser…", () => api.scan(url.trim(), authorized));
    if (s) {
      setScan(s); setEvents([{ kind: "scan", scan: s }]); setRepairStatus({}); setRejected(new Set()); setSelected(null);
      setProposal(null); setResult(null); setAfterScan(null); setMultiAgentRun(null); setExperience(null); setCompliance([]); setImpact(null);
      setStatus(`Scan complete: ${s.violations.length} findings in ${(s.durationMs / 1000).toFixed(1)} s.`);
    }
    return s;
  }

  async function runAgent() {
    if (!scan) return;
    const r = await run("agent", "Agent is reading the evidence and drafting fixes…", () => api.agent(scan.scanId));
    if (r) {
      setEvents((ev) => [...ev, { kind: "agent", run: r }]);
      setScan({ ...scan, explanations: r.explanations });
      const ready = r.proposals.filter((p) => p.status === "suggested").length;
      setStatus(`${r.aiUsed ? "Agent finished" : "Built-in guidance used"}: ${ready} fixes ready for review.`);
    }
  }

  async function runMultiAgent() {
    if (!scan) return;
    const m = await run("multiAgent", "Coordinating specialized agents (Scanner, Impact, Simulator, Compliance, Fixer)…", () => api.agentMulti(scan.scanId));
    if (m) {
      setMultiAgentRun(m);
      setCompliance(m.complianceMappings);
      setImpact(m.impactSummary);
      if (m.experienceSimulation) setExperience(m.experienceSimulation);
      setScan({ ...scan, explanations: m.explanations });
      setStatus(`Multi-Agent completed: ${m.activities.length} specialist activities synthesized.`);
    }
    return m;
  }

  async function fetchExperience() {
    if (!scan) return;
    const sim = await run("experience", "Simulating assistive technology interaction…", () => api.experience(scan.scanId));
    if (sim) {
      setExperience(sim);
      setStatus(`Assistive simulation generated: ${sim.screenReaderLog.length} announcement frames.`);
    }
    return sim;
  }

  async function fetchCompliance() {
    if (!scan) return;
    const c = await run("scan", "Mapping findings to Indian statutory frameworks…", () => api.compliance(scan.scanId));
    if (c) {
      setCompliance(c.compliance);
    }
  }

  async function fetchImpact() {
    if (!scan) return;
    const imp = await run("scan", "Calculating demographic impact & remediation effort…", () => api.impact(scan.scanId));
    if (imp) {
      setImpact(imp);
    }
  }

  async function rollback(workspaceId: string, proposalId: string) {
    const res = await run("apply", "Reverting changes to prior working copy version…", () => api.rollback(workspaceId, proposalId));
    if (res) {
      setStatus(`Rollback complete. Restored version ${res.restoredVersion}.`);
    }
    return res;
  }

  /** Opens a proposal on the Repairs page. */
  function openProposal(p: RepairProposal) {
    setProposal(p); setParams(p.params); setResult(null);
    navigate("/repairs#review-h");
  }

  async function proposeFor(f: Finding) {
    if (!scan) return;
    const p = await run("propose", "Drafting a repair proposal…", () => api.propose(scan.scanId, f.fingerprint));
    if (p) { openProposal(p); setStatus(p.status === "suggested" ? "Proposal ready for review." : "This finding needs human review."); }
  }

  async function updatePreview() {
    if (!proposal) return;
    const original = proposal;
    const p = await run("propose", "Updating the preview…", () => api.propose(original.scanId, original.fingerprint, params));
    // The server renders the diff for the edited values; approval still applies the same proposal
    // (apply re-validates the edited params), so the timeline keeps one entry per drafted fix.
    if (p) { setProposal({ ...original, diff: p.diff, params: p.params }); setParams(p.params); setStatus("Diff updated with your wording."); }
  }

  async function approve() {
    if (!proposal) return;
    const approved = proposal;
    const r = await run("apply", "Applying to an isolated working copy and re-running the same checks…", () => api.apply(approved, params));
    if (r) {
      setResult(r);
      setRepairStatus((m) => ({ ...m, [approved.proposalId]: r.status }));
      setEvents((ev) => [...ev, { kind: "repair", proposal: { ...approved, params }, result: r }]);
      setProposal(null);
      setStatus(`Re-test finished: ${r.status.replace("_", " ")}.`);
      setAfterScan(null);
      if (r.afterScanId) api.getScan(r.afterScanId).then(setAfterScan).catch(() => undefined);
      requestAnimationFrame(() => document.getElementById("verify-h")?.focus());
    }
  }

  function reject() {
    if (!proposal) return;
    setRejected((s) => new Set(s).add(proposal.proposalId));
    setProposal(null);
    setStatus("Proposal rejected. Nothing was changed.");
  }

  async function continueWith(r: ApplyResult) {
    if (!r.afterScanId) return;
    const s = await run("scan", "Loading the re-tested version…", () => api.getScan(r.afterScanId!));
    if (s) {
      setScan(s); setEvents((ev) => [...ev, { kind: "continue", scan: s }]); setResult(null); setSelected(null);
      setStatus(`Now working on copy ${s.workspaceId}: ${s.violations.length} findings.`);
      navigate("/audit");
    }
  }

  /** From a page-view marker: open the finding on the Findings page. */
  function showFinding(f: Finding) {
    if (!scan) return;
    setSelected(f.fingerprint);
    navigate(`/findings#f-${scan.violations.indexOf(f)}`);
  }

  // Derived values used by several pages.
  const explanations = useMemo(() => new Map<string, Explanation>((scan?.explanations ?? []).map((e) => [e.fingerprint, e])), [scan]);
  const agentRan = events.some((e) => e.kind === "agent" && scan && e.run.scanId === scan.scanId);
  const waiting = events.flatMap((e) => (e.kind === "agent" && scan && e.run.scanId === scan.scanId ? e.run.proposals : []))
    .filter((p) => (repairStatus[p.proposalId] ?? p.status) === "suggested" && !rejected.has(p.proposalId));
  const repairs = events.filter((e): e is Extract<SessionEvent, { kind: "repair" }> => e.kind === "repair");
  const verifiedCount = repairs.filter((e) => e.result.status === "verified").length;
  const modelLabel = health?.ai.configured ? `${health.ai.model}` : "built-in guidance (no model configured)";
  const findingFor = (fp: string) => scan?.violations.find((f) => f.fingerprint === fp);

  return {
    health, templates, url, setUrl, authorized, setAuthorized, scan, events, repairStatus, rejected, proposal, setProposal,
    params, setParams, result, afterScan, selected, setSelected, busy, status, error,
    multiAgentRun, experience, compliance, impact,
    startScan, runAgent, runMultiAgent, fetchExperience, fetchCompliance, fetchImpact, rollback,
    openProposal, proposeFor, updatePreview, approve, reject, continueWith, showFinding,
    explanations, agentRan, waiting, repairs, verifiedCount, modelLabel, findingFor,
  };
}

export type Session = ReturnType<typeof useSessionState>;
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionState();
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}
