import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { AiSettingsDraft } from '../slices/ai-insight';
import '../features/shared/ui/md3-select';
import '../features/shared/ui/md3-number-input';
import '../features/shared/ui/md3-switch';
import '../features/shared/ui/md3-entity-input';
import '../features/shared/ui/md3-entities-input';
import type { SelectOption } from '../features/shared/ui/md3-select';

const PERSONALITY_OPTIONS: SelectOption[] = [
  'Standard',
  'Scientific',
  'Chill Stoner',
  'Strict Coach',
  'Pirate',
];

@customElement('gm-settings-panel')
export class GmSettingsPanel extends LitElement {
  @property({ attribute: false }) draft: AiSettingsDraft = {};
  @property({ attribute: false }) hass: HomeAssistant | undefined;

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
    md3-entity-input,
    md3-entities-input,
    md3-select,
    md3-number-input {
      flex: 1;
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
          <md3-switch
            data-field="ai_enabled"
            .checked=${d.ai_enabled ?? false}
            @change=${(e: CustomEvent) => this._patch({ ai_enabled: e.detail.checked })}
          ></md3-switch>
        </div>
        <div class="field-row">
          <div>
            <div class="field-label">Conversation Agent</div>
            <div class="field-hint">HA conversation entity to use</div>
          </div>
          <md3-entity-input
            data-field="assistant_id"
            label="Conversation Agent"
            .hass=${this.hass}
            .value=${d.assistant_id ?? ''}
            .domains=${['conversation']}
            @change=${(e: CustomEvent) => this._patch({ assistant_id: e.detail ?? null })}
          ></md3-entity-input>
        </div>
      </div>

      <!-- Responses -->
      <div class="section">
        <div class="section-heading">Responses</div>
        <div class="field-row">
          <div class="field-label">Personality</div>
          <md3-select
            data-field="notification_personality"
            .value=${d.notification_personality ?? 'Standard'}
            .options=${PERSONALITY_OPTIONS}
            @change=${(e: CustomEvent) => this._patch({ notification_personality: e.detail })}
          ></md3-select>
        </div>
        <div class="field-row">
          <div class="field-label">Max Response Length</div>
          <md3-number-input
            data-field="max_response_length"
            label="Characters"
            .value=${d.max_response_length ?? 250}
            @change=${(e: CustomEvent) => this._patch({ max_response_length: Number(e.detail) })}
          ></md3-number-input>
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
          <md3-switch
            data-field="ai_auto_alerts"
            .checked=${d.ai_auto_alerts ?? true}
            @change=${(e: CustomEvent) => this._patch({ ai_auto_alerts: e.detail.checked })}
          ></md3-switch>
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
          <md3-switch
            data-field="vision_checkup_enabled"
            .checked=${d.vision_checkup_enabled ?? false}
            @change=${(e: CustomEvent) => this._patch({ vision_checkup_enabled: e.detail.checked })}
          ></md3-switch>
        </div>
      </div>

      <!-- Briefings -->
      <div class="section">
        <div class="section-heading">Briefings</div>
        <div class="field-row">
          <div class="field-label">Briefing Interval (minutes)</div>
          <md3-number-input
            data-field="briefing_interval_minutes"
            label="Minutes"
            .min=${5}
            .max=${1440}
            .value=${d.briefing_interval_minutes ?? 30}
            @change=${(e: CustomEvent) => this._patch({ briefing_interval_minutes: Number(e.detail) })}
          ></md3-number-input>
        </div>
        <div class="field-row">
          <div class="field-label">AI Task Entity</div>
          <md3-entity-input
            data-field="ai_task_entity_id"
            label="AI Task Entity"
            .hass=${this.hass}
            .value=${d.ai_task_entity_id ?? ''}
            .domains=${['ai_task']}
            @change=${(e: CustomEvent) => this._patch({ ai_task_entity_id: e.detail ?? null })}
          ></md3-entity-input>
        </div>
        <div class="field-row">
          <div class="field-label">Trigger Entities</div>
          <md3-entities-input
            data-field="briefing_trigger_entities"
            label="Trigger Entities"
            .hass=${this.hass}
            .value=${d.briefing_trigger_entities ?? []}
            @change=${(e: CustomEvent) => this._patch({ briefing_trigger_entities: e.detail ?? [] })}
          ></md3-entities-input>
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
