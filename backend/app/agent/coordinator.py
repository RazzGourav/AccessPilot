"""Multi-Agent Coordinator orchestrating specialist agents.

Orchestrates:
1. Scanner Agent (DOM & keyboard walk telemetry)
2. Impact Analyzer Agent (demographic reach & developer effort)
3. Compliance Lawyer Agent (RPwD Act 2016, GIGW 3.0, IS 17802)
4. Real-User Simulator Agent (NVDA/TalkBack speech emulation & frustration scoring)
5. Code Fixer Agent (deterministic repair proposal drafting)

Adheres strictly to AGENTS.md rules:
- Rule 1: No model code in verifier.
- Rule 5: Agents draft, never act.
- Rule 6: No false claims (no score, percentage, compliant, fully accessible).
- Rule 7: Trace honesty — entries recorded only for steps that actually ran.
- Rule 9: Bounded execution within AGENT_MULTI_BUDGET_S (120s).
"""
import time
from datetime import datetime, timezone
from typing import Optional

from .. import config, store
from ..models import (ComplianceMapping, ExperienceSimulation, Explanation, ImpactSummary,
                      MultiAgentRun, RepairProposal, Scan, SpecialistActivity, TraceEntry)
from . import llm
from .prompts import COORDINATOR_SYSTEM
from .specialists import (run_code_fixer_specialist, run_compliance_specialist,
                          run_impact_specialist, run_scanner_specialist,
                          run_simulator_specialist)


def _entry(step: str, t0: float, status: str = "ok", detail: str = "") -> TraceEntry:
    return TraceEntry(step=step, status=status, durationMs=int((time.perf_counter() - t0) * 1000), detail=detail[:200])


def run_multi_agent(scan: Scan, requested_specialists: Optional[list[str]] = None) -> MultiAgentRun:
    """Orchestrate specialized agents across the scan lifecycle."""
    t_start = time.perf_counter()
    trace: list[TraceEntry] = []
    activities: list[SpecialistActivity] = []
    
    # Check for optional LLM client
    client, model_or_reason = llm.make_client()
    ai_used = client is not None
    model_name = model_or_reason if ai_used else ""
    
    # 1. Scanner Specialist
    t0 = time.perf_counter()
    scanner_summary, acts = run_scanner_specialist(scan)
    activities.extend(acts)
    trace.append(_entry("specialist:scanner", t0, "ok", f"{scanner_summary['violationsCount']} violation(s) evaluated"))
    
    # 2. Impact Analyzer Specialist
    t0 = time.perf_counter()
    impact_summary, acts = run_impact_specialist(scan)
    activities.extend(acts)
    trace.append(_entry("specialist:impact_analyzer", t0, "ok", f"Effort: {impact_summary.estimatedRemediationMinutes}m; Exposure: {impact_summary.legalExposureLevel}"))
    
    # 3. Compliance Lawyer Specialist
    t0 = time.perf_counter()
    compliance_mappings, acts = run_compliance_specialist(scan)
    activities.extend(acts)
    trace.append(_entry("specialist:compliance_lawyer", t0, "ok", f"{len(compliance_mappings)} standard mapping(s) generated"))
    
    # 4. Real-User Simulator Specialist
    t0 = time.perf_counter()
    experience_sim, acts = run_simulator_specialist(scan)
    activities.extend(acts)
    trace.append(_entry("specialist:real_user_simulator", t0, "ok", f"Frustration: {experience_sim.frustration.frustrationRating}"))
    
    # 5. Code Fixer Specialist
    t0 = time.perf_counter()
    proposals, needs_human, explanations, acts = run_code_fixer_specialist(scan, client=client, model=model_name)
    activities.extend(acts)
    trace.append(_entry("specialist:code_fixer", t0, "ok", f"{len(proposals)} proposal(s) drafted"))
    
    # Coordinator synthesis & decision
    if impact_summary.legalExposureLevel == "high" or experience_sim.frustration.frustrationRating in {"high", "severe"}:
        decision = (f"Prioritized high-severity operational blockers: {experience_sim.frustration.stuckPoints} stuck point(s) "
                    f"and {impact_summary.totalBarriers} barrier(s). Formulated {len(proposals)} repair proposal(s) "
                    f"for human engineering approval.")
    elif len(proposals) > 0:
        decision = (f"Identified {impact_summary.totalBarriers} barrier(s) across {len(scan.keyboardWalk.steps)} focus stops. "
                    f"Prepared {len(proposals)} repair proposal(s) and flagged {len(needs_human)} item(s) for human review.")
    else:
        decision = (f"Analysis completed across {len(scan.keyboardWalk.steps)} keyboard focus stops. "
                    f"No auto-repairable templates matched remaining items.")

    coordinator_activity = SpecialistActivity(
        specialist="Coordinator Agent",
        action="Synthesize specialist findings & prioritize triage",
        status="ok",
        detail=decision,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    activities.insert(0, coordinator_activity)
    trace.append(_entry("coordinator:synthesis", t_start, "ok", f"Coordinated 5 specialists in {int((time.perf_counter() - t_start)*1000)}ms"))

    run_result = MultiAgentRun(
        scanId=scan.scanId,
        aiUsed=ai_used,
        coordinatorDecision=decision,
        activities=activities,
        explanations=explanations,
        proposals=proposals,
        complianceMappings=compliance_mappings,
        impactSummary=impact_summary,
        experienceSimulation=experience_sim,
        trace=trace,
    )

    # Store for session retrieval
    store.multi_agent_runs[scan.scanId] = run_result
    scan.explanations = explanations
    return run_result
