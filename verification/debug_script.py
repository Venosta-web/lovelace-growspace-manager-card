from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000/verification/mockup.html")
        page.wait_for_selector("growspace-manager-card")

        # Debug screenshot
        time.sleep(2)
        page.screenshot(path="verification/debug_initial.png")
        print("Debug screenshot saved")

        browser.close()

if __name__ == "__main__":
    run()
