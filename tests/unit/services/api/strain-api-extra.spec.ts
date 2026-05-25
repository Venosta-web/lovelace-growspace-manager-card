/**
 * StrainAPI extra coverage — DataService delegation tests.
 *
 * Verifies edge-case delegation paths from DataService to the strain slice.
 * The slice itself is fully tested in src/slices/strain/strain.slice.test.ts.
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

describe('StrainAPI Extra Coverage', () => {
  let service: DataService;

  beforeEach(() => {
    service = new DataService();
    vi.clearAllMocks();
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({ strains: {} });
  });

  describe('removeStrain gaps', () => {
    it('should call remove_strain service on success', async () => {
      await service.removeStrain('OG', 'pheno1');
      expect(hassCallModule.callService).toHaveBeenCalledWith(
        'growspace_manager',
        'remove_strain',
        expect.objectContaining({ strain: 'OG', phenotype: 'pheno1' }),
      );
    });

    it('should handle service error', async () => {
      vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('remove fail'));
      await expect(service.removeStrain('OG')).rejects.toThrow('remove fail');
    });
  });

  describe('exportStrainLibrary gaps', () => {
    it('should handle service error', async () => {
      vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('export fail'));
      await expect(service.exportStrainLibrary()).rejects.toThrow('export fail');
    });
  });

  describe('importStrainLibrary gaps', () => {
    it('should handle successful HTTP response but result.success is false', async () => {
      vi.mocked(hassCallModule.callFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Validation error' }),
      });
      const file = new File(['{}'], 'lib.json', { type: 'application/json' });
      await expect(service.importStrainLibrary(file, false)).rejects.toThrow('Validation error');
    });

    it('should handle successful HTTP response with missing success/error fields', async () => {
      vi.mocked(hassCallModule.callFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      });
      const file = new File(['{}'], 'lib.json', { type: 'application/json' });
      await expect(service.importStrainLibrary(file, false)).rejects.toThrow('Unknown import error');
    });

    it('should handle generic catch block error', async () => {
      vi.mocked(hassCallModule.callFetch).mockRejectedValueOnce(new Error('network fail'));
      const file = new File(['{}'], 'lib.json', { type: 'application/json' });
      await expect(service.importStrainLibrary(file, false)).rejects.toThrow('network fail');
    });
  });

  describe('clearStrainLibrary gaps', () => {
    it('should handle service error', async () => {
      vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('clear fail'));
      await expect(service.clearStrainLibrary()).rejects.toThrow('clear fail');
    });
  });
});
