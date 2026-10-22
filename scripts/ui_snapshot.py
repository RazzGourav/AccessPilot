"""Save static snapshots of AccessPilot's UI states for design review tools (taste-skill inspector).

Usage (server running on :8000):  backend/.venv/Scripts/python scripts/ui_snapshot.py [OUT_DIR]
Writes OUT_DIR/results.html (after scan + agent) and OUT_DIR/verified.html (after one approved repair).
Scripts are stripped so the snapshot shows exactly the captured state; styles are inlined.
"""
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

UI = "http://127.0.0.1:8000/"


def save(page, path: Path):
    css = page.evaluate("() => Array.from(document.styleSheets).map(s => Array.from(s.cssRules).map(r => r.cssText).join('\\n')).join('\\n')")
    html = page.content()
    html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S | re.I)
    html = re.sub(r'<link rel="stylesheet"[^>]*>', "", html)
    html = re.sub(r'((?:src|href)=")/api/', rf"\1{UI}api/", html)  # captures are served by the app
    html = html.replace("</head>", f"<style>{css}</style></head>", 1)
    path.write_text(html, encoding="utf-8")
    print("saved", path)


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else ".taste-skill/snapshots")
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(UI, wait_until="networkidle")
        page.check("#auth")
        page.click("button[type=submit]")
        page.wait_for_selector("#results-h", timeout=60_000)
        page.click("text=Run agent")
        page.wait_for_selector("text=Fix ready")
        save(page, out / "results.html")
        page.locator(".tl-actions button").nth(1).click()
        page.wait_for_selector("#review-h")
        save(page, out / "review.html")
        page.click("text=Approve and apply")
        page.wait_for_selector("#verify-h", timeout=60_000)
        save(page, out / "verified.html")
        browser.close()


if __name__ == "__main__":
    main()
