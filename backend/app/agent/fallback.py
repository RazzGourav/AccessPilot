"""Deterministic explanations and proposals used when no model is available or the model fails."""
from ..fixer import service
from ..models import Explanation, Finding, RepairProposal, Scan

PLAIN = {
    "label": ("This form field has no name that assistive technology can announce.",
              "Screen-reader users hear only \"edit text\" and cannot tell what to type."),
    "image-alt": ("This image has no text alternative.",
                  "Screen-reader users miss what the image conveys, or hear a file name."),
    "color-contrast": ("The text colour is too close to its background.",
                       "People with low vision or using a screen in sunlight may not be able to read it."),
    "html-has-lang": ("The page does not declare its language.",
                      "Screen readers may pronounce the text with the wrong language rules."),
    "button-name": ("This button has no accessible name.",
                    "Screen-reader users hear \"button\" without knowing what it does."),
    "heading-order": ("Heading levels skip a level.",
                      "Screen-reader users who navigate by headings may think content is missing."),
    "region": ("Some content is outside any landmark region.",
               "Screen-reader users who jump between landmarks can miss this content."),
    "landmark-one-main": ("The page has no main landmark.",
                          "Screen-reader users cannot jump straight to the main content."),
    "kbd-clickable-not-focusable": ("This element works with a mouse but cannot be reached with the Tab key.",
                                    "Keyboard-only and switch users cannot activate it, so they may not be able to submit the form."),
    "kbd-repeated-focus": ("Tab kept moving between the same few elements.",
                           "Keyboard users may be unable to move past this area. Confirm manually."),
}


def explain(f: Finding) -> Explanation:
    what, who = PLAIN.get(f.ruleId, (f.help or f.description, "Some users may be unable to perceive or operate this content."))
    action = service.SUGGEST_ONLY.get(f.ruleId) or (f"A supported repair ({f.repairTemplate}) is available for review." if f.repairTemplate else "Review against the linked guidance.")
    return Explanation(fingerprint=f.fingerprint, explanation=what, userImpact=who, suggestedAction=action,
                       confidence=1.0 if f.source == "axe" else 0.5, needsHumanReview=f.needsHumanReview or f.source != "axe",
                       generatedBy="deterministic")


def run(scan: Scan) -> tuple[list[Explanation], list[RepairProposal], list[dict]]:
    explanations = [explain(f) for f in scan.violations]
    proposals, needs_human = [], []
    for f in scan.violations:
        if scan.repairable and f.repairTemplate:
            proposals.append(service.propose(scan.scanId, f.fingerprint, proposed_by="deterministic"))
        else:
            needs_human.append({"fingerprint": f.fingerprint, "reason": service.SUGGEST_ONLY.get(f.ruleId, "No supported repair; review manually."), "by": "deterministic"})
    return explanations, proposals, needs_human
