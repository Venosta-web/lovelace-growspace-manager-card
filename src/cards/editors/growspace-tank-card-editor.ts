import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from '../../lib/types/config';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('growspace-tank-card-editor')
export class GrowspaceTankCardEditor extends LitElement implements LovelaceCardEditor {
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
        if (growspaceListSensor?.attributes.growspaces) {
            const raw = growspaceListSensor.attributes.growspaces;
            if (Array.isArray(raw)) {
                this._sensorGrowspaces = raw.map((g: any) => ({ id: g.id, name: g.name || g.id }));
            } else {
                this._sensorGrowspaces = Object.entries(raw).map(([id, name]) => ({ id, name: String(name) || id }));
            }
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

        const value = (ev.target as HTMLSelectElement).value;
        if (this._default_growspace === value) return;

        this._config = { ...this._config, default_growspace: value };
        this.dispatchEvent(
            new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true,
            })
        );
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
            }
        `,
    ];

    protected render(): TemplateResult {
        if (!this.hass || !this._config) {
            return html``;
        }

        return html`
            <div class="card-config">
                <div class="select-group">
                    <label>Target Growspace</label>
                    <select .value=${this._default_growspace} @change=${this._valueChanged}>
                        <option value="" disabled ?selected=${this._default_growspace === ''}>
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
                    Displays all irrigation tanks configured for the selected growspace with live fill levels,
                    depletion status, and time remaining.
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'growspace-tank-card-editor': GrowspaceTankCardEditor;
    }
}
