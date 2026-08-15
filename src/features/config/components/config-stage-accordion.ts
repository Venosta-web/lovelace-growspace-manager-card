/**
 * Shared controlled disclosure list for stage-based configuration editors.
 *
 * Consumers provide the stage rows and project their stage-specific summary and
 * editor into the named slots returned by the helpers below. Toggling a header
 * emits `stage-accordion-toggle`; the consumer remains responsible for updating
 * the controlled `open` value.
 */

import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiChevronDown } from '@mdi/js';

export interface ConfigStageAccordionStage {
  id: string;
  label: string;
  color: string;
  open: boolean;
  current?: boolean;
}

export interface ConfigStageAccordionToggleDetail {
  stage: ConfigStageAccordionStage;
}

export function stageAccordionSummarySlot(stageId: string): string {
  return `summary-${stageId}`;
}

export function stageAccordionInteriorSlot(stageId: string): string {
  return `interior-${stageId}`;
}

@customElement('config-stage-accordion')
export class ConfigStageAccordion extends LitElement {
  @property({ attribute: false }) stages: readonly ConfigStageAccordionStage[] = [];
  @property({ type: Boolean, reflect: true }) compact = false;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .acc-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      /* Preserve the reference VPD row geometry during this enabling extraction. */
      border-radius: var(--border-radius-md, 12px);
      overflow: hidden;
    }
    .acc-head {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      box-sizing: border-box;
      padding: 13px 16px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }
    .acc-head:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .acc-head:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: -2px;
    }
    .acc-stage-dot {
      width: 10px;
      height: 10px;
      border: 1px solid var(--primary-text-color, #fff);
      border-radius: 50%;
      flex-shrink: 0;
    }
    .acc-head-title {
      flex: 1;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .current-stage {
      border-color: color-mix(in srgb, var(--primary-color, #4caf50) 60%, transparent);
      background: color-mix(in srgb, var(--primary-color, #4caf50) 8%, transparent);
    }
    .current-label {
      color: var(--primary-text-color, #fff);
      font-size: 0.6875rem;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .acc-chev {
      width: 20px;
      height: 20px;
      fill: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      transition: transform 0.2s;
      flex-shrink: 0;
    }
    .acc-chev.open {
      transform: rotate(180deg);
    }
    .acc-body {
      padding: 16px;
      border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    :host([compact]) {
      gap: 4px;
    }
    :host([compact]) .acc-head {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      gap: 2px 8px;
      padding: 8px 10px;
    }
    :host([compact]) .acc-stage-dot {
      width: 8px;
      height: 8px;
    }
    :host([compact]) .acc-head-title {
      font-size: 0.75rem;
    }
    :host([compact]) .current-label {
      grid-column: 3;
    }
    :host([compact]) .acc-head slot {
      grid-column: 2 / -1;
      grid-row: 2;
      min-width: 0;
    }
    :host([compact]) .acc-chev {
      grid-column: 4;
      grid-row: 1;
      width: 18px;
      height: 18px;
    }
    :host([compact]) .acc-body {
      gap: 12px;
      padding: 12px;
    }
    @media (prefers-reduced-motion: reduce) {
      .acc-head,
      .acc-chev {
        transition-duration: 0.01ms;
      }
    }
  `;

  protected updated(changedProperties: PropertyValues<this>): void {
    if (!changedProperties.has('stages')) return;

    const previousStages = changedProperties.get('stages') as
      | readonly ConfigStageAccordionStage[]
      | undefined;
    if (!previousStages) return;

    const previouslyOpen = new Map(previousStages.map((stage) => [stage.id, stage.open]));
    const openedIndex = this.stages.findIndex(
      (stage) => stage.open && previouslyOpen.get(stage.id) === false
    );
    if (openedIndex === -1) return;

    this.renderRoot
      .querySelectorAll<HTMLElement>('.acc-card')
      [openedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private _toggle(stage: ConfigStageAccordionStage): void {
    this.dispatchEvent(
      new CustomEvent<ConfigStageAccordionToggleDetail>('stage-accordion-toggle', {
        detail: { stage },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleKeydown(event: KeyboardEvent, stage: ConfigStageAccordionStage): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this._toggle(stage);
  }

  render(): TemplateResult {
    return html`${this.stages.map((stage, index) => this._renderStage(stage, index))}`;
  }

  private _renderStage(stage: ConfigStageAccordionStage, index: number): TemplateResult {
    const headerId = `stage-header-${index}`;
    const panelId = `stage-panel-${index}`;
    return html`
      <div class="acc-card ${stage.current ? 'current-stage' : ''}">
        <div
          id=${headerId}
          class="acc-head"
          role="button"
          tabindex="0"
          aria-expanded=${stage.open ? 'true' : 'false'}
          aria-controls=${panelId}
          aria-current=${stage.current ? 'step' : nothing}
          @click=${() => this._toggle(stage)}
          @keydown=${(event: KeyboardEvent) => this._handleKeydown(event, stage)}
        >
          <div class="acc-stage-dot" style="background:${stage.color};"></div>
          <div class="acc-head-title">${stage.label}</div>
          ${stage.current ? html`<span class="current-label">Current</span>` : nothing}
          ${stage.open ? nothing : html`<slot name=${stageAccordionSummarySlot(stage.id)}></slot>`}
          <svg class="acc-chev ${stage.open ? 'open' : ''}" viewBox="0 0 24 24">
            <path d=${mdiChevronDown}></path>
          </svg>
        </div>
        ${stage.open
          ? html`
              <div id=${panelId} class="acc-body" role="region" aria-labelledby=${headerId}>
                <slot name=${stageAccordionInteriorSlot(stage.id)}></slot>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-stage-accordion': ConfigStageAccordion;
  }
}
