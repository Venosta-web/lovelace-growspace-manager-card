import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../src/dialogs/add-plants-dialog';
import { AddPlantsDialog } from '../../../src/dialogs/add-plants-dialog';

describe('AddPlantsDialog', () => {
    let element: AddPlantsDialog;
    const mockStrainLibrary = [
        { strain: 'OG Kush', description: 'Strong' },
        { strain: 'Blue Dream', description: 'Sweet' }
    ];

    beforeEach(async () => {
        element = await fixture(html`
            <add-plants-dialog 
                .open=${true} 
                .strainLibrary=${mockStrainLibrary}
                .growspaceName=${'Tent 1'}
            ></add-plants-dialog>
        `);
    });

    it('renders header correctly', () => {
        expect(element.shadowRoot?.querySelector('.dialog-title')?.textContent).toBe('Batch Add Plants');
        expect(element.shadowRoot?.querySelector('.dialog-subtitle')?.textContent).toContain('Tent 1');
    });

    it('initializes with default values', () => {
        expect((element as any).amount).toBe(1);
        expect((element as any).start_number).toBe(1);
    });

    it('updates strain on selection', async () => {
        const select = element.shadowRoot?.querySelector('md3-select');
        select?.dispatchEvent(new CustomEvent('change', { detail: 'OG Kush' }));
        expect((element as any).strain).toBe('OG Kush');
    });

    it('populates strain options correctly', async () => {
        const select = element.shadowRoot?.querySelector('md3-select') as any;
        expect(select).toBeTruthy();
        // uniqueStrains sorts the strains: Blue Dream, OG Kush
        expect(select.options).toEqual(['Blue Dream', 'OG Kush']);
    });

    it('updates amount and start number', async () => {
        const amountInput = element.shadowRoot?.querySelector('md3-number-input[label="Amount"]');
        amountInput?.dispatchEvent(new CustomEvent('change', { detail: '5' }));
        expect((element as any).amount).toBe(5);

        const startInput = element.shadowRoot?.querySelector('md3-number-input[label="Start Number"]');
        startInput?.dispatchEvent(new CustomEvent('change', { detail: '10' }));
        expect((element as any).start_number).toBe(10);
    });

    it('updates phenotype and addToLibrary toggle', async () => {
        const phenoInput = element.shadowRoot?.querySelector('md3-text-input[label="Phenotype (Optional)"]');
        expect(phenoInput).toBeTruthy();
        phenoInput?.dispatchEvent(new CustomEvent('change', { detail: 'Purple Haze' }));
        expect((element as any).phenotype).toBe('Purple Haze');

        // Test toggle - requires strain to be set to be enabled
        (element as any).strain = 'OG Kush';
        await element.updateComplete;

        const toggle = element.shadowRoot?.querySelector('md3-switch');
        expect(toggle).toBeTruthy();

        // md3-switch uses @change with e.target.checked logic
        // Mock event object
        const mockChangeEvent = { target: { checked: true } };
        // We can't dispatch a native event easily that matches the specific e.target structure expected by the inline handler
        // unless we use a custom event or specifically craft it.
        // The inline handler is: @change=${(e: any) => this.addToLibrary = e.target.checked}
        toggle?.dispatchEvent(new CustomEvent('change', {
            detail: {},
            bubbles: true,
            composed: true
        } as any));
        // Wait, CustomEvent doesn't automatically populate target.checked. 
        // We might need to manually call the handler or use a better mock event.
        // However, standard DOM dispatchEvent sets 'target' to the element. 
        // If we set .checked on the element first, then dispatch change, it might work?

        // Let's rely on setting the property on the element mock if possible?
        // Actually, let's just trigger the state change verification.

        // Simulating the handler logic:
        const switchEl = toggle as any;
        switchEl.checked = true;
        switchEl.dispatchEvent(new Event('change'));
        expect((element as any).addToLibrary).toBe(true);
    });

    it('emits close event when clicking close button', async () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const closeBtn = element.shadowRoot?.querySelector('.dialog-header button');
        (closeBtn as HTMLElement).click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('emits add-plants-submit event with correct payload', async () => {
        const submitSpy = vi.fn();
        element.addEventListener('add-plants-submit', submitSpy);

        (element as any).strain = 'Blue Dream';
        (element as any).amount = 3;
        (element as any).veg_start = '2023-01-01';

        const addBtn = element.shadowRoot?.querySelector('.md3-button.primary') as HTMLElement;
        addBtn.click();

        expect(submitSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                strain: 'Blue Dream',
                amount: 3,
                veg_start: '2023-01-01'
            })
        }));
    });

    it('covers all branch variants of renderTimelineContent', async () => {
        // Test 'seedling' default branch
        element.growspaceName = 'Seedling Tray';
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('md3-date-input[label="Seedling Start"]')).toBeTruthy();

        // Already covered mother, clone, dry, cure in other tests
    });

    it('renders and updates Mother Start input', async () => {
        element.growspaceName = 'Mother Room';
        await element.updateComplete;

        const input = element.shadowRoot?.querySelector('md3-date-input[label="Mother Start"]');
        expect(input).toBeTruthy();
        input?.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
        expect((element as any).mother_start).toBe('2023-01-01');
    });

    it('renders and updates Clone Start input', async () => {
        element.growspaceName = 'Clone Box';
        await element.updateComplete;

        const input = element.shadowRoot?.querySelector('md3-date-input[label="Clone Start"]');
        expect(input).toBeTruthy();
        input?.dispatchEvent(new CustomEvent('change', { detail: '2023-02-01' }));
        expect((element as any).clone_start).toBe('2023-02-01');
    });

    it('renders and updates Dry Start input', async () => {
        element.growspaceName = 'Dry Room';
        await element.updateComplete;

        const input = element.shadowRoot?.querySelector('md3-date-input[label="Dry Start"]');
        expect(input).toBeTruthy();
        input?.dispatchEvent(new CustomEvent('change', { detail: '2023-03-01' }));
        expect((element as any).dry_start).toBe('2023-03-01');
    });

    it('renders and updates Cure Start input', async () => {
        element.growspaceName = 'Cure Jars';
        await element.updateComplete;

        const input = element.shadowRoot?.querySelector('md3-date-input[label="Cure Start"]');
        expect(input).toBeTruthy();
        input?.dispatchEvent(new CustomEvent('change', { detail: '2023-04-01' }));
        expect((element as any).cure_start).toBe('2023-04-01');
    });

    it('renders and updates default date inputs', async () => {
        element.growspaceName = 'General Room';
        await element.updateComplete;

        const seedlingInput = element.shadowRoot?.querySelector('md3-date-input[label="Seedling Start"]');
        seedlingInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
        expect((element as any).seedling_start).toBe('2023-01-01');

        const vegInput = element.shadowRoot?.querySelector('md3-date-input[label="Veg Start"]');
        vegInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-02-01' }));
        expect((element as any).veg_start).toBe('2023-02-01');

        const flowerInput = element.shadowRoot?.querySelector('md3-date-input[label="Flower Start"]');
        flowerInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-03-01' }));
        expect((element as any).flower_start).toBe('2023-03-01');
    });

    it('resets state with setInitialState', () => {
        (element as any).strain = 'OG Kush';
        (element as any).amount = 10;

        element.setInitialState('New Strain');

        expect((element as any).strain).toBe('New Strain');
        expect((element as any).amount).toBe(1);
    });

    it('renders nothing when not open', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });

    it('handles confirm without strain', async () => {
        const submitSpy = vi.fn();
        element.addEventListener('add-plants-submit', submitSpy);
        (element as any).strain = '';
        (element as any)._confirm();
        expect(submitSpy).toHaveBeenCalled();
    });

    it('should dispatch create-new-strain event', async () => {
        const createSpy = vi.fn();
        element.addEventListener('create-new-strain', createSpy);

        // Button with mdiDna icon
        const createBtn = element.shadowRoot?.querySelector('button[title="Add New Strain"]') as HTMLElement;
        expect(createBtn).toBeTruthy();
        createBtn.click();

        expect(createSpy).toHaveBeenCalled();
        expect(createSpy.mock.calls[0][0].detail).toMatchObject({ source: 'add-plants' });
    });
    it('shows validation error when growspace slots are full', async () => {
        // Setup a restricted growspace
        const restrictedElement = await fixture(html`
            <add-plants-dialog 
                .open=${true} 
                .strainLibrary=${mockStrainLibrary}
                .growspaceName=${'Tent 1'}
                .growspaceDevice=${{
                rows: 2,
                plants_per_row: 2,
                plants: ['p1', 'p2', 'p3'] // 3 occupied
            }}
            ></add-plants-dialog>
        `);

        // Total 4 slots, 3 occupied = 1 free. Try adding 2.
        (restrictedElement as any).amount = 2;

        const toastSpy = vi.fn();
        restrictedElement.addEventListener('show-toast', toastSpy);

        const addBtn = restrictedElement.shadowRoot?.querySelector('.md3-button.primary') as HTMLElement;
        addBtn.click();

        expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                type: 'error',
                message: expect.stringContaining('Not enough free Plant Slots')
            })
        }));
    });

    it('handles missing device properties correctly (0 slots)', async () => {
        const elementPartial = await fixture(html`
            <add-plants-dialog 
                .open=${true} 
                .growspaceDevice=${{ device_id: 'g1' }} 
            ></add-plants-dialog>
        `);
        // rows/plants_per_row undefined -> 0 slots.
        // amount 1 > 0 -> Error.
        (elementPartial as any).amount = 1;

        const toastSpy = vi.fn();
        elementPartial.addEventListener('show-toast', toastSpy);

        (elementPartial as any)._confirm();

        expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({ type: 'error' })
        }));
    });

    it('allows submission when growspace has enough free slots', async () => {
        const elementSuccess = await fixture(html`
            <add-plants-dialog 
                .open=${true} 
                .growspaceDevice=${{
                rows: 4, plants_per_row: 4, plants: ['p1'] // 16 slots, 1 occupied, 15 free
            }}
            ></add-plants-dialog>
        `);
        (elementSuccess as any).amount = 5; // 5 <= 15. OK.
        (elementSuccess as any).strain = 'Success Strain';

        const submitSpy = vi.fn();
        elementSuccess.addEventListener('add-plants-submit', submitSpy);

        (elementSuccess as any)._confirm();

        expect(submitSpy).toHaveBeenCalled();
    });
});
