"""FR-21 self-audit: drive AccessPilot's own UI by keyboard only and run axe on each state.

Usage (backend running on :8000 with the built UI):
    backend/.venv/Scripts/python scripts/self_audit.py [--shots DIR]
Exits non-zero if any serious or critical axe finding appears in the AccessPilot UI.
"""
import argparse
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
AXE = (ROOT / "backend" / "vendor" / "axe.min.js").read_text(encoding="utf-8")
UI = "http://127.0.0.1:8000/"
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]


def audit(page, label):
    # Measure the settled UI: wait for one-shot arrival animations (opacity fades) to finish,
    # otherwise contrast is sampled mid-fade.
    page.wait_for_function(
        "() => document.getAnimations().every(a => a.playState !== 'running' || a.effect.getTiming().iterations === Infinity)",
        timeout=10_000)
    page.evaluate(AXE)
    res = page.evaluate("(t) => axe.run(document, {runOnly: {type: 'tag', values: t}}).then(r => r.violations.map(v => ({id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes[0].target})))", TAGS)
    severe = [v for v in res if v["impact"] in ("serious", "critical")]
    print(f"[{label}] {len(res)} rule(s) with violations; serious/critical: {len(severe)}")
    for v in res:
        print(f"    {v['impact']:9} {v['id']} x{v['n']} e.g. {v['t']}")
    return severe


def tab_to(page, predicate_js, max_tabs=80):
    for _ in range(max_tabs):
        page.keyboard.press("Tab")
        if page.evaluate(predicate_js):
            return True
    raise AssertionError(f"Could not reach element by keyboard: {predicate_js}")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", type=Path)
    ap.add_argument("--theme", choices=["light", "dark"], default="light")
    args = ap.parse_args()
    severe = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1366, "height": 900})
        page.add_init_script(f"try {{ localStorage.setItem('accesspilot-theme', '{args.theme}') }} catch (e) {{}}")
        page.goto(UI, wait_until="networkidle")
        severe += audit(page, "home")

        # Keyboard-only flow: home -> audit -> consent -> scan -> agent -> review -> approve -> verification
        tab_to(page, "document.activeElement.textContent === 'Start an audit'")
        page.keyboard.press("Enter")
        page.wait_for_selector("#auth")
        severe += audit(page, "audit (empty)")
        tab_to(page, "document.activeElement.id === 'auth'")
        page.keyboard.press("Space")
        tab_to(page, "document.activeElement.id === 'url'")
        page.keyboard.press("Enter")
        page.wait_for_selector("#results-h", timeout=60_000)
        severe += audit(page, "results")
        if args.shots:
            page.screenshot(path=str(args.shots / "1-results.png"), full_page=True)

        tab_to(page, "document.activeElement.textContent.startsWith('Run agent')", 300)
        page.keyboard.press("Enter")
        page.wait_for_selector("text=Fix ready", timeout=120_000)
        tab_to(page, "document.activeElement.textContent.startsWith('Review')", 300)
        page.keyboard.press("Enter")
        page.wait_for_selector("#review-h")
        severe += audit(page, "review")
        if args.shots:
            page.screenshot(path=str(args.shots / "2-review.png"), full_page=False)
            page.screenshot(path=str(args.shots / "2b-timeline-full.png"), full_page=True)

        tab_to(page, "document.activeElement.textContent.startsWith('Approve')", 60)
        page.keyboard.press("Enter")
        page.wait_for_selector("#verify-h", timeout=120_000)
        severe += audit(page, "verification")
        if args.shots:
            page.locator("#verify-h").scroll_into_view_if_needed()
            page.screenshot(path=str(args.shots / "3-verification.png"), full_page=False)
        print("verification status:", page.locator(".verify .status").inner_text())

        # Every other page of the site, reached through its navigation link (session state carries over).
        for label, href in [("findings", "/findings"), ("report", "/report"), ("how it works", "/how-it-works"), ("accessibility statement", "/accessibility")]:
            page.click(f'a[href="{href}"] >> nth=0')
            page.wait_for_function(f"() => location.pathname === '{href}'")
            page.wait_for_selector("main h1")
            severe += audit(page, label)
        browser.close()
    print("Keyboard-only flow completed.")
    sys.exit(1 if severe else 0)


if __name__ == "__main__":
    main()
