"""Capture the real product screenshots used on the Home page (frontend/public/shots/).

Usage (server running on :8000):  backend/.venv/Scripts/python scripts/site_shots.py
Then rebuild the frontend. Prints each image's size so the <img width/height> attributes can match.
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend" / "public" / "shots"
UI = "http://127.0.0.1:8000"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        # Tall viewport so the sticky side column is never clipped; reduced motion so nothing is mid-animation.
        page = browser.new_page(viewport={"width": 1440, "height": 2400}, device_scale_factor=2, reduced_motion="reduce")
        page.add_init_script("try { localStorage.setItem('accesspilot-theme', 'light') } catch (e) {}")
        page.goto(f"{UI}/audit", wait_until="networkidle")
        page.check("#auth")
        page.click("form.intake button[type=submit]")
        page.wait_for_selector("#results-h", timeout=60_000)
        page.wait_for_load_state("networkidle")

        shots = {}
        pv = page.locator(".pageview")
        pv.screenshot(path=str(OUT / "barriers.png"))
        shots["barriers.png"] = pv.bounding_box()
        page.click(".pageview .seg button:nth-child(2)")
        pv.screenshot(path=str(OUT / "tab-order.png"))
        shots["tab-order.png"] = pv.bounding_box()

        page.click(".next button.primary")            # run agent
        page.wait_for_selector("text=Fix ready")
        page.wait_for_load_state("networkidle")
        tl = page.locator("section[aria-labelledby=timeline-h]").bounding_box()
        clip = {"x": tl["x"], "y": tl["y"], "width": tl["width"], "height": min(tl["height"], 640)}
        page.screenshot(path=str(OUT / "timeline.png"), clip=clip)
        shots["timeline.png"] = clip
        page.click(".next button.primary")            # review the first fix -> /repairs
        page.wait_for_selector("#review-h")
        # Show the email-label fix: a short, readable diff and a visible before/after.
        page.click('.queue li:has-text("Form elements must have labels") button')
        page.wait_for_selector('.review:has-text("Add a visible label")')
        page.wait_for_load_state("networkidle")
        # The decision itself: why it needs a person, the editable wording, the exact diff, Approve / Reject.
        top = page.locator(".review .why").bounding_box()
        panel = page.locator(".review").bounding_box()
        clip = {"x": panel["x"], "y": top["y"] - 16, "width": panel["width"], "height": panel["y"] + panel["height"] - top["y"] + 16}
        page.screenshot(path=str(OUT / "review.png"), clip=clip)
        shots["review.png"] = clip
        page.click("text=Approve and apply")
        page.wait_for_selector(".before-after svg >> nth=1", timeout=60_000)
        page.wait_for_load_state("networkidle")
        # The decisive top of the verification panel: verdict, name change, before and after.
        v = page.locator(".verify")
        box = v.bounding_box()
        end = page.locator(".verify .before-after").bounding_box()
        clip = {"x": box["x"], "y": box["y"], "width": box["width"], "height": end["y"] + end["height"] - box["y"] + 16}
        page.screenshot(path=str(OUT / "verify.png"), clip=clip)
        shots["verify.png"] = clip
        browser.close()
    for name, box in shots.items():
        print(f"{name}: {round(box['width'])}x{round(box['height'])} CSS px (saved at 2x)")
    demo_data()


def demo_data():
    """One timed run through the API on the bundled demo, saved as the Home page's data.

    Every number Home shows comes from this file: findings, keyboard stops, timings, the repair result.
    """
    import json
    import time

    import httpx

    with httpx.Client(base_url=UI, timeout=120) as c:
        t = time.perf_counter()
        scan = c.post("/api/scan", json={"url": f"{UI}/demo/demo.html", "authorized": True}).json()
        scan_ms = int((time.perf_counter() - t) * 1000)
        t = time.perf_counter()
        run = c.post("/api/agent/run", json={"scanId": scan["scanId"]}).json()
        agent_ms = int((time.perf_counter() - t) * 1000)
        label = next(p for p in run["proposals"] if p["template"] == "T1")
        t = time.perf_counter()
        result = c.post("/api/repair/apply", json={"proposalId": label["proposalId"], "approved": True, "approvalToken": label["approvalToken"]}).json()
        apply_ms = int((time.perf_counter() - t) * 1000)
        after = c.get(f"/api/scans/{result['afterScanId']}").json()
        (OUT / "golden.jpg").write_bytes(c.get(f"/api/scans/{scan['scanId']}/screenshot").content)
        (OUT / "golden-after.jpg").write_bytes(c.get(f"/api/scans/{after['scanId']}/screenshot").content)

    explain = {e["fingerprint"]: e for e in run["explanations"]}
    keep = lambda f: {k: f[k] for k in ("ruleId", "impact", "help", "target", "wcag", "box", "repairTemplate", "source")} | {
        "explanation": explain.get(f["fingerprint"], {}).get("explanation", ""),
        "userImpact": explain.get(f["fingerprint"], {}).get("userImpact", ""),
    }
    stop = lambda s: {k: s[k] for k in ("order", "name", "role", "tag", "repeated", "box")}
    email_before = next((s for s in scan["keyboardWalk"]["steps"] if s["selector"] == "#email"), None)
    email_after = next((s for s in after["keyboardWalk"]["steps"] if s["selector"] == "#email"), None)
    data = {
        "capturedAt": scan["createdAt"],
        "page": scan["page"],
        "title": scan["title"],
        "passes": scan["passesCount"],
        "findings": [keep(f) for f in scan["violations"]],
        "stops": [stop(s) for s in scan["keyboardWalk"]["steps"]],
        "trace": scan["trace"],
        "timings": {"scanMs": scan_ms, "agentMs": agent_ms, "applyAndRetestMs": apply_ms, "aiUsed": run["aiUsed"]},
        "repair": {
            "template": "T1", "diff": label["diff"], "status": result["status"], "reason": result["reason"],
            "resolved": len(result["comparison"]["resolved"]), "remaining": len(result["comparison"]["remaining"]),
            "new": len(result["comparison"]["new"]), "controlNew": len(result["controlPage"]["newSeriousOrCritical"]),
            "nameBefore": email_before["name"] if email_before else None, "nameAfter": email_after["name"] if email_after else None,
            "boxBefore": email_before["box"] if email_before else None, "boxAfter": email_after["box"] if email_after else None,
            "afterPage": after["page"],
        },
    }
    (ROOT / "frontend" / "src" / "data" / "demo.json").write_text(json.dumps(data, indent=1), encoding="utf-8")
    print(f"demo.json: {len(data['findings'])} findings, {len(data['stops'])} stops, scan {scan_ms} ms, agent {agent_ms} ms, apply+retest {apply_ms} ms, repair {result['status']}")


if __name__ == "__main__":
    main()
