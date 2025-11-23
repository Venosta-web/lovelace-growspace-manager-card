
from playwright.sync_api import sync_playwright
import time

def verify_config_dialog():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen to console events
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"BROWSER ERROR: {exc}"))

        # Load the mockup
        page.goto("http://localhost:8000/mockup.html")

        # Wait for card to exist in DOM (we know it does)
        print("Waiting for card component...")

        # We wait for it to be defined
        page.evaluate("customElements.whenDefined('growspace-manager-card').then(() => console.log('Component defined'))")

        # Wait for it to be visible. If it's 0x0, it might be considered hidden.
        # Let's check bounding box
        card = page.locator("growspace-manager-card")

        # Force display block in case it's not (it is in CSS)

        try:
             # Try waiting for it to be visible
             card.wait_for(state="visible", timeout=5000)
        except:
             print("Card not visible yet. Checking dimensions...")
             box = card.bounding_box()
             print(f"Bounding box: {box}")

        # 1. Click the Cog button (it has title="Configure")
        print("Clicking config button...")
        config_btn = page.locator('div[title="Configure"]')

        # If component failed to render, this won't exist.
        if config_btn.count() == 0:
            print("Config button not found. Dumping body HTML...")
            print(page.content())
            browser.close()
            return

        config_btn.click()

        print("Dialog opened. Waiting for dialog...")
        page.locator('.config-container').wait_for(state="visible")

        page.screenshot(path="verification_config_add.png")
        print("Captured Add Growspace tab.")

        # 2. Switch to Environment tab
        print("Switching to Environment tab...")
        page.locator('.config-tab', has_text="Environment").click()
        time.sleep(0.5)
        page.screenshot(path="verification_config_env.png")
        print("Captured Environment tab.")

        # 3. Switch to Global tab
        print("Switching to Global tab...")
        page.locator('.config-tab', has_text="Global").click()
        time.sleep(0.5)
        page.screenshot(path="verification_config_global.png")
        print("Captured Global tab.")

        browser.close()

if __name__ == "__main__":
    verify_config_dialog()
