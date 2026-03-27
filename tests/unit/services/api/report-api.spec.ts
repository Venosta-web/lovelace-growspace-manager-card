import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';
import { DOMAIN, SERVICES } from '../../../../src/constants';

describe('ReportAPI', () => {
    let service: DataService;
    let mockHass: HomeAssistant;

    beforeEach(() => {
        service = new DataService();
        mockHass = {
            callService: vi.fn().mockResolvedValue({}),
            connection: {
                sendMessagePromise: vi.fn(),
            },
        } as any;
        service.updateHass(mockHass);
    });

    describe('exportGrowReport', () => {
        it('should call export_grow_report service on success', async () => {
            await service.exportGrowReport('gs1');
            expect(mockHass.callService).toHaveBeenCalledWith(DOMAIN, SERVICES.EXPORT_GROW_REPORT, {
                growspace_id: 'gs1',
                format: 'json',
            });
        });

        it('should handle service error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Export Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await expect(service.exportGrowReport('gs1')).rejects.toThrow('Export Error');
            expect(consoleSpy).toHaveBeenCalledWith('[ReportAPI:exportGrowReport] Error:', expect.any(Error));
        });
    });

    describe('fetchGrowReport', () => {
        it('should handle successful WS response', async () => {
            const mockReport = {
                summary: { plant_count: 10, strains: ['Kush'], stages: {} },
                harvest: { total_wet_weight: 100, total_dry_weight: 80, total_trim_weight: 20, top_thc: 25 },
                environment: { temperature_avg: 24, humidity_avg: 50, vpd_avg: 1.2 }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockReport);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            const result = await service.fetchGrowReport('gs1');
            expect(result).toEqual(mockReport);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith({
                type: 'growspace_manager/get_grow_report',
                growspace_id: 'gs1',
            });
            expect(consoleSpy).toHaveBeenCalledWith('[ReportAPI:fetchGrowReport] WS call completed', mockReport);
        });

        it('should handle fetch error', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('WS Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await expect(service.fetchGrowReport('gs1')).rejects.toThrow('WS Error');
            expect(consoleSpy).toHaveBeenCalledWith('[ReportAPI:fetchGrowReport] Error:', expect.any(Error));
        });
    });
});
