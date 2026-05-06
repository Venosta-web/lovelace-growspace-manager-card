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
  mdiChevronRight,
  mdiDelete,
  mdiSwapHorizontal,
  mdiPrinter,
  mdiContentCopy,
} from '@mdi/js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { sharedStyles } from '../../../styles/shared.styles';
import { uiStyles } from '../../../styles/ui.styles';
import { ResizeController } from '../../../controllers/resize-controller';

@customElement('growspace-edit-mode-banner')
export class EditModeBanner extends LitElement {
  @property({ type: Number }) selectedCount = 0;

  @state() private _canScrollLeft = false;
  @state() private _canScrollRight = false;

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
        background: var(--card-background-color, rgba(32, 33, 36, 0.8));
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 8px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        animation: slideDown 0.3s ease;
        gap: 16px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
        fill: var(--primary-color, #4caf50);
      }

      .banner-actions-wrapper {
        display: flex;
        align-items: center;
        min-width: 0;
        flex: 1;
        position: relative;
        justify-content: flex-end;
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

      .icon-button {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--primary-text-color, #fff);
        cursor: pointer;
        border-radius: 8px;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        width: 40px;
        height: 40px;
        box-sizing: border-box;
      }

      .icon-button:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
      }

      .icon-button svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .icon-button.delete {
        color: var(--error-color, #f44336);
        border-color: rgba(244, 67, 54, 0.3);
        background: rgba(244, 67, 54, 0.1);
      }

      .icon-button.delete:hover {
        background: rgba(244, 67, 54, 0.2);
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

      @media (max-width: 600px) {
        .edit-mode-banner {
          flex-direction: column;
          align-items: stretch;
          padding: 12px;
          gap: 12px;
        }
        .banner-content {
          justify-content: center;
        }
        .banner-actions-wrapper {
          justify-content: center;
        }
      }
    `,
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
          <div
            class="scroll-arrow ${!this._canScrollLeft ? 'hidden' : ''}"
            @click=${() => this._scrollActions('left')}
          >
            <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
          </div>

          <div class="banner-actions" ${ref(this._actionsContainerRef)}>
            <button
              class="icon-button"
              @click=${() => this._dispatch('select-all')}
              title="Select All"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiSelectAll}"></path></svg>
            </button>
            <button
              class="icon-button"
              @click=${() => this._dispatch('clear-selection')}
              title="Clear Selection"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiSelectionOff}"></path></svg>
            </button>
            <div style="width: 1px; background: rgba(255,255,255,0.1); margin: 0 4px;"></div>
            <button
              class="icon-button"
              @click=${() => this._dispatch('water-selected')}
              title="Water Selected"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
            </button>
            <button
              class="icon-button"
              @click=${() => this._dispatch('training-selected')}
              title="Log Training"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiDumbbell}"></path></svg>
            </button>
            <button
              class="icon-button"
              @click=${() => this._dispatch('ipm-selected')}
              title="Log IPM"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiBug}"></path></svg>
            </button>
            <div style="width: 1px; background: rgba(255,255,255,0.1); margin: 0 4px;"></div>
            <button
              class="icon-button"
              @click=${() => this._dispatch('transplant-mode')}
              title="Transplant Mode"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiSwapHorizontal}"></path></svg>
            </button>
            <button
              class="icon-button"
              @click=${() => this._dispatch('clone-selected')}
              title="Clone Selected"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
            </button>
            <button
              class="icon-button"
              @click=${() => this._dispatch('batch-add-plants')}
              title="Batch Add Plants"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiPlusBoxMultiple}"></path></svg>
            </button>
            <button
              class="icon-button"
              @click=${() => this._dispatch('print-labels-selected')}
              title="Print Labels"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiPrinter}"></path></svg>
            </button>
            <div style="width: 1px; background: rgba(255,255,255,0.1); margin: 0 4px;"></div>
            <button
              class="icon-button delete"
              @click=${() => this._dispatch('delete-selected')}
              title="Delete Selected"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
            </button>
            <button
              class="icon-button"
              @click=${() => this._dispatch('exit-edit-mode')}
              title="Exit Edit Mode"
            >
              <svg viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
            </button>
          </div>

          <div
            class="scroll-arrow ${!this._canScrollRight ? 'hidden' : ''}"
            @click=${() => this._scrollActions('right')}
          >
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
