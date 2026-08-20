/// <reference types="vite/client" />
/**
 * The guard behind #550: a destructive button that renders in the primary accent
 * is indistinguishable from the "go ahead" button next to it, and the class that
 * was supposed to mark it (`.md3-button.error`) never existed, so the failure was
 * silent.
 *
 * The assertion is the discriminator, not an absolute colour: each destructive
 * variant must compute *differently* from its non-destructive counterpart. An
 * exact hex would pass for the wrong reason under tests/setup.ts's simulated
 * theme, and would not have caught the original bug either — there, destructive
 * and non-destructive computed the same.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { uiStyles } from './ui.styles';
import { variables } from './variables.generated';

@customElement('destructive-button-probe')
class ButtonProbe extends LitElement {
  static styles = [variables, uiStyles];
  render() {
    return html`
      <button id="primary" class="md3-button primary">primary</button>
      <button id="tonal" class="md3-button tonal">tonal</button>
      <button id="text" class="md3-button text">text</button>
      <button id="danger" class="md3-button danger">danger</button>
      <button id="tonal-danger" class="md3-button tonal danger">tonal danger</button>
      <button id="text-danger" class="md3-button text danger">text danger</button>
    `;
  }
}

describe('destructive buttons', () => {
  let probe: ButtonProbe;

  const button = (id: string) => probe.shadowRoot!.querySelector(`#${id}`) as HTMLElement;
  const paint = (id: string) => {
    const style = getComputedStyle(button(id));
    return { color: style.color, background: style.backgroundColor, border: style.borderTopWidth };
  };

  beforeAll(async () => {
    probe = document.createElement('destructive-button-probe') as ButtonProbe;
    document.body.append(probe);
    await probe.updateComplete;
  });

  afterAll(() => probe.remove());

  it.each([
    ['danger', 'primary'],
    ['tonal-danger', 'tonal'],
    ['text-danger', 'text'],
  ])('paints %s differently from its non-destructive counterpart %s', (destructive, safe) => {
    const a = paint(destructive);
    const b = paint(safe);
    expect([a.color, a.background]).not.toEqual([b.color, b.background]);
  });

  it('keeps the composed variants shaped like the variant they modify', () => {
    // The three `text danger` sites are icon-only delete buttons with inline
    // padding; inheriting the outlined `.danger` border would box them.
    expect(paint('text-danger').border).toBe(paint('text').border);
    expect(paint('tonal-danger').border).toBe(paint('tonal').border);
    expect(paint('danger').border).not.toBe(paint('primary').border);
  });

  it('leaves no destructive button reachable through a class the stylesheet ignores', () => {
    // `.md3-button.error` was the original defect: markup said destructive, CSS
    // had never heard of it, `primary` won.
    expect(uiStyles.cssText).not.toContain('.md3-button.error');
  });

  it('has no md3-button in the tree still marked with the dead modifier', async () => {
    // The defect was silent because nothing connected markup to stylesheet. This
    // is that connection: a button asking for `error` renders as whatever else
    // its class list says, so the name must not come back.
    const sources = import.meta.glob('../**/*.ts', { query: '?raw', import: 'default' });
    const offenders: string[] = [];
    for (const [path, load] of Object.entries(sources)) {
      if (/\.(test|spec)\.ts$/.test(path)) continue;
      const text = (await load()) as string;
      for (const [, classes] of text.matchAll(/class="(md3-button[^"]*)"/g)) {
        if (/\berror\b/.test(classes)) offenders.push(`${path}: ${classes}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
