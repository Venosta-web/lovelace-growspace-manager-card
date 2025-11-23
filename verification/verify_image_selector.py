
import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser error: {err}"))

        # Load the mock HTML
        await page.goto("http://localhost:8000/mockup.html")

        # Wait for card
        await page.wait_for_selector("growspace-manager-card", state="attached")

        # Let's interact via UI to be safe
        # 1. Open Strain Library (chip)
        # Note: In mockup, default_growspace is gs1, so it should render.

        # Check if the chip is there
        chip = page.locator('div.stat-chip[title="Strain Library"]')
        try:
             await chip.wait_for(state="visible", timeout=5000)
             await chip.click()
             print("Clicked Strain Library chip")
        except:
             print("Strain Library chip not found. Dumping body:")
             print(await page.inner_html("body"))
             await browser.close()
             return

        # 2. Click New Strain
        new_btn = page.locator('button', has_text="New Strain")
        await new_btn.click()
        print("Clicked New Strain")

        # 3. Click Select from Library
        select_btn = page.locator('button.select-library-btn')
        await select_btn.click()
        print("Clicked Select from Library")

        # 4. Verify Overlay
        overlay = page.locator('h2.sd-title', has_text="Select from Library")
        await expect(overlay).to_be_visible()
        print("Overlay visible")

        # Screenshot
        await page.screenshot(path="verification/verification_screenshot.png")
        print("Screenshot saved")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
