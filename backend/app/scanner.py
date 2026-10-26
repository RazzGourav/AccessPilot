"""Deterministic scan: Playwright Chromium + locally bundled axe-core + keyboard walk (FR-03..05, FR-18).

Uses the *sync* Playwright API; the API layer runs it in a worker thread. This avoids the Windows
event-loop problem where async Playwright cannot spawn the browser under uvicorn.
"""
import re
import time
from datetime import datetime, timezone
from functools import lru_cache

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

from . import config, coverage, fingerprint, keyboard, policy, store
from .errors import APIError
from .models import Box, Finding, KeyboardWalk, PageShot, Scan, TraceEntry

_WCAG_SC = re.compile(r"^wcag(\d)(\d)(\d+)$")


@lru_cache(maxsize=1)
def axe_source() -> str:
    return config.AXE_PATH.read_text(encoding="utf-8")


def wcag_criteria(tags: list[str]) -> list[str]:
    out = []
    for t in tags:
        m = _WCAG_SC.match(t)
        if m:
            out.append(".".join(m.groups()))
    return out


def normalise(rule: dict) -> list[Finding]:
    """One Finding per affected node, with bounded evidence."""
    from .fixer.templates import template_for  # local import: fixer depends on models only

    findings = []
    for node in rule.get("nodes", []):
        target = fingerprint.normalise_target(node.get("target", []))
        snippet = (node.get("html") or "")[: config.SNIPPET_MAX]
        fp, key = fingerprint.make(rule["id"], target, snippet)
        tpl = template_for(rule["id"], target)
        findings.append(Finding(
            fingerprint=fp, key=key, source="axe", ruleId=rule["id"], impact=node.get("impact") or rule.get("impact"),
            description=rule.get("description", ""), help=rule.get("help", ""), helpUrl=rule.get("helpUrl", ""),
            tags=rule.get("tags", []), wcag=wcag_criteria(rule.get("tags", [])), target=target, snippet=snippet,
            failureSummary=(node.get("failureSummary") or "")[:600], repairTemplate=tpl.id if tpl else None,
        ))
    return findings


class _Tracer:
    def __init__(self, entries: list[TraceEntry]):
        self.entries = entries

    def run(self, step: str, fn, detail=lambda r: ""):
        t0 = time.perf_counter()
        try:
            result = fn()
        except Exception as exc:
            self.entries.append(TraceEntry(step=step, status="failed", durationMs=int((time.perf_counter() - t0) * 1000), detail=str(exc)[:200]))
            raise
        self.entries.append(TraceEntry(step=step, status="ok", durationMs=int((time.perf_counter() - t0) * 1000), detail=detail(result)))
        return result


def run_scan(url: str, *, with_keyboard: bool = True, repairable: bool = False, workspace_id: str | None = None,
             trace: list[TraceEntry] | None = None) -> Scan:
    """Scan one already-validated URL. Always closes the browser (NFR-03)."""
    trace = list(trace or [])
    tr = _Tracer(trace)
    started = time.perf_counter()
    created = datetime.now(timezone.utc).isoformat(timespec="seconds")
    blocked: list[str] = []

    def guard(route, request):
        if request.is_navigation_request() and not policy.navigation_allowed(request.url):
            blocked.append(request.url)
            route.abort("blockedbyclient")
        else:
            route.continue_()

    with sync_playwright() as pw:
        browser = tr.run("browser_launched", lambda: pw.chromium.launch(headless=True))
        try:
            context = browser.new_context(viewport={"width": 1280, "height": 900}, bypass_csp=True)
            page = context.new_page()
            page.route("**/*", guard)
            try:
                tr.run("page_loaded", lambda: page.goto(url, wait_until="domcontentloaded", timeout=config.NAV_TIMEOUT_MS),
                       detail=lambda r: f"HTTP {r.status}" if r else "")
            except PlaywrightTimeout as exc:
                raise APIError("scan_timeout", "The page did not finish loading within the scan budget.", 504) from exc
            except PlaywrightError as exc:
                if blocked:
                    raise APIError("target_not_allowed", "The page redirected to a target that is not allowed.", 403) from exc
                raise APIError("scan_failed", f"The page could not be loaded: {str(exc).splitlines()[0][:160]}", 502) from exc

            title = page.title()
            final_url = page.url

            def run_axe():
                page.evaluate(axe_source())
                return page.evaluate(
                    "(tags) => axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] })"
                    ".then(r => ({ version: axe.version, violations: r.violations, incomplete: r.incomplete, passes: r.passes.length }))",
                    config.AXE_TAGS,
                )

            axe = tr.run("axe_completed", run_axe, detail=lambda r: f"{len(r['violations'])} rules with violations")
            violations = [f for rule in axe["violations"] for f in normalise(rule)]
            incomplete = [f for rule in axe["incomplete"] for f in normalise(rule)]
            for f in incomplete:
                f.repairTemplate = None
                f.needsHumanReview = True

            status = "completed"
            kw = KeyboardWalk(limit=config.KEYBOARD_LIMIT, endedReason="not_run")
            if with_keyboard:
                try:
                    kw, heuristic = tr.run("keyboard_walk_completed", lambda: keyboard.walk(page),
                                           detail=lambda r: f"{len(r[0].steps)} stops, ended: {r[0].endedReason}")
                    violations.extend(heuristic)
                except PlaywrightError:
                    status = "partial"
                    trace[-1].status = "partial"

            shot = None
            try:
                page_shot, shot = tr.run("page_captured", lambda: _capture(page, violations, kw),
                                         detail=lambda r: f"{r[0].width}×{r[0].height} px, kept in memory only")
            except PlaywrightError:
                page_shot = None  # evidence overlay is optional; the scan result stands without it
        finally:
            browser.close()

    impact_rank = {"critical": 0, "serious": 1, "moderate": 2, "minor": 3, None: 4}
    violations.sort(key=lambda f: (impact_rank[f.impact], f.ruleId, f.target))
    scan = Scan(
        scanId=store.new_id("scan"), status=status, requestedUrl=url, finalUrl=final_url, title=title,
        createdAt=created, durationMs=int((time.perf_counter() - started) * 1000), scannerVersion=axe["version"],
        violations=violations, incomplete=incomplete, passesCount=axe["passes"], keyboardWalk=kw,
        coverage=coverage.build(axe["version"], len(violations), len(incomplete), axe["passes"], len(kw.steps)),
        trace=trace, limitations=list(coverage.LIMITATIONS), repairable=repairable, workspaceId=workspace_id,
        page=page_shot,
    )
    store.put_scan(scan)
    if shot:
        store.screenshots[scan.scanId] = shot
    return scan


_BOXES = r"""
(sels) => sels.map(s => {
  if (!s || s.includes('>>>')) return null;
  let els;
  try { els = Array.from(document.querySelectorAll(s)); } catch { return null; }
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
  }
  if (x1 === Infinity) return null;
  return { x: Math.round(x1 + scrollX), y: Math.round(y1 + scrollY), w: Math.round(x2 - x1), h: Math.round(y2 - y1) };
})
"""


def _capture(page, violations: list[Finding], kw: KeyboardWalk) -> tuple[PageShot, bytes]:
    """Screenshot the page and locate findings and focus stops in the same coordinates.

    The viewport is grown to the page height first, so fixed elements are drawn where their boxes
    are measured. The image is held in memory for the evidence view and never exported.
    """
    page.evaluate("() => { if (document.activeElement) document.activeElement.blur(); }")
    doc_h = page.evaluate("() => document.documentElement.scrollHeight")
    height = max(600, min(int(doc_h), config.SHOT_MAX_HEIGHT))
    page.set_viewport_size({"width": config.SHOT_WIDTH, "height": height})
    page.evaluate("() => window.scrollTo(0, 0)")
    sels = [f.target for f in violations] + [s.selector for s in kw.steps]
    boxes = page.evaluate(_BOXES, sels)
    for item, box in zip([*violations, *kw.steps], boxes):
        item.box = Box(**box) if box and box["y"] < height else None
    shot = page.screenshot(type="jpeg", quality=72)
    return PageShot(width=config.SHOT_WIDTH, height=height, truncated=doc_h > height), shot
