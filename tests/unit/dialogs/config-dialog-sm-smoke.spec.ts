import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';
import { aHass, aGrowspaceDevice } from '../../fixtures/index';

vi.mock('../../../src/slices/subarea', () => ({
    getSubareas: vi.fn().mockResolvedValue([]),
    addSubarea: vi.fn().mockResolvedValue({ id: 'sa-new', name: '', environment_config: {} }),
    removeSubarea: vi.fn().mockResolvedValue(undefined),
    updateSubarea: vi.fn().mockResolvedValue(undefined),
    setSubareas: vi.fn(),
    subareas$: { get: vi.fn().mockReturnValue([]), set: vi.fn(), subscribe: vi.fn() },
}));

const registerMockElements = () => {
    const stubs: [string, typeof HTMLElement][] = [
        ['ha-dialog', class extends HTMLElement {
            constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>'; }
        }],
        ['ha-entity-picker', class extends HTMLElement {}],
        ['gs-help-tooltip', class extends HTMLElement {}],
        ['subarea-config-dialog', class extends HTMLElement {
            set hass(_v: unknown) {}
            set open(_v: unknown) {}
            set growspaceId(_v: unknown) {}
            set subarea(_v: unknown) {}
        }],
        ['sensor-group-dialog', class extends HTMLElement {
            set open(_v: unknown) {}
            set hass(_v: unknown) {}
            set sensorGroup(_v: unknown) {}
        }],
        ['md3-number-input', class extends HTMLElement {
            set value(_v: unknown) {}
            set label(_v: unknown) {}
        }],
        ['md3-text-input', class extends HTMLElement {
            set value(_v: unknown) {}
            set label(_v: unknown) {}
        }],
    ];
    for (const [name, impl] of stubs) {
        if (!customElements.get(name)) customElements.define(name, impl);
    }
};

describe('ConfigDialog — SM smoke test', () => {
    let element: ConfigDialog;
    const device = aGrowspaceDevice({ deviceId: 'gs1', name: 'Growspace 1' });

    beforeEach(async () => {
        registerMockElements();
        if (!customElements.get('config-dialog-smoke')) {
            customElements.define('config-dialog-smoke', class extends ConfigDialog {});
        }
        element = new ConfigDialog();
        element.hass = aHass({ growspaces: [{ growspaceId: 'gs1', name: 'Growspace 1', rows: 4, cols: 4 }] }) as any;
        element.growspaceOptions = { gs1: 'Growspace 1' };
        element.devices = [device] as any;
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
    });

    it('mounts and renders without throwing', async () => {
        expect(element.shadowRoot).to.exist;
    });

    it('shows the growspace tab nav by default', async () => {
        element.currentTab = ConfigTab.GROWSPACES;
        await element.updateComplete;
        const addBtn = element.shadowRoot?.querySelector('.cfg-master-add-btn');
        expect(addBtn).to.exist;
    });

    it('adding state shows the add growspace form', async () => {
        element.currentTab = ConfigTab.GROWSPACES;
        (element as any)._isAddingGrowspace = true;
        await element.updateComplete;

        expect((element as any)._isAddingGrowspace).to.be.true;
        // Add form contains an h3 heading "New Growspace"
        const headings = Array.from(element.shadowRoot?.querySelectorAll('h3') ?? []) as HTMLElement[];
        const addHeading = headings.find((h) => h.textContent?.includes('New Growspace'));
        expect(addHeading).to.exist;
    });

    it('editing state shows the edit growspace form', async () => {
        element.currentTab = ConfigTab.GROWSPACES;
        (element as any).editSelectedId = 'gs1';
        await element.updateComplete;

        expect((element as any).editSelectedId).to.equal('gs1');
        expect((element as any).editName).to.equal('Growspace 1');
        // Edit form contains multi-select containers for lungroom / camera rows
        const containers = element.shadowRoot?.querySelectorAll('.multi-select-container');
        expect(containers?.length).to.be.greaterThan(0);
    });

    it('cancelling add returns to idle (no add form visible)', async () => {
        element.currentTab = ConfigTab.GROWSPACES;
        (element as any)._isAddingGrowspace = true;
        await element.updateComplete;
        (element as any)._isAddingGrowspace = false;
        await element.updateComplete;

        expect((element as any)._isAddingGrowspace).to.be.false;
        const headings = Array.from(element.shadowRoot?.querySelectorAll('h3') ?? []) as HTMLElement[];
        const addHeading = headings.find((h) => h.textContent?.includes('New Growspace'));
        expect(addHeading).to.be.undefined;
    });
});
