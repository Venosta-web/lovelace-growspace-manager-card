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

    it('should clean undefined keys in addStrain', async () => {
        await service.addStrain({ strain: 'X', description: undefined });
        expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_strain', {
            strain: 'X'
        });
    });

    it('should remove strain successfully', async () => {
        await service.removeStrain('X', 'pheno1');
        expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_strain', {
            strain: 'X',
            phenotype: 'pheno1'
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

        it('should handle import errors with empty text response (fallback to statusText)', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                statusText: 'Bad Request',
                text: async () => ''
            });
            mockHass.fetchWithAuth = mockFetch;

            await expect(service.importStrainLibrary(new File([''], 't.zip'), false)).rejects.toThrow('Bad Request');
        });

        it('should verify import failure result success:false', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: false, error: 'Logic Error' })
            });
            mockHass.fetchWithAuth = mockFetch;

            await expect(service.importStrainLibrary(new File([''], 't.zip'), false)).rejects.toThrow('Logic Error');
        });

        it('should verify import failure result success:false default error', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: false })
            });
            mockHass.fetchWithAuth = mockFetch;

            await expect(service.importStrainLibrary(new File([''], 't.zip'), false)).rejects.toThrow('Unknown import error');
        });

        it('should throw on exportStrainLibrary failure', async () => {
            callServiceMock.mockRejectedValue(new Error('Export Fail'));
            await expect(service.exportStrainLibrary()).rejects.toThrow('Export Fail');
        });

        it('should throw on clearStrainLibrary failure', async () => {
            callServiceMock.mockRejectedValue(new Error('Clear Fail'));
            await expect(service.clearStrainLibrary()).rejects.toThrow('Clear Fail');
        });


        describe('Service Call Errors', () => {
            it('should throw on addStrain failure', async () => {
                callServiceMock.mockRejectedValue(new Error('Add Fail'));
                await expect(service.addStrain({ strain: 'X' })).rejects.toThrow('Add Fail');
            });

            it('should throw on removeStrain failure', async () => {
                callServiceMock.mockRejectedValue(new Error('Remove Fail'));
                await expect(service.removeStrain('X')).rejects.toThrow('Remove Fail');
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

                it('fetchStrainLibrary should handle extra "response" key if it somehow persists (nested in strains)', async () => {
                    // This targets line 150 logic where 'response' is inside the iterated object
                    const serviceResponse = {
                        strains: {
                            'response': { phenotypes: {} },
                            'Valid': { phenotypes: { 'default': {} } }
                        }
                    };
                    (mockHass.connection.sendMessagePromise as any).mockResolvedValue(serviceResponse);

                    const res = await service.fetchStrainLibrary();
                    expect(res).toHaveLength(1);
                    expect(res[0].strain).toBe('Valid');
                });

                it('fetchStrainLibrary should handle missing meta or phenotypes and "response" filter in loop', async () => {
                    // This targets line 151-152 (meta/phenotypes || {})
                    const serviceResponse = {
                        'strain1': { meta: null, phenotypes: null }
                    };
                    (mockHass.connection.sendMessagePromise as any).mockResolvedValue(serviceResponse);

                    const res = await service.fetchStrainLibrary();
                    // Loop runs, meta={}, phenotypes={}
                    // Inner loop Object.entries({}) -> empty
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


            describe('Additional Coverage', () => {
                it('should clean undefined keys in addStrain', async () => {
                    await service.addStrain({ strain: 'X', description: undefined });
                    expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_strain', {
                        strain: 'X'
                    });
                });

                it('should remove strain successfully', async () => {
                    await service.removeStrain('X', 'pheno1');
                    expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_strain', {
                        strain: 'X',
                        phenotype: 'pheno1'
                    });
                });

                it('should return empty array when schema validation fails for both wrapper and legacy', async () => {
                    const mockResponse = {
                        invalid: 'structure'
                    };
                    (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockResponse);
                    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

                    const res = await service.fetchStrainLibrary();

                    expect(res).toEqual([]);
                    expect(warnSpy).toHaveBeenCalled();
                });

                it('getStrainLibrary should use direct lookup for known sensors (sensor.strain_library)', () => {
                    service.updateHass({
                        states: {
                            'sensor.strain_library': {
                                attributes: { strains: ['DirectLookup'] }
                            }
                        }
                    } as any);
                    const res = service.getStrainLibrary();
                    expect(res).toHaveLength(1);
                    expect(res[0].strain).toBe('DirectLookup');
                });

                it('getStrainLibrary should return empty for invalid strains type (number)', () => {
                    service.updateHass({
                        states: {
                            'sensor.strains': { attributes: { strains: 12345 } }
                        }
                    } as any);
                    expect(service.getStrainLibrary()).toEqual([]);
                });

                it('fetchStrainLibrary should handle undefined meta/phenotypes in wrapper mode', async () => {
                    // Covers lines 151-152 (undefined branches)
                    const serviceResponse = {
                        strains: {
                            'U': {} // meta undefined, phenotypes undefined
                        }
                    };
                    (mockHass.connection.sendMessagePromise as any).mockResolvedValue(serviceResponse);
                    const res = await service.fetchStrainLibrary();
                    // loop runs, meta undefined->{}, phenotypes undefined->{}, inner loop empty -> result empty
                    expect(res).toHaveLength(0);
                });

                it('importStrainLibrary should handle non-Error exception', async () => {
                    // Covers line 283 branch (err not instanceof Error)
                    mockHass.fetchWithAuth = vi.fn().mockRejectedValue('String Error');
                    await expect(service.importStrainLibrary(new File([''], 't.zip'), false))
                        .rejects.toThrow('Failed to import strain library');
                });
            });

            describe('New Strain Meta Actions', () => {
                it('updateStrainMeta should call service with data', async () => {
                    const data = { strain: 'OG Kush', description: 'Updated' };
                    await service.updateStrainMeta(data);
                    expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'update_strain_meta', data);
                });

                it('updateStrainMeta should handle error', async () => {
                    callServiceMock.mockRejectedValue(new Error('Update Fail'));
                    await expect(service.updateStrainMeta({ strain: 'X' })).rejects.toThrow('Update Fail');
                });

                it('deleteBreeder should call sendMessagePromise with name', async () => {
                    await service.deleteBreeder('Me');
                    expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith({
                        type: 'growspace_manager/delete_breeder',
                        breeder_name: 'Me'
                    });
                });

                it('deleteBreeder should handle error', async () => {
                    (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Delete Fail'));
                    await expect(service.deleteBreeder('Me')).rejects.toThrow('Delete Fail');
                });

                it('updateBreeder should call sendMessagePromise with data', async () => {
                    await service.updateBreeder('Old', 'New', 'logo.png');
                    expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith({
                        type: 'growspace_manager/update_breeder',
                        original_name: 'Old',
                        new_name: 'New',
                        logo: 'logo.png'
                    });
                });

                it('updateBreeder should handle error', async () => {
                    (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Update Fail'));
                    await expect(service.updateBreeder('Old', 'New')).rejects.toThrow('Update Fail');
                });

                it('updateStrainMeta should clean undefined keys and handle non-base64 image', async () => {
                    const data = { strain: 'OG Kush', description: undefined, image: '/local/test.jpg' };
                    await service.updateStrainMeta(data);
                    expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'update_strain_meta', {
                        strain: 'OG Kush'
                    });
                });

                it('fetchStrainLibrary should return empty array when result is null', async () => {
                    (mockHass.connection.sendMessagePromise as any).mockResolvedValue(null);
                    const res = await service.fetchStrainLibrary();
                    expect(res).toEqual([]);
                });
            });
        });
    });
});