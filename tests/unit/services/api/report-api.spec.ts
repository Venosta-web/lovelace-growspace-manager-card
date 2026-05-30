import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportAPI } from '../../../../src/services/api/report-api';
import { DOMAIN, SERVICES } from '../../../../src/lib/constants';

let callServiceMock: ReturnType<typeof vi.fn>;
let sendMessagePromiseMock: ReturnType<typeof vi.fn>;
let mockHass: any;
let api: ReportAPI;

beforeEach(() => {
  callServiceMock = vi.fn().mockResolvedValue(undefined);
  sendMessagePromiseMock = vi.fn().mockResolvedValue({});
  mockHass = {
    callService: callServiceMock,
    connection: {
      sendMessagePromise: sendMessagePromiseMock,
    },
  };
  api = new ReportAPI(mockHass);
});

describe('ReportAPI — exportGrowReport', () => {
  it('calls callService with default format when format is omitted', async () => {
    await api.exportGrowReport('growspace-1');
    expect(callServiceMock).toHaveBeenCalledWith(
      DOMAIN,
      SERVICES.EXPORT_GROW_REPORT,
      {
        growspace_id: 'growspace-1',
        format: 'json',
      }
    );
  });

  it('calls callService with custom format when format is explicitly provided', async () => {
    await api.exportGrowReport('growspace-1', 'pdf');
    expect(callServiceMock).toHaveBeenCalledWith(
      DOMAIN,
      SERVICES.EXPORT_GROW_REPORT,
      {
        growspace_id: 'growspace-1',
        format: 'pdf',
      }
    );
  });

  it('logs and propagates errors thrown by callService', async () => {
    const mockError = new Error('Service failed');
    callServiceMock.mockRejectedValue(mockError);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(api.exportGrowReport('growspace-1')).rejects.toThrow('Service failed');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ReportAPI:exportGrowReport] Error:',
      mockError
    );

    consoleSpy.mockRestore();
  });
});

describe('ReportAPI — fetchGrowReport', () => {
  it('resolves and returns GrowReportData on success', async () => {
    const mockReportData = {
      summary: {
        plant_count: 5,
        strains: ['Northern Lights', 'OG Kush'],
        stages: { Veg: 3, Flower: 2 },
      },
      harvest: {
        total_wet_weight: 500,
        total_dry_weight: 120,
        total_trim_weight: 80,
        top_thc: 24.5,
      },
      environment: {
        temperature_avg: 23.5,
        humidity_avg: 55,
        vpd_avg: 1.1,
      },
    };
    sendMessagePromiseMock.mockResolvedValue(mockReportData);

    const result = await api.fetchGrowReport('growspace-1');

    expect(sendMessagePromiseMock).toHaveBeenCalledWith({
      type: 'growspace_manager/get_grow_report',
      growspace_id: 'growspace-1',
    });
    expect(result).toEqual(mockReportData);
  });

  it('logs and propagates errors thrown by sendMessagePromise', async () => {
    const mockError = new Error('WebSocket timeout');
    sendMessagePromiseMock.mockRejectedValue(mockError);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(api.fetchGrowReport('growspace-1')).rejects.toThrow('WebSocket timeout');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ReportAPI:fetchGrowReport] Error:',
      mockError
    );

    consoleSpy.mockRestore();
  });
});
