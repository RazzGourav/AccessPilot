// Mirrors backend/app/models.py
export type Impact = "critical" | "serious" | "moderate" | "minor" | null;
export type RepairStatus = "suggested" | "applied" | "verified" | "partially_verified" | "failed" | "needs_human";

export interface Box { x: number; y: number; w: number; h: number }
export interface PageShot { width: number; height: number; truncated: boolean }

export interface TraceEntry { step: string; status: "ok" | "failed" | "skipped" | "partial"; durationMs: number; detail: string }

export interface Finding {
  fingerprint: string; key: string; source: "axe" | "keyboard-heuristic" | "ai-advice";
  ruleId: string; impact: Impact; description: string; help: string; helpUrl: string;
  tags: string[]; wcag: string[]; target: string; snippet: string; failureSummary: string;
  repairTemplate: string | null; needsHumanReview: boolean; box: Box | null;
}

export interface FocusStop { order: number; selector: string; tag: string; role: string; name: string; tabIndex: number; repeated: boolean; box: Box | null }

export interface Coverage {
  scanner: string; scannerVersion: string; tags: string[]; violations: number; incomplete: number;
  passes: number; keyboardStops: number; methods: string[]; notTested: string[];
}

export interface Explanation {
  fingerprint: string; explanation: string; userImpact: string; suggestedAction: string;
  confidence: number; needsHumanReview: boolean; generatedBy: "ai" | "deterministic";
}

export interface Scan {
  scanId: string; status: "completed" | "partial" | "failed"; requestedUrl: string; finalUrl: string; title: string;
  createdAt: string; durationMs: number; scanner: string; scannerVersion: string;
  violations: Finding[]; incomplete: Finding[]; passesCount: number;
  keyboardWalk: { steps: FocusStop[]; limit: number; truncated: boolean; endedReason: string; notes: string[] };
  coverage: Coverage; trace: TraceEntry[]; limitations: string[]; repairable: boolean;
  workspaceId: string | null; explanations: Explanation[]; page: PageShot | null;
}

export interface RepairProposal {
  proposalId: string; scanId: string; fingerprint: string; template: string | null; status: RepairStatus;
  rationale: string; allowedFiles: string[]; risk: "low" | "medium" | "high"; diff: string;
  params: Record<string, string>; needsHumanEdit: string[]; approvalToken: string; proposedBy: "ai" | "deterministic" | "user";
}

export interface ApplyResult {
  proposalId: string; status: RepairStatus; reason: string; afterScanId: string | null; workspaceId: string | null;
  comparison: { beforeId: string; afterId: string; resolved: string[]; remaining: string[]; new: string[]; beforeCount: number; afterCount: number } | null;
  controlPage: { seriousOrCriticalBefore: number; seriousOrCriticalAfter: number; newSeriousOrCritical: string[] } | null;
  approvedBy: string; approvedAt: string;
}

export interface AgentRun {
  scanId: string; aiUsed: boolean; model: string; fallbackReason: string; explanations: Explanation[];
  proposals: RepairProposal[]; needsHuman: { fingerprint: string; reason: string; by: string }[]; trace: TraceEntry[];
}

export interface TemplateInfo {
  id: string; ruleId: string; title: string; file: string; risk: string;
  params: { name: string; label: string; default: string; humanEdit: boolean }[];
}

export interface Health {
  status: string; axeBundled: boolean; demoUrl: string; controlUrl: string;
  ai: { configured: boolean; provider: string | null; model: string | null };
}

export interface ComplianceMapping {
  fingerprint: string; ruleId: string; target: string;
  rpwdSection: string; gigwClause: string; is17802Clause: string;
  statutoryNote: string; statutoryPriority: string;
}

export interface TopBarrier {
  ruleId: string; count: number;
}

export interface ImpactSummary {
  totalBarriers: number;
  barrierCountsBySeverity: Record<string, number>;
  affectedUserGroups: Record<string, number>;
  estimatedRemediationMinutes: number;
  legalExposureLevel: string;
  exposureSummary: string;
  topBarriers: TopBarrier[];
}

export interface ScreenReaderFrame {
  order: number; role: string; name: string; speechText: string; selector: string;
  state: string; box: Box | null;
}

export interface FrustrationMetrics {
  stuckPoints: number; repeatedFocusStops: number; missingAccessibleNames: number;
  tabOrderJumps: number; frustrationRating: "low" | "moderate" | "high" | "severe";
  summary: string;
}

export interface ExperienceSimulation {
  scanId: string; screenReaderLog: ScreenReaderFrame[];
  frustration: FrustrationMetrics; keyboardPathLength: number;
}

export interface SpecialistActivity {
  specialist: string; action: string; status: "ok" | "failed" | "pending" | "skipped";
  detail: string; timestamp: string;
}

export interface MultiAgentRun {
  scanId: string; aiUsed: boolean; coordinatorDecision: string;
  activities: SpecialistActivity[]; explanations: Explanation[]; proposals: RepairProposal[];
  complianceMappings: ComplianceMapping[]; impactSummary: ImpactSummary;
  experienceSimulation?: ExperienceSimulation; trace: TraceEntry[];
}

export interface RollbackResult {
  proposalId: string; workspaceId: string; restoredVersion: number;
  status: string; message: string;
}
