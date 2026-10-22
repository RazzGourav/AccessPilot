"""Take visual screenshots of the running app pages."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path("public_shots")
OUT.mkdir(exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    # 1. Home
    page.goto("http://127.0.0.1:8000/", wait_until="networkidle")
    page.screenshot(path=str(OUT / "screen_home.png"), full_page=True)
    print("captured screen_home.png")
    
    # 2. Audit
    page.goto("http://127.0.0.1:8000/audit", wait_until="networkidle")
    page.screenshot(path=str(OUT / "screen_audit_empty.png"))
    print("captured screen_audit_empty.png")
    
    # 3. Run a scan on Golden Site
    page.check("#auth")
    page.click("button[type=submit]")
    page.wait_for_selector(".layout", timeout=30000)
    page.screenshot(path=str(OUT / "screen_audit_scanned.png"), full_page=True)
    print("captured screen_audit_scanned.png")
    
    # 4. Findings
    page.click("nav >> text=Findings")
    page.wait_for_selector(".card.findings", timeout=10000)
    page.screenshot(path=str(OUT / "screen_findings.png"), full_page=True)
    print("captured screen_findings.png")
    
    # 5. Repairs
    page.click("nav >> text=Repairs")
    page.wait_for_selector(".card", timeout=10000)
    page.screenshot(path=str(OUT / "screen_repairs.png"), full_page=True)
    print("captured screen_repairs.png")

    # 6. Report
    page.click("nav >> text=Report")
    page.wait_for_selector(".card", timeout=10000)
    page.screenshot(path=str(OUT / "screen_report.png"), full_page=True)
    print("captured screen_report.png")

    # 7. How it works
    page.click("nav >> text=How it works")
    page.wait_for_selector(".pipeline-grid", timeout=10000)
    page.screenshot(path=str(OUT / "screen_how.png"), full_page=True)
    print("captured screen_how.png")

    browser.close()
