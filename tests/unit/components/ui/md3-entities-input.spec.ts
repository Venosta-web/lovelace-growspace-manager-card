import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Md3EntitiesInput } from '../../../../src/features/shared/ui/md3-entities-input';

if (!customElements.get('md3-entities-input')) {
    customElements.define('md3-entities-input', Md3EntitiesInput);
}

describe('Md3EntitiesInput', () => {
    let element: Md3EntitiesInput;

    beforeEach(async () => {
        element = document.createElement('md3-entities-input') as Md3EntitiesInput;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.clearAllMocks();
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(Md3EntitiesInput);
    });

    it('should render with no chips and an input when value is empty', async () => {
        const chips = element.shadowRoot?.querySelectorAll('.chip');
        const input = element.shadowRoot?.querySelector('input.search-input');
        expect(chips?.length).toBe(0);
        expect(input).toBeTruthy();
    });

    it('should not render label span when label is empty', async () => {
        const label = element.shadowRoot?.querySelector('.label');
        expect(label).toBeNull();
    });

    it('should render label span when label is set', async () => {
        element.label = 'My Entities';
        await element.updateComplete;

        const label = element.shadowRoot?.querySelector('.label');
        expect(label?.textContent).toBe('My Entities');
    });

    describe('_getEntities()', () => {
        it('returns empty array when hass is not set', () => {
            element.hass = undefined;
            // Access via render — datalist should have no options
            element.requestUpdate();
            return element.updateComplete.then(() => {
                const options = element.shadowRoot?.querySelectorAll('datalist option');
                expect(options?.length).toBe(0);
            });
        });

        it('returns all entity ids when domains is empty', async () => {
            element.hass = {
                states: {
                    'light.kitchen': {},
                    'sensor.temp': {},
                    'switch.fan': {},
                },
            } as any;
            element.domains = [];
            await element.updateComplete;

            const options = element.shadowRoot?.querySelectorAll('datalist option');
            expect(options?.length).toBe(3);
        });

        it('filters entities to matching domains', async () => {
            element.hass = {
                states: {
                    'light.kitchen': {},
                    'sensor.temp': {},
                    'switch.fan': {},
                },
            } as any;
            element.domains = ['light', 'switch'];
            await element.updateComplete;

            const options = element.shadowRoot?.querySelectorAll('datalist option');
            const values = Array.from(options ?? []).map((o) => (o as HTMLOptionElement).value);
            expect(values).toContain('light.kitchen');
            expect(values).toContain('switch.fan');
            expect(values).not.toContain('sensor.temp');
        });

        it('returns entities sorted alphabetically', async () => {
            element.hass = {
                states: {
                    'light.z_last': {},
                    'light.a_first': {},
                    'light.m_middle': {},
                },
            } as any;
            element.domains = [];
            await element.updateComplete;

            const options = element.shadowRoot?.querySelectorAll('datalist option');
            const values = Array.from(options ?? []).map((o) => (o as HTMLOptionElement).value);
            expect(values).toEqual(['light.a_first', 'light.m_middle', 'light.z_last']);
        });
    });

    describe('chip rendering (lines 107-110)', () => {
        it('renders a chip for each value', async () => {
            element.value = ['light.kitchen', 'sensor.temp'];
            await element.updateComplete;

            const chips = element.shadowRoot?.querySelectorAll('.chip');
            expect(chips?.length).toBe(2);
            expect(chips?.[0].textContent).toContain('light.kitchen');
            expect(chips?.[1].textContent).toContain('sensor.temp');
        });

        it('renders a remove button inside each chip', async () => {
            element.value = ['light.kitchen'];
            await element.updateComplete;

            const removeBtn = element.shadowRoot?.querySelector('.chip-remove');
            expect(removeBtn).toBeTruthy();
        });
    });

    describe('_remove()', () => {
        it('removes the clicked entity from value and dispatches change', async () => {
            element.value = ['light.kitchen', 'sensor.temp'];
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('change', listener);

            const removeBtn = element.shadowRoot?.querySelector('.chip-remove') as HTMLElement;
            removeBtn.click();
            await element.updateComplete;

            expect(element.value).toEqual(['sensor.temp']);
            expect(listener).toHaveBeenCalledOnce();
            expect(listener.mock.calls[0][0].detail).toEqual(['sensor.temp']);
        });

        it('dispatches a composed, bubbling change event', async () => {
            element.value = ['light.kitchen'];
            await element.updateComplete;

            let capturedEvent: CustomEvent | null = null;
            element.addEventListener('change', (e) => {
                capturedEvent = e as CustomEvent;
            });

            const removeBtn = element.shadowRoot?.querySelector('.chip-remove') as HTMLElement;
            removeBtn.click();

            expect(capturedEvent).not.toBeNull();
            expect((capturedEvent as unknown as CustomEvent).bubbles).toBe(true);
            expect((capturedEvent as unknown as CustomEvent).composed).toBe(true);
        });
    });

    describe('_handleAdd()', () => {
        it('adds a new entity on input change and clears the field', async () => {
            element.value = [];
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('change', listener);

            const input = element.shadowRoot?.querySelector('input.search-input') as HTMLInputElement;
            input.value = 'light.new';
            input.dispatchEvent(new Event('change', { bubbles: true }));
            await element.updateComplete;

            expect(element.value).toEqual(['light.new']);
            expect(input.value).toBe('');
            expect(listener).toHaveBeenCalledOnce();
            expect(listener.mock.calls[0][0].detail).toEqual(['light.new']);
        });

        it('does not add a duplicate entity', async () => {
            element.value = ['light.kitchen'];
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('change', listener);

            const input = element.shadowRoot?.querySelector('input.search-input') as HTMLInputElement;
            input.value = 'light.kitchen';
            input.dispatchEvent(new Event('change', { bubbles: true }));
            await element.updateComplete;

            expect(element.value).toEqual(['light.kitchen']);
            expect(listener).not.toHaveBeenCalled();
        });

        it('does not add an empty value', async () => {
            element.value = [];
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('change', listener);

            const input = element.shadowRoot?.querySelector('input.search-input') as HTMLInputElement;
            input.value = '   ';
            input.dispatchEvent(new Event('change', { bubbles: true }));

            expect(element.value).toEqual([]);
            expect(listener).not.toHaveBeenCalled();
        });

        it('appends to existing values', async () => {
            element.value = ['light.kitchen'];
            await element.updateComplete;

            const input = element.shadowRoot?.querySelector('input.search-input') as HTMLInputElement;
            input.value = 'sensor.temp';
            input.dispatchEvent(new Event('change', { bubbles: true }));
            await element.updateComplete;

            expect(element.value).toEqual(['light.kitchen', 'sensor.temp']);
        });
    });
});
