
import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # We need to serve the files. Since we are in the repo root, we can use file://
        # BUT Modules via file:// are blocked by CORS usually.
        # We should start a simple HTTP server or assume the environment allows it?
        # The memory says "Frontend verification scripts using Playwright with ES modules must be served via a local HTTP server".

        # So I will assume a server is running on port 8000.
        # I need to start it first. I will do that in the bash command.

        page.goto("http://localhost:8000/verification_mockup.html")

        # Wait for the cards to render
        try:
            page.wait_for_selector("growspace-manager-card", state="visible", timeout=5000)
            # Wait a bit more for Lit to render
            page.wait_for_timeout(2000)
        except Exception as e:
            print(f"Error waiting for selector: {e}")

        # Take screenshot
        page.screenshot(path="verification_result.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    run()
