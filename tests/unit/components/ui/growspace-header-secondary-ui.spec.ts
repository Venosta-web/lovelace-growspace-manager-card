import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import type { GrowspaceHeaderSecondaryUI } from '../../../../src/features/ui/components/growspace-header-secondary-ui';
import '../../../../src/features/ui/components/growspace-header-secondary-ui';
import type { FlowerFlipInfo } from '../../../../src/utils/flower-flip';

const OPTIMAL_CHIP = { key: 'optimal', icon: 'test-icon', label: '', value: 'Optimal', status: 'optimal', active: false, linked: false, tooltip: '', groupIndex: 0 };
const DLI_CHIP = { key: 'dli', icon: 'test-icon', label: '', value: '30', status: '', active: false, linked: false, tooltip: '', groupIndex: 0 };

const baseInfo: FlowerFlipInfo = {
  plantNames: ['Blue Dream'],
  flowerStart: '2026-05-24',
  vegDayHours: 18,
  flowerDayHours: 12,
  autoLightTracking: false,
};

async function renderStrip(chips: any[], flowerFlipInfo: FlowerFlipInfo | null = null) {
  const el: GrowspaceHeaderSecondaryUI = await fixture(html`
    <growspace-header-secondary-ui
      .chips=${chips}
      .flowerFlipInfo=${flowerFlipInfo}
      .growspaceId=${'gs1'}
    ></growspace-header-secondary-ui>
  `);
  return el;
}

describe('GrowspaceHeaderSecondaryUI – FlowerFlipChip', () => {
  afterEach(() => vi.clearAllMocks());

  it('does NOT render flower-flip-chip when flowerFlipInfo is null', async () => {
    const el = await renderStrip([OPTIMAL_CHIP, DLI_CHIP], null);
    const chip = el.shadowRoot!.querySelector('flower-flip-chip');
    expect(chip).toBeNull();
  });

  it('renders flower-flip-chip when flowerFlipInfo is set', async () => {
    const el = await renderStrip([OPTIMAL_CHIP, DLI_CHIP], baseInfo);
    const chip = el.shadowRoot!.querySelector('flower-flip-chip');
    expect(chip).not.toBeNull();
  });

  it('places flower-flip-chip immediately before the optimal chip', async () => {
    const el = await renderStrip([DLI_CHIP, OPTIMAL_CHIP], baseInfo);
    const strip = el.shadowRoot!.querySelector('.secondary-strip')!;
    const children = Array.from(strip.children);

    const flipIdx = children.findIndex((c) => c.tagName.toLowerCase() === 'flower-flip-chip');
    const optimalIdx = children.findIndex(
      (c) => c.tagName.toLowerCase() === 'growspace-chip' && (c as any).value === 'Optimal'
    );

    expect(flipIdx).toBeGreaterThanOrEqual(0);
    expect(flipIdx).toBe(optimalIdx - 1);
  });

  it('forwards flower-flip-click event with bubbles', async () => {
    const el = await renderStrip([OPTIMAL_CHIP], baseInfo);
    const listener = vi.fn();
    el.addEventListener('flower-flip-click', listener);

    const chip = el.shadowRoot!.querySelector('flower-flip-chip') as HTMLElement;
    chip.dispatchEvent(
      new CustomEvent('flower-flip-click', {
        detail: { growspaceId: 'gs1', flowerStart: '2026-05-24' },
        bubbles: true,
        composed: true,
      })
    );

    expect(listener).toHaveBeenCalledOnce();
  });
});
