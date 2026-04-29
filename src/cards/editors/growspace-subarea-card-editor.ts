import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { DataService } from '../../services/data-service';
import type { Subarea } from '../../services/types';
import { sharedStyles } from '../../styles/shared.styles';
import type { GrowspaceSubareaCardConfig } from '../growspace-subarea-card';

@customElement('growspace-subarea-card-editor')
export class GrowspaceSubareaCardEditor extends LitElement implements LovelaceCardEditor {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private _config!: GrowspaceSubareaCardConfig;
    @state() private _growspaces: { id: string; name: string }[] = [];
    @state() private _subareas: Subarea[] = [];
    @state() private _loadingSubareas = false;

    private _dataService: DataService | null = null;

    public setConfig(config: GrowspaceSubareaCardConfig): void {
        this._config = config;
        this._loadGrowspaces();
        if (config.growspace_id) {
            this._loadSubareas(config.growspace_id);
        }
    }

    protected firstUpdated(): void {
        if (this._growspaces.length === 0) {
            this._loadGrowspaces();
        }
        if (this._config?.growspace_id && this._subareas.length === 0) {
            this._loadSubareas(this._config.growspace_id);
        }
    }

    protected updated(changedProps: Map<string, unknown>): void {
        if (changedProps.has('hass') && this.hass) {
            this._loadGrowspaces();
            if (this._config?.growspace_id) {
                this._loadSubareas(this._config.growspace_id);
            }
        }
    }

    private _loadGrowspaces(): void {
        if (!this.hass) return;

        const entity = this.hass.states['sensor.growspaces_list'];
        if (entity?.attributes?.growspaces) {
            const raw = entity.attributes.growspaces;
            if (Array.isArray(raw)) {
                this._growspaces = raw.map((g: any) => ({ id: g.id, name: g.name || g.id }));
            } else {
                this._growspaces = Object.entries(raw).map(([id, name]) => ({
                    id,
                    name: String(name) || id,
                }));
            }
        } else {
            this._growspaces = [];
        }
    }

    private async _loadSubareas(growspaceId: string): Promise<void> {
        if (!growspaceId || !this.hass) return;

        if (!this._dataService) {
            this._dataService = new DataService(this.hass);
        } else {
            this._dataService.updateHass(this.hass);
        }

        this._loadingSubareas = true;
        this._subareas = [];

        try {
            this._subareas = await this._dataService.getSubareas(growspaceId);
        } catch (err) {
            console.error('[GrowspaceSubareaCardEditor] Failed to load subareas:', err);
            this._subareas = [];
        } finally {
            this._loadingSubareas = false;
        }
    }

    private _computeSchema() {
        const subareaOptions = [
            { label: this._config?.growspace_id ? (this._subareas.length ? 'Select a subarea...' : 'No subareas found') : 'Select a growspace first', value: '' },
            ...this._subareas.map((sa) => ({ label: sa.name, value: sa.id }))
        ];

        return [
            {
                name: 'growspace_id',
                selector: {
                    select: {
                        options: [
                            { label: 'Select a growspace...', value: '' },
                            ...this._growspaces.map((gs) => ({ label: gs.name, value: gs.id }))
                        ],
                    },
                },
            },
            {
                name: 'subarea_id',
                selector: {
                    select: {
                        options: subareaOptions,
                    },
                },
            },
        ];
    }

    private _valueChanged(ev: CustomEvent): void {
        if (!this._config || !this.hass) return;

        const newConfig = ev.detail.value;
        const growspaceChanged = newConfig.growspace_id !== this._config.growspace_id;

        if (growspaceChanged) {
            newConfig.subarea_id = '';
            this._loadSubareas(newConfig.growspace_id);
        }

        this._config = newConfig;

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

            .info-text {
                font-size: 0.85rem;
                color: var(--secondary-text-color);
                line-height: 1.4;
            }

            .loading-text {
                font-size: 0.85rem;
                color: var(--secondary-text-color);
                font-style: italic;
            }
        `,
    ];

    protected render(): TemplateResult {
        if (!this.hass || !this._config) {
            return html``;
        }

        return html`
            <div class="card-config">
                ${this._loadingSubareas ? html`<span class="loading-text">Loading subareas...</span>` : ''}
                <ha-form
                    .hass=${this.hass}
                    .data=${this._config}
                    .schema=${this._computeSchema()}
                    .computeLabel=${(s: any) => s.name === 'growspace_id' ? 'Parent Growspace' : 'Subarea'}
                    @value-changed=${this._valueChanged}
                ></ha-form>

                <div class="info-text">
                    Displays environment sensors and device status for the selected subarea within a growspace.
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'growspace-subarea-card-editor': GrowspaceSubareaCardEditor;
    }
}
