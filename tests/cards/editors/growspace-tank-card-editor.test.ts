import { fixture, html } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import '../../../src/cards/editors/growspace-tank-card-editor';
import { GrowspaceTankCardEditor } from '../../../src/cards/editors/growspace-tank-card-editor';

describe('GrowspaceTankCardEditor', () => {
    let element: GrowspaceTankCardEditor;
    let mockHass: any;

    beforeEach(async () => {
        mockHass = {
            states: {
                'sensor.growspaces_list': {
                    attributes: {
                        growspaces: [
                            { id: 'gs1', name: 'Growroom 1' },
                            { id: 'gs2', name: 'Growroom 2' }
                        ]
                    }
                }
            },
            language: 'en',
        };

        element = await fixture<GrowspaceTankCardEditor>(html`
            <growspace-tank-card-editor .hass=${mockHass}></growspace-tank-card-editor>
        `);

        element.setConfig({
            type: 'custom:growspace-tank-card',
            default_growspace: 'gs1'
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceTankCardEditor);
    });

    test('renders target growspace select correctly', async () => {
        await element.updateComplete;

        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        const options = Array.from(select.querySelectorAll('option'));

        expect(options.length).toBe(3); // placeholder + 2 growspaces
        expect(options[1].value).toBe('gs1');
        expect(options[1].textContent?.trim()).toBe('Growroom 1');
        expect(options[2].value).toBe('gs2');
    });

    test('handles growspace change and dispatches event', async () => {
        await element.updateComplete;

        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);

        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        select.value = 'gs2';
        select.dispatchEvent(new Event('change'));

        expect(configChangedSpy).toHaveBeenCalled();
        expect(configChangedSpy.mock.calls[0][0].detail.config.default_growspace).toBe('gs2');
    });

    test('does not dispatch event if value is unchanged', async () => {
        await element.updateComplete;

        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);

        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        select.value = 'gs1'; // same as current
        select.dispatchEvent(new Event('change'));

        expect(configChangedSpy).not.toHaveBeenCalled();
    });

    test('handles missing growspaces list sensor', async () => {
        mockHass.states = {};
        element.hass = { ...mockHass };
        await element.updateComplete;

        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        const options = select.querySelectorAll('option');
        expect(options.length).toBe(1); // just placeholder
    });

    test('handles growspaces list as object format', async () => {
        element.hass = {
            ...mockHass,
            states: {
                'sensor.growspaces_list': {
                    attributes: {
                        growspaces: {
                            'gs3': 'Tent 3',
                            'gs4': 'Tent 4'
                        }
                    }
                }
            }
        };
        await element.updateComplete;
        await element.updateComplete;

        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        const options = Array.from(select.querySelectorAll('option'));
        expect(options[1].value).toBe('gs3');
        expect(options[1].textContent?.trim()).toBe('Tent 3');
    });

    test('handles uninitialized config in render', async () => {
        (element as any)._config = undefined;
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML.trim()).not.toContain('select');
    });
});
