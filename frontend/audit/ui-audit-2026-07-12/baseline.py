from pathlib import Path
import json
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


BASE = "http://127.0.0.1:5173"
ROOT = Path(__file__).parent
SCREENSHOTS = ROOT / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
ROUTES = [
    ("dashboard", "/"),
    ("copilot", "/copilot"),
    ("knowledge-graph", "/knowledge-graph"),
    ("compliance", "/compliance"),
    ("documents", "/documents"),
    ("capture", "/capture"),
    ("settings", "/settings"),
    ("field", "/field"),
]


def inspect_page(page, name, route, viewport_name, width, height):
    page.set_viewport_size({"width": width, "height": height})
    console_messages = []
    failed_requests = []
    page.on("console", lambda msg: console_messages.append({"type": msg.type, "text": msg.text}))
    page.on("requestfailed", lambda req: failed_requests.append({"url": req.url, "error": req.failure}))
    try:
        page.goto(BASE + route, wait_until="domcontentloaded", timeout=15000)
        try:
            page.wait_for_load_state("networkidle", timeout=5000)
        except PlaywrightTimeoutError:
            pass
        page.wait_for_timeout(500)
    except Exception as exc:
        return {"route": route, "viewport": viewport_name, "navigation_error": str(exc)}

    screenshot = SCREENSHOTS / f"baseline-{name}-{viewport_name}.png"
    page.screenshot(path=str(screenshot), full_page=True)
    report = page.evaluate(
        """
        () => {
          const rect = document.documentElement.getBoundingClientRect();
          const interactive = [...document.querySelectorAll('a,button,input,select,textarea,[role="button"]')]
            .filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            })
            .map(el => ({
              tag: el.tagName.toLowerCase(),
              name: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').trim().slice(0, 80),
              width: Math.round(el.getBoundingClientRect().width),
              height: Math.round(el.getBoundingClientRect().height),
              disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
            }));
          const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(el => ({tag: el.tagName, text: el.innerText.trim().slice(0, 100)}));
          return {
            title: document.title,
            url: location.pathname,
            h1Count: document.querySelectorAll('h1').length,
            headings,
            bodyWidth: Math.round(document.body.scrollWidth),
            viewportWidth: Math.round(window.innerWidth),
            horizontalOverflow: document.body.scrollWidth > window.innerWidth + 1,
            interactiveCount: interactive.length,
            unlabeledInteractive: interactive.filter(item => !item.name),
            undersizedTouchTargets: interactive.filter(item => item.width < 44 || item.height < 44).slice(0, 30),
            nativeSelectCount: document.querySelectorAll('select').length,
            dialogCount: document.querySelectorAll('[role="dialog"]').length,
          };
        }
        """
    )

    return {
        "route": route,
        "viewport": viewport_name,
        "screenshot": str(screenshot.relative_to(ROOT)),
        "inspection": report,
        "console": console_messages,
        "failed_requests": failed_requests,
    }


def main():
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        for name, route in ROUTES:
            results.append(inspect_page(page, name, route, "desktop", 1440, 1000))
            results.append(inspect_page(page, name, route, "mobile", 390, 844))

        # Core shell interactions.
        page.set_viewport_size({"width": 1440, "height": 1000})
        page.goto(BASE + "/", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=5000)
        except PlaywrightTimeoutError:
            pass
        interactions = {}
        search = page.get_by_role("button", name="Search workflows")
        interactions["mobile_search_button_visible_at_desktop"] = search.is_visible() if search.count() else False
        desktop_search = page.get_by_role("button", name="Search workflows")
        if desktop_search.count() == 0:
            desktop_search = page.get_by_role("button", name="Search")
        if desktop_search.count():
            desktop_search.first.click()
            interactions["search_dialog_opened"] = page.get_by_role("dialog").count() > 0
            page.keyboard.press("Escape")
        theme = page.get_by_role("button", name="Change color theme")
        if theme.count():
            theme.first.click()
            interactions["theme_menu_opened"] = page.get_by_role("menu").count() > 0
            page.keyboard.press("Escape")
        benchmark = page.get_by_role("button", name="Benchmark mode")
        if benchmark.count():
            benchmark.first.click()
            interactions["benchmark_dialog_opened"] = page.get_by_role("dialog").count() > 0
            page.keyboard.press("Escape")
        page.screenshot(path=str(SCREENSHOTS / "baseline-dashboard-interactions.png"), full_page=True)

        (ROOT / "baseline.json").write_text(json.dumps({"base": BASE, "results": results, "interactions": interactions}, indent=2), encoding="utf-8")
        browser.close()


if __name__ == "__main__":
    main()
