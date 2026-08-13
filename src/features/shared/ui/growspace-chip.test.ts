import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { StatusLevel } from '../../environment/constants';
import './growspace-chip';

const DOT_ICON = 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z';

async function renderChip(status: string): Promise<ShadowRoot> {
  const el = await fixture(
    html`<growspace-chip
      icon="${DOT_ICON}"
      label="pH"
      value="6.5"
      status="${status}"
    ></growspace-chip>`
  );
  return el.shadowRoot!;
}

/** The cue's icon path and word — the two signals that survive without color. */
function cueOf(root: ShadowRoot): { icon: string | null; text: string } {
  const cue = root.querySelector('.status-cue');
  return {
    icon: cue?.querySelector('path')?.getAttribute('d') ?? null,
    text: cue?.textContent?.trim() ?? '',
  };
}

/**
 * The declarations a selector receives inside `@media (prefers-reduced-motion: reduce)`.
 * Read as parsed style rather than CSS text — Chrome re-serializes `animation: none`
 * into its longhand form, so a text match would be checking the wrong thing.
 */
function reducedMotionStyle(root: ShadowRoot, selector: string): CSSStyleDeclaration | undefined {
  return Array.from(root.adoptedStyleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .filter(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText.includes('prefers-reduced-motion')
    )
    .flatMap((media) => Array.from(media.cssRules))
    .find(
      (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === selector
    )?.style;
}

describe('growspace-chip – status is perceivable without color', () => {
  it.each([StatusLevel.OPTIMAL, StatusLevel.WARNING, StatusLevel.DANGER])(
    'renders a persistent non-color cue for %s',
    async (status) => {
      const { icon } = cueOf(await renderChip(status));
      expect(icon).toBeTruthy();
    }
  );

  it('renders no cue when the chip carries no status', async () => {
    expect(cueOf(await renderChip('')).icon).toBeNull();
  });

  it('keeps warning and danger distinguishable by icon alone', async () => {
    const warning = cueOf(await renderChip(StatusLevel.WARNING));
    const danger = cueOf(await renderChip(StatusLevel.DANGER));
    expect(warning.icon).not.toBe(danger.icon);
  });

  it('keeps warning and danger distinguishable by word alone', async () => {
    expect(cueOf(await renderChip(StatusLevel.WARNING)).text).toBe('Warning');
    expect(cueOf(await renderChip(StatusLevel.DANGER)).text).toBe('Critical');
  });

  it('leaves optimal icon-only so a healthy chip stays quiet', async () => {
    expect(cueOf(await renderChip(StatusLevel.OPTIMAL)).text).toBe('');
  });

  it('reads status text at the primary text color in every level', async () => {
    // A status hue on the text itself would invert to unreadable under a light
    // Home Assistant theme; the hue belongs on the outline, fill, and cue icon.
    const root = await renderChip(StatusLevel.DANGER);
    const chip = root.querySelector('.stat-chip') as HTMLElement;
    const cue = root.querySelector('.status-cue') as HTMLElement;
    expect(getComputedStyle(cue).color).toBe(getComputedStyle(chip).color);
  });
});

describe('growspace-chip – status tint survives other states', () => {
  // .stat-chip:hover is declared after the status rules and :host([active])
  // outranks them, so both states can silently erase the tint.
  it.each([StatusLevel.OPTIMAL, StatusLevel.WARNING, StatusLevel.DANGER])(
    'keeps the %s outline when the chip is hovered',
    async (status) => {
      const root = await renderChip(status);
      const chip = root.querySelector('.stat-chip') as HTMLElement;
      const resting = getComputedStyle(chip).borderTopColor;

      const hover = Array.from(root.adoptedStyleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .find(
          (rule): rule is CSSStyleRule =>
            rule instanceof CSSStyleRule && rule.selectorText === '.stat-chip:hover'
        );
      // The hover rule must not out-rank the status border, which is !important.
      expect(hover?.style.getPropertyPriority('border-color')).toBe('');
      expect(resting).not.toBe('rgba(0, 0, 0, 0)');
    }
  );

  it('keeps the danger tint when the chip is also active', async () => {
    const el = await fixture(
      html`<growspace-chip
        icon="${DOT_ICON}"
        label="Tank"
        value="4%"
        status="${StatusLevel.DANGER}"
        active
      ></growspace-chip>`
    );
    const chip = el.shadowRoot!.querySelector('.stat-chip') as HTMLElement;
    const plain = await renderChip(StatusLevel.DANGER);
    const plainChip = plain.querySelector('.stat-chip') as HTMLElement;
    expect(getComputedStyle(chip).borderTopColor).toBe(getComputedStyle(plainChip).borderTopColor);
  });
});

describe('growspace-chip – reduced motion', () => {
  it('stops the danger pulse when reduced motion is requested', async () => {
    const root = await renderChip(StatusLevel.DANGER);
    expect(reducedMotionStyle(root, '.stat-chip.status-danger')?.animationName).toBe('none');
  });

  it('stops the hover lift when reduced motion is requested', async () => {
    const root = await renderChip(StatusLevel.WARNING);
    expect(reducedMotionStyle(root, '.stat-chip:hover')?.transform).toBe('none');
  });

  it('still distinguishes danger from warning with the pulse stopped', async () => {
    // The pulse is decoration: the outline weight carries the same split.
    const warning = await renderChip(StatusLevel.WARNING);
    const danger = await renderChip(StatusLevel.DANGER);
    const width = (root: ShadowRoot) =>
      getComputedStyle(root.querySelector('.stat-chip') as HTMLElement).borderTopWidth;
    expect(width(warning)).not.toBe(width(danger));
  });
});
