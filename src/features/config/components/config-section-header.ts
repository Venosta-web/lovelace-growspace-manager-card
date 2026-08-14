import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/** Shared icon-and-label heading for Config Dialog sections. */
@customElement('config-section-header')
export class ConfigSectionHeader extends LitElement {
  @property() icon = '';
  @property() label = '';

  static styles = css`
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
    }

    svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      fill: var(--primary-color, #4caf50);
    }

    h3 {
      margin: 0;
      padding: 0;
      border: 0;
      color: var(--primary-text-color, #fff);
      font: inherit;
      font-size: 1rem;
      font-weight: 500;
      line-height: 1.3;
    }

    slot {
      margin-left: auto;
    }
  `;

  render(): TemplateResult {
    return html`
      <div class="section-header">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${this.icon}></path></svg>
        <h3>${this.label}</h3>
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-section-header': ConfigSectionHeader;
  }
}
