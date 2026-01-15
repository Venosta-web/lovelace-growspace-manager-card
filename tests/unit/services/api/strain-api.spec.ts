import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';

describe('DataService - StrainAPI', () => {
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
            callWS: vi.fn().mockResolvedValue({}), // For WS calls like getHistoryStats
            fetchWithAuth: vi.fn().mockResolvedValue({}), // For importStrainLibrary
        } as any;
        service.updateHass(mockHass);
    });

    describe('Strain Library', () => {
        it('should fetch strain library via service', async () => {
            const mockResponse = {
                'Kush': {
                    meta: { breeder: 'Me' },
                    phenotypes: {
                        'default': { description: 'Good' }
                    }
                }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockResponse);
            const strains = await service.fetchStrainLibrary();
            expect(strains).toHaveLength(1);
            expect(strains[0].strain).toBe('Kush');
        });

        it('should fetch strain library via service with wrapper format', async () => {
            const mockResponse = {
                strains: {
                    'Haze': {
                        meta: { breeder: 'You' },
                        phenotypes: {
                            'default': { description: 'Sativa' }
                        }
                    }
                },
                strain_list: ['Haze']
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockResponse);
            const strains = await service.fetchStrainLibrary();
            expect(strains).toHaveLength(1);
            expect(strains[0].strain).toBe('Haze');
            expect(strains[0].breeder).toBe('You');
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

    describe('Import/Export', () => {
        it('should export strain library', async () => {
            await service.exportStrainLibrary();
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'export_strain_library', {});
        });

        it('should clear strain library', async () => {
            await service.clearStrainLibrary();
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'clear_strain_library', {});
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

    describe('Strain Library Internals', () => {
        it('should parse array format from attributes', () => {
            service.updateHass({
                states: {
                    'sensor.strains': {
                        attributes: { strains: ['OG Kush', 'Blue Dream'] }
                    }
                }
            } as any);

            const strains = service.getStrainLibrary();
            expect(strains).toHaveLength(2);
            expect(strains[0].key).toBe('OG Kush|default');
        });

        it('should parse object format with sorting', () => {
            service.updateHass({
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
            } as any);

            const strains = service.getStrainLibrary();
            expect(strains[0].strain).toBe('A');
            expect(strains[1].strain).toBe('B');
        });

        it('should return empty if missing attributes', () => {
            service.updateHass({ states: {} } as any);
            expect(service.getStrainLibrary()).toEqual([]);
        });

        it('should handle fetchStrainLibrary errors', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Fail'));
            const res = await service.fetchStrainLibrary();
            expect(res).toEqual([]);
        });

        it('should skip "response" key in strain library fetch', async () => {
            const mockResponse = {
                response: 'meta', // Should be skipped (deleted before validation)
                'Kush': { phenotypes: { 'default': {} } }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockResponse);
            const res = await service.fetchStrainLibrary();
            expect(res).toHaveLength(1);
            expect(res[0].strain).toBe('Kush');
        });
    });

    describe('Strain Library Sorting & Edge Cases', () => {
        it('should sort strains by name then phenotype', () => {
            service.updateHass({
                states: {
                    'sensor.strains': {
                        attributes: {
                            strains: {
                                'B': { phenotypes: { '1': {} } },
                                'A': { phenotypes: { '2': {}, '1': {} } }
                            }
                        }
                    }
                }
            } as any);

            const strains = service.getStrainLibrary();
            expect(strains[0].strain).toBe('A');
            expect(strains[0].phenotype).toBe('1');
            expect(strains[1].strain).toBe('A');
            expect(strains[1].phenotype).toBe('2');
            expect(strains[2].strain).toBe('B');
        });

        it('should handle undefined phenotype in sort', () => {
            service.updateHass({
                states: {
                    'sensor.strains': {
                        attributes: {
                            strains: {
                                'A': { phenotypes: { '': {}, 'p2': {} } }
                            }
                        }
                    }
                }
            } as any);
            const strains = service.getStrainLibrary();
            // Empty string should come first
            expect(strains[0].phenotype).toBe('');
            expect(strains[1].phenotype).toBe('p2');
        });
        describe('Ultimate Coverage & Edge Cases', () => {
            it('getStrainLibrary sorting with matching strain names and different phenotypes', () => {
                service.updateHass({
                    states: {
                        'sensor.strains': {
                            attributes: {
                                strains: {
                                    'Kush': { phenotypes: { '1': {}, '0': {} } }
                                }
                            }
                        }
                    }
                } as any);

                const res = service.getStrainLibrary();
                expect(res[0].phenotype).toBe('0');
                expect(res[1].phenotype).toBe('1');
            });

            it('fetchStrainLibrary should handle extra "response" key if it somehow persists', async () => {
                const serviceResponse = {
                    response: 'should be deleted',
                    'Kush': { phenotypes: { 'default': {} } }
                };
                (mockHass.connection.sendMessagePromise as any).mockResolvedValue(serviceResponse);

                const res = await service.fetchStrainLibrary();
                expect(res).toHaveLength(1);
                expect(res[0].strain).toBe('Kush');
            });

            it('fetchStrainLibrary should handle missing meta or phenotypes and "response" filter in loop', async () => {
                const serviceResponse = {
                    'strain1': { meta: undefined, phenotypes: undefined },
                    'response': { phenotypes: { 'p1': {} } }
                };
                (mockHass.connection.sendMessagePromise as any).mockResolvedValue(serviceResponse);

                const res = await service.fetchStrainLibrary();
                expect(res).toHaveLength(0);
            });

            it('getStrainLibrary should handle missing meta or phenotypes', () => {
                mockHass.states = {
                    'sensor.strains': {
                        attributes: {
                            strains: {
                                'strain1': { meta: null, phenotypes: null }
                            }
                        }
                    }
                } as any;
                const res = service.getStrainLibrary();
                expect(res).toHaveLength(0);
            });

            it('fetchStrainLibrary should handle WS error with logging', async () => {
                (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('WS Fail'));
                const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

                const res = await service.fetchStrainLibrary();
                expect(res).toEqual([]);
                expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch strain library for grid:'), expect.anything());
            });

            it('getStrainLibrary should handle sensor with null attributes', () => {
                service.updateHass({
                    states: {
                        'sensor.strains': { attributes: null } as any
                    }
                } as any);
                expect(service.getStrainLibrary()).toEqual([]);
            });

            it('getStrainLibrary should handle undefined rawStrains (explicit verify)', () => {
                service.updateHass({
                    states: {
                        'sensor.strains': { attributes: { strains: undefined } }
                    }
                } as any);
                expect(service.getStrainLibrary()).toEqual([]);
            });
        });
    });
});