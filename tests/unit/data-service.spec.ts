import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';

describe('DataService', () => {
    let service: DataService;
    let mockHass: HomeAssistant;
    let callServiceMock: any;

    beforeEach(() => {
        service = new DataService();
        callServiceMock = vi.fn().mockResolvedValue({});
        mockHass = {
            callService: callServiceMock,
            connection: {
                sendMessagePromise: vi.fn().mockResolvedValue({}), // For websocket calls
            },
            callApi: vi.fn().mockResolvedValue({}), // For API calls like getHistory
            fetchWithAuth: vi.fn().mockResolvedValue({}), // For importStrainLibrary
            // Add other required properties as needed by Typescript, usually mocked as any for unit tests
        } as any;
        service.updateHass(mockHass);
    });

    describe('History & Data Fetching', () => {
        it('should fetch growspace data via websocket', async () => {
            const mockData = { gs1: {} };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockData);

            const result = await service.fetchGrowspaceData('gs1');

            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
                type: 'growspace_manager/get_data',
                growspace_id: 'gs1'
            }));
            expect(result).toBe(mockData);
        });

        it('should handle websocket errors in fetchGrowspaceData', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('WS Error'));
            const result = await service.fetchGrowspaceData();
            expect(result).toBeNull();
        });

        it('should fetch all growspaces (collection) when no ID provided', async () => {
            const mockCollection = {
                gs1: { growspace_id: 'gs1', name: 'GS1', type: 'normal', rows: 4, plants_per_row: 4, grid: {} },
                gs2: { growspace_id: 'gs2', name: 'GS2', type: 'mom', rows: 2, plants_per_row: 2, grid: {} }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockCollection);

            const result = await service.fetchGrowspaceData();
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
                type: 'growspace_manager/get_data',
                growspace_id: undefined
            }));
            // We expect a record
            expect(result).toEqual(mockCollection);
        });

        it('should validate nullable optional fields in collection', async () => {
            const mockCollection = {
                gs1: {
                    growspace_id: 'gs1',
                    name: 'GS1',
                    type: 'normal',
                    rows: 4,
                    plants_per_row: 4,
                    grid: {},
                    notification_target: null, // Should pass
                    air_exchange: null // Should pass
                }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockCollection);

            const result = await service.fetchGrowspaceData();

            // The result will have defaults applied by Zod schema
            expect(result).toEqual({
                gs1: expect.objectContaining({
                    growspace_id: 'gs1',
                    notification_target: null,
                    air_exchange: null,
                    // Verify defaults are applied
                    total_plants: 0,
                    irrigation_config: {}
                })
            });
        });

        it('should getHistory via API', async () => {
            const mockHist = [[{ state: '20' }]];
            (mockHass.callApi as any).mockResolvedValue(mockHist);
            const start = new Date('2023-01-01');

            const probResult = await service.getHistory('sensor.temp', start);

            expect(mockHass.callApi).toHaveBeenCalledWith('GET', expect.stringContaining('history/period'));
            expect(probResult).toEqual(mockHist[0]);
        });

        it('should handle API errors in getHistory', async () => {
            (mockHass.callApi as any).mockRejectedValue(new Error('API Error'));
            const result = await service.getHistory('s', new Date());
            expect(result).toEqual([]);
        });
    });

    describe('Strain Library', () => {
        it('should fetch strain library via service', async () => {
            const mockResponse = {
                response: {
                    'Kush': {
                        meta: { breeder: 'Me' },
                        phenotypes: {
                            'default': { description: 'Good' }
                        }
                    }
                }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockResponse);
            const strains = await service.fetchStrainLibrary();
            expect(strains).toHaveLength(1);
            expect(strains[0].strain).toBe('Kush');
        });

        it('should add strain with base64 image handling', async () => {
            await service.addStrain({ strain: 'X', image: 'data:image/png;base64,abc' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_strain', expect.objectContaining({
                strain: 'X',
                image_base64: 'data:image/png;base64,abc'
            }));
        });

        it('should add strain omitting image path if not base64', async () => {
            await service.addStrain({ strain: 'X', image: '/local/img.jpg' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_strain', expect.objectContaining({
                strain: 'X'
            }));
            expect(callServiceMock).not.toHaveBeenCalledWith('growspace_manager', 'add_strain', expect.objectContaining({
                image_path: expect.any(String)
            }));
        });
    });

    describe('Growspace CRUD', () => {
        it('should add growspace', async () => {
            await service.addGrowspace({ name: 'G1', rows: 4, plants_per_row: 4 });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_growspace', expect.objectContaining({ name: 'G1' }));
        });

        it('should update growspace', async () => {
            await service.updateGrowspace({ growspace_id: 'g1', name: 'G2' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'update_growspace', expect.objectContaining({ growspace_id: 'g1', name: 'G2' }));
        });

        it('should remove growspace', async () => {
            await service.removeGrowspace('g1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_growspace', { growspace_id: 'g1' });
        });
    });

    describe('Plant Actions', () => {
        it('should add plant with auto-dates for special rooms', async () => {
            await service.addPlant({ growspace_id: 'mother', strain: 'XS', row: 0, col: 0 });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_plant', expect.objectContaining({
                growspace_id: 'mother',
                mother_start: expect.stringMatching(/\d{4}-\d{2}-\d{2}/)
            }));
        });

        it('should update plant', async () => {
            await service.updatePlant({ plant_id: 'p1', notes: 'Hi' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'update_plant', { plant_id: 'p1', notes: 'Hi' });
        });

        it('should remove plant', async () => {
            await service.removePlant('p1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_plant', { plant_id: 'p1' });
        });

        it('should swap plants', async () => {
            await service.swapPlants('p1', 'p2');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'switch_plants', { plant1_id: 'p1', plant2_id: 'p2' });
        });

        it('should take clone', async () => {
            await service.takeClone({ mother_plant_id: 'm1' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'take_clone', { mother_plant_id: 'm1' });
        });
    });

    describe('Environment & Irrigation', () => {
        it('should configure environment', async () => {
            const conf = { growspace_id: 'g1', temperature_sensor: 's.t', humidity_sensor: 's.h', vpd_sensor: 's.v' };
            await service.configureEnvironment(conf);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'configure_environment', conf);
        });

        it('should set dehumidifier control', async () => {
            await service.setDehumidifierControl('g1', true);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'set_dehumidifier_control', { growspace_id: 'g1', enabled: true });
        });

        it('should set irrigation settings', async () => {
            const args = { growspace_id: 'g1', irrigation_pump_entity: 'switch.p', drain_pump_entity: 'switch.d', irrigation_duration: 10, drain_duration: 5 };
            await service.setIrrigationSettings(args);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'set_irrigation_settings', args);
        });

        it('should manage irrigation times', async () => {
            await service.addIrrigationTime({ growspace_id: 'g1', time: '10:00' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_irrigation_time', { growspace_id: 'g1', time: '10:00' });

            await service.removeIrrigationTime({ growspace_id: 'g1', time: '10:00' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_irrigation_time', { growspace_id: 'g1', time: '10:00' });
        });

        it('should manage drain times', async () => {
            await service.addDrainTime({ growspace_id: 'g1', time: '10:00' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_drain_time', expect.anything());

            await service.removeDrainTime({ growspace_id: 'g1', time: '10:00' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_drain_time', expect.anything());
        });

        it('should set irrigation strategy', async () => {
            await service.setIrrigationStrategy('g1', { strategy: 'daily' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'set_irrigation_strategy', { growspace_id: 'g1', strategy: 'daily' });
        });
    });

    describe('Import/Export', () => {
        it('should export strain library', async () => {
            await service.exportStrainLibrary();
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'export_strain_library');
        });

        it('should clear strain library', async () => {
            await service.clearStrainLibrary();
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'clear_strain_library');
        });

        it('should import strain library via HTTP', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });
            mockHass.fetchWithAuth = mockFetch;

            await service.importStrainLibrary(new File([''], 'test.zip'), true);

            expect(mockFetch).toHaveBeenCalledWith('/api/growspace_manager/import_strains', expect.objectContaining({ method: 'POST' }));
        });

        it('should handle import errors', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                text: async () => 'Error'
            });
            mockHass.fetchWithAuth = mockFetch;

            await expect(service.importStrainLibrary(new File([''], 't.zip'), false)).rejects.toThrow('Error');
        });
    });

    describe('Grow Master & Advice', () => {
        it('should ask grow advice', async () => {
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue({ response: 'Do this' });
            await service.askGrowAdvice('g1', 'Help');
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ service: 'ask_grow_advice' }));
        });

        it('should analyze all growspaces', async () => {
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue({ response: 'Analysis' });
            await service.analyzeAllGrowspaces();
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ service: 'analyze_all_growspaces' }));
        });

        it('should get strain recommendation', async () => {
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue({ response: 'Strain X' });
            await service.getStrainRecommendation('Sleepy');
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ service: 'strain_recommendation' }));
        });
    });

    // Keeping original tests for harvestPlant / moveClone to ensure logic persists
    describe('harvestPlant', () => {
        it('should call harvest_plant service with correct payload', async () => {
            await service.harvestPlant('plant_123', 'dry');

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager', // DOMAIN
                'harvest_plant',     // SERVICE
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'dry'
                }
            );
        });

        it('should handle custom target names correctly', async () => {
            // Logic in DataService attempts to map 'dry' -> 'dry', 'cure' -> 'cure'
            // If we pass 'My Custom Dry Room', it passes it through unless it detects keywords?
            // "if (hint.includes('dry') && target !== 'dry') payload.target_growspace_id = 'dry';"

            await service.harvestPlant('plant_123', 'My Dry Room');
            // 'My Dry Room' includes 'dry' but is not 'dry'.
            // The logic: 
            // const hint = target.toLowerCase(); 
            // if (hint.includes('dry') && target !== 'dry') payload.target_growspace_id = 'dry';

            // So for 'My Dry Room', we expect payload to be 'dry' if logic stands, 
            // OR if the user intended to support custom IDs.
            // Let's verify the CURRENT implementation logic via test.

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'harvest_plant',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'dry' // Because it contained 'dry'
                }
            );
        });

        it('should pass through unknown targets as-is', async () => {
            await service.harvestPlant('plant_123', 'tent_2');
            // 'tent_2' does not contain 'dry', 'cure', 'mother', 'clone'
            // So it should pass as 'tent_2'

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'harvest_plant',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'tent_2'
                }
            );
        });
    });

    describe('moveClone', () => {
        it('should call move_clone with transition date if provided', async () => {
            const date = '2023-12-01';
            await service.moveClone('plant_123', 'veg_tent', date);

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'move_clone',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'veg_tent',
                    transition_date: date
                }
            );
        });

        it('should call move_clone without transition date if optional', async () => {
            await service.moveClone('plant_123', 'veg_tent');

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'move_clone',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'veg_tent'
                }
            );
        });
    });
});
