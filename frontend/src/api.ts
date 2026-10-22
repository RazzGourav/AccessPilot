import type {
  AgentRun, ApplyResult, ComplianceMapping, ExperienceSimulation, Health,
  ImpactSummary, MultiAgentRun, RepairProposal, RollbackResult, Scan, TemplateInfo,
} from "./types";

export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, body === undefined ? undefined : {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network", "Cannot reach the AccessPilot API. Is the backend running on port 8000?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(err.code ?? "http_" + res.status, err.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  health: () => call<Health>("/api/health"),
  templates: () => call<{ templates: TemplateInfo[] }>("/api/repair/templates"),
  scan: (url: string, authorized: boolean) => call<Scan>("/api/scan", { url, authorized }),
  getScan: (id: string) => call<Scan>(`/api/scans/${id}`),
  agent: (scanId: string) => call<AgentRun>("/api/agent/run", { scanId }),
  agentMulti: (scanId: string) => call<MultiAgentRun>("/api/agent/run-multi", { scanId }),
  experience: (scanId: string) => call<ExperienceSimulation>(`/api/scans/${scanId}/experience`),
  compliance: (scanId: string) => call<{ scanId: string; compliance: ComplianceMapping[] }>(`/api/scans/${scanId}/compliance`),
  impact: (scanId: string) => call<ImpactSummary>(`/api/scans/${scanId}/impact`),
  rollback: (workspaceId: string, proposalId: string) =>
    call<RollbackResult>("/api/repair/rollback", { workspaceId, proposalId }),
  propose: (scanId: string, fingerprint: string, params: Record<string, string> = {}) =>
    call<RepairProposal>("/api/repair/propose", { scanId, fingerprint, params }),
  apply: (p: RepairProposal, params: Record<string, string>) =>
    call<ApplyResult>("/api/repair/apply", { proposalId: p.proposalId, approved: true, approvalToken: p.approvalToken, approvedBy: "reviewer", params }),
  reportUrl: (scanId: string) => `/api/reports/${scanId}`,
  screenshotUrl: (scanId: string) => `/api/scans/${scanId}/screenshot`,
};
