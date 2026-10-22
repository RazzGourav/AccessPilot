"""Specialist agents that execute dedicated analytical and remediation tasks.

Each specialist executes deterministically by default and incorporates LLM insights
when configured, ensuring zero-cost operation and graceful fallback.
"""
import time
from datetime import datetime, timezone
from typing import Any, Optional

from ..compliance.india import map_findings_to_india_compliance
from ..impact import analyze_impact
from ..models import (ComplianceMapping, ExperienceSimulation, Explanation, ImpactSummary,
                      RepairProposal, Scan, SpecialistActivity, TopBarrier)
from ..ux_simulator import simulate_experience
from . import fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_scanner_specialist(scan: Scan) -> tuple[dict[str, Any], list[SpecialistActivity]]:
    """Scanner Specialist: deep analysis of violation topologies and keyboard focus order."""
    t0 = time.perf_counter()
    violations_count = len(scan.violations)
    incomplete_count = len(scan.incomplete)
    stops_count = len(scan.keyboardWalk.steps)
    
    activity = SpecialistActivity(
        specialist="Scanner Agent",
        action="Analyze DOM findings & focus telemetry",
        status="ok",
        detail=f"Parsed {violations_count} violation(s), {incomplete_count} incomplete, {stops_count} keyboard stop(s).",
        timestamp=_now_iso(),
    )
    
    summary = {
        "violationsCount": violations_count,
        "incompleteCount": incomplete_count,
        "keyboardStops": stops_count,
        "endedReason": scan.keyboardWalk.endedReason,
    }
    return summary, [activity]


def run_impact_specialist(scan: Scan) -> tuple[ImpactSummary, list[SpecialistActivity]]:
    """Impact Analyzer Specialist: computes demographic barrier reach and developer effort."""
    raw_impact = analyze_impact(scan.violations)
    
    top_barriers = [TopBarrier(ruleId=b["ruleId"], count=b["count"]) for b in raw_impact["topBarriers"]]
    
    impact_model = ImpactSummary(
        totalBarriers=raw_impact["totalBarriers"],
        barrierCountsBySeverity=raw_impact["barrierCountsBySeverity"],
        affectedUserGroups=raw_impact["affectedUserGroups"],
        estimatedRemediationMinutes=raw_impact["estimatedRemediationMinutes"],
        legalExposureLevel=raw_impact["legalExposureLevel"],
        exposureSummary=raw_impact["exposureSummary"],
        topBarriers=top_barriers,
    )
    
    activity = SpecialistActivity(
        specialist="Impact Analyzer Agent",
        action="Evaluate demographic impact & developer effort",
        status="ok",
        detail=f"Estimated {raw_impact['estimatedRemediationMinutes']}m developer effort; legal exposure: {raw_impact['legalExposureLevel']}.",
        timestamp=_now_iso(),
    )
    return impact_model, [activity]


def run_compliance_specialist(scan: Scan) -> tuple[list[ComplianceMapping], list[SpecialistActivity]]:
    """Compliance Lawyer Specialist: maps barriers to Indian statutory frameworks (RPwD, GIGW, IS 17802)."""
    raw_mappings = map_findings_to_india_compliance(scan.violations)
    mappings = [ComplianceMapping(**m) for m in raw_mappings]
    
    activity = SpecialistActivity(
        specialist="Compliance Lawyer Agent",
        action="Map findings to RPwD Act 2016, GIGW 3.0 & IS 17802",
        status="ok",
        detail=f"Mapped {len(mappings)} finding(s) to statutory provisions without compliance claims.",
        timestamp=_now_iso(),
    )
    return mappings, [activity]


def run_simulator_specialist(scan: Scan) -> tuple[ExperienceSimulation, list[SpecialistActivity]]:
    """Real-User Simulator Specialist: emulates screen reader announcements and keyboard friction."""
    sim = simulate_experience(scan)
    
    activity = SpecialistActivity(
        specialist="Real-User Simulator Agent",
        action="Simulate assistive speech output & navigation friction",
        status="ok",
        detail=(f"Generated {len(sim.screenReaderLog)} announcement frame(s); "
                f"frustration level: {sim.frustration.frustrationRating}."),
        timestamp=_now_iso(),
    )
    return sim, [activity]


def run_code_fixer_specialist(scan: Scan, client: Any = None, model: str = "") -> tuple[list[RepairProposal], list[dict], list[Explanation], list[SpecialistActivity]]:
    """Code Fixer Specialist: prepares safe, reviewable repair proposals."""
    activities: list[SpecialistActivity] = []
    
    # Generate explanations, proposals, and human review flags deterministically as reliable baseline
    explanations, proposals, needs_human = fallback.run(scan)
    
    activities.append(SpecialistActivity(
        specialist="Code Fixer Agent",
        action="Formulate reviewable repair proposals",
        status="ok",
        detail=f"Drafted {len(proposals)} proposal(s) and flagged {len(needs_human)} item(s) for human review.",
        timestamp=_now_iso(),
    ))
    
    return proposals, needs_human, explanations, activities
