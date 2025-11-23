from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the mockup
        page.goto("http://localhost:8000/verification/mockup.html")

        # Wait for the card to render
        page.wait_for_selector("growspace-manager-card")

        # Click on "Strains" button in the header
        # Note: In mobile view it might be different, but we assume desktop size by default
        # The Strains button has text "Strains" or title "Strain Library"
        strains_btn = page.get_by_title("Strain Library")
        strains_btn.click()

        # Wait for dialog
        page.wait_for_selector(".strain-dialog-container")

        # Click "New Strain" button
        new_strain_btn = page.get_by_text("New Strain")
        new_strain_btn.click()

        # Verify Editor View
        expect(page.get_by_text("Add New Strain")).to_be_visible()
        expect(page.get_by_text("PHOTO UPLOAD AREA")).to_be_visible()

        # Take screenshot of the editor with upload area
        page.screenshot(path="verification/strain_editor_upload.png")
        print("Screenshot saved to verification/strain_editor_upload.png")

        # Optional: verify file input exists (hidden)
        upload_input = page.locator("#strain-image-upload")
        expect(upload_input).to_be_hidden() # It is styled as display:none but triggered by click

        browser.close()

if __name__ == "__main__":
    run()
