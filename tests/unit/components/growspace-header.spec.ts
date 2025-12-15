
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceHeader } from '../../../src/components/growspace-header';
import { MetricsUtils } from '../../../src/utils/metrics-utils';
import { ChartUtils } from '../../../src/utils/chart-utils';
// Mock dependencies
vi.mock('../../../src/utils/metrics-utils', () => ({
    MetricsUtils: {
        computeHeaderMetrics: vi.fn()
    }
}));

vi.mock('../../../src/utils/chart-utils', () => ({
    ChartUtils: {
        generateSparklinePath: vi.fn().mockReturnValue('M0,0 L100,100'),
        getSparklineColor: vi.fn().mockReturnValue('green'),
        generateVpdSparklineSegments: vi.fn().mockReturnValue([])
    }
}));

vi.mock('../../../src/controllers/resize-controller', () => {
    return {
        ResizeController: class {
            observe = vi.fn();
            unobserve = vi.fn();
            isMobile = false;
            hasTouch = false;
            constructor(host: any, callback: any) { }
        }
    };
});

vi.mock('../../../src/components/growspace-chip', () => {
    // Basic mock for the chip
    return {
        GrowspaceChip: class { }
    };
});

describe('GrowspaceHeader', () => {
    let element: GrowspaceHeader;
    let mockStore: any;
    let mockHistory: any;
    let mockHass: any;

    beforeEach(() => {
        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(), // deprecated
                removeListener: vi.fn(), // deprecated
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        // Setup Mocks
        mockStore = {
            state: {
                devices: [
                    { device_id: 'd1', name: 'Growspace 1' },
                    { device_id: 'd2', name: 'Growspace 2' }
                ],
                selectedDevice: 'd1',
                viewMode: 'standard',
                isEditMode: false
            },
            handleDeviceChange: vi.fn(),
            openAddPlantDialog: vi.fn(),
            setActiveDialog: vi.fn(),
            setEditMode: vi.fn(),
            setViewMode: vi.fn(),
            fetchStrainLibrary: vi.fn(),
            openLogbookDialog: vi.fn()
        };

        mockHistory = {
            activeEnvGraphs: new Set<string>(),
            linkedGraphGroups: [],
            historyCache: {
                temperature: [],
                vpd: []
            },
            addListener: vi.fn(),
            removeListener: vi.fn(),
            toggleEnvGraph: vi.fn(),
            linkGraphs: vi.fn(),
            unlinkGraphGroup: vi.fn()
        };

        mockHass = { states: {} };

        // Define Element
        if (!customElements.get('growspace-header')) {
            customElements.define('growspace-header', GrowspaceHeader);
        }

        element = document.createElement('growspace-header') as GrowspaceHeader;
        element.store = mockStore;
        element.historyController = mockHistory;
        element.hass = mockHass;
        element.device = {
            device_id: 'd1',
            name: 'Growspace 1',
            overview_entity_id: 'sensor.ov',
            type: 'normal',
            plants: [],
            rows: 0,
            plants_per_row: 0
        };
        element.config = { default_growspace: 'd1' } as any;

        // Default Metrics Mock
        (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
            mainChips: [
                { key: 'temperature', value: '25°C', label: 'Temp', icon: 'path', status: 'ok' },
                { key: 'humidity', value: '60%', label: 'Hum', icon: 'path', status: 'ok' },
                { key: 'vpd', value: '1.2kPa', label: 'VPD', icon: 'path', status: 'ok' },
                { key: 'co2', value: '800ppm', label: 'CO2', icon: 'path', status: 'warning' },
                // Secondary
                { key: 'ppfd', value: '500', label: 'PPFD', icon: 'path', status: 'ok' }
            ],
            deviceChips: [
                { key: 'fan', label: 'Fan', icon: 'path', value: 'on' }
            ],
            dominant: { icon: 'path', daysLabel: 'Day 30', weeksLabel: 'Week 5' },
            envAttrs: { dehumidifier_control_enabled: true }
        });
    });

    describe('Rendering', () => {
        it('should render title if default_growspace is set', async () => {
            // Already set in beforeEach
            document.body.appendChild(element);
            await element.updateComplete;

            const title = element.shadowRoot?.querySelector('.gs-title');
            expect(title).not.toBeNull();
            expect(title?.textContent).toBe('Growspace 1');
            expect(element.shadowRoot?.querySelector('select')).toBeNull();

            document.body.removeChild(element);
        });

        it('should render select dropdown if default_growspace is not set', async () => {
            element.config = {} as any; // No default
            document.body.appendChild(element);
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('select');
            expect(select).not.toBeNull();
            expect(select?.value).toBe('d1');

            document.body.removeChild(element);
        });

        it('should render hero stats', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const heroCards = element.shadowRoot?.querySelectorAll('.hero-card');
            expect(heroCards?.length).toBe(4); // Temp, Hum, VPD, CO2

            const tempValue = heroCards?.[0].querySelector('.hero-value')?.textContent;
            expect(tempValue).toBe('25');

            document.body.removeChild(element);
        });

        it('should render secondary chips', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const chips = element.shadowRoot?.querySelectorAll('growspace-chip');
            // 1 device chip + 1 secondary chip (ppfd)
            expect(chips?.length).toBeGreaterThanOrEqual(2);

            document.body.removeChild(element);
        });
    });

    describe('Interactions', () => {
        it('should handle device change', async () => {
            element.config = {} as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
            select.value = 'd2';
            select.dispatchEvent(new Event('change'));

            expect(mockStore.handleDeviceChange).toHaveBeenCalledWith('d2');
            document.body.removeChild(element);
        });

        it('should toggle graph on hero card click', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const card = element.shadowRoot?.querySelector('.hero-card') as HTMLElement;
            card.click();

            expect(mockHistory.toggleEnvGraph).toHaveBeenCalledWith(
                expect.objectContaining({ metric: 'temperature', visible: true })
            );

            document.body.removeChild(element);
        });

        it('should handle menu actions', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            // Open menu
            (element as any)._menuOpen = true;
            element.requestUpdate();
            await element.updateComplete;

            const menu = element.shadowRoot?.querySelector('.menu-dropdown');
            expect(menu).not.toBeNull();

            // Config
            const configItem = menu?.querySelectorAll('.menu-item')[0] as HTMLElement; // Config is usually first
            configItem.click();
            expect(mockStore.setActiveDialog).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'CONFIG' })
            );

            // Strains
            const strainsItem = menu?.querySelectorAll('.menu-item')[4] as HTMLElement; // Index 4 based on render order? 
            // Better to find by text if possible, but structure is fixed in code: Config, Edit, Compact, ControlHum, Strains...
            // Config=0, Edit=1, Compact=2, Control=3, Strains=4
            strainsItem.click();
            expect(mockStore.fetchStrainLibrary).toHaveBeenCalled();
            expect(mockStore.setActiveDialog).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'STRAIN_LIBRARY' })
            );

            document.body.removeChild(element);
        });
    });

    describe('Responsiveness', () => {
        it('should show mobile link button on mobile', async () => {
            // We need to preserve observe method because firstUpdated calls it
            (element as any)._resizeController = {
                isMobile: true,
                observe: vi.fn(),
                unobserve: vi.fn(),
                hasTouch: false
            };
            element.requestUpdate();

            document.body.appendChild(element); // Re-attach to force render with new controller state if possible
            // However, private controller prop replacement might be tricky if it's used in firstUpdated.
            // We can just set it on the instance and request metrics re-compute if it affected metrics.
            // But it affects render template directly.

            await element.updateComplete;

            const linkBtn = element.shadowRoot?.querySelector('.mobile-link');
            expect(linkBtn).not.toBeNull();

            (linkBtn as HTMLElement).click();
            await element.updateComplete;
            expect(linkBtn?.classList.contains('active')).toBe(true);

            document.body.removeChild(element);
        });
    });

    describe('Drag & Drop', () => {
        it('should handle drop to link graphs', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            // Mock drag start
            (element as any)._draggedMetric = 'temperature';

            // Call handleChipDrop directly since creating DataTransfer in JSDOM is tedious
            (element as any)._handleChipDrop(new Event('drop'), 'humidity');

            expect(mockHistory.linkGraphs).toHaveBeenCalledWith('temperature', 'humidity');
            expect((element as any)._draggedMetric).toBeNull(); // Reset

            document.body.removeChild(element);
        });
    });
});
