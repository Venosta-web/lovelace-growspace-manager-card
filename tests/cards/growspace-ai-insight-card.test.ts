import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, aroundEach, beforeEach, vi } from 'vitest';
import { html } from 'lit';
import { GrowspaceAiInsightCard } from '../../src/cards/growspace-ai-insight-card';
import type { GrowAdviceResponse } from '../../src/types';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import { createMockHass } from '../mocks/hass';

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

describe('GrowspaceAiInsightCard', () => {
    let element: GrowspaceAiInsightCard;

    aroundEach(async (runTest) => {
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

    test('returns standard card size', () => {
        expect(element.getCardSize()).toBe(4);
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
    
    describe('_extractText behavior', () => {
        test('extracts direct string', () => {
            const text = (element as any)._extractText('hello string');
            expect(text).toBe('hello string');
        });

        test('extracts json if no response property', () => {
            const obj = { some_data: 123 } as any;
            const text = (element as any)._extractText(obj);
            expect(text).toBe('{"some_data":123}');
        });

        test('extracts response if string', () => {
            const obj = { response: 'hello directly' } as any;
            const text = (element as any)._extractText(obj);
            expect(text).toBe('hello directly');
        });

        test('extracts nested response', () => {
            const obj = { response: { response: 'nested response text' } } as any;
            const text = (element as any)._extractText(obj);
            expect(text).toBe('nested response text');
        });

        test('extracts json from nested object', () => {
            const obj = { response: { other_data: 456 } } as any;
            const text = (element as any)._extractText(obj);
            expect(text).toBe('{"other_data":456}');
        });
    });

    describe('_analyze behavior', () => {
        beforeEach(() => {
            // Setup active devices
            element.store.data.$devices.set([
                { deviceId: 'tent_1', name: 'Tent 1', plants: [] } as any,
                { deviceId: 'tent_2', name: 'Tent 2', plants: [] } as any,
            ]);
            element.store.grid.$selectedDevice.set('tent_1');
        });

        test('analyze all triggers analyzeAllGrowspaces', async () => {
            const spyAll = vi.spyOn(element.store.dataService, 'analyzeAllGrowspaces').mockResolvedValue('All advice' as any);
            element.shadowRoot?.querySelector('.sd-textarea')?.dispatchEvent(new InputEvent('input', { data: 'test query' }));
            
            await (element as any)._analyze(true);

            expect(spyAll).toHaveBeenCalled();
            expect((element as any)._response).toBe('All advice');
            expect((element as any)._isLoading).toBe(false);
        });

        test('analyze specific triggers askGrowAdvice on selected device', async () => {
            const spySpecific = vi.spyOn(element.store.dataService, 'askGrowAdvice').mockResolvedValue('Specific advice' as any);
            element.shadowRoot?.querySelector('.sd-textarea')?.dispatchEvent(new InputEvent('input', { data: 'test query' }));
            (element as any)._userQuery = 'test query';

            await (element as any)._analyze(false);

            expect(spySpecific).toHaveBeenCalledWith('tent_1', 'test query');
            expect((element as any)._response).toBe('Specific advice');
            expect((element as any)._isLoading).toBe(false);
        });

        test('analyze specific throws error if no device selected', async () => {
            element.store.grid.$selectedDevice.set(null);
            await (element as any)._analyze(false);

            expect((element as any)._error).toContain('No device selected and "Analyze All" was false.');
        });

        test('analyze specific throws error if device not found in array', async () => {
            element.store.grid.$selectedDevice.set('nonexistent');
            await (element as any)._analyze(false);

            expect((element as any)._error).toContain('Selected device not found in devices list.');
        });

        test('handles generic errors during analyze', async () => {
            vi.spyOn(element.store.dataService, 'analyzeAllGrowspaces').mockRejectedValue(new Error('Network fault'));
            
            await (element as any)._analyze(true);
            
            expect((element as any)._error).toBe('Network fault');
        });

        test('fallback generic error handler handles unknown thrown objects', async () => {
            vi.spyOn(element.store.dataService, 'analyzeAllGrowspaces').mockRejectedValue('Not an Error object');
            
            await (element as any)._analyze(true);
            
            expect((element as any)._error).toBe('Unknown error occurred during analysis.');
        });
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

        test('renders loading spinner when loading', async () => {
            (element as any)._isLoading = true;
            await element.updateComplete;
            
            const loader = element.shadowRoot?.querySelector('.gm-loading');
            expect(loader).toBeTruthy();
        });

        test('renders response box when response exists and not loading', async () => {
            (element as any)._isLoading = false;
            (element as any)._response = 'The AI says grow more weed';
            await element.updateComplete;
            
            const box = element.shadowRoot?.querySelector('.gm-response-box');
            expect(box).toBeTruthy();
            expect(box?.textContent).toContain('The AI says grow more weed');
        });

        test('renders error box when error exists', async () => {
            (element as any)._error = 'Oops AI failed';
            await element.updateComplete;
            
            const box = element.shadowRoot?.querySelector('.error-state');
            expect(box).toBeTruthy();
            expect(box?.textContent).toContain('Error: Oops AI failed');
        });

        test('buttons trigger correct analyze bounds', async () => {
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

});
