import { expect, test, describe, vi } from 'vitest';
import { GrowspaceAiInsightCard } from '../../src/cards/growspace-ai-insight-card';
import { aiInsight$, isAiLoading$, aiError$ } from '../../src/slices/ai-insight';
import { aHass, aGrowspace } from '../fixtures';
import { renderCard } from '../harness';

if (!customElements.get('growspace-ai-insight-card')) {
  customElements.define('growspace-ai-insight-card', GrowspaceAiInsightCard);
}

vi.mock('../../src/features/shared/ui/error-boundary', () => ({
  ErrorBoundary: class extends HTMLElement {},
}));
vi.mock('../../src/cards/editors/growspace-ai-insight-card-editor', () => ({
  GrowspaceAiInsightCardEditor: class extends HTMLElement {},
}));

vi.mock('../../src/slices/ai-insight', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/slices/ai-insight')>();
  return {
    ...actual,
    analyzeAllGrowspaces: vi.fn().mockResolvedValue(undefined),
    askGrowAdvice: vi.fn().mockResolvedValue(undefined),
    dismissInsight: vi.fn(),
    clearAiError: vi.fn(),
  };
});

describe('GrowspaceAiInsightCard', () => {
  const growspace = aGrowspace();
  const hass = aHass({ growspaces: [growspace] });

  function resetAtoms() {
    isAiLoading$.set(false);
    aiInsight$.set(null);
    aiError$.set(null);
  }

  test('renders without crash', async () => {
    resetAtoms();
    const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
    expect(handle.element).toBeInstanceOf(GrowspaceAiInsightCard);
    handle.unmount();
  });

  test('throws error on invalid config', async () => {
    resetAtoms();
    const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
    expect(() => handle.element.setConfig(undefined as any)).toThrowError('Invalid configuration');
    handle.unmount();
  });

  test('renders error state when hass is missing', async () => {
    resetAtoms();
    const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
    handle.element.hass = undefined as any;
    await handle.element.updateComplete;

    const errorDiv = handle.element.shadowRoot?.querySelector('.error-state');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv?.textContent).toContain('Home Assistant not available');
    handle.unmount();
  });

  test('provides fallback stub config', () => {
    const stub = GrowspaceAiInsightCard.getStubConfig();
    expect(stub.type).toBe('custom:growspace-ai-insight-card');
    expect(stub).toHaveProperty('default_growspace');
  });

  test('returns standard card size', async () => {
    resetAtoms();
    const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
    expect(handle.element.getCardSize()).toBe(4);
    handle.unmount();
  });

  test('renders loading spinner when isAiLoading$ is true', async () => {
    resetAtoms();
    const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
    handle.element.store.data.$devices.set([
      { deviceId: growspace.growspaceId, name: growspace.name, plants: [] } as any,
    ]);
    handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
    isAiLoading$.set(true);
    await handle.element.updateComplete;

    const loader = handle.element.shadowRoot?.querySelector('.gm-loading');
    expect(loader).toBeTruthy();
    handle.unmount();
  });

  test('renders response box when aiInsight$ has text', async () => {
    resetAtoms();
    const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
    handle.element.store.data.$devices.set([
      { deviceId: growspace.growspaceId, name: growspace.name, plants: [] } as any,
    ]);
    handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
    isAiLoading$.set(false);
    aiInsight$.set('The AI says grow more');
    await handle.element.updateComplete;

    const box = handle.element.shadowRoot?.querySelector('.gm-response-box');
    expect(box?.textContent).toContain('The AI says grow more');
    handle.unmount();
  });

  test('renders error state when aiError$ has a message', async () => {
    resetAtoms();
    const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
    handle.element.store.data.$devices.set([
      { deviceId: growspace.growspaceId, name: growspace.name, plants: [] } as any,
    ]);
    handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
    aiError$.set('Oops AI failed');
    await handle.element.updateComplete;

    const errorBox = handle.element.shadowRoot?.querySelector('.error-state');
    expect(errorBox?.textContent).toContain('Error: Oops AI failed');
    handle.unmount();
  });

  describe('regenerate briefing flow', () => {
    test('clicking Analyze All calls analyzeAllGrowspaces', async () => {
      resetAtoms();
      const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
      handle.element.store.data.$devices.set([
        { deviceId: growspace.growspaceId, name: growspace.name, plants: [] } as any,
      ]);
      handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
      await handle.element.updateComplete;

      const { analyzeAllGrowspaces } = await import('../../src/slices/ai-insight');
      const allBtn = handle.element.shadowRoot?.querySelectorAll('.md3-button')[0] as HTMLButtonElement;
      allBtn.click();
      await handle.element.updateComplete;

      expect(analyzeAllGrowspaces).toHaveBeenCalled();
      handle.unmount();
    });

    test('clicking Analyze Specific calls askGrowAdvice with selected device', async () => {
      resetAtoms();
      const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
      handle.element.store.data.$devices.set([
        { deviceId: growspace.growspaceId, name: growspace.name, plants: [] } as any,
      ]);
      handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
      (handle.element as any)._userQuery = 'test query';
      await handle.element.updateComplete;

      const { askGrowAdvice } = await import('../../src/slices/ai-insight');
      const specificBtn = handle.element.shadowRoot?.querySelectorAll('.md3-button')[1] as HTMLButtonElement;
      specificBtn.click();
      await new Promise((r) => setTimeout(r, 0));

      expect(askGrowAdvice).toHaveBeenCalledWith(growspace.growspaceId, 'test query');
      handle.unmount();
    });
  });

  test('disconnectedCallback destroys store', async () => {
    resetAtoms();
    const handle = await renderCard<GrowspaceAiInsightCard>('growspace-ai-insight-card', { hass, growspace });
    const spy = vi.spyOn(handle.element.store, 'destroy');
    handle.element.disconnectedCallback();
    expect(spy).toHaveBeenCalled();
  });

  test('gets config element correctly', async () => {
    const editor = await GrowspaceAiInsightCard.getConfigElement();
    expect(editor.tagName.toLowerCase()).toBe('growspace-ai-insight-card-editor');
  });
});
