import { LitElement, html, css, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiAccountGroup,
  mdiArrowLeft,
  mdiCheck,
  mdiCloudUpload,
  mdiDelete,
  mdiImage,
  mdiPencil,
} from '@mdi/js';
import { StrainEntry } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/gs-help-tooltip';

@customElement('gs-breeder-manager')
export class GsBreederManager extends LitElement {
  @property({ type: Array }) strains: StrainEntry[] = [];
  @property({ type: Boolean }) open = false;

  @state() private _editorState: { name: string; logo: string; originalName: string } | null = null;
  @state() private _pendingDelete: string | null = null;

  static styles = [
    dialogStyles,
    css`
      :host {
        --accent-green: #4caf50;
      }

      .sd-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .sd-footer {
        padding: 16px 24px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .sd-form-group {
        margin-bottom: 20px;
      }

      .sd-label {
        display: block;
        color: var(--primary-text-color, --secondary-text-color);
        font-size: 0.85rem;
        margin-bottom: 8px;
        font-weight: 500;
      }

      .sd-input {
        width: 100%;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--primary-text-color, #fff);
        font-size: 0.95rem;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }

      .sd-input:focus {
        border-color: var(--accent-green);
      }

      .breeder-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .breeder-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .breeder-card:hover {
        border-color: var(--accent-green);
        background: rgba(255, 255, 255, 0.08);
      }

      .breeder-logo-preview {
        width: 56px;
        height: 56px;
        border-radius: 8px;
        object-fit: contain;
        background: rgba(255, 255, 255, 0.05);
        padding: 4px;
        flex-shrink: 0;
      }

      .breeder-logo-placeholder {
        width: 56px;
        height: 56px;
        border-radius: 8px;
        border: 1px dashed var(--divider-color);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color);
        flex-shrink: 0;
      }

      .breeder-info {
        flex: 1;
        min-width: 0;
      }

      .breeder-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--primary-text-color, #fff);
        margin: 0 0 4px 0;
      }

      .breeder-strain-count {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }

      .breeder-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }

      .action-btn {
        background: rgba(0, 0, 0, 0.6);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        cursor: pointer;
      }

      .action-btn:hover {
        background: var(--accent-green);
      }
    `,
  ];

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('open') && !this.open) {
      this._editorState = null;
    }
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  render() {
    if (!this.open) return nothing;

    return html`
      <gs-dialog .open=${true} .heading=${'Breeder Manager'} .iconPath=${mdiAccountGroup}>
        <slot name="header-extra" slot="header-extra">
          <gs-help-tooltip
            content="Manage your breeder database and logos. Breeders can be assigned to strains to track genetics."
            placement="bottom"
            label="Breeders"
          ></gs-help-tooltip>
        </slot>

        <div class="sd-content">
          ${this._editorState ? this._renderEditor() : this._renderList()}
        </div>

        ${!this._editorState
          ? html`
              <div class="sd-footer">
                <span
                  style="font-size:0.8rem; color:var(--secondary-text-color); padding: 0 8px; flex:1;"
                >
                  Breeders appear automatically when strains with breeder info are saved.
                </span>
                <button class="md3-button tonal" @click=${this._close}>Close</button>
              </div>
            `
          : nothing}
      </gs-dialog>

      ${this._pendingDelete ? this._renderDeleteConfirmation() : nothing}
    `;
  }

  private _getUniqueBreeders(): Array<{ name: string; logo: string; strainCount: number }> {
    const breederMap = new Map<string, { logo: string; strainCount: number }>();
    this.strains.forEach((s) => {
      if (s.breeder && s.breeder.trim()) {
        const existing = breederMap.get(s.breeder);
        if (existing) {
          existing.strainCount++;
          if (!existing.logo && s.breeder_logo) {
            existing.logo = s.breeder_logo;
          }
        } else {
          breederMap.set(s.breeder, { logo: s.breeder_logo || '', strainCount: 1 });
        }
      }
    });
    return [...breederMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private _renderList(): TemplateResult {
    const breeders = this._getUniqueBreeders();
    if (breeders.length === 0) {
      return html`
        <div style="text-align:center; padding:40px; color:var(--secondary-text-color);">
          <svg style="width:48px;height:48px;fill:currentColor;opacity:0.5;" viewBox="0 0 24 24">
            <path d="${mdiAccountGroup}"></path>
          </svg>
          <p>No breeders found. Add strains with breeder info or create a new breeder.</p>
        </div>
      `;
    }

    return html`
      <div class="breeder-list">
        ${breeders.map(
          (b) => html`
            <div class="breeder-card" @click=${() => this._startEdit(b.name, b.logo)}>
              ${b.logo
                ? html`<img class="breeder-logo-preview" src="${b.logo}" alt="${b.name}" />`
                : html`<div class="breeder-logo-placeholder">
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${mdiImage}"></path>
                    </svg>
                  </div>`}
              <div class="breeder-info">
                <div class="breeder-name">${b.name}</div>
                <div class="breeder-strain-count">
                  ${b.strainCount} strain${b.strainCount !== 1 ? 's' : ''}
                </div>
              </div>
              <div class="breeder-actions">
                <button
                  class="action-btn"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._startEdit(b.name, b.logo);
                  }}
                >
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiPencil}"></path>
                  </svg>
                </button>
                <button
                  class="action-btn"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._pendingDelete = b.name;
                  }}
                  style="color:var(--error-color, #f44336);"
                >
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiDelete}"></path>
                  </svg>
                </button>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderEditor(): TemplateResult {
    const state = this._editorState!;
    const isEdit = !!state.originalName;
    const affectedStrains = isEdit
      ? this.strains.filter((s) => s.breeder === state.originalName)
      : [];

    const handleLogoUpload = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        PlantUtils.compressImage(file)
          .then((base64) => {
            this._editorState = { ...this._editorState!, logo: base64 };
          })
          .catch((err) => console.error('Error compressing logo:', err));
      }
    };

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <button
            class="md3-button tonal"
            style="padding:0 12px; height:32px;"
            @click=${() => (this._editorState = null)}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiArrowLeft}"></path>
            </svg>
            Back
          </button>
          <h3 style="margin:0; color:var(--primary-text-color);">
            ${isEdit ? 'Edit Breeder' : 'New Breeder'}
          </h3>
        </div>

        <div class="sd-form-group">
          <label class="sd-label">Breeder Name *</label>
          <input
            type="text"
            class="sd-input"
            placeholder="e.g. Royal Queen Seeds"
            .value=${state.name}
            @input=${(e: InputEvent) => {
              this._editorState = {
                ...this._editorState!,
                name: (e.target as HTMLInputElement).value,
              };
            }}
          />
        </div>

        <div class="sd-form-group">
          <label class="sd-label">Breeder Logo</label>
          <div style="display:flex; align-items:center; gap:16px;">
            ${state.logo
              ? html`<img
                  src="${state.logo}"
                  style="width:64px; height:64px; object-fit:contain; border-radius:8px; background:rgba(255,255,255,0.05); padding:4px;"
                />`
              : html`<div
                  style="width:64px; height:64px; border:1px dashed var(--divider-color); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--secondary-text-color);"
                >
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiImage}"></path>
                  </svg>
                </div>`}
            <div style="display:flex; gap:8px;">
              <button
                class="md3-button tonal"
                style="height:36px; padding:0 16px; font-size:0.85rem;"
                @click=${(e: Event) =>
                  ((e.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement).click()}
              >
                <svg
                  style="width:16px;height:16px;fill:currentColor;margin-right:6px;"
                  viewBox="0 0 24 24"
                >
                  <path d="${mdiCloudUpload}"></path>
                </svg>
                ${state.logo ? 'Change Logo' : 'Upload Logo'}
              </button>
              <input
                type="file"
                accept="image/*"
                style="display:none"
                @change=${handleLogoUpload}
              />
              ${state.logo
                ? html`
                    <button
                      class="md3-button text"
                      style="height:36px; padding:0 12px; color:var(--error-color, #ff5252);"
                      @click=${() => {
                        this._editorState = { ...this._editorState!, logo: '' };
                      }}
                    >
                      <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${mdiDelete}"></path>
                      </svg>
                    </button>
                  `
                : nothing}
            </div>
          </div>
        </div>

        ${isEdit && affectedStrains.length > 0
          ? html`
              <div
                style="background:rgba(255,255,255,0.03); border:1px solid var(--divider-color); border-radius:8px; padding:16px;"
              >
                <label class="sd-label" style="margin-bottom:8px;"
                  >Strains using this breeder (${affectedStrains.length})</label
                >
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  ${affectedStrains.map(
                    (s) => html`
                      <span
                        style="background:rgba(76,175,80,0.15); color:var(--accent-green); padding:4px 10px; border-radius:16px; font-size:0.8rem; font-weight:500;"
                      >
                        ${s.strain}${s.phenotype ? ` (${s.phenotype})` : ''}
                      </span>
                    `
                  )}
                </div>
              </div>
            `
          : nothing}

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
          <button class="md3-button tonal" @click=${() => (this._editorState = null)}>
            Cancel
          </button>
          <button
            class="md3-button primary"
            @click=${() => this._handleSave()}
            ?disabled=${!state.name.trim()}
          >
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiCheck}"></path>
            </svg>
            ${isEdit ? 'Save Changes' : 'Create Breeder'}
          </button>
        </div>
      </div>
    `;
  }

  private _renderDeleteConfirmation(): TemplateResult {
    const breederName = this._pendingDelete!;
    const affectedCount = this.strains.filter((s) => s.breeder === breederName).length;

    return html`
      <ha-dialog
        open
        @closed=${() => {
          this._pendingDelete = null;
        }}
        hideActions
        without-header
        width="large"
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div
          class="glass-dialog-container"
          style="height: auto; padding: 24px; display: flex; flex-direction: column;"
        >
          <h2 class="dialog-title">Remove Breeder?</h2>
          <p
            style="color:var(--secondary-text-color); margin:16px 0; font-size:1rem; line-height:1.5;"
          >
            This will remove <strong>"${breederName}"</strong> from ${affectedCount}
            strain${affectedCount !== 1 ? 's' : ''}. The strains themselves will not be deleted.
          </p>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
            <button
              class="md3-button tonal"
              @click=${() => {
                this._pendingDelete = null;
              }}
            >
              Cancel
            </button>
            <button
              class="md3-button text"
              style="color:#f44336;"
              @click=${() => this._confirmDelete()}
            >
              <svg
                style="width:18px;height:18px;fill:currentColor;margin-right:8px;"
                viewBox="0 0 24 24"
              >
                <path d="${mdiDelete}"></path>
              </svg>
              Remove
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private _startEdit(name?: string, logo?: string) {
    this._editorState = { name: name || '', logo: logo || '', originalName: name || '' };
  }

  private _handleSave() {
    const state = this._editorState;
    if (!state || !state.name.trim()) return;

    const newName = state.name.trim();
    const isEdit = !!state.originalName;

    if (isEdit) {
      this.dispatchEvent(
        new CustomEvent('update-breeder', {
          detail: { oldName: state.originalName, newName, logo: state.logo },
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent('save-breeder', {
          detail: { name: newName, logo: state.logo },
        })
      );
    }

    this._editorState = null;
  }

  private _confirmDelete() {
    if (this._pendingDelete) {
      this.dispatchEvent(
        new CustomEvent('delete-breeder', {
          detail: { name: this._pendingDelete },
        })
      );
      this._pendingDelete = null;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gs-breeder-manager': GsBreederManager;
  }
}
