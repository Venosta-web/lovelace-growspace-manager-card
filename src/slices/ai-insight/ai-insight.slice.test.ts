/**
 * AIInsight slice — unit tests.
 *
 * Tests cover:
 *   - atom defaults
 *   - dismissInsight (clears insight + error)
 *   - askGrowAdvice (apply, loading flag, error rollback)
 *   - analyzeAllGrowspaces (apply, loading flag, error rollback)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCall from '../../services/hass-call';
import {
  aiInsight$,
  isAiLoading$,
  aiError$,
  dismissInsight,
  clearAiError,
  askGrowAdvice,
  analyzeAllGrowspaces,
} from './index';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  setHass: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Reset atoms before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  aiInsight$.set(null);
  isAiLoading$.set(false);
  aiError$.set(null);
  vi.clearAllMocks();
  vi.mocked(hassCall.callServiceReturning).mockResolvedValue({ response: 'ok' });
});

// ---------------------------------------------------------------------------
// Atom defaults
// ---------------------------------------------------------------------------

describe('aiInsight$', () => {
  it('defaults to null', () => {
    expect(aiInsight$.get()).toBeNull();
  });
});

describe('isAiLoading$', () => {
  it('defaults to false', () => {
    expect(isAiLoading$.get()).toBe(false);
  });
});

describe('aiError$', () => {
  it('defaults to null', () => {
    expect(aiError$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// dismissInsight
// ---------------------------------------------------------------------------

describe('dismissInsight', () => {
  it('clears aiInsight$ and aiError$', () => {
    aiInsight$.set('some advice');
    aiError$.set('some error');

    dismissInsight();

    expect(aiInsight$.get()).toBeNull();
    expect(aiError$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearAiError
// ---------------------------------------------------------------------------

describe('clearAiError', () => {
  it('clears only aiError$ without touching aiInsight$', () => {
    aiInsight$.set('existing advice');
    aiError$.set('an error');

    clearAiError();

    expect(aiError$.get()).toBeNull();
    expect(aiInsight$.get()).toBe('existing advice');
  });
});

// ---------------------------------------------------------------------------
// askGrowAdvice
// ---------------------------------------------------------------------------

describe('askGrowAdvice', () => {
  it('calls ask_grow_advice service with growspace_id and user_query', async () => {
    await askGrowAdvice('gs1', 'what is the VPD?');

    expect(hassCall.callServiceReturning).toHaveBeenCalledWith(
      'growspace_manager',
      'ask_grow_advice',
      { growspace_id: 'gs1', user_query: 'what is the VPD?' },
      expect.anything()
    );
  });

  it('sets aiInsight$ to the response text on success', async () => {
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce({
      response: 'Your VPD is fine.',
    });

    await askGrowAdvice('gs1', 'VPD question');

    expect(aiInsight$.get()).toBe('Your VPD is fine.');
  });

  it('extracts nested response string when response is an object', async () => {
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce({
      response: { response: 'Nested advice text.' },
    });

    await askGrowAdvice('gs1', 'question');

    expect(aiInsight$.get()).toBe('Nested advice text.');
  });

  it('clears isAiLoading$ after a successful call', async () => {
    await askGrowAdvice('gs1', 'question');

    expect(isAiLoading$.get()).toBe(false);
  });

  it('sets aiError$ and clears isAiLoading$ when the service call fails', async () => {
    vi.mocked(hassCall.callServiceReturning).mockRejectedValueOnce(new Error('network failure'));

    await expect(askGrowAdvice('gs1', 'question')).rejects.toThrow('network failure');

    expect(aiError$.get()).toBe('network failure');
    expect(isAiLoading$.get()).toBe(false);
    expect(aiInsight$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// analyzeAllGrowspaces
// ---------------------------------------------------------------------------

describe('analyzeAllGrowspaces', () => {
  it('calls analyze_all_growspaces service with no extra params', async () => {
    await analyzeAllGrowspaces();

    expect(hassCall.callServiceReturning).toHaveBeenCalledWith(
      'growspace_manager',
      'analyze_all_growspaces',
      {},
      expect.anything()
    );
  });

  it('sets aiInsight$ to the response text on success', async () => {
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce({
      response: 'All growspaces healthy.',
    });

    await analyzeAllGrowspaces();

    expect(aiInsight$.get()).toBe('All growspaces healthy.');
  });

  it('sets aiError$ and clears isAiLoading$ when the service call fails', async () => {
    vi.mocked(hassCall.callServiceReturning).mockRejectedValueOnce(new Error('timeout'));

    await expect(analyzeAllGrowspaces()).rejects.toThrow('timeout');

    expect(aiError$.get()).toBe('timeout');
    expect(isAiLoading$.get()).toBe(false);
  });
});
