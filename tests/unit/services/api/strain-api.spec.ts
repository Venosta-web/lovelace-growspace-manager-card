/**
 * DataService — strain delegation tests.
 *
 * Verifies that DataService correctly delegates all strain operations to the
 * strain slice. The slice itself is fully tested in src/slices/strain/strain.slice.test.ts;
 * these tests only confirm the DataService shim maps method signatures correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../../src/services/data-service';

vi.mock('../../../../src/services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({ strains: {} }),
  callFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }),
  setHass: vi.fn(),
}));

import * as hassCallModule from '../../../../src/services/hass-call';

describe('DataService — strain slice delegation', () => {
  let service: DataService;

  beforeEach(() => {
    service = new DataService();
    vi.clearAllMocks();
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({ strains: {} });
  });

  it('fetchStrainLibrary delegates to strain slice (hassCall)', async () => {
    await service.fetchStrainLibrary();
    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_strain_library',
      {},
      expect.anything(),
    );
  });

  it('addStrain delegates to strain slice (callService)', async () => {
    await service.addStrain({ strain: 'Gelato', phenotype: 'pheno1' });
    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_strain',
      expect.objectContaining({ strain: 'Gelato' }),
    );
  });

  it('updateStrainMeta delegates to strain slice (callService)', async () => {
    await service.updateStrainMeta({ strain: 'OG', description: 'nice' });
    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_strain_meta',
      expect.objectContaining({ strain: 'OG' }),
    );
  });

  it('removeStrain with phenotype builds key "strain|phenotype"', async () => {
    await service.removeStrain('Blue Dream', 'pheno1');
    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_strain',
      expect.objectContaining({ strain: 'Blue Dream', phenotype: 'pheno1' }),
    );
  });

  it('removeStrain without phenotype builds key "strain|default"', async () => {
    await service.removeStrain('OG Kush');
    // 'default' phenotype is omitted in the slice
    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_strain',
      expect.objectContaining({ strain: 'OG Kush' }),
    );
    const call = vi.mocked(hassCallModule.callService).mock.calls[0][2];
    expect(call.phenotype).toBeUndefined();
  });

  it('exportStrainLibrary delegates to strain slice (callService)', async () => {
    await service.exportStrainLibrary();
    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'export_strain_library',
      {},
    );
  });

  it('importStrainLibrary delegates to strain slice (callFetch)', async () => {
    const file = new File(['{}'], 'lib.json', { type: 'application/json' });
    await service.importStrainLibrary(file, false);
    expect(hassCallModule.callFetch).toHaveBeenCalledWith(
      '/api/growspace_manager/import_strains',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('clearStrainLibrary delegates to strain slice (callService)', async () => {
    await service.clearStrainLibrary();
    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'clear_strain_library',
      {},
    );
  });

  it('updateBreeder delegates to strain slice (hassCall)', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({});
    await service.updateBreeder('Old', 'New', 'logo.png');
    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_breeder',
      expect.objectContaining({ original_name: 'Old', new_name: 'New', logo: 'logo.png' }),
      expect.anything(),
    );
  });

  it('deleteBreeder delegates to strain slice (hassCall)', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({});
    await service.deleteBreeder('DJ Short');
    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/delete_breeder',
      { breeder_name: 'DJ Short' },
      expect.anything(),
    );
  });
});
