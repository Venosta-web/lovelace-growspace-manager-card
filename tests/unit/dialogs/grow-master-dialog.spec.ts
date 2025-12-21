import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowMasterDialog } from '../../../src/dialogs/grow-master-dialog';
import '../../../src/dialogs/grow-master-dialog';
import { html, render } from 'lit';

describe('GrowMasterDialog', () => {
    let element: GrowMasterDialog;

    beforeEach(async () => {
        element = document.createElement('grow-master-dialog') as GrowMasterDialog;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(GrowMasterDialog);
    });

    it('should not render content when closed', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });

    it('should render content when open', async () => {
        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeTruthy();
        expect(element.shadowRoot?.querySelector('.dialog-title')?.textContent).toContain('Ask the Grow Master');
    });

    describe('Rendering States', () => {
        it('should show stressed state styling', async () => {
            element.open = true;
            element.isStressed = true;
            await element.updateComplete;

            const subtitle = element.shadowRoot?.querySelector('.dialog-subtitle');
            expect(subtitle?.textContent).toContain('Warning: Plant Stress Detected');

            const container = element.shadowRoot?.querySelector('.glass-dialog-container');
            // Check if border color logic is applied (might need computed style or check style attr)
            expect(container?.getAttribute('style')).toContain('border-color: #FF9800');
        });

        it('should show custom personality title', async () => {
            element.open = true;
            element.personality = 'Botanist';
            await element.updateComplete;

            const title = element.shadowRoot?.querySelector('.dialog-title');
            expect(title?.textContent).toContain('Ask the Botanist');
        });

        it('should show loading spinner', async () => {
            element.open = true;
            element.isLoading = true;
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('.gm-loading')).toBeTruthy();
            expect(element.shadowRoot?.querySelector('.gm-response-box')).toBeNull();
        });

        it('should show response when not loading', async () => {
            element.open = true;
            element.isLoading = false;
            element.response = 'Analysis complete.';
            await element.updateComplete;

            const responseBox = element.shadowRoot?.querySelector('.gm-response-box');
            expect(responseBox).toBeTruthy();
            expect(responseBox?.textContent).toContain('Analysis complete.');
        });
    });

    describe('Interactions', () => {
        it('should update userQuery on input', async () => {
            element.open = true;
            await element.updateComplete;

            const textarea = element.shadowRoot?.querySelector('textarea');
            expect(textarea).toBeTruthy();

            // Simulate input
            if (textarea) {
                textarea.value = 'How are my plants?';
                textarea.dispatchEvent(new Event('input'));
            }
            await element.updateComplete;

            // We can't access private userQuery easily without casting or checking internal state if exposed
            // But we can verify it's passed in the event payload later
            // Or access via 'any'
            expect((element as any).userQuery).toBe('How are my plants?');
        });

        it('should dispatch close event', async () => {
            element.open = true;
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('close', listener);

            const closeBtn = element.shadowRoot?.querySelector('button.md3-button.text'); // Valid selector for the X button?
            // The template has a specific close button
            // Button with mdiClose icon
            (closeBtn as HTMLElement).click();

            expect(listener).toHaveBeenCalled();
        });

        it('should dispatch analyze-growspace event', async () => {
            element.open = true;
            (element as any).userQuery = 'Test Query';
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('analyze-growspace', listener);

            // Find "Analyze Environment" button
            const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') || []);
            const analyzeBtn = buttons.find(b => b.textContent?.includes('Analyze Environment'));
            expect(analyzeBtn).toBeTruthy();

            (analyzeBtn as HTMLElement).click();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: { query: 'Test Query' }
            }));
        });

        it('should dispatch analyze-all-growspaces event', async () => {
            element.open = true;
            (element as any).userQuery = 'Global Query';
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('analyze-all-growspaces', listener);

            // Find "Analyze All" button
            const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') || []);
            const analyzeAllBtn = buttons.find(b => b.textContent?.includes('Analyze All'));
            expect(analyzeAllBtn).toBeTruthy();

            (analyzeAllBtn as HTMLElement).click();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: { query: 'Global Query' }
            }));
        });
    });
});
