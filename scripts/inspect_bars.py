from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page()
    page.goto('http://127.0.0.1:8000/')
    res = page.evaluate("""() => {
        const el = document.querySelector('.bars');
        const li = el.querySelector('li');
        const bar = el.querySelector('.bar');
        return {
            classes: el.className,
            vis: window.getComputedStyle(el).visibility,
            op: window.getComputedStyle(el).opacity,
            liClasses: li.className,
            liColor: window.getComputedStyle(li).color,
            barBg: window.getComputedStyle(bar).backgroundColor,
            barH: window.getComputedStyle(bar).height,
            barDisplay: window.getComputedStyle(bar).display
        };
    }""")
    print("RES:", res)
    browser.close()
