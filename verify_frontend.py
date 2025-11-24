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

        # Click the "Strain Library" button (it's a chip/button in the header)
        # Using title selector as defined in code: title="Strain Library"
        # Or locate by icon path if needed, but let's try selector.

        # Wait for the button to appear. The card renders async.
        # It's a div with class 'stat-chip' and title 'Strain Library'
        page.locator(".stat-chip[title='Strain Library']").click()

        # Wait for dialog to open
        expect(page.locator("ha-dialog")).to_be_visible()

        # Wait for content to render. We expect "Gorilla Glue" and "Hybrid"
        expect(page.get_by_text("Gorilla Glue")).to_be_visible()
        expect(page.get_by_text("Hybrid")).to_be_visible()

        # Check for the scale graph.
        # We can look for the class .scale-graph-container
        # And verify the bars have correct widths
        scale_graph = page.locator(".scale-graph-container").first
        expect(scale_graph).to_be_visible()

        # Take a screenshot of the library browse view
        page.screenshot(path="strain_library_browse.png")
        print("Captured strain_library_browse.png")

        # Now click on the Gorilla Glue card to open the editor
        page.get_by_text("Gorilla Glue").click()

        # Wait for Editor View
        expect(page.get_by_text("Edit Strain")).to_be_visible()

        # Verify inputs exist
        expect(page.get_by_text("Hybrid Composition (%)")).to_be_visible()
        sativa_input = page.locator("input[placeholder='0-100']").first
        indica_input = page.locator("input[placeholder='0-100']").nth(1)

        # Check values
        expect(sativa_input).to_have_value("60")
        expect(indica_input).to_have_value("40")

        # Test validation logic: Set Sativa to 90, Indica should remain until modified?
        # Actually logic is: on input of one, if sum > 100, clamp/adjust.
        # Let's try typing 80 into Sativa (current Indica is 40). 80+40=120 > 100.
        # My logic:
        # if(val + currentIndica > 100) { val = 100 - currentIndica; e.target.value = val; }
        # So if I type 80, and Indica is 40, Sativa should become 60.
        # Wait, that's "clamping the input". It prevents me from increasing Sativa unless I decrease Indica first.
        # Let's verify that behavior.

        sativa_input.fill("80")
        # Logic: currentIndica is 40. val=80. 80+40=120. val becomes 60.
        expect(sativa_input).to_have_value("60")

        # Take screenshot of editor
        page.screenshot(path="strain_library_editor.png")
        print("Captured strain_library_editor.png")

        browser.close()

if __name__ == "__main__":
    run()
