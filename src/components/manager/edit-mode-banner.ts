import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiCheckboxMarked,
  mdiSelectAll,
  mdiSelectionOff,
  mdiWater,
  mdiDumbbell,
  mdiBug,
  mdiClose,
  mdiPlusBoxMultiple,
  mdiChevronLeft,
  mdiChevronRight
} from '@mdi/js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { sharedStyles } from '../../styles/shared.styles';
import { uiStyles } from '../../styles/ui.styles';
import { ResizeController } from '../../controllers/resize-controller';

@customElement('growspace-edit-mode-banner')
export class EditModeBanner extends LitElement {
  @property({ type: Number }) accessor selectedCount = 0;

  @state() private accessor _canScrollLeft = false;
  @state() private accessor _canScrollRight = false;

  private _actionsContainerRef: Ref<HTMLDivElement> = createRef();
  private _resizeController = new ResizeController(this, () => this._checkScroll());

  static styles = [
    sharedStyles,
    uiStyles,
    css`
      :host {
        display: block;
      }
      .edit-mode-banner {
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.25));
        border: 1px solid rgba(76, 175, 80, 0.4);
        border-radius: 12px;
        padding: 8px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        animation: slideDown 0.3s ease;
        gap: 16px;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--primary-text-color, #fff);
        font-weight: 500;
        font-size: 0.95rem;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .banner-content svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .banner-actions-wrapper {
        display: flex;
        align-items: center;
        min-width: 0;
        flex: 1;
        position: relative;
      }

      .banner-actions {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        scroll-behavior: smooth;
        padding: 4px 0;
      }

      .banner-actions::-webkit-scrollbar {
        display: none;
      }

      .banner-actions button {
        flex-shrink: 0;
      }

      .scroll-arrow {
        min-width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-text-color, #fff);
        cursor: pointer;
        border-radius: 50%;
        transition: all 0.2s;
        background: rgba(255, 255, 255, 0.1);
        margin: 0 4px;
        z-index: 1;
      }

      .scroll-arrow:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .scroll-arrow.hidden {
        opacity: 0;
        pointer-events: none;
        width: 0;
        min-width: 0;
        margin: 0;
      }

      .scroll-arrow svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      @media (max-width: 600px) {
        .edit-mode-banner {
          flex-direction: column;
          align-items: stretch;
          padding: 12px;
          gap: 8px;
        }
        .banner-content {
          justify-content: center;
        }
      }
    `
  ];

  firstUpdated() {
    const container = this._actionsContainerRef.value;
    if (container) {
      container.addEventListener('scroll', () => this._checkScroll());
      this._resizeController.observe(container);
    }
    setTimeout(() => this._checkScroll(), 0);
  }

  private _scrollActions(direction: 'left' | 'right') {
    const container = this._actionsContainerRef.value;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
    }
  }

  private _checkScroll() {
    const container = this._actionsContainerRef.value;
    if (container) {
      this._canScrollLeft = container.scrollLeft > 1;
      this._canScrollRight =
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1;
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="edit-mode-banner">
        <div class="banner-content">
          <svg viewBox="0 0 24 24">
            <path d="${mdiCheckboxMarked}"></path>
          </svg>
          <span>${this.selectedCount} plant(s) selected</span>
        </div>
        
        <div class="banner-actions-wrapper">
          <div class="scroll-arrow ${!this._canScrollLeft ? 'hidden' : ''}" @click=${() => this._scrollActions('left')}>
            <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
          </div>

          <div class="banner-actions" ${ref(this._actionsContainerRef)}>
            <button class="md3-button text" @click=${() => this._dispatch('select-all')}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiSelectAll}"></path></svg>
              Select All
            </button>
            <button class="md3-button text" @click=${() => this._dispatch('clear-selection')}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiSelectionOff}"></path></svg>
              Clear
            </button>
            <button class="md3-button text" @click=${() => this._dispatch('water-selected')}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
              Water / Nutrients
            </button>
            <button class="md3-button text" @click=${() => this._dispatch('training-selected')}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiDumbbell}"></path></svg>
              Log Training
            </button>
            <button class="md3-button text" @click=${() => this._dispatch('ipm-selected')}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiBug}"></path></svg>
              Log IPM
            </button>
            <button class="md3-button text" @click=${() => this._dispatch('batch-add-plants')}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiPlusBoxMultiple}"></path></svg>
              Batch Add Plants
            </button>
            <button class="md3-button text" @click=${() => this._dispatch('exit-edit-mode')}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
              Exit
            </button>
          </div>

          <div class="scroll-arrow ${!this._canScrollRight ? 'hidden' : ''}" @click=${() => this._scrollActions('right')}>
            <svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
          </div>
        </div>
      </div>
    `;
  }

  private _dispatch(event: string) {
    this.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true }));
  }
}
