import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DominantStageInfo } from '../../utils/metrics-utils';
import '../ui/scroll-container';

@customElement('growspace-header-stages')
export class GrowspaceHeaderStages extends LitElement {
  @property({ attribute: false }) public dominant: DominantStageInfo | undefined;

  static styles = css`
    :host {
      display: block;
      min-width: 0;
      width: 100%;
      height: 100%;
    }

    .gs-stage-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--primary-text-color, rgba(255, 255, 255, 0.9));
      width: fit-content;
      backdrop-filter: blur(8px);
      white-space: nowrap;
      margin-right: 8px; /* Spacing between pills */
    }

    /* Ensure pills don't shrink */
    .gs-stage-pill {
      flex-shrink: 0;
    }

    .stages-wrapper {
      /* Needed for flex layout inside scroll container */
      display: flex;
      align-items: center;
      height: 100%;
    }
  `;

  render() {
    if (!this.dominant) return html``;

    return html`
      <scroll-container .scrollAmount=${100} containerClass="stages-scroll-area">
        <div class="stages-wrapper">
          <div class="gs-stage-pill">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor">
              <path d="${this.dominant.icon}"></path>
            </svg>
            ${this.dominant.daysLabel}
          </div>
          <div class="gs-stage-pill">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor">
              <path d="${this.dominant.icon}"></path>
            </svg>
            ${this.dominant.weeksLabel}
          </div>
        </div>
      </scroll-container>
    `;
  }
}
