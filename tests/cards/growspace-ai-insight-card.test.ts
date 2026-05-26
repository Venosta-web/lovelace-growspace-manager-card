import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, aroundEach, beforeEach, vi } from 'vitest';
import { html } from 'lit';
import { GrowspaceAiInsightCard } from '../../src/cards/growspace-ai-insight-card';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import { createMockHass } from '../mocks/hass';
import { aiInsight$, isAiLoading$, aiError$ } from '../../src/slices/ai-insight';

// Ensure the custom element is defined
if (!customElements.get('growspace-ai-insight-card')) {
    customElements.define('growspace-ai-insight-card', GrowspaceAiInsightCard);
}

// Mock sub-components
vi.mock('../../src/features/shared/ui/error-boundary', () => ({
    ErrorBoundary: class extends HTMLElement { }
}));
vi.mock('../../src/cards/editors/growspace-ai-insight-card-editor', () => ({
    GrowspaceAiInsightCardEditor: class extends HTMLElement { }
}));

// Mock the slice mutators at the module boundary — atoms are kept real so cards
// react to atom changes without needing a live HA connection.
vi.mock('../../src/slices/ai-insight', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/slices/ai-insight')>();
    return {
        ...actual,
        analyzeAllGrowspaces: vi.fn().mockResolvedValue(undefined),
        askGrowAdvice: vi.fn().mockResolvedValue(undefined),
        dismissInsight: vi.fn(),
        clearAiError: vi.fn(),
    };
});

describe('GrowspaceAiInsightCard', () => {
    let element: GrowspaceAiInsightCard;

    aroundEach(async (runTest) => {
        // Reset atoms before each test so state doesn't leak between tests.
        isAiLoading$.set(false);
        aiInsight$.set(null);
        aiError$.set(null);

        element = await fixture<GrowspaceAiInsightCard>(html`<growspace-ai-insight-card></growspace-ai-insight-card>`);
        element.hass = createMockHass() as any;
        await runTest();
        vi.restoreAllMocks();
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceAiInsightCard);
    });

    test('initializes default growspace from config', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-ai-insight-card',
            default_growspace: 'test_tent',
        };

        const initSpy = vi.spyOn(element.store, 'initializeSelectedDevice');
        element.setConfig(config);

        expect(element._config?.default_growspace).toBe('test_tent');
        expect(initSpy).toHaveBeenCalledWith(config);
    });

    test('throws error on invalid config', () => {
        expect(() => element.setConfig(undefined as any)).toThrowError('Invalid configuration');
    });

    test('renders error state when hass is missing', async () => {
        const el = await fixture<GrowspaceAiInsightCard>(html`<growspace-ai-insight-card></growspace-ai-insight-card>`);
        el.hass = undefined as any;
        await el.updateComplete;

        const errorDiv = el.shadowRoot?.querySelector('.error-state');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('Home Assistant not available');
    });

    test('provides fallback stub config', () => {
        const stub = GrowspaceAiInsightCard.getStubConfig();
        expect(stub.type).toBe('custom:growspace-ai-insight-card');
        expect(stub).toHaveProperty('default_growspace');
    });

    test('returns standard card size', () => {
        expect(element.getCardSize()).toBe(4);
    });

    test('calls store updateHass on updated', async () => {
        const spy = vi.spyOn(element.store, 'updateHass');
        element.hass = { ...element.hass, language: 'de' } as any;
        await element.updateComplete;
        expect(spy).toHaveBeenCalled();
    });

    test('disconnectedCallback destroys store', async () => {
        const spy = vi.spyOn(element.store, 'destroy');
        element.disconnectedCallback();
        expect(spy).toHaveBeenCalled();
    });

    test('stale counter triggers data refresh', async () => {
        const refreshSpy = vi.spyOn(element.store.syncService, 'refreshGrowspaceData');
        element.store.data.$staleCounter.set(element.store.data.$staleCounter.get() + 1);
        await Promise.resolve();
        expect(refreshSpy).toHaveBeenCalled();
    });

    test('calls system_log/write on handle error', () => {
        (element as any)._handleError(new Error('AI Insight Error'), { componentStack: 'Mock' });

        expect(element.hass.callService).toHaveBeenCalledWith('system_log', 'write', expect.objectContaining({
            message: 'Growspace AI Insight Card Error: AI Insight Error',
            level: 'error',
            logger: 'lovelace_growspace_manager_card',
        }));
    });

    test('gets config element correctly', async () => {
        const editor = await GrowspaceAiInsightCard.getConfigElement();
        expect(editor.tagName.toLowerCase()).toBe('growspace-ai-insight-card-editor');
    });

    describe('render functionality', () => {
        beforeEach(() => {
            element.store.data.$devices.set([
                { deviceId: 'tent_1', name: 'Tent 1', plants: [] } as any
            ]);
            element.store.grid.$selectedDevice.set('tent_1');
        });

        test('renders the target name in subtitle', async () => {
            await element.updateComplete;
            const subtitle = element.shadowRoot?.querySelector('.ai-subtitle');
            expect(subtitle?.textContent).toContain('Target: Tent 1');
        });

        test('renders Unknown Growspace if selected device not matched', async () => {
            element.store.grid.$selectedDevice.set(null);
            await element.updateComplete;
            const subtitle = element.shadowRoot?.querySelector('.ai-subtitle');
            expect(subtitle?.textContent).toContain('Target: Unknown Growspace');
        });

        test('textarea updates query state', async () => {
            await element.updateComplete;
            const textarea = element.shadowRoot?.querySelector('.sd-textarea') as HTMLTextAreaElement;

            textarea.value = 'hello!';
            textarea.dispatchEvent(new InputEvent('input'));

            expect((element as any)._userQuery).toBe('hello!');
        });

        test('renders loading spinner when isAiLoading$ is true', async () => {
            isAiLoading$.set(true);
            await element.updateComplete;

            const loader = element.shadowRoot?.querySelector('.gm-loading');
            expect(loader).toBeTruthy();
        });

        test('renders response box when aiInsight$ has text and not loading', async () => {
            isAiLoading$.set(false);
            aiInsight$.set('The AI says grow more');
            await element.updateComplete;

            const box = element.shadowRoot?.querySelector('.gm-response-box');
            expect(box).toBeTruthy();
            expect(box?.textContent).toContain('The AI says grow more');
        });

        test('renders error state when aiError$ has a message', async () => {
            aiError$.set('Oops AI failed');
            await element.updateComplete;

            const box = element.shadowRoot?.querySelector('.error-state');
            expect(box).toBeTruthy();
            expect(box?.textContent).toContain('Error: Oops AI failed');
        });

        test('buttons trigger correct analyze calls', async () => {
            const spy = vi.spyOn(element as any, '_analyze').mockResolvedValue(undefined as any);
            await element.updateComplete;

            const buttons = element.shadowRoot?.querySelectorAll('.md3-button');
            const allBtn = buttons?.[0] as HTMLButtonElement;
            const specificBtn = buttons?.[1] as HTMLButtonElement;

            allBtn.click();
            expect(spy).toHaveBeenCalledWith(true);

            specificBtn.click();
            expect(spy).toHaveBeenCalledWith(false);
        });
    });

    describe('_analyze behavior', () => {
        beforeEach(() => {
            element.store.data.$devices.set([
                { deviceId: 'tent_1', name: 'Tent 1', plants: [] } as any,
                { deviceId: 'tent_2', name: 'Tent 2', plants: [] } as any,
            ]);
            element.store.grid.$selectedDevice.set('tent_1');
        });

        test('Analyze All button calls analyzeAllGrowspaces', async () => {
            const { analyzeAllGrowspaces } = await import('../../src/slices/ai-insight');
            await element.updateComplete;

            const allBtn = element.shadowRoot?.querySelectorAll('.md3-button')[0] as HTMLButtonElement;
            allBtn.click();
            await element.updateComplete;

            expect(analyzeAllGrowspaces).toHaveBeenCalled();
        });

        test('Analyze Specific button calls askGrowAdvice with selected device and query', async () => {
            const { askGrowAdvice } = await import('../../src/slices/ai-insight');
            (element as any)._userQuery = 'test query';
            await element.updateComplete;

            const specificBtn = element.shadowRoot?.querySelectorAll('.md3-button')[1] as HTMLButtonElement;
            specificBtn.click();
            // wait for the async _analyze to dispatch
            await new Promise((r) => setTimeout(r, 0));

            expect(askGrowAdvice).toHaveBeenCalledWith('tent_1', 'test query');
        });
    });
});
