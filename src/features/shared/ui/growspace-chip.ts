import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiLink } from '@mdi/js';
import { sharedStyles } from '../../../styles/shared.styles';
import { statusTokens } from '../../../styles/status.styles';
import { StatusLevel, STATUS_CUES, toStatusLevel } from '../../environment/constants';

@customElement('growspace-chip')
export class GrowspaceChip extends LitElement {
  @property({ type: String }) icon = '';
  @property({ type: String }) label = '';
  @property({ type: String }) value: string | number | undefined = undefined;
  @property({ type: Array }) multiValues: string[] | undefined = undefined;
  @property({ type: String }) status: StatusLevel | '' = '';
  @property({ type: Boolean, reflect: true }) active = false;
  @property({ type: Boolean }) linked = false;
  @property({ type: String }) tooltip = '';
  @property({ type: Boolean }) toggle = false;
  @property({ type: String }) actionLabel = '';

  static styles = [
    sharedStyles,
    statusTokens,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        position: relative;
        -webkit-tap-highlight-color: transparent;
      }

      .stat-chip {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--glass-bg);
        border: var(--glass-border);
        border-radius: 12px;
        padding: 8px 16px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--primary-text-color, rgba(255, 255, 255, 0.9));
        backdrop-filter: var(--glass-blur);
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        user-select: none;
        flex-shrink: 0;
        white-space: nowrap;
        touch-action: auto;
        font: inherit;
        text-align: start;
      }

      .stat-chip:focus-visible,
      .link-icon:focus-visible {
        outline: 2px solid var(--primary-color, #4caf50);
        outline-offset: 2px;
      }

      .stat-chip.has-link {
        padding-inline-end: 32px;
      }

      /*
       * Status styling. Text stays at --primary-text-color in every level so it
       * survives a light Home Assistant theme; the status hue is carried by the
       * outline, the fill, and the .status-cue icon beside it.
       */
      @keyframes pulse-danger {
        0% {
          box-shadow: 0 0 0 0 var(--gm-status-danger-outline);
        }
        70% {
          box-shadow: 0 0 0 10px transparent;
        }
        100% {
          box-shadow: 0 0 0 0 transparent;
        }
      }

      /*
       * !important is load-bearing: .stat-chip:hover is declared later and
       * :host([active]) .stat-chip outranks these on specificity, so without it a
       * hovered or active chip silently drops its status tint.
       */
      .stat-chip.status-optimal {
        border-color: var(--gm-status-optimal-outline) !important;
        background: var(--gm-status-optimal-fill) !important;
      }

      .stat-chip.status-warning {
        border-color: var(--gm-status-warning-outline) !important;
        background: var(--gm-status-warning-fill) !important;
      }

      /*
       * Danger differs from warning by cue icon and word, not by hue — so the two
       * stay distinguishable with the pulse stopped and with color removed. The
       * heavier outline is a third, redundant signal.
       */
      .stat-chip.status-danger {
        border-color: var(--gm-status-danger-outline) !important;
        border-width: 2px;
        /* Absorbs the extra border so the chip keeps its 8px/16px box. */
        padding: 7px 15px;
        background: var(--gm-status-danger-fill) !important;
        animation: pulse-danger 2s infinite;
      }

      .stat-chip.status-danger.has-link {
        padding-inline-end: 31px;
      }

      .stat-chip:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
        border-color: var(--divider-color, rgba(255, 255, 255, 0.2));
        transform: translateY(-1px);
      }

      :host([active]) .stat-chip {
        background: color-mix(
          in srgb,
          var(--gm-primary-color) 15%,
          var(--glass-bg, rgba(255, 255, 255, 0.05))
        );
        border-color: var(--gm-primary-color);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        color: var(--primary-text-color, #fff);
      }

      .icon {
        width: 18px;
        height: 18px;
        display: flex;
      }

      .icon svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
        opacity: 0.8;
        pointer-events: none;
      }

      .link-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        position: absolute;
        inset-inline-end: 8px;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0.8;
        cursor: pointer;
        color: var(--gm-primary-color);
        padding: 0;
        border: 0;
        background: transparent;
      }

      .link-icon svg {
        width: 100%;
        height: 100%;
        fill: var(--gm-primary-color);
      }

      /* Respect user motion preferences (WCAG 2.3.3) */
      @media (prefers-reduced-motion: reduce) {
        .stat-chip {
          transition: none;
        }

        .stat-chip:hover {
          transform: none;
        }

        .stat-chip.status-danger {
          animation: none;
        }
      }
    `,
  ];

  /**
   * The non-color signal. Optimal shows the icon alone — a quiet chip stays quiet —
   * while warning and danger add the word, so the two levels a reader must tell
   * apart never rely on hue or on the pulse animation to differ.
   */
  private _renderStatusCue() {
    const level = toStatusLevel(this.status);
    if (!level) return nothing;

    const cue = STATUS_CUES[level];
    return html`
      <span class="status-cue status-${level}">
        <svg viewBox="0 0 24 24"><path d="${cue.icon}"></path></svg>
        ${level === StatusLevel.OPTIMAL ? nothing : html`<span>${cue.label}</span>`}
      </span>
    `;
  }

  render() {
    // Determine classes based on meaningful status string
    const statusClass = this.status ? `status-${this.status}` : '';

    return html`
      <button
        class="stat-chip ${statusClass} ${this.linked ? 'has-link' : ''}"
        title="${this.tooltip}"
        type="button"
        aria-label=${this.actionLabel || nothing}
        aria-pressed=${this.toggle ? String(this.active) : nothing}
      >
        <div class="icon">
          <svg viewBox="0 0 24 24"><path d="${this.icon}"></path></svg>
        </div>
        ${this.label ? html`${this.label}: ` : ''}${this.multiValues && this.multiValues.length > 0
          ? html`<div style="display: flex; align-items: center; gap: 8px;">
              ${this.multiValues.map(
                (val, idx) =>
                  html`${idx > 0
                      ? html`<div
                          style="width: 1px; height: 12px; background: rgba(255,255,255,0.2);"
                        ></div>`
                      : ''}<span>${val}</span>`
              )}
            </div>`
          : this.value}
        ${this._renderStatusCue()}
      </button>
      ${this.linked
        ? html`
            <button
              class="link-icon"
              @click=${this._handleLinkClick}
              title="Unlink Graph"
              aria-label="Unlink ${this.label || 'metric'} graph"
              type="button"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${mdiLink}"></path></svg>
            </button>
          `
        : nothing}
    `;
  }

  private _handleLinkClick(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('unlink', { bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-chip': GrowspaceChip;
  }
}
