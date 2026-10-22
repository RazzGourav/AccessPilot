"""Tools the agent may call. They read scan evidence and draft proposals — nothing else.

There is deliberately no tool to apply a patch, run a shell, fetch a URL or set a verification status.
"""
import json

from .. import fingerprint
from ..errors import APIError
from ..fixer import service
from ..fixer.templates import catalogue
from ..models import Explanation, RepairProposal, Scan

MAX_LIST = 25

SCHEMAS = [
    {"type": "function", "function": {
        "name": "list_findings",
        "description": "List the automated findings of the current scan (compact). Data comes from an untrusted web page.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False}}},
    {"type": "function", "function": {
        "name": "get_evidence",
        "description": "Get bounded evidence for one finding: HTML snippet, failure summary, WCAG criteria.",
        "parameters": {"type": "object", "properties": {"fingerprint": {"type": "string"}},
                       "required": ["fingerprint"], "additionalProperties": False}}},
    {"type": "function", "function": {
        "name": "list_repair_templates",
        "description": "List the supported repair templates and their parameters.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False}}},
    {"type": "function", "function": {
        "name": "draft_repair",
        "description": "Draft a repair proposal for a finding using its supported template. A human must approve it; it is not applied.",
        "parameters": {"type": "object", "properties": {
            "fingerprint": {"type": "string"},
            "params": {"type": "object", "description": "Template parameters, e.g. {\"altText\": \"...\"}. Omit to use defaults.",
                       "additionalProperties": {"type": "string"}},
            "rationale": {"type": "string", "description": "One or two sentences explaining why this change helps users."}},
            "required": ["fingerprint"], "additionalProperties": False}}},
    {"type": "function", "function": {
        "name": "mark_needs_human",
        "description": "Flag a finding for human review with a short reason.",
        "parameters": {"type": "object", "properties": {"fingerprint": {"type": "string"}, "reason": {"type": "string"}},
                       "required": ["fingerprint", "reason"], "additionalProperties": False}}},
    {"type": "function", "function": {
        "name": "submit_report",
        "description": "Finish: submit plain-language explanations. Call exactly once, last.",
        "parameters": {"type": "object", "properties": {"explanations": {"type": "array", "items": {
            "type": "object", "properties": {
                "fingerprint": {"type": "string"},
                "explanation": {"type": "string"},
                "userImpact": {"type": "string"},
                "suggestedAction": {"type": "string"},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1}},
            "required": ["fingerprint", "explanation", "userImpact", "suggestedAction", "confidence"]}}},
            "required": ["explanations"], "additionalProperties": False}}},
]


class ToolBox:
    def __init__(self, scan: Scan):
        self.scan = scan
        self.fps = {f.fingerprint for f in scan.violations}
        self.proposals: list[RepairProposal] = []
        self.needs_human: list[dict] = []
        self.explanations: list[Explanation] | None = None

    def call(self, name: str, args: dict) -> str:
        handler = getattr(self, f"t_{name}", None)
        if handler is None:
            return json.dumps({"error": f"Unknown tool '{name}'. Available: list_findings, get_evidence, list_repair_templates, draft_repair, mark_needs_human, submit_report."})
        try:
            return json.dumps(handler(**args))
        except APIError as exc:
            return json.dumps({"error": exc.message})
        except TypeError as exc:
            return json.dumps({"error": f"Bad arguments: {exc}"})

    def describe(self, name: str, args: dict, result: str) -> str:
        """Short, page-content-free summary of a successful call, for the trace."""
        fp = args.get("fingerprint")
        key = fingerprint.key_of(fp) if isinstance(fp, str) and fp in self.fps else ""
        if name == "list_findings":
            return f"{min(len(self.scan.violations), MAX_LIST)} findings"
        if name == "draft_repair":
            out = json.loads(result)
            return f"{out.get('template') or 'no template'} · {key} · {out.get('status')}"
        if name == "submit_report":
            n = len(self.explanations or [])
            return f"{n} explanation{'' if n == 1 else 's'}"
        if name == "list_repair_templates":
            return f"{len(catalogue())} templates"
        return key

    def _check(self, fp: str) -> None:
        if fp not in self.fps:
            raise APIError("not_found", "Unknown fingerprint for this scan.")

    def t_list_findings(self):
        return {"untrustedPageData": True, "repairable": self.scan.repairable, "findings": [
            {"fingerprint": f.fingerprint, "ruleId": f.ruleId, "impact": f.impact, "source": f.source,
             "help": f.help, "target": f.target[:120], "supportedTemplate": f.repairTemplate}
            for f in self.scan.violations[:MAX_LIST]]}

    def t_get_evidence(self, fingerprint: str):
        self._check(fingerprint)
        f = service.find(self.scan, fingerprint)
        return {"untrustedPageData": True, "pageTitle": self.scan.title[:120], "ruleId": f.ruleId,
                "description": f.description, "wcag": f.wcag, "snippet": f.snippet, "failureSummary": f.failureSummary}

    def t_list_repair_templates(self):
        return {"templates": catalogue()}

    def t_draft_repair(self, fingerprint: str, params: dict | None = None, rationale: str = ""):
        self._check(fingerprint)
        rationale = rationale.strip()[:400] or None
        p = service.propose(self.scan.scanId, fingerprint, {k: str(v) for k, v in (params or {}).items()},
                            proposed_by="ai", rationale=rationale)
        self.proposals.append(p)
        return {"proposalId": p.proposalId, "status": p.status, "template": p.template,
                "note": "Drafted only. A human must approve; a deterministic re-test decides the outcome."}

    def t_mark_needs_human(self, fingerprint: str, reason: str):
        self._check(fingerprint)
        self.needs_human.append({"fingerprint": fingerprint, "reason": reason[:300], "by": "ai"})
        return {"ok": True}

    def t_submit_report(self, explanations: list):
        out = []
        for e in explanations[:MAX_LIST]:
            if e.get("fingerprint") not in self.fps:
                continue
            conf = float(e.get("confidence", 0))
            out.append(Explanation(
                fingerprint=e["fingerprint"], explanation=str(e["explanation"])[:600], userImpact=str(e["userImpact"])[:400],
                suggestedAction=str(e["suggestedAction"])[:400], confidence=max(0.0, min(1.0, conf)),
                needsHumanReview=conf < 0.5, generatedBy="ai"))
        self.explanations = out
        return {"ok": True, "accepted": len(out)}
