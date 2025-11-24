from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the mockup
        page.goto("http://localhost:8000/mockup.html")

        # Wait for the card to load
        expect(page.locator("growspace-manager-card")).to_be_visible()

        # Click the "Strain Library" button
        page.locator(".stat-chip[title='Strain Library']").click()

        # Wait for dialog to open
        expect(page.locator("ha-dialog")).to_be_visible()

        # Wait for content to render. We expect "Gorilla Glue" and "Hybrid"
        expect(page.get_by_text("Gorilla Glue")).to_be_visible()
        expect(page.get_by_text("Hybrid")).to_be_visible()

        # Check for the NEW hybrid graph container
        hg_container = page.locator(".hg-container").first
        expect(hg_container).to_be_visible()

        # Verify legend exists
        expect(hg_container.locator(".hg-legend-container")).to_be_visible()
        expect(hg_container.get_by_text("25%")).to_be_visible()

        # Take a screenshot of the library browse view
        page.screenshot(path="strain_library_browse.png")
        print("Captured strain_library_browse.png")

        # Now click on the Gorilla Glue card to open the editor
        page.get_by_text("Gorilla Glue").click()

        # Wait for Editor View
        expect(page.get_by_text("Edit Strain")).to_be_visible()

        # Verify new interactive inputs exist
        expect(page.get_by_text("Hybrid Composition (%)")).to_be_visible()

        # Check for the new number inputs (class .hg-num-input)
        # There should be 2: Indica and Sativa
        inputs = page.locator(".hg-num-input")
        expect(inputs).to_have_count(2)

        indica_input = inputs.nth(0)
        sativa_input = inputs.nth(1)

        # Check values (Indica 40, Sativa 60)
        expect(indica_input).to_have_value("40")
        expect(sativa_input).to_have_value("60")

        # Test interaction: Click the bar?
        # Let's try typing first to match previous test logic
        # Set Indica to 50. Sativa should become 50.
        indica_input.fill("50")
        indica_input.dispatch_event("input") # Trigger lit update

        expect(indica_input).to_have_value("50")
        expect(sativa_input).to_have_value("50")

        # Test clicking the bar
        # The bar is .hg-bar-track.
        bar = page.locator(".hg-bar-track").last # Use last because browse view might still be in DOM? No, dialog rerenders content.
        # But wait, the dialog content replaces the browse view.
        # Let's be safe and use visibility.
        editor_bar = page.locator(".hg-bar-track").filter(has=page.locator(".hg-tick")).last

        # Click at 25% of width.
        # Playwright click takes position={x, y}.
        # We need to click relative to element.
        box = editor_bar.bounding_box()
        # Click at 25% from left
        page.mouse.click(box['x'] + (box['width'] * 0.25), box['y'] + (box['height'] / 2))

        # Indica should be approx 25, Sativa 75.
        # Allow small margin due to rounding
        val = int(indica_input.input_value())
        assert 23 <= val <= 27, f"Expected Indica ~25, got {val}"

        # Take screenshot of editor
        page.screenshot(path="strain_library_editor.png")
        print("Captured strain_library_editor.png")

        browser.close()

if __name__ == "__main__":
    run()
