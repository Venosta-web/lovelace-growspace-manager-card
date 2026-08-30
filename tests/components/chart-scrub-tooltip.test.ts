/**
 * `<chart-scrub-tooltip>` — the one scrub readout of the [[Env Graph]] family.
 *
 * There used to be two, and a grower got whichever one their metric happened to
 * fall into: one spoke the locale's clock and the other a forced 24-hour one,
 * one printed the moment as a heading and the other prefixed every row with it,
 * and their cursors were drawn differently thick (#866). This file specifies the
 * component itself; the two entry points reaching it are covered in
 * `env-chart.test.ts` and `metric-combo-chart.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../src/features/environment/components/chart-scrub-tooltip';
import type { ChartScrubTooltip } from '../../src/features/environment/components/chart-scrub-tooltip';

/** 14:32 local, so the rendered clock is the locale's doing and not the zone's. */
const AT = new Date(2026, 0, 1, 14, 32).getTime();

async function mount(props: Partial<ChartScrubTooltip> = {}): Promise<ChartScrubTooltip> {
  const parent = await fixture(html`
    <div style="position:relative;width:400px;height:200px">
      <chart-scrub-tooltip
        .position=${props.position ?? 0.5}
        .time=${props.time ?? AT}
        .locale=${props.locale}
        .rows=${props.rows ?? [{ title: 'Temperature', value: '22.0 °C', color: 'tomato' }]}
      ></chart-scrub-tooltip>
    </div>
  `);
  const element = parent.querySelector('chart-scrub-tooltip') as ChartScrubTooltip;
  await element.updateComplete;
  return element;
}

describe('chart-scrub-tooltip', () => {
  describe('the clock it speaks', () => {
    it('follows a 12-hour locale rather than forcing a 24-hour one', async () => {
      const element = await mount({ locale: 'en-US' });

      expect(element.shadowRoot!.querySelector('.chart-scrub-time')!.textContent).toMatch(
        /2:32\s*PM/i
      );
    });

    it('follows a 24-hour locale', async () => {
      const element = await mount({ locale: 'de-DE' });

      const heading = element.shadowRoot!.querySelector('.chart-scrub-time')!.textContent!;
      expect(heading).toContain('14:32');
      expect(heading).not.toMatch(/AM|PM/i);
    });
  });

  describe('the moment, stated once', () => {
    it('heads the readout rather than prefixing every row', async () => {
      const element = await mount({
        rows: [
          { title: 'Temperature', value: '22.0 °C' },
          { title: 'Exhaust duty', value: '80.0%', interval: { startTime: AT, endTime: AT + 1 } },
          { title: 'VPD optimal', value: '0.8 kPa–1.2 kPa' },
        ],
        locale: 'de-DE',
      });

      const readout = element.shadowRoot!;
      expect(readout.querySelectorAll('.chart-scrub-time')).toHaveLength(1);
      const rows = readout.querySelectorAll('.chart-scrub-row');
      expect(rows).toHaveLength(3);
      for (const row of rows) expect(row.textContent).not.toMatch(/\d{1,2}:\d{2}/);
    });

    it('tells a moment row and an interval row apart by the shape of their swatch', async () => {
      const element = await mount({
        rows: [
          { title: 'Temperature', value: '22.0 °C', color: 'tomato' },
          {
            title: 'Exhaust duty',
            value: '80.0%',
            color: 'cyan',
            interval: { startTime: AT, endTime: AT + 3_600_000 },
          },
        ],
      });

      const [moment, interval] = element.shadowRoot!.querySelectorAll('.chart-scrub-swatch');
      expect(moment.classList.contains('is-interval')).toBe(false);
      expect(interval.classList.contains('is-interval')).toBe(true);

      // A dot for a point on a trace, a bar for the bucket it was averaged over
      // — the shape each row was read off in the pane below.
      const dot = getComputedStyle(moment);
      const bar = getComputedStyle(interval);
      expect(dot.width).toBe(dot.height);
      expect(parseFloat(bar.width)).toBeGreaterThan(parseFloat(bar.height));
    });

    it('carries the series hue on the swatch and leaves the words readable', async () => {
      // The rule #857 settled for the legend: a swatch takes the hue so body
      // text does not have to fight the ground for contrast.
      const element = await mount({
        rows: [{ title: 'Temperature', value: '22.0 °C', color: 'rgb(255, 99, 71)' }],
      });

      const row = element.shadowRoot!.querySelector('.chart-scrub-row')!;
      expect(getComputedStyle(row.querySelector('.chart-scrub-swatch')!).backgroundColor).toBe(
        'rgb(255, 99, 71)'
      );
      expect(getComputedStyle(row).color).not.toBe('rgb(255, 99, 71)');
    });
  });

  describe('the cursor', () => {
    it('is one hairline and nothing beside it', async () => {
      // The inline readout used to set a 1px background *and* a 1px dashed
      // left border on the same element, so it drew 2px wide with a solid line
      // beside the dashes (#866).
      const element = await mount();

      const cursors = element.shadowRoot!.querySelectorAll('.chart-scrub-cursor');
      expect(cursors).toHaveLength(1);

      const style = getComputedStyle(cursors[0]);
      expect(style.borderLeftWidth).toBe('1px');
      expect(style.borderLeftStyle).toBe('dashed');
      expect(style.width).toBe('0px');
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('stands at the scrubbed position, with the readout, and clamps to the pane', async () => {
      const element = await mount({ position: 1.4 });

      const readout = element.shadowRoot!.querySelector<HTMLElement>('.chart-scrub-tooltip')!;
      const cursor = element.shadowRoot!.querySelector<HTMLElement>('.chart-scrub-cursor')!;
      expect(cursor.style.left).toBe('100%');
      expect(readout.style.left).toBe('100%');
    });
  });
});
