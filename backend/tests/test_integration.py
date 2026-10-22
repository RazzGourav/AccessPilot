"""Real browser against the bundled Golden Site and Control Page (served by the app itself)."""
from app.fixer import templates
from app.fixer.templates import Template

from .conftest import BASE

GOLDEN = f"{BASE}/demo/demo.html"
CONTROL = f"{BASE}/demo/control.html"


def scan(http, url):
    r = http.post("/api/scan", json={"url": url, "authorized": True})
    assert r.status_code == 200, r.text
    return r.json()


def finding(s, rule):
    return next(f for f in s["violations"] if f["ruleId"] == rule)


def test_health(http):
    body = http.get("/api/health").json()
    assert body["status"] == "ok" and body["axeBundled"]


def test_site_pages_deep_link(http):
    from app import config
    if not (config.FRONTEND_DIST / "index.html").exists():
        import pytest
        pytest.skip("frontend not built")
    for page in ("how-it-works", "audit", "findings", "repairs", "report", "accessibility"):
        r = http.get(f"/{page}")
        assert r.status_code == 200 and '<div id="root">' in r.text, page
    assert http.get("/not-a-page").status_code == 404


def test_error_shape(http):
    r = http.post("/api/scan", json={"url": GOLDEN, "authorized": False})
    assert r.status_code == 400 and r.json()["error"]["code"] == "consent_required"
    r = http.post("/api/scan", json={"url": "file:///etc/passwd", "authorized": True})
    assert r.json()["error"]["code"] == "invalid_url"


def test_golden_site_detects_seeded_defects(http):
    s = scan(http, GOLDEN)
    rules = {f["ruleId"] for f in s["violations"]}
    assert {"label", "image-alt", "color-contrast", "html-has-lang", "button-name", "heading-order",
            "landmark-one-main", "kbd-clickable-not-focusable", "kbd-repeated-focus"} <= rules
    assert s["repairable"] and s["coverage"]["notTested"]
    kw = s["keyboardWalk"]
    assert 0 < len(kw["steps"]) <= 30 and kw["endedReason"] == "repeated_focus_cycle"
    assert [t["step"] for t in s["trace"]][:4] == ["target_validated", "browser_launched", "page_loaded", "axe_completed"]


def test_page_capture_locates_findings_and_focus_stops(http):
    s = scan(http, GOLDEN)
    assert s["page"]["width"] == 1280 and s["page"]["height"] >= 600
    assert finding(s, "label")["box"]["w"] > 0
    assert all(st["box"] for st in s["keyboardWalk"]["steps"])
    r = http.get(f"/api/scans/{s['scanId']}/screenshot")
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg" and r.content[:2] == b"\xff\xd8"
    assert "page_captured" in [t["step"] for t in s["trace"]]
    # the image itself never leaves through the export
    assert "screenshot" not in http.get(f"/api/reports/{s['scanId']}").text.lower()


def test_control_page_has_no_serious_or_critical(http):
    s = scan(http, CONTROL)
    assert not [f for f in s["violations"] if f["impact"] in ("serious", "critical")]
    assert not s["repairable"]


def _propose(http, s, rule):
    r = http.post("/api/repair/propose", json={"scanId": s["scanId"], "fingerprint": finding(s, rule)["fingerprint"]})
    assert r.status_code == 200, r.text
    return r.json()


def test_repair_requires_approval_then_verifies(http):
    s = scan(http, GOLDEN)
    p = _propose(http, s, "label")
    assert p["status"] == "suggested" and p["diff"].startswith("--- a/demo/demo.html")
    r = http.post("/api/repair/apply", json={"proposalId": p["proposalId"], "approved": True, "approvalToken": "wrong"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "approval_required"
    r = http.post("/api/repair/apply", json={"proposalId": p["proposalId"], "approved": True, "approvalToken": p["approvalToken"]}).json()
    assert r["status"] == "verified", r
    cmp = r["comparison"]
    assert "label|#email" in cmp["resolved"] and not cmp["new"]
    assert len(cmp["resolved"]) + len(cmp["remaining"]) == cmp["beforeCount"]
    assert len(cmp["remaining"]) + len(cmp["new"]) == cmp["afterCount"]
    # the approval token is single-use
    again = http.post("/api/repair/apply", json={"proposalId": p["proposalId"], "approved": True, "approvalToken": p["approvalToken"]})
    assert again.status_code == 409


def test_unsupported_finding_needs_human(http):
    s = scan(http, GOLDEN)
    assert _propose(http, s, "heading-order")["status"] == "needs_human"


def test_report_only_targets_never_get_a_patch(http):
    s = scan(http, CONTROL)
    s_golden = scan(http, GOLDEN)
    # fake a finding lookup on the non-demo scan: proposing anything there must not yield a diff
    if s["violations"]:
        assert _propose(http, s, s["violations"][0]["ruleId"])["status"] == "needs_human"
    assert s_golden["repairable"] and not s["repairable"]


def test_bad_patch_is_failed_not_verified(http, monkeypatch):
    bad = Template(id="T1", rule_id="label", target_pattern=r"^#email$", file="demo.html",
                   find='<input type="email" id="email" name="email" autocomplete="email">',
                   replace='<span>Email</span><input type="email" id="email" name="email" autocomplete="email">',
                   title="bad", rationale="bad")
    monkeypatch.setitem(templates.TEMPLATES, "T1", bad)
    s = scan(http, GOLDEN)
    p = _propose(http, s, "label")
    r = http.post("/api/repair/apply", json={"proposalId": p["proposalId"], "approved": True, "approvalToken": p["approvalToken"]}).json()
    assert r["status"] == "failed" and "still reports" in r["reason"]


def test_regression_gate_catches_control_page_damage(http, monkeypatch):
    regressing = Template(id="T3", rule_id="color-contrast", target_pattern="email-help|helper", file="demo.css",
                          find="color: #b4b4b4;", replace="color: #57606a; }} label {{ color: #e6e6e6;",
                          title="regressing", rationale="regressing")
    monkeypatch.setitem(templates.TEMPLATES, "T3", regressing)
    s = scan(http, GOLDEN)
    p = _propose(http, s, "color-contrast")
    r = http.post("/api/repair/apply", json={"proposalId": p["proposalId"], "approved": True, "approvalToken": p["approvalToken"]}).json()
    assert r["status"] == "failed"
    assert r["controlPage"]["newSeriousOrCritical"]


def test_export_has_scope_and_no_secrets(http):
    s = scan(http, GOLDEN)
    http.post("/api/agent/run", json={"scanId": s["scanId"]})
    text = http.get(f"/api/reports/{s['scanId']}").text
    assert "limitations" in text and "notTested" in text
    for secret in ("approvalToken", "ghp_", "github_pat_", "api_key", "addEventListener('keydown'"):  # last = full page source
        assert secret not in text
