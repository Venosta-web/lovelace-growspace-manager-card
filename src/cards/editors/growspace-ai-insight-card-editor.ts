import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from '../../lib/types/config';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('growspace-ai-insight-card-editor')
export class GrowspaceAiInsightCardEditor extends LitElement implements LovelaceCardEditor {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private _config!: GrowspaceManagerCardConfig;
    @state() private _sensorGrowspaces: { id: string; name: string }[] = [];

    public setConfig(config: GrowspaceManagerCardConfig): void {
        this._config = config;
        this._loadGrowspaces();
    }

    private _loadGrowspaces(): void {
        if (!this.hass) return;

        const growspaceListSensor = this.hass.states['sensor.growspaces_list'];
        if (growspaceListSensor && growspaceListSensor.attributes.growspaces) {
            this._sensorGrowspaces = growspaceListSensor.attributes.growspaces.map((g: any) => ({
                id: g.id,
                name: g.name || g.id
            }));
        }
    }

    protected firstUpdated(): void {
        this._loadGrowspaces();
    }

    public get _default_growspace(): string {
        return this._config?.default_growspace || '';
    }

    private _valueChanged(ev: Event): void {
        if (!this._config || !this.hass) return;

        const target = ev.target as HTMLSelectElement;
        const value = target.value;

        if (this._default_growspace !== value) {
            this._config = {
                ...this._config,
                default_growspace: value,
            };
            this.dispatchEvent(
                new CustomEvent('config-changed', {
                    detail: { config: this._config },
                    bubbles: true,
                    composed: true,
                })
            );
        }
    }

    static styles: CSSResultGroup = [
        sharedStyles,
        css`
            .card-config {
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .select-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            select {
                padding: 8px;
                border: 1px solid var(--divider-color);
                border-radius: 4px;
                background: var(--card-background-color);
                color: var(--primary-text-color);
            }
            .info-text {
                font-size: 0.9em;
                color: var(--secondary-text-color);
                margin-top: 8px;
            }
        `
    ];

    protected render(): TemplateResult {
        if (!this.hass || !this._config) {
            return html``;
        }

        return html`
            <div class="card-config">
                <div class="select-group">
                    <label>Target Growspace</label>
                    <select
                        .value=${this._default_growspace}
                        @change=${this._valueChanged}
                    >
                        <option value="" disabled selected=${this._default_growspace === ''}>
                            Select a growspace...
                        </option>
                        ${this._sensorGrowspaces.map(
            (gs) => html`
                                <option value=${gs.id} ?selected=${this._default_growspace === gs.id}>
                                    ${gs.name}
                                </option>
                            `
        )}
                    </select>
                </div>

                <div class="info-text">
                    This card will provide AI insights and chat functionality targeted toward the selected growspace.
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'growspace-ai-insight-card-editor': GrowspaceAiInsightCardEditor;
    }
}
