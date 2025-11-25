from playwright.sync_api import sync_playwright
import os

def verify_export_button():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Access via HTTP server
        page.goto("http://localhost:8000/verification/mockup_export.html")

        # Wait for card to load - increase timeout just in case
        try:
            page.wait_for_selector("growspace-manager-card", timeout=10000)
        except Exception as e:
            print(f"Error waiting for card: {e}")
            page.screenshot(path="verification/debug_card_fail.png")
            return

        # Ensure custom elements are defined/upgraded
        page.wait_for_function("customElements.get('growspace-manager-card') !== undefined")

        # Find and click the Strains button
        # Try different selectors as the layout might be responsive or structure changed
        try:
            # Try chip first
            strains_chip = page.locator(".stat-chip").filter(has_text="Strains").first
            if strains_chip.is_visible():
                strains_chip.click()
                print("Clicked Strains chip")
            else:
                # Try button
                strains_btn = page.locator("button").filter(has_text="Strains").first
                if strains_btn.is_visible():
                    strains_btn.click()
                    print("Clicked Strains button")
                else:
                    print("Could not find Strains button/chip")
                    page.screenshot(path="verification/debug_no_strains_btn.png")
                    return
        except Exception as e:
            print(f"Error clicking strains: {e}")
            page.screenshot(path="verification/debug_click_fail.png")
            return

        # Wait for the dialog to open
        try:
            page.wait_for_selector("ha-dialog[open]", timeout=5000)
            print("Strain Library Dialog opened")
        except:
            print("Dialog did not open")
            page.screenshot(path="verification/debug_dialog_fail.png")
            return

        # Check for the Export Button
        # It should have text "Export Strains" and mdiDownload icon
        # Note: The button is inside the dialog, possibly shadow DOM involved?
        # ha-dialog uses slots. Our content is in the light DOM of ha-dialog (slotted).

        export_btn = page.locator("button.sd-btn").filter(has_text="Export Strains")

        if export_btn.count() > 0 and export_btn.first.is_visible():
            print("Export Strains button is visible")
            # Take screenshot of the dialog footer
            page.screenshot(path="verification/verification_export_btn.png")
            print("Screenshot taken: verification/verification_export_btn.png")
        else:
            print("Export Strains button NOT found")
            page.screenshot(path="verification/verification_failure.png")

        browser.close()

if __name__ == "__main__":
    verify_export_button()
