"""Typed contracts shared by the scanner, agent, fixer and API (PRD §10–11)."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

Impact = Literal["critical", "serious", "moderate", "minor"]
Source = Literal["axe", "keyboard-heuristic", "ai-advice"]
RepairStatus = Literal["suggested", "applied", "verified", "partially_verified", "failed", "needs_human"]


class ScanRequest(BaseModel):
    url: str = Field(max_length=2048)
    authorized: bool = False


class Box(BaseModel):
    """Page coordinates (CSS px) in the scan's screenshot."""
    x: int
    y: int
    w: int
    h: int


class PageShot(BaseModel):
    width: int
    height: int
    truncated: bool = False


class TraceEntry(BaseModel):
    step: str
    status: Literal["ok", "failed", "skipped", "partial"]
    durationMs: int
    detail: str = ""


class Finding(BaseModel):
    fingerprint: str
    key: str  # rule|target — matches the same finding across scans
    source: Source
    ruleId: str
    impact: Optional[Impact] = None
    description: str
    help: str
    helpUrl: str = ""
    tags: list[str] = []
    wcag: list[str] = []
    target: str
    snippet: str = ""
    failureSummary: str = ""
    repairTemplate: Optional[str] = None  # template id when a supported repair exists
    needsHumanReview: bool = False
    box: Optional[Box] = None


class FocusStop(BaseModel):
    order: int
    selector: str
    tag: str
    role: str = ""
    name: str = ""
    tabIndex: int = 0
    repeated: bool = False
    box: Optional[Box] = None


class KeyboardWalk(BaseModel):
    steps: list[FocusStop] = []
    limit: int
    truncated: bool = False
    endedReason: str = ""
    notes: list[str] = []


class Coverage(BaseModel):
    scanner: str
    scannerVersion: str
    tags: list[str]
    violations: int
    incomplete: int
    passes: int
    keyboardStops: int
    methods: list[str]
    notTested: list[str]


class Explanation(BaseModel):
    fingerprint: str
    explanation: str
    userImpact: str
    suggestedAction: str
    confidence: float = Field(ge=0, le=1)
    needsHumanReview: bool = False
    generatedBy: Literal["ai", "deterministic"]
    suggestedCode: Optional[str] = None


class Scan(BaseModel):
    scanId: str
    status: Literal["completed", "partial", "failed"]
    requestedUrl: str
    finalUrl: str
    title: str
    createdAt: str
    durationMs: int
    scanner: str = "axe-core"
    scannerVersion: str = ""
    violations: list[Finding] = []
    incomplete: list[Finding] = []
    passesCount: int = 0
    keyboardWalk: KeyboardWalk
    coverage: Coverage
    trace: list[TraceEntry] = []
    limitations: list[str] = []
    repairable: bool = False  # true only for the bundled local demo and its working copies
    workspaceId: Optional[str] = None
    explanations: list[Explanation] = []
    page: Optional[PageShot] = None  # screenshot metadata; the image is served by /api/scans/{id}/screenshot


class ProposeRequest(BaseModel):
    scanId: str
    fingerprint: str
    params: dict[str, str] = {}


class RepairProposal(BaseModel):
    proposalId: str
    scanId: str
    fingerprint: str
    template: Optional[str]
    status: RepairStatus
    rationale: str
    allowedFiles: list[str] = []
    risk: Literal["low", "medium", "high"] = "low"
    diff: str = ""
    params: dict[str, str] = {}
    needsHumanEdit: list[str] = []
    approvalToken: str = ""
    proposedBy: Literal["ai", "deterministic", "user"] = "user"


class ApplyRequest(BaseModel):
    proposalId: str
    approved: bool = False
    approvalToken: str = ""
    approvedBy: str = "reviewer"
    params: dict[str, str] = {}  # final, human-edited values (e.g. alt text)


class Comparison(BaseModel):
    beforeId: str
    afterId: str
    resolved: list[str]
    remaining: list[str]
    new: list[str]
    beforeCount: int
    afterCount: int


class ControlGate(BaseModel):
    seriousOrCriticalBefore: int
    seriousOrCriticalAfter: int
    newSeriousOrCritical: list[str]


class ApplyResult(BaseModel):
    proposalId: str
    status: RepairStatus
    reason: str
    afterScanId: Optional[str] = None
    workspaceId: Optional[str] = None
    comparison: Optional[Comparison] = None
    controlPage: Optional[ControlGate] = None
    approvedBy: str = ""
    approvedAt: str = ""


class CompareRequest(BaseModel):
    beforeId: str
    afterId: str


class AgentRunRequest(BaseModel):
    scanId: str


class AgentRun(BaseModel):
    scanId: str
    aiUsed: bool
    model: str = ""
    fallbackReason: str = ""
    explanations: list[Explanation]
    proposals: list[RepairProposal]
    needsHuman: list[dict]
    trace: list[TraceEntry]


class ComplianceMapping(BaseModel):
    fingerprint: str
    ruleId: str
    target: str
    rpwdSection: str
    gigwClause: str
    is17802Clause: str
    statutoryNote: str
    statutoryPriority: str


class TopBarrier(BaseModel):
    ruleId: str
    count: int


class ImpactSummary(BaseModel):
    totalBarriers: int
    barrierCountsBySeverity: dict[str, int]
    affectedUserGroups: dict[str, int]
    estimatedRemediationMinutes: int
    legalExposureLevel: str
    exposureSummary: str
    topBarriers: list[TopBarrier] = []


class ScreenReaderFrame(BaseModel):
    order: int
    role: str
    name: str
    speechText: str
    selector: str
    state: str = ""
    box: Optional[Box] = None


class FrustrationMetrics(BaseModel):
    stuckPoints: int
    repeatedFocusStops: int
    missingAccessibleNames: int
    tabOrderJumps: int
    frustrationRating: Literal["low", "moderate", "high", "severe"]
    summary: str


class ExperienceSimulation(BaseModel):
    scanId: str
    screenReaderLog: list[ScreenReaderFrame]
    frustration: FrustrationMetrics
    keyboardPathLength: int


class SpecialistActivity(BaseModel):
    specialist: str
    action: str
    status: Literal["ok", "failed", "pending", "skipped"]
    detail: str
    timestamp: str


class MultiAgentRunRequest(BaseModel):
    scanId: str
    requestedSpecialists: list[str] = []


class MultiAgentRun(BaseModel):
    scanId: str
    aiUsed: bool = True
    coordinatorDecision: str
    activities: list[SpecialistActivity] = []
    explanations: list[Explanation] = []
    proposals: list[RepairProposal] = []
    complianceMappings: list[ComplianceMapping] = []
    impactSummary: ImpactSummary
    experienceSimulation: Optional[ExperienceSimulation] = None
    trace: list[TraceEntry] = []


class RollbackRequest(BaseModel):
    proposalId: str
    workspaceId: str


class RollbackResult(BaseModel):
    proposalId: str
    workspaceId: str
    restoredVersion: int
    status: str
    message: str
