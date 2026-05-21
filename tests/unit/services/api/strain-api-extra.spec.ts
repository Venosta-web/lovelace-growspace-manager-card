import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../../src/services/data-service';
import { HomeAssistant } from 'custom-card-helpers';
import { DOMAIN, SERVICES } from '../../../../src/constants';

describe('StrainAPI Extra Coverage', () => {
    let service: DataService;
    let mockHass: HomeAssistant;

    beforeEach(() => {
        service = new DataService();
        mockHass = {
            states: {},
            connection: {
                sendMessagePromise: vi.fn(),
            },
            callService: vi.fn().mockResolvedValue({}),
            fetchWithAuth: vi.fn(),
        } as any;
        service.updateHass(mockHass);
    });

    describe('getStrainLibrary gaps', () => {
        it('should use direct lookup for sensor.strain_library', () => {
            mockHass.states = {
                'sensor.strain_library': {
                    attributes: { strains: ['Direct 1'] }
                }
            } as any;
            const res = service.getStrainLibrary();
            expect(res).toHaveLength(1);
            expect(res[0].strain).toBe('Direct 1');
        });

        it('should use direct lookup for sensor.growspace_manager_strain_library', () => {
            mockHass.states = {
                'sensor.growspace_manager_strain_library': {
                    attributes: { strains: ['Direct 2'] }
                }
            } as any;
            const res = service.getStrainLibrary();
            expect(res).toHaveLength(1);
            expect(res[0].strain).toBe('Direct 2');
        });

        it('should return empty if rawStrains is found but not array or object', () => {
            mockHass.states = {
                'sensor.strain_library': {
                    attributes: { strains: 123 } // Invalid type
                }
            } as any;
            const res = service.getStrainLibrary();
            expect(res).toEqual([]);
        });
    });

    describe('fetchStrainLibrary gaps', () => {
        it('should handle schema validation failure and legacy fallback success', async () => {
            // Mock a response that fails the new schema but passes legacy (just strains object)
            const mockResponse = {
                'Kush': {
                    meta: { breeder: 'Legacy' },
                    phenotypes: { 'p1': {} }
                }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockResponse);

            const res = await service.fetchStrainLibrary();
            expect(res).toHaveLength(1);
            expect(res[0].breeder).toBe('Legacy');
        });

        it('should handle both schema failures', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue({ invalid: true });

            const res = await service.fetchStrainLibrary();
            expect(res).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('addStrain gaps', () => {
        it('should cleanup undefined keys and handle service error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Service Fail'));

            await expect(service.addStrain({
                strain: 'Test',
                breeder: undefined,
                phenotype: 'P1'
            })).rejects.toThrow('Service Fail');

            expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_STRAIN, {
                strain: 'Test',
                phenotype: 'P1'
            });
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('removeStrain gaps', () => {
        it('should call remove_strain service on success', async () => {
            await service.removeStrain('S1', 'P1');
            expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.REMOVE_STRAIN, {
                strain: 'S1',
                phenotype: 'P1'
            });
        });

        it('should handle service error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Remove Fail'));
            await expect(service.removeStrain('S1')).rejects.toThrow('Remove Fail');
        });
    });

    describe('exportStrainLibrary gaps', () => {
        it('should handle service error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Export Fail'));
            await expect(service.exportStrainLibrary()).rejects.toThrow('Export Fail');
        });
    });

    describe('importStrainLibrary gaps', () => {
        it('should handle successful HTTP response but result.success is false', async () => {
            mockHass.fetchWithAuth = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: false, error: 'Internal logic error' })
            });

            await expect(service.importStrainLibrary(new File([], 'test.zip'), true))
                .rejects.toThrow('Internal logic error');
        });

        it('should handle successful HTTP response with missing success/error fields', async () => {
            mockHass.fetchWithAuth = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({})
            });

            await expect(service.importStrainLibrary(new File([], 'test.zip'), true))
                .rejects.toThrow('Unknown import error');
        });

        it('should handle generic catch block error', async () => {
            mockHass.fetchWithAuth = vi.fn().mockRejectedValue('String error');
            await expect(service.importStrainLibrary(new File([], 'test.zip'), true))
                .rejects.toThrow('Failed to import strain library');
        });
    });

    describe('clearStrainLibrary gaps', () => {
        it('should handle service error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Clear Fail'));
            await expect(service.clearStrainLibrary()).rejects.toThrow('Clear Fail');
        });
    });
});
