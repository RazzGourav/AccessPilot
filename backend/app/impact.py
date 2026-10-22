"""Calculates demographic impact estimates and remediation effort.

Uses empirical demographic distributions:
- World Health Organization (WHO): ~16% of global population experiences significant disability.
- Census / Ministry of Social Justice (India): ~26.8 million documented individuals with disabilities,
  plus temporary and aging-related impairments.

Rule 6 Compliance:
No scores, no percentages of 'compliance', no '100% accessible' claims.
Only barrier counts, affected user categories, and remediation time estimates.
"""
from typing import Any

CATEGORY_BY_RULE: dict[str, list[str]] = {
    "image-alt": ["visual", "cognitive"],
    "color-contrast": ["visual", "aging"],
    "label": ["visual", "cognitive", "motor"],
    "html-has-lang": ["visual", "cognitive"],
    "heading-order": ["visual", "cognitive"],
    "keyboard-trap": ["motor", "visual"],
    "link-name": ["visual", "cognitive"],
    "button-name": ["visual", "motor", "cognitive"],
    "aria-allowed-attr": ["visual"],
    "document-title": ["visual", "cognitive"],
    "bypass": ["motor", "visual"],
}

ESTIMATED_MINUTES_PER_FINDING: dict[str, int] = {
    "image-alt": 5,
    "color-contrast": 15,
    "label": 10,
    "html-has-lang": 5,
    "heading-order": 20,
    "keyboard-trap": 45,
    "link-name": 10,
    "button-name": 10,
    "aria-allowed-attr": 15,
    "document-title": 5,
    "bypass": 30,
}
DEFAULT_MINUTES = 15


def analyze_impact(violations: list[Any]) -> dict[str, Any]:
    """Analyze the barrier distribution across assistive user groups and estimate remediation effort."""
    categories_affected: dict[str, int] = {
        "visual": 0,
        "motor": 0,
        "cognitive": 0,
        "aging": 0,
    }
    
    total_estimated_minutes = 0
    barrier_counts_by_severity: dict[str, int] = {
        "critical": 0,
        "serious": 0,
        "moderate": 0,
        "minor": 0,
    }
    
    rule_counts: dict[str, int] = {}
    
    for v in violations:
        rule_id = getattr(v, "ruleId", None) or (v.get("ruleId") if isinstance(v, dict) else "unknown")
        impact = getattr(v, "impact", None) or (v.get("impact") if isinstance(v, dict) else "moderate") or "moderate"
        
        if impact in barrier_counts_by_severity:
            barrier_counts_by_severity[impact] += 1
            
        rule_counts[rule_id] = rule_counts.get(rule_id, 0) + 1
        
        cats = CATEGORY_BY_RULE.get(rule_id, ["visual", "motor"])
        for c in cats:
            if c in categories_affected:
                categories_affected[c] += 1
                
        mins = ESTIMATED_MINUTES_PER_FINDING.get(rule_id, DEFAULT_MINUTES)
        total_estimated_minutes += mins

    # Exposure classification based on severe barrier counts
    critical_count = barrier_counts_by_severity.get("critical", 0)
    serious_count = barrier_counts_by_severity.get("serious", 0)
    
    if critical_count > 0:
        exposure_level = "high"
        statutory_summary = "Critical operational barriers identified that impede keyboard or assistive technology users."
    elif serious_count > 0:
        exposure_level = "medium"
        statutory_summary = "Serious presentation or labelling barriers identified that degrade user autonomy."
    elif len(violations) > 0:
        exposure_level = "low"
        statutory_summary = "Moderate or minor barriers identified."
    else:
        exposure_level = "none"
        statutory_summary = "No automated barriers detected in scanned scope."

    return {
        "totalBarriers": len(violations),
        "barrierCountsBySeverity": barrier_counts_by_severity,
        "affectedUserGroups": categories_affected,
        "estimatedRemediationMinutes": total_estimated_minutes,
        "legalExposureLevel": exposure_level,
        "exposureSummary": statutory_summary,
        "topBarriers": sorted([{"ruleId": k, "count": v} for k, v in rule_counts.items()], key=lambda x: x["count"], reverse=True)[:5],
    }
