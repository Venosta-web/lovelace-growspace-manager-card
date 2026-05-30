import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIAPI } from '../../../../src/services/api/ai-api';
import { WSError } from '../../../../src/services/base-api';
import { DOMAIN, SERVICES } from '../../../../src/lib/constants';

let sendMessagePromiseMock: ReturnType<typeof vi.fn>;
let mockHass: any;
let api: AIAPI;

beforeEach(() => {
  sendMessagePromiseMock = vi.fn().mockResolvedValue({ advice: 'ok' });
  mockHass = {
    connection: { sendMessagePromise: sendMessagePromiseMock },
  };
  api = new AIAPI(mockHass);
});

describe('AIAPI — askGrowAdvice', () => {
  it('returns response on success', async () => {
    const response = { advice: 'water more' };
    sendMessagePromiseMock.mockResolvedValue(response);
    const result = await api.askGrowAdvice('gs-1', 'how are my plants?');
    expect(result).toEqual(response);
  });

  it('sends message with correct payload', async () => {
    await api.askGrowAdvice('gs-1', 'check humidity');
    expect(sendMessagePromiseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        service: SERVICES.ASK_GROW_ADVICE,
        service_data: { growspace_id: 'gs-1', user_query: 'check humidity' },
        return_response: true,
      }),
    );
  });

  it('wraps known error code into WSError and logs', async () => {
    sendMessagePromiseMock.mockRejectedValue({
      code: 'coordinator_not_ready',
      message: 'not ready',
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(api.askGrowAdvice('gs-1', 'q')).rejects.toSatisfy(
      (e: unknown) => e instanceof WSError && e.code === 'coordinator_not_ready',
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('maps unknown error code to internal_error', async () => {
    sendMessagePromiseMock.mockRejectedValue({ code: 'custom_code', message: 'oops' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(api.askGrowAdvice('gs-1', 'q')).rejects.toSatisfy(
      (e: unknown) => e instanceof WSError && e.code === 'internal_error',
    );
    consoleSpy.mockRestore();
  });

  it('wraps plain Error into WSError with internal_error', async () => {
    sendMessagePromiseMock.mockRejectedValue(new Error('network fail'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(api.askGrowAdvice('gs-1', 'q')).rejects.toSatisfy(
      (e: unknown) => e instanceof WSError && e.code === 'internal_error' && e.message === 'network fail',
    );
    consoleSpy.mockRestore();
  });
});

describe('AIAPI — analyzeAllGrowspaces', () => {
  it('returns response on success', async () => {
    const response = { summary: 'all good' };
    sendMessagePromiseMock.mockResolvedValue(response);
    const result = await api.analyzeAllGrowspaces();
    expect(result).toEqual(response);
  });

  it('sends message with correct service', async () => {
    await api.analyzeAllGrowspaces();
    expect(sendMessagePromiseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: DOMAIN,
        service: SERVICES.ANALYZE_ALL_GROWSPACES,
        return_response: true,
      }),
    );
  });

  it('wraps known error code and logs', async () => {
    sendMessagePromiseMock.mockRejectedValue({ code: 'rate_limited', message: 'slow down' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(api.analyzeAllGrowspaces()).rejects.toSatisfy(
      (e: unknown) => e instanceof WSError && e.code === 'rate_limited',
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('wraps plain string error into WSError', async () => {
    sendMessagePromiseMock.mockRejectedValue('plain string error');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(api.analyzeAllGrowspaces()).rejects.toSatisfy(
      (e: unknown) => e instanceof WSError && e.code === 'internal_error',
    );
    consoleSpy.mockRestore();
  });
});

describe('AIAPI — getStrainRecommendation', () => {
  it('returns response on success', async () => {
    const response = { recommendation: 'Blue Dream' };
    sendMessagePromiseMock.mockResolvedValue(response);
    const result = await api.getStrainRecommendation('high yield');
    expect(result).toEqual(response);
  });

  it('re-throws raw error without WSError wrapping (existing inconsistency)', async () => {
    const rawError = new Error('direct error');
    sendMessagePromiseMock.mockRejectedValue(rawError);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(api.getStrainRecommendation('q')).rejects.toBe(rawError);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
