import { LitElement, html, css, nothing, type CSSResultOrNative } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { reducedMotion } from '../../../styles/reduced-motion.styles';

/** One tab of a {@link GsTabStrip}. */
export interface TabStripTab {
  /** What the strip reports when this tab is chosen. Rendered as `data-tab`. */
  value: string;
  /** The tab's visible text, and so its accessible name. */
  label: string;
  /** An mdi path drawn before the label. Decorative: the label names the tab. */
  iconPath?: string;
  /** The tab button's `id`, for a panel's `aria-labelledby` to point at. */
  id?: string;
  /**
   * The `id` of the panel this tab shows. Carried as `aria-controls` on the
   * **selected tab only**: the strip cannot know whether an unselected tab's
   * panel is in the DOM, and a dialog that renders its panels conditionally
   * would otherwise be pointing at nothing.
   */
  controls?: string;
}

/**
 * The Tab Strip: the horizontal `tablist` a tabbed dialog places at the top of
 * its Dialog Frame's content slot.
 *
 * It owns the tabs and nothing below them. Selection is the dialog's: the strip
 * renders `selected` and dispatches a plain, non-bubbling `tab-selected` event
 * carrying `{ value }` when the user picks a different tab, and the dialog
 * decides whether that changes anything. Whether the panels render only while
 * active or stay mounted (ADR-0055) is likewise the dialog's business, which is
 * why the strip holds no panels and no slot for them. See ADR-0060.
 *
 * The strip is one Tab stop — the selected tab — and activation is automatic:
 * ←/→ move to the neighbouring tab, wrapping, Home/End jump to the ends, and
 * moving to a tab selects it. Up and Down are not the strip's; it is horizontal.
 *
 * **It renders into its own light DOM**, not a shadow root. ARIA ID references
 * do not cross shadow boundaries, and a tab's `aria-controls` and its panel's
 * `aria-labelledby` have to resolve in the same tree — the dialog's. Its styles
 * therefore cannot be `static styles` applied to a root of its own; they are
 * adopted, once, into whichever root the strip is connected in, and every rule
 * is scoped under `gs-tab-strip` so it styles nothing else there.
 */
@customElement('gs-tab-strip')
export class GsTabStrip extends LitElement {
  @property({ attribute: false }) tabs: readonly TabStripTab[] = [];
  /** The `value` of the selected tab. */
  @property({ type: String }) selected = '';
  /** The tablist's accessible name. */
  @property({ type: String }) label = '';
  /** Disables every tab, e.g. while the dialog is saving. */
  @property({ type: Boolean }) disabled = false;

  static styles = [
    css`
      gs-tab-strip {
        display: block;
        flex-shrink: 0;
        border-bottom: 1px solid var(--divider-color);
      }

      gs-tab-strip > [role='tablist'] {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: thin;
      }

      gs-tab-strip [role='tab'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 44px;
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        border-radius: 0;
        color: var(--secondary-text-color);
        cursor: pointer;
        font-family: inherit;
        font-size: var(--font-size-sm);
        font-weight: 500;
        white-space: nowrap;
        /* Not --transition-fast, which is \`all\`: the focus ring would animate in. */
        transition-property: color, background-color, border-color;
        transition-duration: var(--md3-motion-duration-short2);
        transition-timing-function: var(--md3-motion-easing-standard);
      }

      gs-tab-strip [role='tab']:hover:not(:disabled):not([aria-selected='true']) {
        color: var(--primary-text-color);
        background: var(--secondary-background-color);
      }

      gs-tab-strip [role='tab']:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -4px;
      }

      gs-tab-strip [role='tab'][aria-selected='true'] {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
      }

      gs-tab-strip [role='tab']:disabled {
        cursor: default;
        opacity: 0.5;
      }

      gs-tab-strip [role='tab'] svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        fill: currentColor;
      }
    `,
    reducedMotion,
  ];

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    adoptInto(this.getRootNode(), (this.constructor as typeof GsTabStrip).elementStyles);
  }

  /** The tab holding the Tab stop: the selected one, or the first if none is. */
  private get _stop(): string | undefined {
    return this.tabs.some((tab) => tab.value === this.selected)
      ? this.selected
      : this.tabs[0]?.value;
  }

  private _choose(value: string): void {
    if (value === this.selected) return;
    this.dispatchEvent(new CustomEvent('tab-selected', { detail: { value } }));
  }

  private _onKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const buttons = [...this.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const from = buttons.indexOf(event.target as HTMLButtonElement);
    if (from === -1) return;

    let to: number;
    switch (event.key) {
      case 'ArrowRight':
        to = (from + 1) % buttons.length;
        break;
      case 'ArrowLeft':
        to = (from - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = buttons.length - 1;
        break;
      default:
        return;
    }
    // Stopped, not merely prevented: an arrow the strip has used must not also
    // reach a dialog that gives the same key a meaning of its own.
    event.preventDefault();
    event.stopPropagation();
    buttons[to].focus();
    this._choose(this.tabs[to].value);
  }

  render() {
    const stop = this._stop;
    return html`
      <div role="tablist" aria-label=${this.label || nothing} @keydown=${this._onKeyDown}>
        ${this.tabs.map((tab) => {
          const selected = tab.value === this.selected;
          return html`
            <button
              type="button"
              role="tab"
              id=${ifDefined(tab.id)}
              data-tab=${tab.value}
              aria-selected=${selected ? 'true' : 'false'}
              aria-controls=${ifDefined(selected ? tab.controls : undefined)}
              tabindex=${tab.value === stop ? 0 : -1}
              ?disabled=${this.disabled}
              @click=${() => this._choose(tab.value)}
            >
              ${tab.iconPath
                ? html`<svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d=${tab.iconPath}></path>
                  </svg>`
                : nothing}
              <span>${tab.label}</span>
            </button>
          `;
        })}
      </div>
    `;
  }
}

/**
 * Add `styles` to the adopted sheets of `root`, once. Lit hands every instance
 * the same constructed sheet per `CSSResult`, so a second strip in the same
 * root finds its sheets present and adds nothing. The reduce-motion block this
 * brings along is unscoped, and harmless for it: it only restates, for the
 * whole dialog, what `dialogStyles` already declares there.
 */
function adoptInto(root: Node, styles: readonly CSSResultOrNative[]): void {
  if (!(root instanceof ShadowRoot || root instanceof Document)) return;
  const sheets = styles
    .map((style) => (style instanceof CSSStyleSheet ? style : style.styleSheet))
    .filter((sheet): sheet is CSSStyleSheet => !!sheet);
  const missing = sheets.filter((sheet) => !root.adoptedStyleSheets.includes(sheet));
  if (missing.length) root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...missing];
}

declare global {
  interface HTMLElementTagNameMap {
    'gs-tab-strip': GsTabStrip;
  }
}
