import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import type { FlowerFlipChip } from '../../../src/features/shared/ui/flower-flip-chip';
import '../../../src/features/shared/ui/flower-flip-chip';
import type { FlowerFlipInfo } from '../../../src/utils/flower-flip';

const baseInfo: FlowerFlipInfo = {
  plantNames: ['Blue Dream'],
  flowerStart: '2026-05-24',
  vegDayHours: 18,
  flowerDayHours: 12,
  autoLightTracking: false,
};

describe('FlowerFlipChip', () => {
  let element: FlowerFlipChip;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('is defined', async () => {
    element = await fixture(html`<flower-flip-chip .info=${baseInfo} .growspaceId=${'gs1'}></flower-flip-chip>`);
    expect(element).toBeDefined();
  });

  it('renders a growspace-chip with warning status', async () => {
    element = await fixture(html`<flower-flip-chip .info=${baseInfo} .growspaceId=${'gs1'}></flower-flip-chip>`);
    const inner = element.shadowRoot!.querySelector('growspace-chip') as any;
    expect(inner).not.toBeNull();
    expect(inner.status).toBe('warning');
  });

  it('tooltip includes affected plant names', async () => {
    const info: FlowerFlipInfo = { ...baseInfo, plantNames: ['Blue Dream', 'OG Kush'] };
    element = await fixture(html`<flower-flip-chip .info=${info} .growspaceId=${'gs1'}></flower-flip-chip>`);
    const inner = element.shadowRoot!.querySelector('growspace-chip') as any;
    expect(inner.tooltip).toContain('Blue Dream');
    expect(inner.tooltip).toContain('OG Kush');
  });

  it('tooltip shows photoperiod transition', async () => {
    element = await fixture(html`<flower-flip-chip .info=${baseInfo} .growspaceId=${'gs1'}></flower-flip-chip>`);
    const inner = element.shadowRoot!.querySelector('growspace-chip') as any;
    expect(inner.tooltip).toContain('18h');
    expect(inner.tooltip).toContain('12h');
  });

  it('tooltip does NOT include auto-tracking note when autoLightTracking is false', async () => {
    element = await fixture(html`<flower-flip-chip .info=${baseInfo} .growspaceId=${'gs1'}></flower-flip-chip>`);
    const inner = element.shadowRoot!.querySelector('growspace-chip') as any;
    expect(inner.tooltip).not.toContain('auto');
  });

  it('tooltip includes auto-tracking note when autoLightTracking is true', async () => {
    const info: FlowerFlipInfo = { ...baseInfo, autoLightTracking: true };
    element = await fixture(html`<flower-flip-chip .info=${info} .growspaceId=${'gs1'}></flower-flip-chip>`);
    const inner = element.shadowRoot!.querySelector('growspace-chip') as any;
    expect(inner.tooltip.toLowerCase()).toContain('auto');
  });

  it('click dispatches flower-flip-click event with growspaceId and flowerStart', async () => {
    element = await fixture(html`<flower-flip-chip .info=${baseInfo} .growspaceId=${'gs1'}></flower-flip-chip>`);
    const listener = vi.fn();
    element.addEventListener('flower-flip-click', listener);

    const inner = element.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
    inner.click();

    expect(listener).toHaveBeenCalledOnce();
    const detail = listener.mock.calls[0][0].detail;
    expect(detail.growspaceId).toBe('gs1');
    expect(detail.flowerStart).toBe('2026-05-24');
  });
});
