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

        it('should pass custom target IDs directly', async () => {
            // No legacy mapping - pass IDs directly
            await service.harvestPlant('plant_123', 'my_custom_dry_room');

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'harvest_plant',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'my_custom_dry_room'
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

    describe('Validation', () => {
        it('should handle single failure vs collection', async () => {
            const badData = { gs1: { broken: true } }; // Invalid schema
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(badData);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await service.fetchGrowspaceData();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validation Failed'), expect.any(Object));
            // Should still return data per fallback logic
            expect(result).toEqual(badData);
        });

        it('should return raw single response on validation failure', async () => {
            const badData = { broken: true };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(badData);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await service.fetchGrowspaceData('gs1');

            expect(consoleSpy).toHaveBeenCalled();
            expect(result).toEqual(badData);
        });
    });

    describe('Growspace Devices (Stateless)', () => {
        it('should return empty if no map', () => {
            expect(service.getGrowspaceDevices(undefined as any)).toEqual([]);
        });

        it('should transform devices without caching', () => {
            const wsData = { growspace_id: 'gs1', name: 'G1', rows: 1, plants_per_row: 1, grid: {}, type: 'normal' };
            const wsMap = { gs1: wsData };

            // First call
            const devices1 = service.getGrowspaceDevices(wsMap as any);
            expect(devices1).toHaveLength(1);

            // Second call with same data creates new instances (no caching)
            const devices2 = service.getGrowspaceDevices(wsMap as any);
            expect(devices2).toHaveLength(1);
            // Each call transforms fresh, so they should be equal in value but not necessarily reference
        });

        it('should handle empty map gracefully', () => {
            const devices = service.getGrowspaceDevices({});
            expect(devices).toEqual([]);
        });
    });

    describe('Strain Library Internals', () => {
        it('should parse array format from attributes', () => {
            service.hass = {
                states: {
                    'sensor.strains': {
                        attributes: { strains: ['OG Kush', 'Blue Dream'] }
                    }
                }
            } as any;

            const strains = service.getStrainLibrary();
            expect(strains).toHaveLength(2);
            expect(strains[0].key).toBe('OG Kush|default');
        });

        it('should parse object format with sorting', () => {
            service.hass = {
                states: {
                    'sensor.strains': {
                        attributes: {
                            strains: {
                                'B': { phenotypes: { '1': {} } },
                                'A': { phenotypes: { '2': {} } }
                            }
                        }
                    }
                }
            } as any;

            const strains = service.getStrainLibrary();
            expect(strains[0].strain).toBe('A');
            expect(strains[1].strain).toBe('B');
        });

        it('should return empty if missing attributes', () => {
            service.hass = { states: {} } as any;
            expect(service.getStrainLibrary()).toEqual([]);
        });

        it('should handle fetchStrainLibrary errors', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Fail'));
            const res = await service.fetchStrainLibrary();
            expect(res).toEqual([]);
        });

        it('should skip "response" key in strain library fetch', async () => {
            const mockResponse = {
                response: {
                    response: 'meta', // Should be skipped
                    'Kush': { phenotypes: { 'default': {} } }
                }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockResponse);
            const res = await service.fetchStrainLibrary();
            expect(res).toHaveLength(1);
            expect(res[0].strain).toBe('Kush');
        });
    });

    describe('Batch History', () => {
        it('should batch fetch and map results', async () => {
            const historyData = [
                [{ entity_id: 's1', state: '10' }],
                [{ entity_id: 's2', state: '20' }]
            ];
            (mockHass.callApi as any).mockResolvedValue(historyData);

            const res = await service.getBatchHistory(['s1', 's2'], new Date());

            expect(res['s1']).toBeDefined();
            expect(res['s2']).toBeDefined();
        });

        it('should handle empty ids', async () => {
            const res = await service.getBatchHistory([], new Date());
            expect(res).toEqual({});
        });

        it('should handle api errors gracefully', async () => {
            (mockHass.callApi as any).mockRejectedValue(new Error('Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const res = await service.getBatchHistory(['s1'], new Date());
            expect(res).toEqual({});
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('Plant Actions Extensions', () => {
        it('should set clone_start if growspace is clone', async () => {
            await service.addPlant({ growspace_id: 'clone', strain: 'X', row: 1, col: 1 });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_plant', expect.objectContaining({
                clone_start: expect.any(String)
            }));
        });

        it('should clean undefined keys in addStrain', async () => {
            await service.addStrain({ strain: 'X', breeder: undefined });
            // Verify breeder is NOT in call
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_strain', {
                strain: 'X'
            });
        });

        it('should call takeClone and remove target if undefined', async () => {
            // Technically target_growspace_id is omitted from payload if not present
            await service.takeClone({ mother_plant_id: 'p1' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'take_clone', { mother_plant_id: 'p1' });
        });
    });

    describe('Harvest Strict ID Passing', () => {
        it('should pass target ID directly without transformation', async () => {
            // Since legacy mapping was removed, IDs are passed directly
            await service.harvestPlant('p1', 'cure');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'harvest_plant', {
                plant_id: 'p1', target_growspace_id: 'cure'
            });
        });

        it('should pass any custom growspace ID as-is', async () => {
            await service.harvestPlant('p1', 'my_custom_room_123');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'harvest_plant', {
                plant_id: 'p1', target_growspace_id: 'my_custom_room_123'
            });
        });

        it('should use default target of dry', async () => {
            await service.harvestPlant('p1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'harvest_plant', {
                plant_id: 'p1', target_growspace_id: 'dry'
            });
        });
    });

    describe('Additional Coverage', () => {
        it('should handle fetchGrowspaceData returning unparsed data on validation error (single)', async () => {
            const badData = { unknown_field: 123 };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(badData);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await service.fetchGrowspaceData('g1');

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('API Validation Failed'), expect.anything());
            // It returns the raw result anyway
            expect(res).toBe(badData);
        });

        it('should handle fetchGrowspaceData returning unparsed collection on validation error', async () => {
            const badCollection = {
                gs1: { missing_name: true } // Invalid
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(badCollection);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await service.fetchGrowspaceData();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validation Failed'), expect.anything());
            expect(res).toBe(badCollection);
        });

        it('should throw error in addPlant if service call fails', async () => {
            callServiceMock.mockRejectedValue(new Error('Service Fail'));
            await expect(service.addPlant({ growspace_id: 'g1', strain: 'X', row: 1, col: 1 }))
                .rejects.toThrow('Service Fail');
        });

        it('should throw simple error in addPlant if no message', async () => {
            callServiceMock.mockRejectedValue('Unknown Error'); // String reject
            await expect(service.addPlant({ growspace_id: 'g1', strain: 'X', row: 1, col: 1 }))
                .rejects.toThrow('Failed to add plant');
        });

        it('should log error in askGrowAdvice failure', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Advice Fail'));
            await expect(service.askGrowAdvice('g1', 'q'))
                .rejects.toThrow('Advice Fail');
        });

        it('should log error in askGrowAdvice failure with no message', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue('Bad');
            await expect(service.askGrowAdvice('g1', 'q'))
                .rejects.toThrow('Failed to get advice');
        });

        it('should throw error in importStrainLibrary if fetch fails', async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error('Network Error'));
            mockHass.fetchWithAuth = mockFetch;
            await expect(service.importStrainLibrary(new File([''], 'x'), false))
                .rejects.toThrow('Network Error');
        });

        it('should throw error in importStrainLibrary if json result has error', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: false, error: 'Custom Backend Error' })
            });
            mockHass.fetchWithAuth = mockFetch;
            await expect(service.importStrainLibrary(new File([''], 'x'), false))
                .rejects.toThrow('Custom Backend Error');
        });

        it('should throw default error in importStrainLibrary if json result false with no message', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: false }) // Missing error prop
            });
            mockHass.fetchWithAuth = mockFetch;
            await expect(service.importStrainLibrary(new File([''], 'x'), false))
                .rejects.toThrow('Unknown import error');
        });
    });

    describe('Service Error Handling (Full Coverage)', () => {
        beforeEach(() => {
            // Setup a generic failure for this block
            callServiceMock.mockRejectedValue(new Error('Generic Service Failure'));
        });

        it('should handle error in addGrowspace', async () => {
            await expect(service.addGrowspace({ name: 'G1', rows: 1, plants_per_row: 1 }))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in updateGrowspace', async () => {
            await expect(service.updateGrowspace({ growspace_id: 'g1' }))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in removeGrowspace', async () => {
            await expect(service.removeGrowspace('g1'))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in configureEnvironment', async () => {
            await expect(service.configureEnvironment({ growspace_id: 'g1' } as any))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in setDehumidifierControl', async () => {
            await expect(service.setDehumidifierControl('g1', true))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in setIrrigationSettings', async () => {
            await expect(service.setIrrigationSettings({ growspace_id: 'g1' } as any))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in addIrrigationTime', async () => {
            await expect(service.addIrrigationTime({ growspace_id: 'g1', time: '10:00' }))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in removeIrrigationTime', async () => {
            await expect(service.removeIrrigationTime({ growspace_id: 'g1', time: '10:00' }))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in addDrainTime', async () => {
            await expect(service.addDrainTime({ growspace_id: 'g1', time: '10:00' }))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in removeDrainTime', async () => {
            await expect(service.removeDrainTime({ growspace_id: 'g1', time: '10:00' }))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in setIrrigationStrategy', async () => {
            await expect(service.setIrrigationStrategy('g1', {}))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in exportStrainLibrary', async () => {
            await expect(service.exportStrainLibrary())
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in clearStrainLibrary', async () => {
            await expect(service.clearStrainLibrary())
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in updatePlant', async () => {
            await expect(service.updatePlant({ plant_id: 'p1' }))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in removePlant', async () => {
            await expect(service.removePlant('p1'))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in harvestPlant', async () => {
            await expect(service.harvestPlant('p1'))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in takeClone', async () => {
            await expect(service.takeClone({ mother_plant_id: 'p1' }))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in moveClone', async () => {
            await expect(service.moveClone('p1', 'g2'))
                .rejects.toThrow('Generic Service Failure');
        });

        it('should handle error in swapPlants', async () => {
            await expect(service.swapPlants('p1', 'p2'))
                .rejects.toThrow('Generic Service Failure');
        });
    });

    describe('Analysis & Advice Error Handling', () => {
        beforeEach(() => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('WS Fail'));
        });

        it('should handle error in analyzeAllGrowspaces', async () => {
            await expect(service.analyzeAllGrowspaces())
                .rejects.toThrow('WS Fail');
        });

        it('should handle error in getStrainRecommendation', async () => {
            await expect(service.getStrainRecommendation('q'))
                .rejects.toThrow('WS Fail');
        });
    });
});
