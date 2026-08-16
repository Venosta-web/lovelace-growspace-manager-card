/**
 * The invariant behind ADR 0036: `growspace-dialog-host` is portalled to
 * `document.body`, so it inherits nothing from the card's `:host`. Every token
 * it does declare must resolve to what it resolves to inside the card — otherwise
 * the same component renders differently depending on which subtree it is in.
 *
 * Two probe elements stand in for the two subtrees. Using probes rather than the
 * real host keeps the guard off the dialog tree's import graph; the host's own
 * test asserts that it is `portalVariables` it adopts.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { variables, portalVariables, cardOnlyTokens, token } from './variables.generated';

@customElement('token-scope-card-probe')
class CardProbe extends LitElement {
  static styles = variables;
  render() {
    return html`<span id="inner">card</span>`;
  }
}

@customElement('token-scope-portal-probe')
class PortalProbe extends LitElement {
  static styles = portalVariables;
  render() {
    return html`<span id="inner">portal</span>`;
  }
}

const readVar = (el: Element, name: string) =>
  getComputedStyle(el).getPropertyValue(name).trim().replace(/\s+/g, ' ');

/**
 * Runs `body` with the given custom properties set at `:root`, then restores what
 * was there — tests/setup.ts declares a simulated HA theme inline on the same
 * element, so removing a property outright would take the theme with it.
 */
function withRootTheme(values: Record<string, string>, body: () => void) {
  const root = document.documentElement;
  const previous = Object.keys(values).map((n) => [n, root.style.getPropertyValue(n)] as const);
  for (const [name, value] of Object.entries(values)) root.style.setProperty(name, value);
  try {
    body();
  } finally {
    for (const [name, value] of previous) {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    }
  }
}

describe('portalled dialog token scope', () => {
  let card: CardProbe;
  let portal: PortalProbe;

  beforeAll(async () => {
    card = document.createElement('token-scope-card-probe') as CardProbe;
    portal = document.createElement('token-scope-portal-probe') as PortalProbe;
    document.body.append(card, portal);
    await Promise.all([card.updateComplete, portal.updateComplete]);
  });

  afterAll(() => {
    card.remove();
    portal.remove();
  });

  const shared = (Object.keys(token) as string[]).filter(
    (name) => !(cardOnlyTokens as readonly string[]).includes(name)
  );

  it('declares every token the card declares, apart from the withheld ones', () => {
    const missing = shared.filter((name) => readVar(portal, name) === '');
    expect(missing).toEqual([]);
  });

  it('resolves every shared token to the same value in both subtrees', () => {
    // Under a theme that gives the withheld names a value of its own, any shared
    // token still referencing one would resolve through the card's declaration on
    // one side and through the theme on the other. tests/setup.ts happens to
    // simulate them at the card's own values, which would hide exactly that.
    withRootTheme(Object.fromEntries(cardOnlyTokens.map((n) => [n, 'rgb(9, 9, 9)'])), () => {
      const mismatched = shared
        .map((name) => ({ name, card: readVar(card, name), portal: readVar(portal, name) }))
        .filter((t) => t.card !== t.portal);
      expect(mismatched).toEqual([]);
    });
  });

  it('withholds exactly the names Home Assistant also defines', () => {
    expect([...cardOnlyTokens]).toEqual(['--divider-color', '--error-color']);
    // Asserted on the stylesheet, not on computed style: tests/setup.ts simulates
    // an HA theme at :root, so these names still *resolve* in the portal — from
    // the theme, which is the whole point. What must be absent is the declaration.
    for (const name of cardOnlyTokens) {
      expect(variables.cssText).toContain(`${name}:`);
      expect(portalVariables.cssText).not.toContain(`${name}:`);
    }
  });

  it('lets a Home Assistant theme win for the withheld names, but not inside the card', () => {
    const themed = 'rgb(1, 2, 3)';
    withRootTheme(Object.fromEntries(cardOnlyTokens.map((n) => [n, themed])), () => {
      for (const name of cardOnlyTokens) {
        expect(readVar(portal, name)).toBe(themed);
        expect(readVar(card, name)).toBe(token[name as keyof typeof token]);
      }
    });
  });

  it('resolves a bare token reference inside the portal subtree', () => {
    // The regression this ADR fixes: 131 bare `var(--font-size-*)` under
    // src/dialogs/ resolved to nothing, so dialog text inherited its size.
    const inner = portal.shadowRoot!.querySelector('#inner') as HTMLElement;
    inner.style.fontSize = 'var(--font-size-sm)';
    expect(getComputedStyle(inner).fontSize).toBe('14px');
  });

  it('resolves the bare dialog-accent names ADR 0038 migrated to', () => {
    // clone/batch-clone, training and both print-label dialogs now pass bare
    // references — including one straight into an inline `background-color` on a
    // button, where a name that does not resolve leaves the fill empty rather
    // than merely off-colour.
    const inner = portal.shadowRoot!.querySelector('#inner') as HTMLElement;
    const expected: Record<string, string> = {
      '--stage-clone': 'rgb(38, 198, 218)',
      '--activity-training': 'rgb(156, 39, 176)',
      '--gm-info-color': 'rgb(33, 150, 243)',
    };
    for (const [name, rgb] of Object.entries(expected)) {
      inner.style.backgroundColor = `var(${name})`;
      expect(getComputedStyle(inner).backgroundColor).toBe(rgb);
    }
  });
});

/**
 * ADR 0041: `var(--ha-name, <literal>)` renders the literal only when the theme
 * is silent about the name, which is why a fallback that contradicts the token
 * it backs is a rendering defect rather than untidiness. The probes stand in for
 * a theme that omits the names the card reads through.
 */
describe('what the card paints when the Home Assistant theme is silent', () => {
  let card: CardProbe;
  let portal: PortalProbe;

  beforeAll(async () => {
    card = document.createElement('token-scope-card-probe') as CardProbe;
    portal = document.createElement('token-scope-portal-probe') as PortalProbe;
    document.body.append(card, portal);
    await Promise.all([card.updateComplete, portal.updateComplete]);
  });

  afterAll(() => {
    card.remove();
    portal.remove();
  });

  /** tests/setup.ts declares the simulated theme inline on :root, so unsetting is a removal. */
  function withoutRootTheme(names: string[], body: () => void) {
    const root = document.documentElement;
    const previous = names.map((n) => [n, root.style.getPropertyValue(n)] as const);
    for (const name of names) root.style.removeProperty(name);
    try {
      body();
    } finally {
      for (const [name, value] of previous) if (value) root.style.setProperty(name, value);
    }
  }

  it('paints the accent Vitality Green, not a Home Assistant default blue', () => {
    withoutRootTheme(['--primary-color'], () => {
      for (const probe of [card, portal]) {
        const inner = probe.shadowRoot!.querySelector('#inner') as HTMLElement;
        inner.style.backgroundColor = 'var(--gm-primary-color)';
        expect(getComputedStyle(inner).backgroundColor).toBe('rgb(76, 175, 80)');
      }
    });
  });

  it('paints secondary text at the documented alphas', () => {
    withoutRootTheme(['--secondary-text-color'], () => {
      const inner = card.shadowRoot!.querySelector('#inner') as HTMLElement;
      inner.style.color = 'var(--text-secondary)';
      expect(getComputedStyle(inner).color).toBe('rgba(255, 255, 255, 0.7)');
      inner.style.color = 'var(--text-muted)';
      expect(getComputedStyle(inner).color).toBe('rgba(255, 255, 255, 0.55)');
    });
  });

  it('keeps the divider and error fallbacks meaningful where the card withholds them', () => {
    // The two card-only names still reach the portal only through the theme, so
    // there the fallback is what renders — it has to be the documented value.
    withoutRootTheme([...cardOnlyTokens], () => {
      const inner = portal.shadowRoot!.querySelector('#inner') as HTMLElement;
      inner.style.borderColor = 'var(--divider-color, rgba(255, 255, 255, 0.12))';
      expect(getComputedStyle(inner).borderColor).toBe('rgba(255, 255, 255, 0.12)');
      inner.style.color = 'var(--error-color, #f44336)';
      expect(getComputedStyle(inner).color).toBe('rgb(244, 67, 54)');
    });
  });
});
