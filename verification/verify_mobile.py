from playwright.sync_api import sync_playwright
import os

def verify_mobile_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Set viewport to mobile size
        page.set_viewport_size({"width": 375, "height": 812})

        # Load local file - using absolute path based on current working directory
        cwd = os.getcwd()
        file_path = f"file://{cwd}/verification/mockup_mobile.html"
        print(f"Navigating to: {file_path}")

        page.goto(file_path)

        # Take screenshot
        output_path = f"{cwd}/verification/mobile_view.png"
        page.screenshot(path=output_path, full_page=True)
        print(f"Screenshot taken: {output_path}")

        browser.close()

if __name__ == "__main__":
    verify_mobile_layout()
