from playwright.sync_api import sync_playwright
import os

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Get absolute path to mockup file
    cwd = os.getcwd()
    file_path = f"file://{cwd}/mockup_header.html"

    page.goto(file_path)

    # Take screenshot
    page.screenshot(path="verification_header.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
