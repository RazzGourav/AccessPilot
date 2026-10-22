"""Fast tests: policy, fingerprints, templates, allowlist, coverage wording. No browser."""
from pathlib import Path

import pytest

from app import coverage, fingerprint, policy
from app.errors import APIError
from app.fixer import workspace
from app.fixer.templates import TEMPLATES, Template, template_for
from app.scanner import wcag_criteria


@pytest.mark.parametrize("url", ["ftp://example.com", "javascript:alert(1)", "example.com", "http://"])
def test_rejects_bad_scheme(url):
    with pytest.raises(APIError) as e:
        policy.check_url(url)
    assert e.value.code == "invalid_url"


@pytest.mark.parametrize("url", ["http://10.0.0.5/", "http://192.168.1.1/", "http://169.254.169.254/latest/meta-data", "http://0.0.0.0/"])
def test_rejects_private_targets(url):
    with pytest.raises(APIError) as e:
        policy.check_url(url)
    assert e.value.code == "target_not_allowed"


def test_consent_required():
    with pytest.raises(APIError) as e:
        policy.check_request("http://127.0.0.1:8765/demo/demo.html", False)
    assert e.value.code == "consent_required"


def test_loopback_respects_flag(monkeypatch):
    from app import config
    monkeypatch.setattr(config, "ALLOW_LOCALHOST", False)
    with pytest.raises(APIError) as e:
        policy.check_url("http://127.0.0.1:8000/")
    assert e.value.code == "target_not_allowed"


def test_fingerprint_key_is_stable_when_snippet_changes():
    fp1, key1 = fingerprint.make("label", "#email", "<input id=email>")
    fp2, key2 = fingerprint.make("label", "#email", "<input  id=email aria-describedby=x>")
    assert key1 == key2 and fp1 != fp2
    assert fingerprint.key_of(fp1) == key1
    assert fingerprint.normalise_target([["#host", "  .inner  "]]) == "#host >>> .inner"


def test_wcag_criteria_parsing():
    assert wcag_criteria(["wcag2a", "wcag111", "wcag1410", "best-practice"]) == ["1.1.1", "1.4.10"]


def test_template_matching_and_unsupported():
    assert template_for("label", "#email").id == "T1"
    assert template_for("label", "#full-name") is None
    assert template_for("heading-order", "h4") is None


def test_template_params_are_validated_and_escaped():
    t2 = TEMPLATES["T2"]
    with pytest.raises(APIError):
        t2.resolve_params({"altText": "<script>alert(1)</script>"})
    with pytest.raises(APIError):
        t2.resolve_params({"onerror": "x"})
    assert 'alt="Tom &amp; Jerry &quot;cat&quot;"' in t2.render({"altText": 'Tom & Jerry "cat"'})


def test_allowlist_rejects_other_files(tmp_path: Path):
    (tmp_path / "secrets.txt").write_text("a")
    evil = Template(id="TX", rule_id="x", target_pattern=".", file="secrets.txt", find="a", replace="b", title="", rationale="")
    with pytest.raises(APIError) as e:
        workspace.apply(tmp_path, evil, {})
    assert e.value.code == "path_not_allowed"
    traversal = Template(id="TY", rule_id="x", target_pattern=".", file="../demo.html", find="a", replace="b", title="", rationale="")
    with pytest.raises(APIError):
        workspace.apply(tmp_path, traversal, {})


def test_original_demo_is_never_patched():
    from app import config
    with pytest.raises(APIError) as e:
        workspace.apply(config.DEMO_DIR, TEMPLATES["T4"], {"lang": "en"})
    assert e.value.code == "path_not_allowed"


def test_patch_error_when_template_does_not_match(tmp_path: Path):
    (tmp_path / "demo.html").write_text("<html lang='en'></html>")
    with pytest.raises(workspace.PatchError):
        workspace.apply(tmp_path, TEMPLATES["T4"], {"lang": "en"})


def test_coverage_has_no_score_or_compliance_claim():
    text = " ".join(coverage.NOT_TESTED + coverage.LIMITATIONS).lower()
    assert "score" not in text
    assert "compliant" not in text


def test_verifier_does_not_import_the_model():
    src = (Path(__file__).parent.parent / "app" / "verifier.py").read_text(encoding="utf-8")
    assert "agent" not in src.split('"""', 2)[2] and "openai" not in src and "llm" not in src
