"""Propose / approve / apply workflow (FR-08, FR-09, FR-10)."""
import secrets

from .. import store, verifier
from ..errors import APIError
from ..models import ApplyRequest, ApplyResult, Finding, RepairProposal, Scan
from . import workspace
from .templates import template_for

SUGGEST_ONLY = {
    "kbd-clickable-not-focusable": "Replace the clickable <div> with a native <button>. This changes structure and behaviour, so a developer should make and test it.",
    "kbd-repeated-focus": "Check whether keyboard users can leave this widget. Focus management is behavioural and needs manual testing.",
    "link-name": "Give the link text that describes its destination.",
    "region": "Wrap page content in landmarks such as <header> and <main>. This is a structural change for a reviewer to decide.",
    "landmark-one-main": "Add a single <main> landmark around the primary content.",
    "heading-order": "Use heading levels that follow the page outline. This is a content decision for a reviewer.",
}

SUGGEST_CODE = {
    "label": '<label for="field-id">Descriptive Label</label>\n<input id="field-id" name="field-name" type="text">',
    "image-alt": '<img src="path/to/image.jpg" alt="Concise description of the image content or purpose">',
    "color-contrast": '/* Ensure contrast ratio >= 4.5:1 for normal text (WCAG AA) */\ncolor: #1a1a1a;\nbackground-color: #ffffff;',
    "html-has-lang": '<html lang="en"> <!-- Use ISO 639-1 code e.g. en, hi, ta -->',
    "button-name": '<button type="button" aria-label="Action Name">\n  Action Name\n</button>',
    "landmark-one-main": '<main id="main-content" role="main">\n  <!-- Primary page content goes here -->\n</main>',
    "region": '<header role="banner">...</header>\n<main role="main">...</main>\n<footer role="contentinfo">...</footer>',
    "heading-order": '<!-- Ensure sequential hierarchy without skipping: <h1> -> <h2> -> <h3> -->',
    "kbd-clickable-not-focusable": '<button type="button" class="btn" onclick="handleClick()">\n  Clickable Action\n</button>',
    "kbd-repeated-focus": '<!-- Avoid cyclical focus traps; allow Tab key to progress forward and Shift+Tab backward -->',
    "link-name": '<a href="/target" aria-label="Descriptive destination">Read more about topic</a>',
}


def get_scan(scan_id: str) -> Scan:
    scan = store.scans.get(scan_id)
    if scan is None:
        raise APIError("not_found", f"Scan {scan_id} was not found. Scans are kept in memory only.", 404)
    return scan


def find(scan: Scan, fp: str) -> Finding:
    for f in scan.violations:
        if f.fingerprint == fp:
            return f
    raise APIError("not_found", "That finding is not part of this scan.", 404)


def _needs_human(scan: Scan, finding: Finding, why: str, proposed_by: str) -> RepairProposal:
    p = RepairProposal(proposalId=store.new_id("prop"), scanId=scan.scanId, fingerprint=finding.fingerprint,
                       template=None, status="needs_human", rationale=why, risk="medium", proposedBy=proposed_by)
    store.put_proposal(p)
    return p


def propose(scan_id: str, fp: str, params: dict[str, str] | None = None, proposed_by: str = "user",
            rationale: str | None = None) -> RepairProposal:
    scan = get_scan(scan_id)
    finding = find(scan, fp)
    if not scan.repairable:
        return _needs_human(scan, finding, "Repairs are only applied to the bundled demo site. For other sites AccessPilot reports and explains but does not change code.", proposed_by)
    tpl = template_for(finding.ruleId, finding.target)
    if tpl is None:
        why = SUGGEST_ONLY.get(finding.ruleId, "No supported repair template for this finding. A developer should review it.")
        return _needs_human(scan, finding, why, proposed_by)
    resolved = tpl.resolve_params(params)
    try:
        d = workspace.diff(workspace.dir_for(scan.workspaceId), tpl, resolved)
    except workspace.PatchError as exc:
        return _needs_human(scan, finding, f"The template no longer matches the source ({exc}).", proposed_by)
    p = RepairProposal(
        proposalId=store.new_id("prop"), scanId=scan_id, fingerprint=fp, template=tpl.id, status="suggested",
        rationale=rationale or tpl.rationale, allowedFiles=[f"demo/{tpl.file}"], risk=tpl.risk, diff=d, params=resolved,
        needsHumanEdit=[p.label for p in tpl.params if p.human_edit], approvalToken=secrets.token_urlsafe(16),
        proposedBy=proposed_by,
    )
    store.put_proposal(p)
    return p


def apply(req: ApplyRequest) -> ApplyResult:
    p = store.proposals.get(req.proposalId)
    if p is None:
        raise APIError("not_found", "Unknown proposal.", 404)
    if p.status != "suggested" or p.template is None:
        raise APIError("not_applicable", f"This proposal is '{p.status}' and cannot be applied.", 409)
    if not req.approved or not secrets.compare_digest(req.approvalToken, p.approvalToken):
        raise APIError("approval_required", "Explicit approval of this exact proposal is required before any change.", 403)
    from .templates import TEMPLATES
    params = TEMPLATES[p.template].resolve_params({**p.params, **req.params})
    result = verifier.verify(p, params, req.approvedBy[:60] or "reviewer")
    p.status = result.status
    p.params = params
    p.approvalToken = ""  # single use
    store.put_result(result)
    return result


def rollback_proposal(workspace_id: str, proposal_id: str) -> dict:
    remaining = workspace.rollback(workspace_id)
    # Reset proposal status to suggested if it was applied
    p = store.proposals.get(proposal_id)
    if p:
        p.status = "suggested"
    return {
        "proposalId": proposal_id,
        "workspaceId": workspace_id,
        "restoredVersion": remaining,
        "status": "rolled_back",
        "message": f"Successfully reverted changes to workspace {workspace_id}.",
    }
