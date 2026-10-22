"""Bounded keyboard walk and clickable-not-focusable heuristic (FR-05, PRD D07/D08).

Both produce evidence for human review. Neither claims a keyboard trap or a WCAG failure on its own.
"""
import time

from . import config, fingerprint
from .models import Finding, FocusStop, KeyboardWalk

_DESCRIBE_ACTIVE = r"""
() => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const sel = (e) => {
    const parts = [];
    while (e && e.nodeType === 1 && e !== document.body && e !== document.documentElement) {
      if (e.id) { parts.unshift('#' + CSS.escape(e.id)); break; }
      let p = e.tagName.toLowerCase();
      const sibs = e.parentElement ? Array.from(e.parentElement.children).filter(s => s.tagName === e.tagName) : [];
      if (sibs.length > 1) p += ':nth-of-type(' + (sibs.indexOf(e) + 1) + ')';
      parts.unshift(p);
      e = e.parentElement;
    }
    return parts.join(' > ');
  };
  const implicit = { a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', summary: 'button' };
  const tag = el.tagName.toLowerCase();
  let role = el.getAttribute('role') || implicit[tag] || '';
  if (tag === 'input') {
    const t = (el.getAttribute('type') || 'text').toLowerCase();
    role = el.getAttribute('role') || ({ checkbox: 'checkbox', radio: 'radio', button: 'button', submit: 'button', range: 'slider' }[t] || 'textbox');
  }
  let name = el.getAttribute('aria-label') || '';
  if (!name && el.getAttribute('aria-labelledby')) {
    name = el.getAttribute('aria-labelledby').split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ');
  }
  if (!name && el.labels && el.labels.length) name = el.labels[0].textContent;
  if (!name) name = el.getAttribute('alt') || el.getAttribute('title') || '';
  if (!name && !['input', 'select', 'textarea'].includes(tag)) name = el.innerText || '';
  return { selector: sel(el), tag, role, name: name.replace(/\s+/g, ' ').trim().slice(0, 80), tabIndex: el.tabIndex };
}
"""

_CLICKABLE_NOT_FOCUSABLE = r"""
() => {
  const native = new Set(['a', 'button', 'input', 'select', 'textarea', 'summary', 'details', 'option']);
  const out = [];
  document.querySelectorAll('[onclick], [role="button"], [role="link"]').forEach(el => {
    const tag = el.tagName.toLowerCase();
    if (native.has(tag)) return;
    if (el.tabIndex >= 0) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    let s = el.id ? '#' + CSS.escape(el.id) : tag + (el.classList.length ? '.' + Array.from(el.classList).map(c => CSS.escape(c)).join('.') : '');
    out.push({ selector: s, html: el.outerHTML.slice(0, 300), text: (el.innerText || '').trim().slice(0, 80) });
  });
  return out;
}
"""

REPEAT_STOP_AFTER = 4  # consecutive revisits before we stop and flag for human review


def walk(page, limit: int = config.KEYBOARD_LIMIT, budget_s: float = config.KEYBOARD_BUDGET_S) -> tuple[KeyboardWalk, list[Finding]]:
    page.evaluate("() => { if (document.activeElement) document.activeElement.blur(); window.focus(); }")
    steps: list[FocusStop] = []
    seen: dict[str, int] = {}
    consecutive_repeats = 0
    ended = "limit_reached"
    deadline = time.monotonic() + budget_s
    findings: list[Finding] = []
    notes: list[str] = []

    for i in range(limit):
        if time.monotonic() > deadline:
            ended = "time_budget_reached"
            break
        page.keyboard.press("Tab")
        info = page.evaluate(_DESCRIBE_ACTIVE)
        if info is None:
            ended = "no_focusable_stops" if not steps else "left_document"
            break
        sel = info["selector"]
        if steps and sel == steps[0].selector and consecutive_repeats == 0 and len(seen) == len(steps):
            ended = "wrapped_to_start"
            break
        repeated = sel in seen
        consecutive_repeats = consecutive_repeats + 1 if repeated else 0
        seen[sel] = seen.get(sel, 0) + 1
        steps.append(FocusStop(order=i + 1, repeated=repeated, **info))
        if consecutive_repeats >= REPEAT_STOP_AFTER:
            ended = "repeated_focus_cycle"
            break

    truncated = ended in ("limit_reached", "time_budget_reached")
    if ended == "repeated_focus_cycle":
        cycle = sorted({s.selector for s in steps if s.repeated})
        notes.append("Focus kept cycling among " + ", ".join(cycle) + ". Inspect manually: this heuristic does not prove a keyboard trap.")
        target = ", ".join(cycle)
        fp, key = fingerprint.make("kbd-repeated-focus", target, target)
        findings.append(Finding(
            fingerprint=fp, key=key, source="keyboard-heuristic", ruleId="kbd-repeated-focus", impact=None,
            description="Pressing Tab repeatedly kept focus inside the same small group of elements.",
            help="Possible focus cycle — check whether keyboard users can move past this area",
            tags=["keyboard-heuristic"], wcag=["2.1.2"], target=target, snippet="",
            failureSummary="Repeated focus stops observed: " + target, needsHumanReview=True,
        ))
    if ended == "no_focusable_stops":
        notes.append("No element received focus when pressing Tab.")

    for item in page.evaluate(_CLICKABLE_NOT_FOCUSABLE):
        fp, key = fingerprint.make("kbd-clickable-not-focusable", item["selector"], item["html"])
        findings.append(Finding(
            fingerprint=fp, key=key, source="keyboard-heuristic", ruleId="kbd-clickable-not-focusable", impact=None,
            description=f"\"{item['text'] or item['selector']}\" responds to clicks but never receives keyboard focus.",
            help="Clickable element is not reachable with the keyboard — use a <button> or <a>",
            tags=["keyboard-heuristic"], wcag=["2.1.1"], target=item["selector"], snippet=item["html"],
            failureSummary="Element has a click handler or button role but is not in the Tab order.",
            needsHumanReview=True,
        ))

    return KeyboardWalk(steps=steps, limit=limit, truncated=truncated, endedReason=ended, notes=notes), findings
