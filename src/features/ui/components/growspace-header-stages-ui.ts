import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DominantStageInfo } from '../../../utils/metrics-utils';
import '../../shared/ui/scroll-container';

@customElement('growspace-header-stages-ui')
export class GrowspaceHeaderStagesUI extends LitElement {
  @property({ attribute: false }) public dominant: DominantStageInfo | undefined;
  @property({ type: Boolean }) public lightOn: boolean | undefined;
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

    .gs-stage-pill.light-on {
      background: rgba(255, 235, 59, 0.08);
      border-color: rgba(255, 235, 59, 0.25);
      color: #fff176;
    }

    .gs-stage-pill.light-off {
      background: rgba(100, 100, 100, 0.08);
      border-color: rgba(255, 255, 255, 0.12);
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
    }

    .gs-stage-pill.alert {
      background: rgba(244, 67, 54, 0.08);
      border-color: rgba(244, 67, 54, 0.3);
      color: #ff8a80;
    }

    .light-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
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
          ${this.lightOn !== undefined
            ? html`
                <div class="gs-stage-pill ${this.lightOn ? 'light-on' : 'light-off'}">
                  <span class="light-dot"></span>
                  ${this.lightOn ? 'Lights ON' : 'Lights OFF'}
                </div>
              `
            : nothing}

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
