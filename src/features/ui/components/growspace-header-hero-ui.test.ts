import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { StatusLevel } from '../../environment/constants';
import type { HeaderChip } from '../../../slices/header-metrics';
import type { GrowspaceDevice } from '../../../types';
import './growspace-header-hero-ui';

const DEVICE = { deviceId: 'gs1', name: 'Tent A', plants: [] } as unknown as GrowspaceDevice;

function chip(status?: string): HeaderChip {
  return {
    key: 'vpd',
    icon: 'M12,2 L12,22',
    label: 'VPD',
    value: '1.1',
    status,
    active: false,
    linked: false,
    groupIndex: -1,
  };
}

async function renderHero(status?: string): Promise<ShadowRoot> {
  const el = await fixture(
    html`<growspace-header-hero-ui
      .device=${DEVICE}
      .chips=${[chip(status)]}
      .historyCache=${{}}
    ></growspace-header-hero-ui>`
  );
  return el.shadowRoot!;
}

function badgeOf(
  root: ShadowRoot
): { className: string; icon: string | null; text: string } | null {
  const badge = root.querySelector('.hero-status-badge');
  if (!badge) return null;
  return {
    className: badge.className,
    icon: badge.querySelector('path')?.getAttribute('d') ?? null,
    text: badge.textContent?.trim() ?? '',
  };
}

describe('growspace-header-hero-ui – status badge', () => {
  it.each([
    [StatusLevel.OPTIMAL, 'OK'],
    [StatusLevel.WARNING, 'Warning'],
    [StatusLevel.DANGER, 'Critical'],
  ])('labels %s as "%s"', async (status, label) => {
    expect(badgeOf(await renderHero(status))?.text).toBe(label);
  });

  it.each([StatusLevel.OPTIMAL, StatusLevel.WARNING, StatusLevel.DANGER])(
    'pairs %s with a cue icon',
    async (status) => {
      expect(badgeOf(await renderHero(status))?.icon).toBeTruthy();
    }
  );

  it('renders no badge when the chip carries no status', async () => {
    expect(badgeOf(await renderHero(undefined))).toBeNull();
  });

  it.each([StatusLevel.OPTIMAL, StatusLevel.WARNING, StatusLevel.DANGER])(
    'keys %s off the real status vocabulary so the badge is actually styled',
    async (status) => {
      // Regression: the badge classes were status-ok / status-error while every
      // producer emits optimal / warning / danger, so two levels rendered bare.
      const badge = badgeOf(await renderHero(status));
      expect(badge?.className).toContain(`status-${status}`);
      const el = (await renderHero(status)).querySelector('.hero-status-badge') as HTMLElement;
      expect(getComputedStyle(el).borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  );

  it('keeps warning and danger distinguishable by icon and word alone', async () => {
    const warning = badgeOf(await renderHero(StatusLevel.WARNING));
    const danger = badgeOf(await renderHero(StatusLevel.DANGER));
    expect(warning?.icon).not.toBe(danger?.icon);
    expect(warning?.text).not.toBe(danger?.text);
  });
});
