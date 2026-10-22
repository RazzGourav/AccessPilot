"""Finding identity across scans (FR-19).

fingerprint = rule | normalised target | snippet hash  (shown to users, stable per exact node)
key         = rule | normalised target                 (used for resolved/remaining/new matching,
                                                        so an unrelated edit to the same node's
                                                        markup is not mistaken for a fix)
"""
import hashlib
import re

_WS = re.compile(r"\s+")


def normalise_target(target) -> str:
    """axe targets are lists of selectors (nested lists for shadow DOM)."""
    if isinstance(target, (list, tuple)):
        parts = [normalise_target(t) for t in target]
        return " >>> ".join(p for p in parts if p)
    return _WS.sub(" ", str(target)).strip()


def snippet_hash(snippet: str) -> str:
    return hashlib.sha1(_WS.sub(" ", snippet).strip().encode("utf-8")).hexdigest()[:8]


def make(rule_id: str, target: str, snippet: str) -> tuple[str, str]:
    key = f"{rule_id}|{target}"
    return f"{key}|{snippet_hash(snippet)}", key


def key_of(fingerprint: str) -> str:
    return fingerprint.rsplit("|", 1)[0]
