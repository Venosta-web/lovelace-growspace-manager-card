import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HeaderChip } from '../../../slices/header-metrics';
import { ViewMode } from '../../../constants';
import { GrowspaceDevice } from '../../../types';
import '../../shared/ui/scroll-container';
import '../../shared/ui/growspace-chip';
import '../../shared/ui/gs-help-tooltip';
import { localizeWithParams } from '../../../localize/localize';

// Icons
import {
  mdiCog,
  mdiBrain,
  mdiDotsVertical,
  mdiDragVariant,
  mdiChartMultiple,
  mdiCheckboxMultipleMarkedOutline,
  mdiClipboardTextClock,
  mdiWater,
  mdiWaterPlus,
  mdiBottleTonicPlus,
  mdiBug,
  mdiDumbbell,
  mdiPlus,
  mdiDna,
  mdiCube,
  mdiCamera,
} from '@mdi/js';

@customElement('growspace-header-actions-ui')
export class GrowspaceHeaderActionsUI extends LitElement {
  @property({ attribute: false }) public deviceChips: HeaderChip[] = [];
  @property({ type: Boolean }) public isMobile = false;
  @property({ type: Boolean }) public mobileLink = false;
  @property() public viewMode = ViewMode.STANDARD;
  @property({ type: Boolean }) public isEditMode = false;
  @property({ attribute: false }) public selectedPlants = new Set<string>();
  @property({ type: Number }) public problemPlantCount = 0;
  @property() public selectedDevice: string | null = null;
  @property({ attribute: false }) public device?: GrowspaceDevice;
  @property() public activeTask: 'idle' | 'arrange' | 'compare' | 'select_plants' = 'idle';
  @property({ type: Boolean }) public canArrange = false;
  @property({ type: Boolean }) public canCompare = false;
  @property() public language = 'en';

  @state() private _draggedMetric: string | null = null;
  @state() private _menuOpen = false;

  private get _chipDraggable(): string {
    return 'false';
  }

  private _triggerAction(action: string) {
    const menu = this.shadowRoot?.getElementById('header-menu') as HTMLElement & {
      hidePopover?: () => void;
    };
    if (menu && typeof menu.hidePopover === 'function') {
      try {
        menu.hidePopover();
      } catch {
        /* ignore */
      }
    }

    this.dispatchEvent(
      new CustomEvent('action-triggered', {
        detail: { action },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleMenuToggle(event: Event) {
    const toggleEvent = event as ToggleEvent;
    this._menuOpen = toggleEvent.newState === 'open';

    if (this._menuOpen) {
      requestAnimationFrame(() => {
        if (this._menuOpen) this._menuItems()[0]?.focus();
      });
      return;
    }

    (this.shadowRoot?.getElementById('menu-trigger') as HTMLButtonElement | null)?.focus();
  }

  private _menuItems(): HTMLButtonElement[] {
    return Array.from(
      this.shadowRoot?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []
    );
  }

  private _handleMenuKeydown(event: KeyboardEvent) {
    const items = this._menuItems();
    const currentIndex = items.indexOf(this.shadowRoot?.activeElement as HTMLButtonElement);
    let nextIndex: number | undefined;

    switch (event.key) {
      case 'ArrowDown':
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      case 'Escape':
      case 'Tab':
        (event.currentTarget as HTMLElement & { hidePopover: () => void }).hidePopover();
        if (event.key === 'Escape') event.preventDefault();
        return;
      default:
        return;
    }

    event.preventDefault();
    items[nextIndex]?.focus();
  }

  private _menuItem(
    icon: string,
    label: string,
    action: string,
    options: { disabled?: boolean; active?: boolean; title?: string } = {}
  ) {
    return html`
      <button
        class="menu-item ${options.active ? 'active' : ''}"
        data-action=${action}
        role="menuitem"
        tabindex="-1"
        type="button"
        ?disabled=${options.disabled}
        aria-current=${options.active ? 'true' : nothing}
        title=${options.title ?? nothing}
        @click=${() => this._triggerAction(action)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"></path></svg>
        <span class="menu-item-label">${label}</span>
      </button>
    `;
  }

  private _handleChipDragStart(e: DragEvent, metric: string) {
    this._draggedMetric = metric;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', metric);
    }
    this.dispatchEvent(
      new CustomEvent('chip-drag-start', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    e.preventDefault();
    if (!this._draggedMetric || this._draggedMetric === targetMetric) {
      this._draggedMetric = null;
      return;
    }

    this.dispatchEvent(
      new CustomEvent('chip-drop', {
        detail: { sourceMetric: this._draggedMetric, targetMetric },
        bubbles: true,
        composed: true,
      })
    );
    this._draggedMetric = null;
  }

  private _handleDragOver(e: DragEvent) {
    if (this._draggedMetric) e.preventDefault();
  }

  private _unlinkGraphs(groupIndex: number) {
    this.dispatchEvent(
      new CustomEvent('unlink-graphs', { detail: { groupIndex }, bubbles: true, composed: true })
    );
  }

  private _toggleEnvGraph(metric: string) {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  private _iconButton(icon: string, action: string, label: string, help: string, active?: boolean) {
    return html`
      <div style="position:relative;display:inline-flex;align-items:center;">
        <button
          class="icon-button ${active ? 'active' : ''}"
          @click=${() => this._triggerAction(action)}
          title="${label}"
          aria-label="${label}"
          aria-pressed=${active === undefined ? nothing : String(active)}
          type="button"
        >
          <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
        </button>
        <gs-help-tooltip
          .content=${help}
          placement="bottom"
          .label=${label}
          style="position:absolute;top:-10px;right:-10px;z-index:1;"
        ></gs-help-tooltip>
      </div>
    `;
  }

  private _renderPrimaryAction() {
    if (this.activeTask !== 'idle') return nothing;

    const plants = this.device?.plants;
    if (!Array.isArray(plants)) return nothing;

    const hasGrowspace = Boolean(this.device?.deviceId || this.selectedDevice);
    const selectedCount = this.selectedPlants?.size ?? 0;
    if (selectedCount > 0 && plants.length > 0 && hasGrowspace) {
      return this._primaryAction(mdiWaterPlus, `Water selected (${selectedCount})`, 'water');
    }

    if (this.problemPlantCount > 0 && plants.length > 0) {
      return this._primaryAction(
        mdiCheckboxMultipleMarkedOutline,
        'Review plants',
        'select_plants'
      );
    }

    if (plants.length === 0 && hasGrowspace) {
      return this._primaryAction(mdiPlus, 'Add plant', 'add_plant');
    }

    return nothing;
  }

  private _primaryAction(icon: string, label: string, action: string) {
    return html`
      <button
        class="primary-action"
        type="button"
        data-action=${action}
        @click=${() => this._triggerAction(action)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"></path></svg>
        <span>${label}</span>
      </button>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      min-width: 0;
      gap: 12px;
    }

    .gs-device-chips-container {
      display: flex;
      align-items: center;
      overflow: hidden;
      min-width: 0;
      max-width: 100%;
      flex: 1;
      height: 48px;
    }

    .icon-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-text-color, #fff);
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
      padding: 0;
      font: inherit;
      outline: none;
    }
    .icon-button:hover {
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.2));
    }
    .icon-button:focus-visible {
      outline: 2px solid var(--gm-primary-color);
      outline-offset: 2px;
    }
    .icon-button svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }

    .icon-button.mobile-link.active,
    .icon-button.active {
      background: var(--gm-primary-color);
      border-color: var(--gm-primary-color);
    }

    .primary-action {
      min-height: 40px;
      border: 0;
      border-radius: var(--border-radius-full, 9999px);
      padding: 0 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-shrink: 0;
      background: var(--primary-color, #4caf50);
      color: var(--text-primary-color, #fff);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }
    .primary-action:hover {
      filter: brightness(1.08);
    }
    .primary-action:focus-visible {
      outline: 2px solid var(--primary-text-color, #fff);
      outline-offset: 2px;
    }
    .primary-action svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .menu-dropdown {
      position: fixed;
      inset: auto;
      position-anchor: --menu-trigger;
      top: anchor(bottom);
      right: anchor(right);
      position-try-fallbacks: flip-block;
      margin-top: 8px;
      background: var(--card-background-color, #2a2a2a);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: var(--border-radius-md, 12px);
      font-size: 0.9rem;
      min-width: 180px;
      padding: 0;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
      z-index: 1000;
    }

    .menu-dropdown:popover-open {
      display: block;
      animation: slide-in 0.2s ease-out;
    }

    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .menu-item {
      width: 100%;
      border: 0;
      background: transparent;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      color: var(--primary-text-color, #ddd);
      font: inherit;
      text-align: start;
    }
    .menu-item:hover {
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      color: var(--primary-text-color, #fff);
    }
    .menu-item.active {
      font-weight: 700;
      background: color-mix(in srgb, var(--primary-color, #4caf50) 16%, transparent);
    }
    .menu-item:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .menu-item:focus-visible {
      outline: 2px solid var(--gm-primary-color);
      outline-offset: -3px;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
    }
    .menu-item svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }
    .menu-item-label {
      flex: 1;
    }
    .menu-header {
      padding: 8px 16px 4px;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .menu-divider {
      height: 1px;
      background: var(--divider-color, rgba(255, 255, 255, 0.1));
      margin: 4px 0;
    }

    .drag-handle {
      display: none;
    }

    @media (max-width: 600px) {
      :host {
        width: 100%;
        gap: 8px;
      }

      .primary-action {
        min-height: 48px;
        border-radius: var(--border-radius-full, 9999px);
        flex: 1;
      }

      .icon-button {
        width: 48px;
        height: 48px;
      }

      .menu-dropdown:popover-open {
        inset: auto 0 0 0;
        width: 100%;
        position-anchor: none;
        border-radius: var(--border-radius-lg, 16px) var(--border-radius-lg, 16px) 0 0;
        margin: 0;
        max-height: calc(100dvh - env(safe-area-inset-top, 0px));
        overflow-y: auto;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        animation: slide-up 0.3s cubic-bezier(0.1, 0.7, 0.1, 1);
      }
      @keyframes slide-up {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
      .drag-handle {
        display: flex;
        justify-content: center;
        padding: 10px 0 4px;
      }
      .drag-handle::before {
        content: '';
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: var(--divider-color, rgba(255, 255, 255, 0.3));
      }
    }

    /* Respect user motion preferences (WCAG 2.3.3) */
    @media (prefers-reduced-motion: reduce) {
      .menu-dropdown:popover-open {
        animation: none;
      }
    }

    .chips-wrapper {
      display: flex;
      gap: 8px;
      padding: 0 4px;
    }
  `;

  render() {
    return html`
      ${!this.isMobile
        ? html`
            <div class="gs-device-chips-container">
              <scroll-container .scrollAmount=${150} containerClass="device-chips-scroll">
                <div class="chips-wrapper">
                  ${this.deviceChips.map(
                    (chip) => html`
                      <growspace-chip
                        .icon=${chip.icon}
                        .label=${chip.label}
                        .value=${chip.value}
                        .multiValues=${chip.multiValues}
                        .status=${chip.status}
                        .active=${chip.active}
                        .linked=${chip.linked}
                        .tooltip=${chip.tooltip}
                        .toggle=${true}
                        .actionLabel=${`Toggle ${chip.label} graph`}
                        draggable="${this._chipDraggable}"
                        @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
                        @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
                        @dragover=${this._handleDragOver}
                        @click=${() => this._toggleEnvGraph(chip.key)}
                        @unlink=${() => this._unlinkGraphs(chip.groupIndex)}
                      ></growspace-chip>
                    `
                  )}
                </div>
              </scroll-container>
            </div>
          `
        : nothing}
      ${!this.isMobile
        ? html`
            ${this._iconButton(
              mdiCube,
              'heatmap',
              '3D Heatmap',
              'Switch to 3D VPD heatmap view — visualizes temperature and humidity distribution across your canopy as a 3D surface.',
              this.viewMode === ViewMode.HEATMAP
            )}
            ${this._iconButton(
              mdiCog,
              'config',
              'Settings',
              'Open growspace settings — configure sensor assignments, irrigation strategy, and integration options.'
            )}
          `
        : nothing}
      ${this._renderPrimaryAction()}

      <div class="menu-container">
        <button
          class="icon-button"
          id="menu-trigger"
          style="anchor-name: --menu-trigger"
          popovertarget="header-menu"
          title="Open Menu"
          type="button"
          aria-label="Open growspace actions menu"
          aria-haspopup="menu"
          aria-controls="header-menu"
          aria-expanded=${this._menuOpen}
        >
          <svg viewBox="0 0 24 24"><path d="${mdiDotsVertical}"></path></svg>
        </button>
        ${this._renderMenu()}
      </div>
    `;
  }

  private _renderMenu() {
    const selectedCount = this.selectedPlants?.size || 0;
    return html`
      <div
        id="header-menu"
        popover="auto"
        class="menu-dropdown"
        role="menu"
        aria-label="Growspace actions"
        @toggle=${this._handleMenuToggle}
        @keydown=${this._handleMenuKeydown}
      >
        <div class="drag-handle" aria-hidden="true"></div>
        <div class="menu-header" aria-hidden="true">Plant care</div>
        ${this._menuItem(
          mdiCheckboxMultipleMarkedOutline,
          localizeWithParams('tasks.select_plants', {}, this.language),
          'select_plants',
          {
            disabled: this.activeTask !== 'idle' || (this.device?.plants?.length ?? 0) === 0,
            active: this.activeTask === 'select_plants',
          }
        )}
        ${this._menuItem(mdiPlus, 'Add Plant', 'add_plant')}
        ${this._menuItem(
          mdiWaterPlus,
          selectedCount > 0 ? 'Water Selected' : 'Water Growspace',
          'water'
        )}
        ${this._menuItem(
          mdiBug,
          selectedCount > 0 ? 'Apply IPM to Selected' : 'Log / Manage IPM',
          'ipm'
        )}
        ${this._menuItem(
          mdiDumbbell,
          selectedCount > 0 ? 'Train Selected' : 'Log Training',
          'training'
        )}

        <div class="menu-divider" role="separator"></div>

        <div class="menu-header" aria-hidden="true">Setup</div>
        ${this._menuItem(
          mdiDragVariant,
          localizeWithParams('tasks.arrange', {}, this.language),
          'arrange',
          {
            disabled: this.activeTask !== 'idle' || !this.canArrange,
            active: this.activeTask === 'arrange',
            title: this.canArrange
              ? localizeWithParams('tasks.arrange_help', {}, this.language)
              : localizeWithParams('tasks.arrange_unavailable', {}, this.language),
          }
        )}
        ${this.isMobile ? this._menuItem(mdiCog, 'Settings', 'config') : nothing}
        ${this._menuItem(mdiWater, 'Irrigation', 'irrigation')}
        ${this._menuItem(mdiBottleTonicPlus, 'Nutrients', 'nutrients')}
        ${this._menuItem(mdiDna, 'Strains', 'strains')}

        <div class="menu-divider" role="separator"></div>

        <div class="menu-header" aria-hidden="true">Insights</div>
        ${this._menuItem(
          mdiChartMultiple,
          localizeWithParams('tasks.compare', {}, this.language),
          'compare',
          {
            disabled: this.activeTask !== 'idle' || !this.canCompare,
            active: this.activeTask === 'compare',
            title: this.canCompare
              ? localizeWithParams('tasks.compare_help', {}, this.language)
              : localizeWithParams('tasks.compare_unavailable', {}, this.language),
          }
        )}
        ${this.isMobile ? this._menuItem(mdiCube, '3D Heatmap', 'heatmap') : nothing}
        ${this._menuItem(mdiClipboardTextClock, 'Logbook', 'logbook')}
        ${this._menuItem(mdiCamera, 'Camera Snapshots', 'snapshots')}
        ${this._menuItem(mdiBrain, 'Ask AI', 'ai')}
      </div>
    `;
  }
}
