import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js';
import { ResizeController } from '../../../controllers/resize-controller';

@customElement('scroll-container')
export class ScrollContainer extends LitElement {
  @property({ type: Number }) public scrollAmount = 200;
  @property({ type: String }) public containerClass = '';

  @state() private _canScrollLeft = false;
  @state() private _canScrollRight = false;

  @query('.scroll-content') private _scrollContent!: HTMLDivElement;

  private _resizeController = new ResizeController(this, () => this.checkScroll());

  protected firstUpdated() {
    this.checkScroll();
    this._resizeController.observe(this._scrollContent);
  }

  public checkScroll() {
    if (!this._scrollContent) return;
    const el = this._scrollContent;
    // 1px buffer
    this._canScrollLeft = el.scrollLeft > 1;
    this._canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
  }

  public scrollContentLeft() {
    if (this._scrollContent) {
      this._scrollContent.scrollBy({ left: -this.scrollAmount, behavior: 'smooth' });
    }
  }

  public scrollContentRight() {
    if (this._scrollContent) {
      this._scrollContent.scrollBy({ left: this.scrollAmount, behavior: 'smooth' });
    }
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      position: relative;
      min-width: 0;
      width: 100%;
      height: 100%;
    }

    .scroll-content {
      display: flex;
      align-items: center;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      min-width: 0;
      flex: 1;
      scroll-behavior: smooth;
      height: 100%;
    }

    .scroll-content::-webkit-scrollbar {
      display: none;
    }

    .scroll-arrow {
      min-width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      cursor: pointer;
      border-radius: 50%;
      transition:
        background 0.2s,
        opacity 0.2s;
      flex-shrink: 0;
      z-index: 2;
    }

    .scroll-arrow:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--primary-text-color, #fff);
    }

    .scroll-arrow.hidden {
      opacity: 0;
      pointer-events: none;
      width: 0;
      padding: 0;
      min-width: 0;
      overflow: hidden;
    }

    .scroll-arrow svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    /* Allow slotted content to fill height */
    ::slotted(*) {
      height: 100%;
    }
  `;

  render() {
    return html`
      <div
        class="scroll-arrow ${!this._canScrollLeft ? 'hidden' : ''}"
        @click=${() => this.scrollContentLeft()}
      >
        <svg viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
      </div>

      <div class="scroll-content ${this.containerClass}" @scroll=${() => this.checkScroll()}>
        <slot></slot>
      </div>

      <div
        class="scroll-arrow ${!this._canScrollRight ? 'hidden' : ''}"
        @click=${() => this.scrollContentRight()}
      >
        <svg viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
      </div>
    `;
  }
}
