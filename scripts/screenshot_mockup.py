from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:8000/mockup.html")
    page.screenshot(path="mockup_preview.png", full_page=True)
    browser.close()
