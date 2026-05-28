import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AiSettingsDraft } from '../slices/ai-insight';

@customElement('gm-settings-panel')
export class GmSettingsPanel extends LitElement {
  @property({ attribute: false }) draft: AiSettingsDraft = {};

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
    }
    .section-heading {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--secondary-text-color, rgba(255,255,255,0.5));
      margin-bottom: 8px;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .field-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .field-label {
      font-size: 0.9rem;
      color: var(--primary-text-color);
    }
    .field-hint {
      font-size: 0.75rem;
      color: var(--secondary-text-color, rgba(255,255,255,0.5));
      margin-top: 2px;
    }
  `;

  private _emit() {
    this.dispatchEvent(new CustomEvent('draft-change', {
      detail: { ...this.draft },
      bubbles: true,
      composed: true,
    }));
  }

  private _patch(update: Partial<AiSettingsDraft>) {
    this.draft = { ...this.draft, ...update };
    this._emit();
  }

  render() {
    const d = this.draft;
    return html`
      <!-- Core -->
      <div class="section">
        <div class="section-heading">Core</div>
        <div class="field-row">
          <div>
            <div class="field-label">Enable AI</div>
          </div>
          <ha-switch
            .checked=${d.ai_enabled ?? false}
            @change=${(e: Event) => this._patch({ ai_enabled: (e.target as HTMLInputElement).checked })}
          ></ha-switch>
        </div>
        <div class="field-row">
          <div>
            <div class="field-label">Conversation Agent</div>
            <div class="field-hint">HA conversation entity to use</div>
          </div>
        </div>
      </div>

      <!-- Responses -->
      <div class="section">
        <div class="section-heading">Responses</div>
        <div class="field-row">
          <div class="field-label">Personality</div>
        </div>
        <div class="field-row">
          <div class="field-label">Max Response Length</div>
        </div>
      </div>

      <!-- Alerts -->
      <div class="section">
        <div class="section-heading">Alerts</div>
        <div class="field-row">
          <div>
            <div class="field-label">Auto Alerts</div>
            <div class="field-hint">Enrich triage alerts with AI reasoning</div>
          </div>
          <ha-switch
            .checked=${d.ai_auto_alerts ?? true}
            @change=${(e: Event) => this._patch({ ai_auto_alerts: (e.target as HTMLInputElement).checked })}
          ></ha-switch>
        </div>
      </div>

      <!-- Vision -->
      <div class="section">
        <div class="section-heading">Vision</div>
        <div class="field-row">
          <div>
            <div class="field-label">Vision Checkups</div>
            <div class="field-hint">AI plant health checkups via camera</div>
          </div>
          <ha-switch
            .checked=${d.vision_checkup_enabled ?? false}
            @change=${(e: Event) => this._patch({ vision_checkup_enabled: (e.target as HTMLInputElement).checked })}
          ></ha-switch>
        </div>
      </div>

      <!-- Briefings -->
      <div class="section">
        <div class="section-heading">Briefings</div>
        <div class="field-row">
          <div class="field-label">Briefing Interval (minutes)</div>
        </div>
        <div class="field-row">
          <div class="field-label">AI Task Entity</div>
        </div>
        <div class="field-row">
          <div class="field-label">Trigger Entities</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gm-settings-panel': GmSettingsPanel;
  }
}
