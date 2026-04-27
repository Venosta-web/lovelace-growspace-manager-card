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
        this._loadGrowspaces();
        if (this._config?.growspace_id) {
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

    private _onGrowspaceChanged(ev: Event): void {
        if (!this._config || !this.hass) return;

        const growspaceId = (ev.target as HTMLSelectElement).value;
        if (this._config.growspace_id === growspaceId) return;

        this._config = { ...this._config, growspace_id: growspaceId, subarea_id: '' };
        this._dispatchConfigChanged();
        this._loadSubareas(growspaceId);
    }

    private _onSubareaChanged(ev: Event): void {
        if (!this._config || !this.hass) return;

        const subareaId = (ev.target as HTMLSelectElement).value;
        if (this._config.subarea_id === subareaId) return;

        this._config = { ...this._config, subarea_id: subareaId };
        this._dispatchConfigChanged();
    }

    private _dispatchConfigChanged(): void {
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

            label {
                font-size: 0.875rem;
                font-weight: 500;
                color: var(--secondary-text-color);
            }

            select {
                padding: 8px;
                border: 1px solid var(--divider-color);
                border-radius: 4px;
                background: var(--card-background-color);
                color: var(--primary-text-color);
                font-size: 0.9rem;
            }

            select:disabled {
                opacity: 0.5;
                cursor: not-allowed;
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

        const growspaceId = this._config.growspace_id || '';
        const subareaId = this._config.subarea_id || '';

        return html`
            <div class="card-config">
                <div class="select-group">
                    <label>Parent Growspace</label>
                    <select .value=${growspaceId} @change=${this._onGrowspaceChanged}>
                        <option value="" disabled ?selected=${growspaceId === ''}>
                            Select a growspace...
                        </option>
                        ${this._growspaces.map(
                            (gs) => html`
                                <option value=${gs.id} ?selected=${growspaceId === gs.id}>
                                    ${gs.name}
                                </option>
                            `
                        )}
                    </select>
                </div>

                <div class="select-group">
                    <label>Subarea</label>
                    ${this._loadingSubareas
                        ? html`<span class="loading-text">Loading subareas...</span>`
                        : html`
                              <select
                                  .value=${subareaId}
                                  ?disabled=${!growspaceId}
                                  @change=${this._onSubareaChanged}
                              >
                                  <option value="" disabled ?selected=${subareaId === ''}>
                                      ${growspaceId
                                          ? this._subareas.length
                                              ? 'Select a subarea...'
                                              : 'No subareas found'
                                          : 'Select a growspace first'}
                                  </option>
                                  ${this._subareas.map(
                                      (sa) => html`
                                          <option value=${sa.id} ?selected=${subareaId === sa.id}>
                                              ${sa.name}
                                          </option>
                                      `
                                  )}
                              </select>
                          `}
                </div>

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
