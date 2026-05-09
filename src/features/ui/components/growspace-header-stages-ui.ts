import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DominantStageInfo } from '../../../utils/metrics-utils';
import '../../shared/ui/scroll-container';

@customElement('growspace-header-stages-ui')
export class GrowspaceHeaderStagesUI extends LitElement {
  @property({ attribute: false }) public dominant: DominantStageInfo | undefined;
  @property({ attribute: false }) public problemPlants: string[] = [];

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
      margin-right: 8px;
      flex-shrink: 0;
    }

    .gs-stage-pill.alert {
      background: rgba(244, 67, 54, 0.08);
      border-color: rgba(244, 67, 54, 0.3);
      color: #ff8a80;
    }

    .stages-wrapper {
      display: flex;
      align-items: center;
      height: 100%;
    }
  `;

  render() {
    return html`
      <scroll-container .scrollAmount=${100} containerClass="stages-scroll-area">
        <div class="stages-wrapper">
          ${this.dominant
            ? html`
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
              `
            : nothing}

          ${this.problemPlants.slice(0, 2).map(
            (name) => html`
              <div class="gs-stage-pill alert">
                ⚠ ${name}: needs attention
              </div>
            `
          )}
        </div>
      </scroll-container>
    `;
  }
}
