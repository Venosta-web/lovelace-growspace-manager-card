import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowMasterDialog } from '../../../src/dialogs/grow-master-dialog';
import '../../../src/dialogs/grow-master-dialog';
import { html, render } from 'lit';
import { aiMode$, activeThreadId$, conversationThreads$ } from '../../../src/slices/ai-insight';

vi.mock('../../../src/services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

describe('GrowMasterDialog', () => {
    let element: GrowMasterDialog;

    beforeEach(async () => {
        aiMode$.set('chat');
        activeThreadId$.set(null);
        conversationThreads$.set(new Map());
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
        it('should show stressed state subtitle when isStressed', async () => {
            element.open = true;
            element.isStressed = true;
            await element.updateComplete;

            const subtitle = element.shadowRoot?.querySelector('.dialog-subtitle');
            expect(subtitle?.textContent).toContain('Warning: Plant Stress Detected');
        });

        it('should show custom personality title', async () => {
            element.open = true;
            element.personality = 'Botanist';
            await element.updateComplete;

            const title = element.shadowRoot?.querySelector('.dialog-title');
            expect(title?.textContent).toContain('Ask the Botanist');
        });

        it('renders gm-chat-panel element when chat mode is active', async () => {
            element.open = true;
            aiMode$.set('chat');
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('gm-chat-panel')).toBeTruthy();
        });
    });

    describe('Interactions', () => {
        it('should dispatch close event', async () => {
            element.open = true;
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('close', listener);

            const closeBtn = element.shadowRoot?.querySelector('button.md3-button.text');
            (closeBtn as HTMLElement).click();

            expect(listener).toHaveBeenCalled();
        });
    });
});

describe('GrowMasterDialog — three-mode shell', () => {
    let element: GrowMasterDialog;

    beforeEach(async () => {
        aiMode$.set('briefing');
        activeThreadId$.set(null);
        conversationThreads$.set(new Map());
        element = document.createElement('grow-master-dialog') as GrowMasterDialog;
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
        vi.restoreAllMocks();
    });

    describe('structural shell', () => {
        it('renders a sticky header when open', async () => {
            expect(element.shadowRoot?.querySelector('.gm-header')).toBeTruthy();
        });

        it('renders a left nav rail when open', async () => {
            expect(element.shadowRoot?.querySelector('.gm-nav-rail')).toBeTruthy();
        });

        it('renders a scrollable content area when open', async () => {
            expect(element.shadowRoot?.querySelector('.gm-content')).toBeTruthy();
        });

        it('renders a sticky footer when open', async () => {
            expect(element.shadowRoot?.querySelector('.gm-footer')).toBeTruthy();
        });
    });

    describe('mode switching', () => {
        it('nav rail has buttons for Chat, Briefing, and Inbox', async () => {
            const rail = element.shadowRoot?.querySelector('.gm-nav-rail');
            const buttons = rail?.querySelectorAll('[data-mode]');
            const modes = Array.from(buttons ?? []).map((b) => b.getAttribute('data-mode'));
            expect(modes).toContain('chat');
            expect(modes).toContain('briefing');
            expect(modes).toContain('inbox');
        });

        it('clicking Chat nav item updates aiMode$ to "chat"', async () => {
            const chatBtn = element.shadowRoot?.querySelector('[data-mode="chat"]') as HTMLElement;
            chatBtn.click();
            expect(aiMode$.get()).toBe('chat');
        });

        it('clicking Inbox nav item updates aiMode$ to "inbox"', async () => {
            const inboxBtn = element.shadowRoot?.querySelector('[data-mode="inbox"]') as HTMLElement;
            inboxBtn.click();
            expect(aiMode$.get()).toBe('inbox');
        });

        it('shows chat panel when aiMode$ is "chat"', async () => {
            aiMode$.set('chat');
            await element.updateComplete;
            expect(element.shadowRoot?.querySelector('gm-chat-panel')).toBeTruthy();
            expect(element.shadowRoot?.querySelector('.gm-panel-briefing')).toBeFalsy();
            expect(element.shadowRoot?.querySelector('.gm-panel-inbox')).toBeFalsy();
        });

        it('shows briefing panel when aiMode$ is "briefing"', async () => {
            aiMode$.set('briefing');
            await element.updateComplete;
            expect(element.shadowRoot?.querySelector('.gm-panel-briefing')).toBeTruthy();
            expect(element.shadowRoot?.querySelector('.gm-panel-chat')).toBeFalsy();
        });

        it('shows inbox panel when aiMode$ is "inbox"', async () => {
            aiMode$.set('inbox');
            await element.updateComplete;
            expect(element.shadowRoot?.querySelector('.gm-panel-inbox')).toBeTruthy();
            expect(element.shadowRoot?.querySelector('.gm-panel-chat')).toBeFalsy();
        });
    });

    describe('footer', () => {
        it('footer contains disclaimer text', async () => {
            const footer = element.shadowRoot?.querySelector('.gm-footer');
            expect(footer?.textContent).toMatch(/AI|disclaimer|generated/i);
        });

        it('mic button is present and disabled', async () => {
            const mic = element.shadowRoot?.querySelector('.gm-mic-btn') as HTMLButtonElement;
            expect(mic).toBeTruthy();
            expect(mic?.disabled).toBe(true);
        });
    });

    describe('icon tinting', () => {
        it('header icon has data-mode attribute reflecting aiMode$', async () => {
            aiMode$.set('chat');
            await element.updateComplete;
            const icon = element.shadowRoot?.querySelector('.gm-header-icon');
            expect(icon?.getAttribute('data-mode')).toBe('chat');
        });

        it('header icon data-mode updates when mode changes to briefing', async () => {
            aiMode$.set('briefing');
            await element.updateComplete;
            const icon = element.shadowRoot?.querySelector('.gm-header-icon');
            expect(icon?.getAttribute('data-mode')).toBe('briefing');
        });
    });
});
