"""Tests for multi-agent system, India compliance, impact, UX simulator, and rollback."""
import pytest
from app import coverage
from app.agent.coordinator import run_multi_agent
from app.compliance.india import get_india_mapping_for_rule, map_findings_to_india_compliance
from app.fixer import service, workspace
from app.fixer.templates import TEMPLATES
from app.impact import analyze_impact
from app.models import Box, Finding, FocusStop, KeyboardWalk, Scan
from app.ux_simulator import generate_speech_text, simulate_experience


def _mock_scan() -> Scan:
    findings = [
        Finding(
            fingerprint="fp1",
            key="image-alt|img",
            source="axe",
            ruleId="image-alt",
            impact="critical",
            description="Images must have alternate text",
            help="Images must have alternate text",
            target="img#hero",
            repairTemplate="T2",
        ),
        Finding(
            fingerprint="fp2",
            key="color-contrast|#cta",
            source="axe",
            ruleId="color-contrast",
            impact="serious",
            description="Elements must have sufficient color contrast",
            help="Elements must meet minimum contrast ratio",
            target="#cta",
            repairTemplate="T3",
        ),
    ]
    stops = [
        FocusStop(order=1, selector="a#home", tag="a", role="link", name="Home", box=Box(x=10, y=10, w=100, h=40)),
        FocusStop(order=2, selector="input#email", tag="input", role="textbox", name="", box=Box(x=10, y=60, w=200, h=40)),
        FocusStop(order=3, selector="button#submit", tag="button", role="button", name="Submit", box=Box(x=10, y=120, w=120, h=40)),
    ]
    walk = KeyboardWalk(steps=stops, limit=30, truncated=False, endedReason="wrapped_to_start")
    cov = coverage.build("4.10.2", len(findings), 0, 10, len(stops))
    
    return Scan(
        scanId="scan_test_1",
        status="completed",
        requestedUrl="http://127.0.0.1:8000/demo/demo.html",
        finalUrl="http://127.0.0.1:8000/demo/demo.html",
        title="Test Page",
        createdAt="2026-10-21T00:00:00Z",
        durationMs=100,
        violations=findings,
        keyboardWalk=walk,
        coverage=cov,
        repairable=False,
    )


def test_india_compliance_mapping():
    mapping = get_india_mapping_for_rule("image-alt")
    assert "Section 42" in mapping["rpwd_section"]
    assert "GIGW 3.0" in mapping["gigw_clause"]
    assert "IS 17802" in mapping["is_17802_clause"]


def test_compliance_no_false_claims():
    scan = _mock_scan()
    results = map_findings_to_india_compliance(scan.violations)
    assert len(results) == 2
    for r in results:
        # AGENTS.md Rule 6: no score, percentage, compliant, fully accessible
        text = (r["statutoryNote"] + " " + r["rpwdSection"] + " " + r["gigwClause"]).lower()
        assert "score" not in text
        assert "compliant" not in text
        assert "fully accessible" not in text


def test_impact_analysis():
    scan = _mock_scan()
    impact = analyze_impact(scan.violations)
    assert impact["totalBarriers"] == 2
    assert impact["affectedUserGroups"]["visual"] >= 2
    assert impact["estimatedRemediationMinutes"] > 0
    assert impact["legalExposureLevel"] in {"high", "medium", "low"}
    # Rule 6 check
    summary_lower = impact["exposureSummary"].lower()
    assert "score" not in summary_lower
    assert "compliant" not in summary_lower


def test_ux_simulator_speech_and_frustration():
    scan = _mock_scan()
    sim = simulate_experience(scan)
    assert len(sim.screenReaderLog) == 3
    # First stop is Home link
    assert "Link, Home" in sim.screenReaderLog[0].speechText
    # Second stop is unlabeled input
    assert "Edit text, blank" in sim.screenReaderLog[1].speechText
    assert sim.frustration.frustrationRating in {"low", "moderate", "high", "severe"}
    assert "score" not in sim.frustration.summary.lower()


def test_multi_agent_coordinator():
    scan = _mock_scan()
    result = run_multi_agent(scan)
    assert result.scanId == scan.scanId
    assert len(result.activities) >= 5
    assert len(result.complianceMappings) == 2
    assert result.impactSummary.totalBarriers == 2
    assert result.experienceSimulation is not None
    assert len(result.trace) >= 5


def test_workspace_rollback(tmp_path):
    # Setup test file
    test_file = tmp_path / "demo.html"
    original_html = '<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>'
    test_file.write_text(original_html, encoding="utf-8")
    
    # Register in workspace lookup
    wid = "ws_test_rollback"
    workspace._dirs[wid] = tmp_path
    
    # Apply a change
    tpl = TEMPLATES["T4"]  # language template (replaces <html> with <html lang="params">)
    workspace.apply(tmp_path, tpl, {"lang": "hi"})
    assert 'lang="hi"' in test_file.read_text(encoding="utf-8")
    
    # Rollback
    remaining = workspace.rollback(wid)
    assert remaining == 0
    assert '<html>' in test_file.read_text(encoding="utf-8")
