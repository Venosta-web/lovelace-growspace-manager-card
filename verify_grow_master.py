
from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8000/mockup.html")

    # Wait for card to load
    page.wait_for_timeout(2000)

    # Check for "Main Tent" in shadow DOM
    if page.get_by_text("Main Tent").is_visible():
        print("SUCCESS: Main Tent is visible.")
    else:
        print("FAILURE: Main Tent NOT visible.")
        return

    # Find brain button
    brain_btn = page.locator("button[title='Ask the Grow Master']")
    if brain_btn.is_visible():
        print("SUCCESS: Brain button visible.")
        brain_btn.click(force=True)
    else:
        print("FAILURE: Brain button not visible.")
        page.screenshot(path="debug_no_button.png")
        return

    # Wait for dialog to open
    page.wait_for_timeout(1000)

    # Check if dialog is open by looking for textarea
    if page.locator("textarea").is_visible():
         print("SUCCESS: Dialog opened.")
    else:
         print("FAILURE: Dialog textarea not found.")
         page.screenshot(path="debug_dialog_fail.png")
         return

    # Type a query
    page.locator("textarea").fill("What should I do about humidity?")

    # Click Analyze
    page.get_by_role("button", name="Analyze Environment").click()

    # Wait for response
    page.wait_for_timeout(2000)

    # Verify response
    if page.get_by_text("LISTEN UP!").is_visible():
         print("SUCCESS: Response received.")
    else:
         print("FAILURE: Response missing.")

    # Take final screenshot
    page.screenshot(path="verification_result.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
