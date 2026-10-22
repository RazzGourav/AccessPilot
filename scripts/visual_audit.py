"""Run visual & functional inspection of AccessPilot pages and capture screenshots."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path("public_shots/audit")
OUT.mkdir(parents=True, exist_ok=True)
UI = "http://127.0.0.1:8000"

def main():
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda msg: errors.append(f"Console: {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: errors.append(f"PageError: {err}"))

        # 1. Home
        print("Visiting Home...")
        page.goto(f"{UI}/", wait_until="networkidle")
        page.screenshot(path=str(OUT / "01_home.png"), full_page=True)

        # 2. Audit
        print("Visiting Audit...")
        page.goto(f"{UI}/audit", wait_until="networkidle")
        page.check("#auth")
        page.click("button[type=submit]")
        page.wait_for_selector("#results-h", timeout=30_000)
        time.sleep(1)
        page.screenshot(path=str(OUT / "02_audit_results.png"), full_page=True)

        # 3. Experience
        print("Visiting Experience...")
        page.click("text=Experience")
        page.wait_for_selector(".exp-feed", timeout=20_000)
        time.sleep(1)
        page.screenshot(path=str(OUT / "03_experience.png"), full_page=True)

        # 4. Dashboard
        print("Visiting Dashboard...")
        page.click("text=Dashboard")
        page.wait_for_selector(".dash-container", timeout=20_000)
        time.sleep(1)
        
        # Click Run Multi-Agent Intelligence
        print("Running Multi-Agent Intelligence...")
        page.click("text=Run Multi-Agent Intelligence")
        page.wait_for_selector(".dash-coordinator-box", timeout=30_000)
        time.sleep(1)
        page.screenshot(path=str(OUT / "04_dashboard_multiagent.png"), full_page=True)

        # Switch to India Statutory Standards tab
        print("Inspecting India Standards tab...")
        page.click("text=India Statutory Standards")
        page.wait_for_selector(".compliance-grid", timeout=10_000)
        time.sleep(1)
        page.screenshot(path=str(OUT / "05_dashboard_compliance.png"), full_page=True)

        # Switch to Demographic Impact tab
        print("Inspecting Demographic Impact tab...")
        page.click("text=Demographic Impact & Effort")
        page.wait_for_selector(".demographic-bars", timeout=10_000)
        time.sleep(1)
        page.screenshot(path=str(OUT / "06_dashboard_impact.png"), full_page=True)

        # 5. Findings
        print("Visiting Findings...")
        page.click("text=Findings")
        page.wait_for_selector(".finding-card, .finding-item, main", timeout=10_000)
        time.sleep(1)
        page.screenshot(path=str(OUT / "07_findings.png"), full_page=True)

        # 6. Repairs
        print("Visiting Repairs...")
        page.click("text=Repairs")
        time.sleep(1)
        page.screenshot(path=str(OUT / "08_repairs.png"), full_page=True)

        browser.close()

    print("\nVisual audit completed! Errors logged:", len(errors))
    for e in errors:
        print("  !", e)

if __name__ == "__main__":
    main()
