"""Deterministic verification (FR-11, PRD §9.4, §9.6).

This module must never import the LLM adapter or agent: verification status comes only from re-running
the same automated checks.
"""
from datetime import datetime, timezone

from . import fingerprint, scanner, store
from .fixer import workspace
from .fixer.templates import TEMPLATES
from .models import ApplyResult, Comparison, ControlGate, RepairProposal, Scan

SEVERE = ("serious", "critical")
_control_cache: dict[str, Scan] = {}


def compare(before: Scan, after: Scan) -> Comparison:
    b = {f.key for f in before.violations}
    a = {f.key for f in after.violations}
    return Comparison(
        beforeId=before.scanId, afterId=after.scanId,
        resolved=sorted(b - a), remaining=sorted(b & a), new=sorted(a - b),
        beforeCount=len(b), afterCount=len(a),
    )


def _severe_keys(scan: Scan) -> set[str]:
    return {f.key for f in scan.violations if f.impact in SEVERE}


def _control_scan(workspace_id: str) -> Scan:
    if workspace_id not in _control_cache:
        _control_cache[workspace_id] = scanner.run_scan(workspace.url_for(workspace_id, "control.html"), with_keyboard=False)
    return _control_cache[workspace_id]


def verify(proposal: RepairProposal, params: dict[str, str], approved_by: str) -> ApplyResult:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    base = dict(proposalId=proposal.proposalId, approvedBy=approved_by, approvedAt=now)
    before = store.scans[proposal.scanId]
    source_id = before.workspaceId or workspace.ORIGINAL
    tpl = TEMPLATES[proposal.template]

    wid, wdir = workspace.create_from(workspace.dir_for(source_id))
    try:
        workspace.apply(wdir, tpl, params)
    except workspace.PatchError as exc:
        return ApplyResult(status="failed", reason=f"Patch did not apply: {exc}", workspaceId=wid, **base)

    after = scanner.run_scan(workspace.url_for(wid), repairable=True, workspace_id=wid)
    cmp = compare(before, after)

    ctrl_before, ctrl_after = _control_scan(source_id), _control_scan(wid)
    ctrl_new = sorted(_severe_keys(ctrl_after) - _severe_keys(ctrl_before))
    gate = ControlGate(seriousOrCriticalBefore=len(_severe_keys(ctrl_before)),
                       seriousOrCriticalAfter=len(_severe_keys(ctrl_after)), newSeriousOrCritical=ctrl_new)

    target = fingerprint.key_of(proposal.fingerprint)
    after_impact = {f.key: f.impact for f in after.violations}
    new_severe = [k for k in cmp.new if after_impact.get(k) in SEVERE]
    new_other = [k for k in cmp.new if k not in new_severe]

    if target in cmp.remaining:
        status, reason = "failed", "The originating check still reports this issue after the patch."
    elif new_severe or ctrl_new:
        status, reason = "failed", "The targeted issue is gone, but a new serious or critical issue appeared (regression gate)."
    elif new_other:
        status, reason = "partially_verified", "The targeted issue is gone, but new moderate or minor findings need review."
    else:
        status, reason = "verified", "Verified by automated re-test: the originating check no longer reports this issue and no regression appeared."

    return ApplyResult(status=status, reason=reason, afterScanId=after.scanId, workspaceId=wid,
                       comparison=cmp, controlPage=gate, **base)
