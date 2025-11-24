import { LitElement, html, css, unsafeCSS, CSSResultGroup, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { mdiPlus, mdiSprout, mdiFlower, mdiDna, mdiCannabis, mdiHairDryer, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiLightbulbOn, mdiLightbulbOff, mdiThermometer, mdiWaterPercent, mdiWeatherCloudy, mdiCloudOutline, mdiWeatherSunny, mdiWeatherNight, mdiCog } from '@mdi/js';
import { DateTime } from 'luxon';
import { variables } from './styles/variables';

// Import our modules
import {
  GrowspaceManagerCardConfig,
  PlantEntity,
  PlantStage,
  AddPlantDialogState,
  PlantOverviewDialogState,
  StrainLibraryDialogState,
  ConfigDialogState,
  GrowspaceDevice,
  StrainEntry
} from './types';
import { PlantUtils } from "./utils";
import { DataService } from './data-service';
import { DialogRenderer } from './dialog-renderer';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard {
  @state() private _addPlantDialog: AddPlantDialogState | null = null;
  @state() private _defaultApplied = false;
  @state() private _plantOverviewDialog: PlantOverviewDialogState | null = null;
  @state() private _strainLibraryDialog: StrainLibraryDialogState | null = null;
  @state() private _configDialog: ConfigDialogState | null = null;
  @state() private selectedDevice: string | null = null;
  @state() private _draggedPlant: PlantEntity | null = null;
  @state() private _isCompactView: boolean = false;
  @state() private _historyData: any[] | null = null;
  @state() private _lightCycleCollapsed: boolean = true;
  @state() private _activeEnvGraphs: Set<string> = new Set();
  @state() private _tooltip: { id: string, x: number, time: string, value: string } | null = null;


  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: GrowspaceManagerCardConfig;


  private dataService!: DataService;
  static styles: CSSResultGroup = [
    variables,
    css`
      :host {
        display: block;
        font-family: 'Roboto', sans-serif;
        color: var(--growspace-card-text);
      }

      /* Rich Card Style */
      .plant-card-rich {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        border-radius: 16px;
        overflow: hidden;
        /* Default background if no image */
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        aspect-ratio: 1;
      }

      .plant-card-rich:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .plant-card-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        z-index: 0;
      }

      .plant-card-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.3) 100%);
        z-index: 1;
      }

      .plant-card-content {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
        padding: 16px;
        box-sizing: border-box;
      }

      .pc-header {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 24px;
        align-items: center;
      }

      .pc-strain-name {
        font-size: 1.1rem;
        font-weight: 700;
        color: #fff;
        text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .pc-pheno {
        font-size: 0.9rem;
        color: rgba(255,255,255,0.7);
        font-weight: 500;
      }

      .pc-stage {
        font-size: 1rem;
        font-weight: 600;
        margin-top: 8px;
        color: var(--stage-color);
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        text-transform: capitalize;
      }

      .pc-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
        width: 100%;
        padding: 0 12px;
        box-sizing: border-box;
      }

      .pc-stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .pc-stat-item svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
      }

      .pc-stat-text {
        font-size: 0.85rem;
        font-weight: 500;
        color: #fff;
      }

      /* Empty Slot Redesign */
      .plant-card-empty {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.02);
        border: 2px dashed rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        color: rgba(255,255,255,0.3);
        transition: all 0.2s;
        cursor: pointer;
        min-height: 100px;
        aspect-ratio: 1;
        gap: 12px;
      }

      .plant-card-empty:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.3);
        color: rgba(255,255,255,0.8);
      }

      ha-card {
        padding: var(--spacing-lg);
        border-radius: var(--border-radius-lg);
        background: var(--growspace-card-bg);
        box-shadow: var(--card-shadow);
        transition: var(--transition-medium);
      }

      ha-card:hover {
        box-shadow: var(--card-shadow-hover);
      }

      /* Unified Card Container - Glassmorphism & Gradient */
      .unified-growspace-card {
        /* Fallback */
        background: rgba(30, 30, 35, 0.6);
        /* Gradient approximating the screenshot */
        background-image: linear-gradient(135deg, rgba(50, 50, 60, 0.8) 0%, rgba(40, 30, 60, 0.8) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);

        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: #fff;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      }

      .gs-stats-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .gs-header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: var(--spacing-md);
      }

      .gs-title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .gs-title {
        font-size: 2rem;
        font-weight: 500;
        margin: 0;
        letter-spacing: -0.5px;
      }

      .gs-stage-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.15);
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 0.9rem;
        font-weight: 500;
        color: #fff;
        width: fit-content;
      }

      /* Chips Container */
      .gs-stats-chips {
         display: flex;
         flex-wrap: wrap;
         gap: 8px;
         justify-content: flex-end;
      }

      .stat-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 0.9rem;
        color: #eee;
        backdrop-filter: blur(4px);
        cursor: pointer;
        transition: all 0.2s;
      }

      .stat-chip:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .stat-chip.active {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
      }

      .stat-chip svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
        opacity: 0.9;
      }

      .light-status-chip {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 6px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .light-status-chip.on {
        color: var(--primary-light-color);
      }

      .light-status-chip.off {
         color: rgba(255, 255, 255, 0.7);
      }

      /* 24h Chart */
      .gs-chart-container {
         margin-top: 8px;
         height: 150px;
         position: relative;
         width: 100%;
      }

      .gs-chart-svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 0 4px rgba(255, 235, 59, 0.2));
      }

      .chart-line {
        fill: none;
        stroke: var(--primary-light-color, #FFEB3B);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .chart-gradient-fill {
        fill: url(#gradient);
        opacity: 0.2;
      }

      /* Time markers for chart */
      .chart-markers {
         display: flex;
         justify-content: space-between;
         margin-top: -24px;
         padding: 0 10px;
         font-size: 0.75rem;
         color: rgba(255, 255, 255, 0.3);
         font-weight: 500;
         position: relative;
         z-index: 2;
         pointer-events: none;
      }

      .gs-tooltip {
        position: absolute;
        top: 10px;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        pointer-events: none;
        transform: translate(-50%, 0);
        z-index: 10;
        white-space: nowrap;
        border: 1px solid rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        line-height: 1.2;
        text-align: center;
      }
      .gs-tooltip .time {
        font-weight: bold;
        color: var(--primary-light-color);
        margin-bottom: 2px;
      }

      .gs-cursor-line {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255, 255, 255, 0.3);
        pointer-events: none;
        z-index: 5;
        border-left: 1px dashed rgba(255, 255, 255, 0.5);
      }

      /* Light Cycle Card Nested */
      .gs-light-cycle-card {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 16px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: all 0.3s ease;
      }

      .gs-light-cycle-card.collapsed {
        padding: 12px 20px;
        gap: 0;
      }

      .gs-light-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        cursor: pointer;
      }

      .gs-light-cycle-card.collapsed .gs-light-header-row {
        margin-bottom: 0;
      }

      .gs-light-title {
         font-size: 1.5rem;
         font-weight: 600;
         display: flex;
         align-items: center;
         gap: 12px;
         color: #fff;
      }

      .gs-icon-box {
        background: rgba(255, 235, 59, 0.05);
        border: 1px solid rgba(255, 235, 59, 0.2);
        border-radius: 14px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-light-color);
      }

      .gs-light-subtitle {
        font-size: 0.75rem;
        opacity: 0.5;
        font-weight: 500;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-top: 4px;
      }

      .light-status-text {
         font-size: 1.5rem;
         font-weight: 700;
         display: flex;
         align-items: center;
         gap: 8px;
      }

      .status-dot {
         width: 8px;
         height: 8px;
         border-radius: 50%;
         background: currentColor;
         box-shadow: 0 0 8px currentColor;
      }

      .target-cycle-text {
         font-size: 0.9rem;
         opacity: 0.5;
         text-align: right;
         margin-top: 4px;
      }

      /* Bottom Action Cards */
      .gs-action-cards {
        display: flex;
        gap: 16px;
        margin-top: 8px;
      }

      .action-card {
         flex: 1;
         background: rgba(255, 255, 255, 0.05);
         border: 1px solid rgba(255, 255, 255, 0.05);
         border-radius: 16px;
         padding: 16px;
         display: flex;
         align-items: center;
         justify-content: space-between;
         cursor: default; /* Or pointer if clickable */
      }

      .ac-content {
         display: flex;
         align-items: center;
         gap: 12px;
      }

      .ac-icon {
         width: 40px;
         height: 40px;
         border-radius: 50%;
         display: flex;
         align-items: center;
         justify-content: center;
      }

      .ac-icon.on {
         background: rgba(255, 235, 59, 0.1);
         color: var(--primary-light-color);
      }

      .ac-icon.off {
         background: rgba(120, 144, 156, 0.1);
         color: #90a4ae;
      }

      .ac-text h4 {
         margin: 0;
         font-size: 0.7rem;
         text-transform: uppercase;
         opacity: 0.5;
         letter-spacing: 0.5px;
      }

      .ac-text .time {
         font-size: 1.2rem;
         font-weight: 600;
         color: #fff;
      }

      .ac-text .time span {
         font-size: 0.9rem;
         font-weight: 400;
         opacity: 0.7;
         margin-left: 2px;
      }

      .ac-arrow {
         opacity: 0.3;
      }

      /* Header Dropdown */
      .growspace-select-header {
        background: transparent;
        color: #fff;
        font-size: 2rem;
        font-weight: 500;
        font-family: inherit;
        border: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        width: auto;
        max-width: 100%;
        letter-spacing: -0.5px;
        border-bottom: 1px dashed rgba(255,255,255,0.3);
        transition: border-color 0.2s;
      }
      .growspace-select-header:hover {
         border-bottom-color: rgba(255,255,255,0.8);
      }
      .growspace-select-header:focus {
         outline: none;
         border-bottom-color: var(--primary-color);
      }
      .growspace-select-header option {
         background: var(--growspace-card-bg);
         color: var(--growspace-card-text);
         font-size: 1rem;
         padding: 10px;
      }

      /* Existing styles... */
      ha-card.wide-growspace .plant-name,
      ha-card.wide-growspace .plant-stage,
      ha-card.wide-growspace .plant-phenotype {
        font-size: var(--font-size-sm);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) 0;
      }

      .header-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        margin: 0;
      }

      .selector-container {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        flex: 1;
        text-transform: capitalize;
      }
      
      .growspace-select {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 2px solid var(--divider-color);
        border-radius: var(--border-radius-md);
        background: var(--growspace-card-bg);
        color: var(--growspace-card-text);
        font-family: inherit;
        font-size: var(--font-size-sm);
        cursor: pointer;
        min-width: 180px;
        transition: var(--transition-fast);
      }

      .growspace-select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
      }

      .action-button {
        padding: var(--spacing-sm) var(--spacing-md);
        border: none;
        border-radius: var(--border-radius-md);
        font-family: inherit;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
        background: var(--plant-border-color-default);
        color: var(--growspace-card-text);
        box-shadow: var(--card-shadow);
        transition: var(--transition-fast);
      }

      .action-button:hover {
        transform: translateY(-2px);
        box-shadow: var(--card-shadow-hover);
      }

      .view-toggle {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: var(--font-size-xs);
        color: var(--secondary-text-color);
      }

      .grid {
        display: grid;
        gap: var(--spacing-md);
      }

      .grid.compact {
        gap: var(--spacing-sm);
      }

      .plant {
        display: grid; 
        grid-template-columns: 1fr;
        grid-template-rows: 2fr 1fr 0.8fr 1fr 2fr;
        gap: 0px 0px;
        grid-template-areas:
          "icon"
          "name"
          "phenotype"
          "stage"
          "days";
        align-items: center;
        justify-items: center;
        cursor: pointer;
        aspect-ratio: 1;
        position: relative;
        overflow: hidden;
        min-height: 100px;
        text-align: center;
        padding: var(--spacing-md);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        /* New Glass Style (Lighter than header) */
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .plant::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--stage-color, var(--plant-border-color-default));
        opacity: 0.8;
        transition: var(--transition-medium);
      }

      .plant:hover {
        transform: translateY(-4px);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .plant.empty {
        background: rgba(0, 0, 0, 0.2);
        border: 2px dashed rgba(255, 255, 255, 0.1);
        backdrop-filter: none;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
      }

      .plant.empty:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: var(--plant-border-color-default);
        opacity: 1;
      }

      .plant.dragging {
        opacity: 0.5;
        transform: rotate(5deg);
      }
      .plant-name,
      .plant-phenotype,
      .plant-stage,
      .plant-days {
        min-height: 1.2em; /* reserve space */
        text-align: center;
      }

      .plant-phenotype:empty::before,
      .plant-name:empty::before,
      .plant-stage:empty::before,
      .plant-days:empty::before {
        content: "—";
        color: var(--disabled-text-color);
      }

      .plant-header {
        grid-area: icon;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-xs);
        color: var(--stage-color, var(--secondary-text-color));
      }

      .plant.empty .plant-header {
        margin-top: inherit;
      }

      .plant-icon {
        width: 2rem;
        height: 2rem;
        fill: var(--stage-color, var(--secondary-text-color));
      }

      .plant-name {
        grid-area: name;
        font-weight: var(--font-weight-bold);
        color: var(--growspace-card-text);
        font-size: var(--font-size-lg);
        margin-bottom: var(--spacing-xs);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .plant-stage {
        grid-area: stage;
        color: var(--stage-color, var(--secondary-text-color));
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--spacing-xs);
        text-transform: capitalize;
      }

      .plant-phenotype {
        grid-area: phenotype;
        color: var(--secondary-text-color);
        font-size: var(--font-size-md);
        margin-bottom: var(--spacing-xs);
        font-style: italic;
      }

      .plant-days {
        grid-area: days;
        display: flex;
        justify-content: space-around;
        align-items: center;
        font-size: var(--font-size-md);
        color: var(--secondary-text-color);
        width: 100%;
      }

      .plant-days span {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 5px;
      }

      .compact .plant {
        min-height: 80px;
        padding: var(--spacing-sm);
        border-radius: 12px;
      }

      .compact .plant-name {
        font-size: var(--font-size-sm);
      }

      .compact .plant-days {
        font-size: var(--font-size-xs);
      }

      ha-dialog {
        --mdc-dialog-border-radius: var(--border-radius-md);
        --mdc-dialog-box-shadow: var(--card-shadow-hover);
      }

      .no-data {
        text-align: center;
        color: var(--secondary-text-color);
        padding: var(--spacing-lg);
        font-style: italic;
        background: var(--growspace-empty-bg);
        border-radius: var(--border-radius-md);
        margin: var(--spacing-md) 0;
      }

      .error {
        color: var(--error-color);
        padding: var(--spacing-md);
        background: var(--error-bg);
        border: 1px solid var(--error-border);
        border-radius: var(--border-radius-md);
        margin: var(--spacing-md) 0;
      }
      /* Dialog Styles */
      ha-dialog {
        --mdc-dialog-border-radius: var(--border-radius);
        --mdc-dialog-box-shadow: var(--surface-elevation-hover);
      }
      
      ha-dialog .mdc-dialog--open .mdc-dialog__container,
      ha-dialog .mdc-dialog--open {
        align-items: start;
        margin-top: 5vh;
      }
      
      ha-dialog.strain-dialog .mdc-dialog--open .mdc-dialog__container .mdc-dialog__surface {
        width: 800px;
        max-width: 90vw;
        height: 600px;
        max-height: 90vh;
      }
      ha-dialog.strain-dialog .mdc-dialog--open .dialog-content .strain-library-header {
        justify-content: space-between;
      }
      ha-dialog.strain-dialog {
        --mdc-dialog-min-width: 45vw;
        --mdc-dialog-max-width: 45vw;
        --mdc-dialog-surface-fill-color: var(--growspace-card-bg);
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        padding: var(--spacing-md) 0;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }

      .form-group label {
        font-weight: 500;
        color: var(--primary-text-color);
        font-size: 0.9rem;
      }

      .form-input {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 2px solid var(--divider-color);
        border-radius: var(--border-radius);
        font-family: inherit;
        font-size: 0.9rem;
        transition: var(--transition);
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }

      .form-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
      }

      /* Strain Library Styles - Glassmorphism & Table */
      .strain-search-container {
        position: relative;
        margin-bottom: var(--spacing-md);
      }
      .search-input {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-lg);
        padding-left: 40px;
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: var(--primary-text-color);
        backdrop-filter: blur(10px);
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        transition: var(--transition);
      }
      .search-input:focus {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--primary-color);
        outline: none;
      }
      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        color: var(--secondary-text-color);
        pointer-events: none;
      }

      .strain-table-container {
        background: rgba(255, 255, 255, 0.02);
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        overflow: hidden;
        max-height: 60vh;
        overflow-y: auto;
      }

      .strain-table {
        width: 100%;
        border-collapse: collapse;
      }

      .strain-row {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .strain-row:last-child {
        border-bottom: none;
      }
      .strain-row:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .strain-cell {
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
      }
      .strain-cell.expand-icon {
        width: 40px;
        justify-content: center;
        color: var(--secondary-text-color);
      }
      .strain-cell.content {
        flex: 1;
        font-weight: 500;
        font-size: 1.1rem;
      }
      .strain-cell.actions {
        justify-content: flex-end;
        gap: var(--spacing-sm);
      }

      .pheno-row {
        background: rgba(0, 0, 0, 0.2);
      }
      .pheno-list {
        padding: var(--spacing-sm) var(--spacing-lg);
      }
      .pheno-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm) 0;
        border-bottom: 1px dashed rgba(255,255,255,0.1);
        color: var(--secondary-text-color);
      }
      .pheno-item:last-child {
        border-bottom: none;
      }

      .fab-button {
        position: absolute;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--plant-border-color-default);
        color: var(--growspace-card-text);
        border: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 10;
      }
      .fab-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0,0,0,0.4);
      }
      .fab-button:active {
        transform: scale(0.95);
      }

      /* Add Form Overlay */
      .add-form-overlay {
        position: absolute;
        bottom: 90px;
        right: 24px;
        width: 300px;
        background: var(--card-background-color);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: var(--spacing-md);
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        backdrop-filter: blur(12px);
        z-index: 10;
        animation: slideUp 0.3s ease-out;
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .badge {
        background: rgba(255,255,255,0.1);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        margin-left: 8px;
        color: var(--secondary-text-color);
      }

      /* Clear Confirmation */
      .confirmation-overlay {
        position: absolute;
        bottom: 24px;
        left: 24px;
        background: var(--error-bg);
        border: 1px solid var(--error-border);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: 24px;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: fadeIn 0.2s ease-out;
      }

      .rotate-icon {
         transition: transform 0.3s ease;
      }
      .rotate-icon.expanded {
         transform: rotate(180deg);
      }

      @media (max-width: 600px) {
        .header {
          flex-direction: column;
          align-items: stretch;
        }
        .selector-container {
          justify-content: center;
        }
        /* Switch Grid to List View */
        .grid {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          grid-template-columns: 1fr !important;
          grid-template-rows: auto !important;
        }

        /* Mobile List View for Rich Cards */
        .plant-card-rich {
          min-height: auto;
          aspect-ratio: unset;
          flex-direction: row;
          align-items: center;
          padding: 12px;
          gap: 12px;
        }

        .plant-card-bg {
           /* Turn background into a thumbnail on mobile */
           position: relative;
           width: 64px;
           height: 64px;
           border-radius: 8px;
           flex-shrink: 0;
           background-color: rgba(0,0,0,0.2);
        }

        .plant-card-overlay {
           display: none;
        }

        .plant-card-content {
           flex-direction: row;
           padding: 0;
           align-items: center;
           width: 100%;
           justify-content: space-between;
           gap: 8px;
        }

        .pc-header {
           margin-top: 0;
           align-items: flex-start;
           text-align: left;
           flex: 1;
           gap: 2px;
        }

        .pc-strain-name {
           font-size: 1rem;
        }

        .pc-pheno {
           font-size: 0.85rem;
        }

        .pc-stage {
           margin-top: 2px;
           font-size: 0.85rem;
        }

        .pc-stats {
           width: auto;
           padding: 0;
           gap: 12px;
           flex-shrink: 0;
        }

        .pc-stat-item svg {
           width: 20px;
           height: 20px;
        }

        /* Empty Slot in List View */
        .plant-card-empty {
           min-height: 80px;
           aspect-ratio: unset;
           flex-direction: row;
           justify-content: flex-start;
           padding: 0 24px;
           gap: 16px;
        }

        /* Header vertical stacking */
        .gs-header-top {
            flex-direction: column;
        }
        .gs-stats-chips {
            flex-direction: column;
            width: 100%;
            align-items: stretch;
            gap: 4px;
        }
        .stat-chip {
            width: 100%;
            box-sizing: border-box;
            justify-content: space-between; /* Icon/Value spread */
        }

        /* Mobile specific dialog adjustments */
        ha-dialog.strain-dialog .mdc-dialog__surface {
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
        }
        .fab-button {
            bottom: 16px;
            right: 16px;
        }
        .add-form-overlay {
            bottom: 80px;
            right: 16px;
            left: 16px;
            width: auto;
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .plant {
        animation: fadeIn 0.3s ease-out;
      }

      /* Glassmorphism for Dialogs */
      ha-dialog {
        --mdc-dialog-surface-fill-color: transparent; /* Transparent base for glass effect */
        --mdc-dialog-min-width: 400px;
        --mdc-dialog-max-width: 90vw;
      }

      /* Override internal dialog surface if possible, or we style the content wrapper */
      /* Note: Home Assistant dialogs use mwc-dialog which uses mdc-dialog.
         Directly styling shadow roots is hard, but we can try to influence it via variables
         or style our own container inside. */

      .glass-dialog-container {
        background: var(--growspace-card-bg);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        border-radius: 28px; /* MD3 extra large rounding */
        padding: var(--spacing-lg);
        color: #ffffff; /* Force white text for contrast against dark glass */
        margin: -24px; /* Counteract default dialog padding if necessary */
        min-width: 320px;
      }

      /* MD3 Dialog Layout */
      .dialog-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
        padding-bottom: var(--spacing-md);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .dialog-icon {
        width: 48px;
        height: 48px;
        padding: 12px;
        border-radius: 16px; /* MD3 medium shape */
        background: rgba(var(--stage-color-rgb, 76, 175, 80), 0.2);
        color: var(--stage-color, #4caf50);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .dialog-title-group {
        flex: 1;
      }

      .dialog-title {
        font-size: 1.5rem;
        font-weight: 500; /* MD3 Headline Small */
        margin: 0;
        color: #ffffff;
      }

      .dialog-subtitle {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.7);
        margin-top: 4px;
        text-transform: capitalize;
      }

      /* MD3 Cards inside Dialog */
      .detail-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: var(--spacing-md);
        margin-bottom: var(--spacing-md);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      .detail-card h3 {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* MD3 Input Styles */
      .md3-input-group {
        position: relative;
        margin-bottom: var(--spacing-md);
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px 4px 0 0;
        border-bottom: 1px solid var(--secondary-text-color);
        transition: background 0.2s;
      }

      .md3-input-group:hover {
        background: rgba(255, 255, 255, 0.06);
      }

      .md3-input-group:focus-within {
        background: rgba(255, 255, 255, 0.06);
        border-bottom: 2px solid var(--primary-color);
      }

      .md3-label {
        position: absolute;
        left: 16px;
        top: 8px;
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        pointer-events: none;
        transition: 0.2s;
      }

      .md3-input-group:focus-within .md3-label {
        color: var(--primary-color);
      }

      .md3-input {
        width: 100%;
        padding: 24px 16px 8px;
        border: none;
        background: transparent;
        color: #ffffff;
        font-size: 1rem;
        font-family: inherit;
        box-sizing: border-box;
      }

      .md3-input:focus {
        outline: none;
      }

      /* Button Group & MD3 Buttons */
      .button-group {
        display: flex;
        gap: var(--spacing-sm);
        justify-content: flex-end;
        flex-wrap: wrap;
        margin-top: var(--spacing-lg);
      }

      .md3-button {
        height: 40px;
        padding: 0 24px;
        border-radius: 20px; /* Pill shape */
        border: none;
        font-family: inherit;
        font-weight: 500;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        text-transform: capitalize;
      }

      .md3-button.primary {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }

      .md3-button.primary:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.4);
        filter: brightness(1.1);
      }

      .md3-button.tonal {
        background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.15);
        color: var(--primary-color);
      }

      .md3-button.tonal:hover {
        background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.25);
      }

      .md3-button.text {
        background: transparent;
        color: var(--primary-color);
      }

      .md3-button.text:hover {
        background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.08);
      }

      .md3-button.danger {
        background: transparent;
        color: var(--error-color);
        border: 1px solid rgba(244, 67, 54, 0.5);
      }

      .md3-button.danger:hover {
        background: rgba(244, 67, 54, 0.1);
      }

      /* Specific adjustments for HA Dialog content constraints */
      ha-dialog {
        --mdc-theme-primary: var(--primary-color);
      }

      @media (max-width: 600px) {
        .glass-dialog-container {
            margin: -20px;
            padding: var(--spacing-md);
        }
        .dialog-header {
            flex-direction: column;
            text-align: center;
        }
        .button-group {
            justify-content: center;
        }
      }
    `
  ];
  protected firstUpdated() {
    this.dataService = new DataService(this.hass);
    this.initializeSelectedDevice();
    this._fetchHistory();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('selectedDevice')) {
      this._fetchHistory();
    }
  }

  private async _fetchHistory() {
    if (!this.hass || !this.selectedDevice) return;
    const devices = this.dataService.getGrowspaceDevices();
    const device = devices.find(d => d.device_id === this.selectedDevice);
    if (!device) return;

    let slug = device.name.toLowerCase().replace(/\s+/g, '_');
    if (device.overview_entity_id) {
      slug = device.overview_entity_id.replace('sensor.', '');
    }
    const envEntityId = `binary_sensor.${slug}_optimal_conditions`;

    // Get history for last 24h
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      const history = await this.dataService.getHistory(envEntityId, yesterday, now);
      this._historyData = history;
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  }

  private initializeSelectedDevice() {
    const devices = this.dataService.getGrowspaceDevices();
    if (!devices.length || this.selectedDevice) return;

    // Try to apply default from config
    if (this._config?.default_growspace) {
      const defaultDevice = devices.find(d =>

        d.device_id === this._config.default_growspace ||
        d.name === this._config.default_growspace
      );
      if (defaultDevice) {
        this.selectedDevice = defaultDevice.device_id;
        return;
      }
    }

    // Fallback to first device
    this.selectedDevice = devices[0].device_id;
  }


  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    // path must match where the editor JS is served relative to the card script
    await import("./growspace-manager-card-editor.js");
    const el = document.createElement("growspace-manager-card-editor") as unknown as LovelaceCardEditor;
    return el;
  }
  public static getStubConfig() {
    return {
      default_growspace: "4x4",
      compact: true
    };
  }

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    this._config = config;
    if (this._config.compact !== undefined) {
      this._isCompactView = this._config.compact;
    }
  }

  public getCardSize(): number { return 4; }

  // Event handlers
  private _handleDeviceChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this.selectedDevice = target.value;
  }

  private _handlePlantClick(plant: PlantEntity): void {
    this._plantOverviewDialog = {
      open: true,
      plant,
      editedAttributes: { ...plant.attributes }
    };
  }
  private _handleTakeClone = (motherPlant: PlantEntity) => {
    const plantId = motherPlant.attributes?.plant_id || motherPlant.entity_id.replace('sensor.', '');

    // Call your Home Assistant service to take a clone
    this.hass.callService('growspace_manager', 'take_clone', {
      mother_plant_id: plantId,
      // The service will automatically find an available position in the clone growspace
    }).then(() => {
      console.log(`Clone taken from ${motherPlant.attributes?.strain || 'plant'}`);
    }).catch((error) => {
      console.error(`Failed to take clone: ${error.message}`);
    });
  };

  private getHaDateTimeString(): string {
    // hass.config.time_zone is your Home Assistant timezone
    const tz = this.hass.config.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    return DateTime.now()
      .setZone(tz)                  // Use HA timezone
      .toFormat("yyyy-LL-dd'T'HH:mm"); // Format for datetime-local input
  }

  private _openAddPlantDialog(row: number, col: number) {
    const today = this.getHaDateTimeString();
    const strainLibrary = this.dataService.getStrainLibrary();

    // If library has entries, default to the first one
    const defaultStrain = strainLibrary.length > 0 ? strainLibrary[0].strain : '';
    const defaultPhenotype = strainLibrary.length > 0 ? strainLibrary[0].phenotype : '';

    this._addPlantDialog = {
      open: true,
      row,
      col,
      strain: defaultStrain,
      phenotype: defaultPhenotype,
      veg_start: today,
      flower_start: today,
    };
  }

  private async _confirmAddPlant() {
    if (!this._addPlantDialog || !this.selectedDevice) return;
    if (!this._addPlantDialog.strain) {
      alert('Please enter a strain!');
      return;
    }

    const { row, col, strain, phenotype, veg_start, flower_start } = this._addPlantDialog;

    try {
      const payload = {
        growspace_id: this.selectedDevice,
        row: row + 1,
        col: col + 1,
        strain,
        phenotype,
        veg_start: PlantUtils.formatDateForBackend(veg_start)
          ?? PlantUtils.formatDateForBackend(PlantUtils.getCurrentDateTime()),
        flower_start: PlantUtils.formatDateForBackend(flower_start)
          ?? PlantUtils.formatDateForBackend(PlantUtils.getCurrentDateTime()),
      };
      console.log("Adding plant to growspace:", this.selectedDevice, payload);
      console.log("Adding plant:", payload);
      await this.dataService.addPlant(payload);

      this._addPlantDialog = null;
    } catch (err) {
      console.error('Error adding plant:', err);
    }
  }


  private async _updatePlant() {
    if (!this._plantOverviewDialog) return;

    const { plant, editedAttributes } = this._plantOverviewDialog;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

    const payload: any = { plant_id: plantId };
    const dateFields = ['seedling_start', 'mother_start', 'clone_start', 'veg_start', 'flower_start', 'dry_start', 'cure_start'];

    ['strain', 'phenotype', 'row', 'col', ...dateFields]
      .forEach(field => {
        if (editedAttributes[field] !== undefined && editedAttributes[field] !== null) {
          if (dateFields.includes(field)) {
            const formattedDate = PlantUtils.formatDateForBackend(String(editedAttributes[field]));
            if (formattedDate) {
              payload[field] = formattedDate;
            }
          } else {
            payload[field] = editedAttributes[field];
          }
        }
      });

    try {
      await this.dataService.updatePlant(payload);
      this._plantOverviewDialog = null;
    } catch (err) {
      console.error("Error updating plant:", err);
    }
  }

  private async _handleDeletePlant(plantId: string) {
    if (!confirm("Are you sure you want to delete this plant?")) return;

    try {
      await this.dataService.removePlant(plantId);
      this._plantOverviewDialog = null;
    } catch (err) {
      console.error("Error deleting plant:", err);
    }
  }
  private async _movePlantToNextStage(_: PlantEntity) {
    if (!this._plantOverviewDialog?.plant) {
      console.error("No plant found in overview dialog");
      return;
    }

    const plant = this._plantOverviewDialog.plant;
    const stage = plant.attributes?.stage;
    let targetGrowspace = "";

    const movableStages = new Set(["mother", "flower", "dry", "cure"]);
    if (!stage || !movableStages.has(stage)) {
      alert("Plant must be in mother or flower or dry or cure stage to move. stage is " + stage);
      return;
    }

    // Decide the target growspace

    if (stage === "flower") {
      targetGrowspace = "dry"; // move to curing
    } else if (stage === "dry") {
      targetGrowspace = "cure"; // final harvested
    } else if (stage === "mother") {
      targetGrowspace = "clone"; // move to curing
    }
    else {
      console.error("Unknown stage, cannot move plant", targetGrowspace);
      targetGrowspace = "error"; // fallback to dry
    }

    try {
      const plantId =
        plant.attributes?.plant_id || plant.entity_id.replace("sensor.", "");

      // Call your coordinator/service
      await this.dataService.harvestPlant(plantId, targetGrowspace);

      // Close dialog
      this._plantOverviewDialog = null;
    } catch (err) {
      console.error("Error moving plant to next stage:", err);
    }
  }
  private async _harvestPlant(plantEntity: PlantEntity): Promise<void> {
    await this._movePlantToNextStage(plantEntity);
  }

  private async _finishDryingPlant(plantEntity: PlantEntity): Promise<void> {
    await this._movePlantToNextStage(plantEntity);
  }
  private clonePlant = (motherPlant: PlantEntity, numClones: number) => {
    const plantId = motherPlant.attributes?.plant_id || motherPlant.entity_id.replace('sensor.', '');
    const num_clones = numClones

    // Call your Home Assistant service to take a clone
    this.hass.callService('growspace_manager', 'take_clone', {
      mother_plant_id: plantId,
      num_clones: num_clones,
      // The service will automatically find an available position in the clone growspace
    }).then(() => {
      console.log(`Clone taken from ${motherPlant.attributes?.strain || 'plant'}`);
    }).catch((error) => {
      console.error(`Failed to take clone: ${error.message}`);
    });
  };


  // Strain library methods
  private _openStrainLibraryDialog() {
    const currentStrains = this.dataService.getStrainLibrary();
    this._strainLibraryDialog = {
      open: true,
      view: 'browse',
      strains: currentStrains,
      searchQuery: '',
      editorState: this._createEmptyEditorState()
    };
  }

  private _createEmptyEditorState() {
    return {
      strain: '',
      phenotype: '',
      breeder: '',
      type: '',
      flowering_min: '',
      flowering_max: '',
      lineage: '',
      sex: '',
      description: '',
      image: '',
      image_crop_meta: undefined
    };
  }

  private _switchStrainView(view: 'browse' | 'editor', strainToEdit?: StrainEntry) {
    if (!this._strainLibraryDialog) return;
    this._strainLibraryDialog.view = view;
    this._strainLibraryDialog.isCropping = false; // Reset cropping state

    if (view === 'editor') {
      if (strainToEdit) {
        // Populate editor
        this._strainLibraryDialog.editorState = {
          strain: strainToEdit.strain,
          phenotype: strainToEdit.phenotype || '',
          breeder: strainToEdit.breeder || '',
          type: strainToEdit.type || '',
          flowering_min: strainToEdit.flowering_days_min?.toString() || '',
          flowering_max: strainToEdit.flowering_days_max?.toString() || '',
          lineage: strainToEdit.lineage || '',
          sex: strainToEdit.sex || '',
          description: strainToEdit.description || '',
          image: strainToEdit.image || '',
          image_crop_meta: strainToEdit.image_crop_meta,
          sativa_percentage: strainToEdit.sativa_percentage,
          indica_percentage: strainToEdit.indica_percentage
        };
      } else {
        // Reset editor
        this._strainLibraryDialog.editorState = this._createEmptyEditorState();
      }
    }
    this.requestUpdate();
  }

  private _handleStrainEditorChange(field: string, value: any) {
    if (this._strainLibraryDialog && this._strainLibraryDialog.editorState) {
      (this._strainLibraryDialog.editorState as any)[field] = value;
      this.requestUpdate();
    }
  }

  private _toggleCropMode(active: boolean) {
    if (this._strainLibraryDialog) {
      this._strainLibraryDialog.isCropping = active;
      this.requestUpdate();
    }
  }

  private _toggleImageSelector(isOpen: boolean) {
    if (this._strainLibraryDialog) {
      this._strainLibraryDialog.isImageSelectorOpen = isOpen;
      this.requestUpdate();
    }
  }

  private _handleSelectLibraryImage(imageUrl: string) {
    if (this._strainLibraryDialog && this._strainLibraryDialog.editorState) {
      this._strainLibraryDialog.editorState.image = imageUrl;
      // Close selector

      // Find existing crop meta for this image
      const existing = this._strainLibraryDialog.strains.find(s => s.image === imageUrl && !!s.image_crop_meta);
      if (existing && existing.image_crop_meta) {
        this._strainLibraryDialog.editorState.image_crop_meta = { ...existing.image_crop_meta };
      } else {
        this._strainLibraryDialog.editorState.image_crop_meta = undefined;
      }

      this._strainLibraryDialog.isImageSelectorOpen = false;
      this.requestUpdate();
    }
  }

  private _toggleLightCycle() {
    this._lightCycleCollapsed = !this._lightCycleCollapsed;
  }

  private _toggleEnvGraph(metric: string) {
    const newSet = new Set(this._activeEnvGraphs);
    if (newSet.has(metric)) {
      newSet.delete(metric);
    } else {
      newSet.add(metric);
    }
    this._activeEnvGraphs = newSet;
    this.requestUpdate();
  }

  private _handleGraphHover(e: MouseEvent, graphId: string, dataPoints: { time: number, value: number }[], rect: DOMRect, unit: string) {
    const x = e.clientX - rect.left;
    const width = rect.width;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const minTime = twentyFourHoursAgo.getTime();
    const maxTime = now.getTime();
    const range = maxTime - minTime;

    const hoveredTime = minTime + (x / width) * range;

    // Find closest data point
    let closest = dataPoints[0];
    let minDiff = Math.abs(hoveredTime - closest.time);

    for (let i = 1; i < dataPoints.length; i++) {
      const diff = Math.abs(hoveredTime - dataPoints[i].time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = dataPoints[i];
      }
    }

    const d = new Date(hoveredTime);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

    // For value, if it's light cycle, we need special handling (passed as unit='ON/OFF' maybe?)
    let valStr = `${closest.value} ${unit}`;
    if (unit === 'state') {
      valStr = closest.value === 1 ? 'ON' : 'OFF';
    }

    this._tooltip = {
      id: graphId,
      x: x,
      time: timeStr,
      value: valStr
    };
  }

  private renderEnvGraph(metricKey: string, color: string, title: string, unit: string): TemplateResult {
    if (!this._historyData || this._historyData.length === 0) return html``;

    const getValue = (ent: any, key: string) => {
      if (!ent || !ent.attributes) return undefined;
      if (ent.attributes[key] !== undefined) return ent.attributes[key];
      if (ent.attributes.observations && typeof ent.attributes.observations === 'object') {
        return ent.attributes.observations[key];
      }
      return undefined;
    };

    const sortedHistory = [...this._historyData].sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime());
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const dataPoints: { time: number, value: number }[] = [];

    sortedHistory.forEach(h => {
      const t = new Date(h.last_changed).getTime();
      if (t < twentyFourHoursAgo.getTime()) return;
      const val = getValue(h, metricKey);
      if (val !== undefined && !isNaN(parseFloat(val))) {
        dataPoints.push({ time: t, value: parseFloat(val) });
      }
    });

    if (dataPoints.length < 2) return html``;

    const width = 1000;
    const height = 100;
    const minVal = Math.min(...dataPoints.map(d => d.value));
    const maxVal = Math.max(...dataPoints.map(d => d.value));
    const range = maxVal - minVal || 1;

    const paddedMin = minVal - (range * 0.1);
    const paddedMax = maxVal + (range * 0.1);
    const paddedRange = paddedMax - paddedMin;

    const points: [number, number][] = dataPoints.map(d => {
      const x = ((d.time - twentyFourHoursAgo.getTime()) / (24 * 60 * 60 * 1000)) * width;
      const y = height - ((d.value - paddedMin) / paddedRange) * height;
      return [x, y];
    });

    const svgPath = `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')}`;

    return html`
      <div class="gs-light-cycle-card" style="margin-top: 12px; border: 1px solid ${color}40;">
         <div class="gs-light-header-row" @click=${() => this._toggleEnvGraph(metricKey)}>
             <div class="gs-light-title" style="font-size: 1.2rem;">
                 <div class="gs-icon-box" style="color: ${color}; background: ${color}10; border-color: ${color}30; width: 36px; height: 36px;">
                      <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiMagnify}"></path></svg>
                 </div>
                 <div>
                    <div>${title}</div>
                    <div class="gs-light-subtitle">24H HISTORY • ${minVal.toFixed(1)} - ${maxVal.toFixed(1)} ${unit}</div>
                 </div>
             </div>
             <div style="opacity: 0.7;">
                <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiChevronDown}"></path></svg>
             </div>
         </div>

         <div class="gs-chart-container" style="height: 100px;"
              @mousemove=${(e: MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        this._handleGraphHover(e, metricKey, dataPoints, rect, unit);
      }}
              @mouseleave=${() => this._tooltip = null}>

             ${this._tooltip && this._tooltip.id === metricKey ? html`
                 <div class="gs-cursor-line" style="left: ${this._tooltip.x}px;"></div>
                 <div class="gs-tooltip" style="left: ${this._tooltip.x}px;">
                    <div class="time">${this._tooltip.time}</div>
                    <div>${this._tooltip.value}</div>
                 </div>
             ` : ''}

             <svg class="gs-chart-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
                 <defs>
                     <linearGradient id="grad-${metricKey}" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" style="stop-color:${color};stop-opacity:0.5" />
                         <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
                     </linearGradient>
                 </defs>
                 <path class="chart-line" d="${svgPath}" style="stroke: ${color};" />
                 <path class="chart-gradient-fill" d="${svgPath} V 100 H 0 Z" style="fill: url(#grad-${metricKey});" />
             </svg>
             <div class="chart-markers">
                <span>-24H</span>
                <span>NOW</span>
             </div>
         </div>
      </div>
    `;
  }

  private _setStrainSearchQuery(query: string) {
    if (this._strainLibraryDialog) {
      this._strainLibraryDialog.searchQuery = query;
      this.requestUpdate();
    }
  }

  private _toggleAddStrainForm() {
    // Legacy method removed or kept empty
  }

  private _promptClearAll() {
    // Removed logic
  }

  private _cancelClearAll() {
    // Removed logic
  }

  private async _addStrain() {
    if (!this._strainLibraryDialog?.editorState?.strain) return;

    const s = this._strainLibraryDialog.editorState;

    const payload = {
      strain: s.strain,
      phenotype: s.phenotype,
      breeder: s.breeder,
      type: s.type,
      flowering_days_min: s.flowering_min ? parseInt(s.flowering_min) : undefined,
      flowering_days_max: s.flowering_max ? parseInt(s.flowering_max) : undefined,
      lineage: s.lineage,
      sex: s.sex,
      description: s.description,
      image: s.image,
      image_crop_meta: s.image_crop_meta,
      sativa_percentage: s.sativa_percentage,
      indica_percentage: s.indica_percentage
    };

    try {
      await this.dataService.addStrain(payload);

      // Refetch library to update list or optimistic update
      const key = `${s.strain}|${s.phenotype || 'default'}`;
      const newEntry: StrainEntry = {
        key: key,
        strain: s.strain,
        phenotype: s.phenotype,
        breeder: s.breeder,
        type: s.type,
        flowering_days_min: payload.flowering_days_min,
        flowering_days_max: payload.flowering_days_max,
        lineage: s.lineage,
        sex: s.sex,
        description: s.description,
        image: s.image,
        image_crop_meta: s.image_crop_meta,
        sativa_percentage: s.sativa_percentage,
        indica_percentage: s.indica_percentage
      };

      // Remove existing if update (naive check by key)
      this._strainLibraryDialog.strains = this._strainLibraryDialog.strains.filter(ex => ex.key !== key);
      this._strainLibraryDialog.strains.push(newEntry);

      // Switch back to browse
      this._switchStrainView('browse');

    } catch (err) {
      console.error("Error adding strain:", err);
    }
  }

  private async _removeStrain(strainKey: string) {
    if (!this._strainLibraryDialog) return;

    try {
      // The key is constructed as "Strain|Phenotype" or "Strain|default" in data-service
      const parts = strainKey.split('|');
      const strain = parts[0];
      const phenotype = parts.length > 1 && parts[1] !== 'default' ? parts[1] : undefined;

      await this.dataService.removeStrain(strain, phenotype);

      this._strainLibraryDialog.strains = this._strainLibraryDialog.strains.filter(s => s.key !== strainKey);
      this.requestUpdate();
    } catch (err) {
      console.error("Error removing strain:", err);
    }
  }

  private async _clearStrains() {
    await this.dataService.clearStrainLibrary();
    if (this._strainLibraryDialog) {
      this._strainLibraryDialog.strains = [];
      this._strainLibraryDialog.confirmClearAll = false;
      this.requestUpdate();
    }
  }

  private updateGrid(): void {
    // Refresh data from Home Assistant
    this.dataService = new DataService(this.hass);

    // Force Lit to re-render
    this.requestUpdate();
  }
  // Drag and drop handlers
  private _handleDragStart(e: DragEvent, plant: PlantEntity) {
    this._draggedPlant = plant;
    e.dataTransfer?.setData("text/plain", JSON.stringify({ id: plant.entity_id }));
    const target = e.target as HTMLElement;
    target.classList.add('dragging');
  }

  private _handleDragEnd(e: DragEvent) {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  private async _handleDrop(
    e: DragEvent,
    targetRow: number,
    targetCol: number,
    targetPlant: PlantEntity | null
  ) {
    e.preventDefault();
    if (!this._draggedPlant || !this.selectedDevice) return;

    const sourcePlant = this._draggedPlant;
    this._draggedPlant = null;

    try {
      if (targetPlant) {
        const sourceId = sourcePlant.attributes.plant_id || sourcePlant.entity_id.replace("sensor.", "");
        const targetId = targetPlant.attributes.plant_id || targetPlant.entity_id.replace("sensor.", "");

        // Call backend swap function (atomic, correct)
        await this.hass.callService("growspace_manager", "switch_plants", {
          plant1_id: sourceId,
          plant2_id: targetId,
        });

        // Ask HA for updated state
        this.updateGrid();
      } else {
        // Move plant to empty slot
        await this._movePlant(sourcePlant, targetRow, targetCol);
      }
    } catch (err) {
      console.error("Error during drag-and-drop:", err);
    }
  }


  private async _movePlant(plant: PlantEntity, newRow: number, newCol: number) {
    try {
      const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
      await this.dataService.updatePlant({
        plant_id: plantId,
        row: newRow,
        col: newCol,
      });
    } catch (err) {
      console.error("Error moving plant:", err);
    }
  }
  _moveClonePlant(plant: PlantEntity, targetGrowspace: string) {
    this.hass.callService('growspace_manager', 'move_clone', {
      plant_id: plant.attributes.plant_id,
      target_growspace_id: targetGrowspace
    }).then(() => {
      console.log(`Moved clone ${plant.attributes.friendly_name} to ${targetGrowspace}`);
      // Optionally refresh local state
      this._plantOverviewDialog = null;
    }).catch((err) => {
      console.error('Error moving clone:', err);
    });
  }

  // Configuration Dialog Methods
  private _openConfigDialog() {
    this._configDialog = {
      open: true,
      currentTab: 'add_growspace',
      addGrowspaceData: { name: '', rows: 3, plants_per_row: 3, notification_service: '' },
      environmentData: { selectedGrowspaceId: '', temp_sensor: '', humidity_sensor: '', vpd_sensor: '', co2_sensor: '', light_sensor: '', fan_switch: '' },
      globalData: { weather_entity: '', lung_room_temp: '', lung_room_humidity: '' }
    };
  }

  private _handleAddGrowspaceSubmit() {
    if (!this._configDialog) return;
    const d = this._configDialog.addGrowspaceData;
    if (!d.name) { alert('Name is required'); return; }
    this.dataService.addGrowspace(d)
      .then(() => { this._configDialog = null; this.requestUpdate(); })
      .catch(e => alert(`Error: ${e.message}`));
  }

  private _handleEnvSubmit() {
    if (!this._configDialog) return;
    const d = this._configDialog.environmentData;
    if (!d.selectedGrowspaceId || !d.temp_sensor || !d.humidity_sensor || !d.vpd_sensor) {
      alert('Growspace and required sensors (Temp, Hum, VPD) are mandatory');
      return;
    }
    this.dataService.configureGrowspaceSensors({
      growspace_id: d.selectedGrowspaceId,
      temperature_sensor: d.temp_sensor,
      humidity_sensor: d.humidity_sensor,
      vpd_sensor: d.vpd_sensor,
      co2_sensor: d.co2_sensor || undefined,
      light_sensor: d.light_sensor || undefined,
      fan_switch: d.fan_switch || undefined
    })
      .then(() => { this._configDialog = null; this.requestUpdate(); })
      .catch(e => alert(`Error: ${e.message}`));
  }

  private _handleGlobalSubmit() {
    if (!this._configDialog) return;
    const d = this._configDialog.globalData;
    this.dataService.configureGlobalSettings(d)
      .then(() => { this._configDialog = null; this.requestUpdate(); })
      .catch(e => alert(`Error: ${e.message}`));
  }


  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }


    this.dataService = new DataService(this.hass);
    const devices = this.dataService.getGrowspaceDevices();

    if (!devices.length) {
      return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;
    }

    // Apply default growspace logic
    if (!this._defaultApplied && this._config?.default_growspace) {
      const match = devices.find(d =>
        d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
      );
      if (match) this.selectedDevice = match.device_id;
      this._defaultApplied = true;
    }

    if (!this.selectedDevice || !devices.find(d => d.device_id === this.selectedDevice)) {
      this.selectedDevice = devices[0].device_id;
    }

    const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;
    }

    // Check if growspace is empty

    /*if (selectedDeviceData.plants.length === ) {
      return html`
        <ha-card>
          <div class="no-data" style="text-align:center; padding: 1.5rem;">
            Growspace <strong>${selectedDeviceData.name}</strong> is currently empty.
          </div>
        </ha-card>
      `;
    }
    */
    const growspaceOptions: Record<string, string> = {};
    const growspaces = this.hass.states['sensor.growspaces_list']?.attributes?.growspaces;
    if (growspaces) {
      Object.entries(growspaces).forEach(([id, name]) => {
        growspaceOptions[id] = name as string;
      });
    }
    // Calculate grid layout
    const effectiveRows = PlantUtils.calculateEffectiveRows(selectedDeviceData);
    const { grid } = PlantUtils.createGridLayout(
      selectedDeviceData.plants,
      effectiveRows,
      selectedDeviceData.plants_per_row
    );

    const isWide = selectedDeviceData.plants_per_row > 6;
    const strainLibrary = this.dataService.getStrainLibrary();

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        <div class="unified-growspace-card">
          ${this.renderHeader(devices)}
          ${!this._isCompactView ? this.renderGrowspaceHeader(selectedDeviceData) : ''}
          ${this.renderGrid(grid, effectiveRows, selectedDeviceData.plants_per_row, strainLibrary)}
        </div>
      </ha-card>
      
      ${this.renderDialogs()}
    `;
  }

  private renderGrowspaceHeader(device: GrowspaceDevice): TemplateResult {
    const dominant = PlantUtils.getDominantStage(device.plants);
    const devices = this.dataService.getGrowspaceDevices();

    // Fetch Environmental Data
    let slug = device.name.toLowerCase().replace(/\s+/g, '_');
    if (device.overview_entity_id) {
      slug = device.overview_entity_id.replace('sensor.', '');
    }
    const envEntityId = `binary_sensor.${slug}_optimal_conditions`;
    const envEntity = this.hass.states[envEntityId];

    // Helper to get attribute from either top-level or nested 'observations'
    const getValue = (ent: any, key: string) => {
      if (!ent || !ent.attributes) return undefined;
      // 1. Check top level
      if (ent.attributes[key] !== undefined) return ent.attributes[key];
      // 2. Check nested 'observations' (if it exists and is an object)
      if (ent.attributes.observations && typeof ent.attributes.observations === 'object') {
        return ent.attributes.observations[key];
      }
      return undefined;
    };

    const temp = getValue(envEntity, 'temperature');
    const hum = getValue(envEntity, 'humidity');
    const vpd = getValue(envEntity, 'vpd');
    const co2 = getValue(envEntity, 'co2');

    // Light Status Logic with History
    const isLightsOnValue = getValue(envEntity, 'is_lights_on');
    const hasLightSensor = isLightsOnValue !== undefined && isLightsOnValue !== null;
    const isLightsOn = isLightsOnValue === true;

    let svgPath = "";
    let lastOnTime = "--:--";
    let lastOffTime = "--:--";
    let lastOnAmPm = "";
    let lastOffAmPm = "";

    // Target Cycle Logic
    const hasFlower = device.plants.some(p => p.attributes.stage === 'flower');
    const targetCycle = hasFlower ? '12/12 Cycle' : '18/6 Cycle';

    let transitions: { time: number, state: boolean }[] = [];

    if (this._historyData && this._historyData.length > 0) {
      // Sort history Oldest -> Newest for graph building
      const sortedHistory = [...this._historyData].sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime());

      // Filter for light state changes
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Build path
      const width = 1000;
      const height = 100;
      const points: [number, number][] = [];

      // Initial state (before history window) - infer from first entry or assume off?
      // Ideally look at the state just before the window, but here we take the first point in window
      // If first point is ON, it means it turned ON at that time? No, it means state changed.
      // DataService uses history/period, so it returns state changes.

      // We need the state at T-24h.
      // For simplicity, we'll assume the state at T-24h is the inverse of the first change found,
      // or if no changes, the current state (constant).

      let currentState = sortedHistory.length > 0 ? (getValue(sortedHistory[0], 'is_lights_on') === true ? false : true) : isLightsOn;
      // Actually, a better heuristic: if the first history entry says "ON", it means it turned ON then. So before that it was OFF.

      // If history is sparse, we might need to be careful.
      // Let's scan through and record transitions.

      sortedHistory.forEach(h => {
        const t = new Date(h.last_changed).getTime();
        const s = getValue(h, 'is_lights_on') === true;
        if (t >= twentyFourHoursAgo.getTime()) {
          transitions.push({ time: t, state: s });
        }
      });

      // Determine initial state at -24h
      if (transitions.length > 0) {
        // If the first transition in the window is TO 'true', then before that it was 'false'
        currentState = !transitions[0].state;
      } else {
        currentState = isLightsOn; // No changes in 24h
      }

      // Start point
      points.push([0, currentState ? 0 : height]);

      transitions.forEach(tr => {
        const x = ((tr.time - twentyFourHoursAgo.getTime()) / (24 * 60 * 60 * 1000)) * width;
        // Draw horizontal line from previous x to current x
        points.push([x, currentState ? 0 : height]);
        // Update state
        currentState = tr.state;
        // Vertical line is implicit in the next horizontal segment starting at same x but new y
        points.push([x, currentState ? 0 : height]);
      });

      // Final point at 'now'
      points.push([width, currentState ? 0 : height]);

      svgPath = `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')}`;

      // Calculate Last ON / OFF Times
      // We need the *latest* transition to ON and the *latest* transition to OFF
      // Scan history (Newest -> Oldest)
      const reversedHistory = [...sortedHistory].reverse();

      const lastOn = reversedHistory.find(h => getValue(h, 'is_lights_on') === true);
      if (lastOn) {
        const d = new Date(lastOn.last_changed);
        lastOnTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/ [AP]M/, '');
        lastOnAmPm = d.toLocaleTimeString([], { hour12: true }).slice(-2);
      }

      const lastOff = reversedHistory.find(h => getValue(h, 'is_lights_on') === false);
      if (lastOff) {
        const d = new Date(lastOff.last_changed);
        lastOffTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/ [AP]M/, '');
        lastOffAmPm = d.toLocaleTimeString([], { hour12: true }).slice(-2);
      }
    }

    return html`
      <div class="gs-stats-container">
         <div class="gs-header-top">
            <div class="gs-title-group">
               <!-- Title as Dropdown if no default is set -->
               ${!this._config?.default_growspace ? html`
                 <select class="growspace-select-header" .value=${this.selectedDevice || ''} @change=${this._handleDeviceChange}>
                    ${devices.map(d => html`<option value="${d.device_id}">${d.name}</option>`)}
                 </select>
               ` : html`
                 <h3 class="gs-title">${device.name}</h3>
               `}

               ${dominant ? html`
               <div class="gs-stage-chip">
                 <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${PlantUtils.getPlantStageIcon(dominant.stage)}"></path></svg>
                 ${dominant.stage.charAt(0).toUpperCase() + dominant.stage.slice(1)} • Day ${dominant.days}
               </div>
               ` : ''}
            </div>

            <div class="gs-stats-chips">
                ${temp !== undefined ? html`
                   <div class="stat-chip ${this._activeEnvGraphs.has('temperature') ? 'active' : ''}"
                        @click=${() => this._toggleEnvGraph('temperature')}>
                     <svg viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>${temp}°C
                   </div>` : ''}
                ${hum !== undefined ? html`
                   <div class="stat-chip ${this._activeEnvGraphs.has('humidity') ? 'active' : ''}"
                        @click=${() => this._toggleEnvGraph('humidity')}>
                     <svg viewBox="0 0 24 24"><path d="${mdiWaterPercent}"></path></svg>${hum}%
                   </div>` : ''}
                ${vpd !== undefined ? html`
                   <div class="stat-chip ${this._activeEnvGraphs.has('vpd') ? 'active' : ''}"
                        @click=${() => this._toggleEnvGraph('vpd')}>
                     <svg viewBox="0 0 24 24"><path d="${mdiCloudOutline}"></path></svg>${vpd} kPa
                   </div>` : ''}
                ${co2 !== undefined ? html`
                   <div class="stat-chip ${this._activeEnvGraphs.has('co2') ? 'active' : ''}"
                        @click=${() => this._toggleEnvGraph('co2')}>
                     <svg viewBox="0 0 24 24"><path d="${mdiWeatherCloudy}"></path></svg>${co2} ppm
                   </div>` : ''}

                ${!this._isCompactView ? html`
                   <div class="stat-chip" @click=${this._openStrainLibraryDialog} title="Strain Library">
                      <svg viewBox="0 0 24 24"><path d="${mdiDna}"></path></svg>
                      Strains
                   </div>

                   <div class="stat-chip" @click=${this._openConfigDialog} title="Configure">
                      <svg viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
                      Config
                   </div>

                   <div class="stat-chip" @click=${() => this._isCompactView = true} title="Switch to Compact Mode">
                       <svg viewBox="0 0 24 24"><path d="${mdiMagnify}"></path></svg>
                       Compact
                   </div>
                ` : ''}
            </div>
         </div>

         <!-- Nested Light Cycle Card -->
         ${hasLightSensor ? html`
         <div class="gs-light-cycle-card ${this._lightCycleCollapsed ? 'collapsed' : ''}">
            <div class="gs-light-header-row" @click=${() => this._toggleLightCycle()}>
                <div class="gs-light-title">
                    <div class="gs-icon-box">
                       <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiWeatherSunny}"></path></svg>
                    </div>
                    <div>
                       <div>Light Cycle</div>
                       ${!this._lightCycleCollapsed ? html`<div class="gs-light-subtitle">24H HISTORY</div>` : ''}
                    </div>
                </div>

                ${envEntity ? html`
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div>
                        <div class="light-status-chip ${isLightsOn ? 'on' : 'off'}">
                           <div class="light-status-text">
                               <div class="status-dot"></div>
                               ${isLightsOn ? 'ON' : 'OFF'}
                           </div>
                        </div>
                        ${!this._lightCycleCollapsed ? html`<div class="target-cycle-text">Target: ${targetCycle}</div>` : ''}
                    </div>
                    <div class="rotate-icon ${!this._lightCycleCollapsed ? 'expanded' : ''}" style="opacity: 0.7;">
                        <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiChevronDown}"></path></svg>
                    </div>
                </div>
                ` : ''}
            </div>

            ${!this._lightCycleCollapsed ? html`
            <div class="gs-chart-container"
                @mousemove=${(e: MouseEvent) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            // Need to construct data points for hover logic
            // Re-using the transitions array calculated above would be cleaner but it's inside the if block.
            // I'll reconstruct a simplified points array for the hover handler:
            // [ {time: t, value: 1/0} ... ] using 'transitions'.

            const hoverPoints: { time: number, value: number }[] = [];
            // Add initial state at -24h
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            // Use 'transitions' calculated above
            // Oh wait, transitions is in the upper scope? Yes, inside the function.

            // We need to pass points that represent the state changes.
            // For step line, we should probably pass points at regular intervals or just the transitions?
            // _handleGraphHover finds the closest point. For a step function, we want the value of the interval.
            // So we should look for the transition *before* the hovered time.

            // Let's modify _handleGraphHover or create a specific one?
            // Or just feed it enough points?
            // Actually, if we feed it transitions, "closest" might be the transition *after*.

            // Let's implement a custom hover for light cycle here inline or adapt logic.
            // I will use _handleGraphHover but I need to adapt the logic for step function.
            // Actually, let's just use the transitions array.

            const hoverPointsLocal = transitions.map(t => ({ time: t.time, value: t.state ? 1 : 0 }));
            // Add start point
            // Transitions only has changes within window.
            // Need to insert start point at -24h
            // 'transitions' is defined in the scope above.

            // Wait, if I use _handleGraphHover with discrete points, it finds the closest point.
            // If I hover between two points 6 hours apart, it will snap to one.
            // That's fine for now, or I can refine _handleGraphHover to support 'step' interpolation.

            // Let's stick to _handleGraphHover for consistency but populate it well.
            // Or better: pass the transitions and let a specialized handler deal with it?
            // I'll stick to generic for now, but ensure we have points.

            if (hoverPointsLocal.length === 0 || hoverPointsLocal[0].time > twentyFourHoursAgo.getTime()) {
              // Add the initial state point
              // We don't have 'currentState' variable available here easily (it was mutated in loop)
              // But we know 'transitions' and we calculated 'currentState' before loop.
              // It's tricky because of scope mutation.

              // Let's just rely on the 'transitions' array and add the start/end points.
              // But I can't easily access the initial state derived above without refactoring.
              // However, I can re-derive or just use what I have.

              // Hack: I'll just pass the transitions. The user will see the time of the switch.
              // If they hover in between, they snap to the switch.
              // "Time: 10:30pm Value: ON" -> implies at 10:30pm it turned ON.
            }

            this._handleGraphHover(e, 'light-cycle', hoverPointsLocal, rect, 'state');
          }}
                @mouseleave=${() => this._tooltip = null}
            >
                ${this._tooltip && this._tooltip.id === 'light-cycle' ? html`
                    <div class="gs-cursor-line" style="left: ${this._tooltip.x}px;"></div>
                    <div class="gs-tooltip" style="left: ${this._tooltip.x}px;">
                        <div class="time">${this._tooltip.time}</div>
                        <div>${this._tooltip.value}</div>
                    </div>
                ` : ''}

                <svg class="gs-chart-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:var(--primary-light-color, #FFEB3B);stop-opacity:0.5" />
                            <stop offset="100%" style="stop-color:var(--primary-light-color, #FFEB3B);stop-opacity:0" />
                        </linearGradient>
                    </defs>
                    <path class="chart-line" d="${svgPath}" />
                    <path class="chart-gradient-fill" d="${svgPath} V 100 H 0 Z" />
                </svg>
                <div class="chart-markers">
                   <span>-24H</span>
                   <span>-18H</span>
                   <span>-12H</span>
                   <span>-6H</span>
                   <span>NOW</span>
                </div>
            </div>

            <!-- Bottom Cards -->
            <div class="gs-action-cards">
                <div class="action-card">
                    <div class="ac-content">
                        <div class="ac-icon on">
                            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiWeatherSunny}"></path></svg>
                        </div>
                        <div class="ac-text">
                            <h4>LIGHT ON</h4>
                            <div class="time">${lastOnTime} <span>${lastOnAmPm}</span></div>
                        </div>
                    </div>
                    <div class="ac-arrow">
                        <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
                    </div>
                </div>

                <div class="action-card">
                    <div class="ac-content">
                        <div class="ac-icon off">
                            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiWeatherNight}"></path></svg>
                        </div>
                        <div class="ac-text">
                            <h4>LIGHT OFF</h4>
                            <div class="time">${lastOffTime} <span>${lastOffAmPm}</span></div>
                        </div>
                    </div>
                    <div class="ac-arrow">
                         <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
                    </div>
                </div>
            </div>
            ` : ''}
         </div>
         ` : ''}

         <!-- Active Environmental Graphs -->
         ${this._activeEnvGraphs.has('temperature') ? this.renderEnvGraph('temperature', '#FF5722', 'Temperature', '°C') : ''}
         ${this._activeEnvGraphs.has('humidity') ? this.renderEnvGraph('humidity', '#2196F3', 'Humidity', '%') : ''}
         ${this._activeEnvGraphs.has('vpd') ? this.renderEnvGraph('vpd', '#9C27B0', 'VPD', 'kPa') : ''}
         ${this._activeEnvGraphs.has('co2') ? this.renderEnvGraph('co2', '#90A4AE', 'CO2', 'ppm') : ''}

      </div>
    `;
  }

  private renderHeader(devices: GrowspaceDevice[]): TemplateResult {
    if (!this._isCompactView && !this._config?.title) {
      return html``;
    }

    const selectedDevice = devices.find(d => d.device_id === this.selectedDevice);

    return html`
      <div class="header">
        ${this._config?.title ? html`<h2 class="header-title">${this._config.title}</h2>` : ''}
        
        ${this._isCompactView ? html`
        <div class="selector-container">
          ${!this._config?.default_growspace ? html`
            <label for="device-select">Growspace:</label>
            <select 
              id="device-select" 
              class="growspace-select"
              .value=${this.selectedDevice || ''} 
              @change=${this._handleDeviceChange}
            >
              ${devices.map(d => html`<option value="${d.device_id}">${d.name}</option>`)}
            </select>
          ` : html`
            <label for="device-select">Growspace:</label>
            <!-- Even if default is set, user wants dropdown in compact mode -->
            <select
              id="device-select"
              class="growspace-select"
              .value=${this.selectedDevice || ''}
              @change=${this._handleDeviceChange}
            >
              ${devices.map(d => html`<option value="${d.device_id}">${d.name}</option>`)}
            </select>
          `}
        </div>

        <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
          <div class="view-toggle">
            <input 
              type="checkbox" 
              id="compact-view" 
              .checked=${this._isCompactView}
              @change=${(e: Event) => this._isCompactView = (e.target as HTMLInputElement).checked}
            >
            <label for="compact-view">Compact</label>
          </div>
          
          <button class="action-button" @click=${this._openStrainLibraryDialog}>
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiDna}"></path>
            </svg>
            Strains
          </button>
        </div>
        ` : ''}
      </div>
    `;
  }

  private renderGrid(grid: (PlantEntity | null)[][], rows: number, cols: number, strainLibrary: StrainEntry[]): TemplateResult {
    return html`
      <div class="grid ${this._isCompactView ? 'compact' : ''}" 
           style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
        ${grid.flat().map((plant, index) => {
      const row = Math.floor(index / cols) + 1;
      const col = (index % cols) + 1;

      if (!plant) {
        return this.renderEmptySlot(row, col);
      }

      return this.renderPlantSlot(plant, row, col, strainLibrary);
    })}
      </div>
    `;
  }

  private renderEmptySlot(row: number, col: number): TemplateResult {
    return html`
      <div 
        class="plant-card-empty"
        style="grid-row: ${row}; grid-column: ${col}" 
        @click=${() => this._openAddPlantDialog(row - 1, col - 1)}
        @dragover=${this._handleDragOver}
        @drop=${(e: DragEvent) => this._handleDrop(e, row, col, null)}
      >
        <div class="plant-header">
          <svg style="width: 48px; height: 48px; opacity: 0.5; fill: currentColor;" viewBox="0 0 24 24">
            <path d="${mdiPlus}"></path>
          </svg>
        </div>
        <div style="font-weight: 500; opacity: 0.8;">Add Plant</div>
      </div>
    `;
  }

  private renderPlantSlot(plant: PlantEntity, row: number, col: number, strainLibrary: StrainEntry[]): TemplateResult {
    // If we are in mobile/compact list mode, use the old renderer structure (modified class names if needed)
    // The query logic in CSS handles `.plant` but we are changing to `.plant-card-rich`.
    // Actually, mobile view (<600px) has CSS for `.plant`.
    // To preserve mobile view, we need to check if we are on mobile or ensure the new class supports the list view via media query.
    // The request said "list view behaviour should stay on mobile".
    // The media query targets `.plant`. I should probably keep using `.plant` class on the container or duplicate styles.
    // I'll add `plant` class to the rich card as well to inherit mobile styles if needed,
    // BUT the structure is different.

    // Actually, on mobile, the grid is forced to column.
    // I should create a separate render path for mobile if I want to strictly preserve the "list" look,
    // OR ensure the new card looks good in a list.
    // The request says "list view behaviour should stay".
    // I'll assume that means the "layout" (icon left, text right).
    // The new structure (bg image, overlay) works well for cards.
    // If I use the new card structure on mobile, it will look like a stack of cards.
    // The user might want that? "match the design".
    // "mostly take the positioning and what gets displayed but make it in the same style"
    // So likely the card design applies everywhere, just the Grid vs List layout changes.

    // I will use the new card structure.

    const stageColor = PlantUtils.getPlantStageColor(plant.state);

    // Resolve Image
    const strainName = plant.attributes?.strain;
    const pheno = plant.attributes?.phenotype;

    let imageUrl: string | undefined;
    if (strainName) {
      // Look for specific pheno match first
      const phenoMatch = strainLibrary.find(s => s.strain === strainName && s.phenotype === pheno);
      if (phenoMatch && phenoMatch.image) {
        imageUrl = phenoMatch.image;
      } else {
        // Fallback to strain default
        const strainMatch = strainLibrary.find(s => s.strain === strainName && (!s.phenotype || s.phenotype === 'default'));
        if (strainMatch && strainMatch.image) {
           imageUrl = strainMatch.image;
        } else if (!imageUrl) {
           // Any match?
           const anyMatch = strainLibrary.find(s => s.strain === strainName && s.image);
           if (anyMatch) imageUrl = anyMatch.image;
        }
      }
    }

    const bgStyle = imageUrl ? `background-image: url('${imageUrl}');` : '';

    return html`
      <div 
        class="plant-card-rich"
        style="grid-row: ${row}; grid-column: ${col}; --stage-color: ${stageColor}" 
        draggable="true"
        @dragstart=${(e: DragEvent) => this._handleDragStart(e, plant)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${(e: DragEvent) => this._handleDrop(e, row, col, plant)}
        @click=${() => this._handlePlantClick(plant)}
      >
        ${imageUrl ? html`<div class="plant-card-bg" style="${bgStyle}"></div>
                          <div class="plant-card-overlay"></div>` : ''}

        <div class="plant-card-content">
            <div class="pc-header">
                <div class="pc-strain-name" title="${plant.attributes?.strain || ''}">
                    ${plant.attributes?.strain || 'Unknown Strain'}
                </div>
                ${plant.attributes?.phenotype ? html`<div class="pc-pheno">${plant.attributes.phenotype}</div>` : ''}
                <div class="pc-stage">
                    ${plant.state || 'Unknown'}
                </div>
            </div>

            <div class="pc-stats">
               ${this.renderPlantDaysRich(plant)}
            </div>
        </div>
      </div>
    `;
  }

  private renderPlantDaysRich(plant: PlantEntity): TemplateResult {
     // We need to show relevant days.
     // Mockup shows two icons at bottom.
     // Likely Veg Days and Flower Days if available, or current stage days?
     // User said "continue to show relevant days like we already do".
     // Existing logic filters and shows all relevant days.
     // I will use that logic but style it for the new card (Icon Top, Text Bottom or similar).

     const days = [
      { days: plant.attributes?.seedling_days, icon: mdiSprout, title: "Seedling", stage: "seedling" },
      { days: plant.attributes?.mother_days, icon: mdiSprout, title: "Mother", stage: "mother" },
      { days: plant.attributes?.clone_days, icon: mdiSprout, title: "Clone", stage: "clone" },
      { days: plant.attributes?.veg_days, icon: mdiSprout, title: "Veg", stage: "vegetative" },
      { days: plant.attributes?.flower_days, icon: mdiFlower, title: "Flower", stage: "flower" },
      { days: plant.attributes?.dry_days, icon: mdiHairDryer, title: "Dry", stage: "dry" },
      { days: plant.attributes?.cure_days, icon: mdiCannabis, title: "Cure", stage: "cure" }
    ].filter(d => d.days !== undefined && d.days !== null); // Filter nulls, let 0 show if relevant? Logic above used d.days which is truthy, so 0 was hidden. I'll stick to truthy.

    const visibleDays = days.filter(d => d.days);

    return html`
        ${visibleDays.map(d => {
            const color = PlantUtils.getPlantStageColor(d.stage);
            return html`
                <div class="pc-stat-item">
                    <svg style="color: ${color};" viewBox="0 0 24 24"><path d="${d.icon}"></path></svg>
                    <div class="pc-stat-text">${d.days}d</div>
                </div>
            `;
        })}
    `;
  }

  private renderDialogs(): TemplateResult {
    const strainLibrary = this.dataService?.getStrainLibrary() || [];
    const growspaceOptions: Record<string, string> = {};
    const growspaces = this.hass.states['sensor.growspaces_list']?.attributes?.growspaces;
    if (growspaces) {
      Object.entries(growspaces).forEach(([id, name]) => {
        growspaceOptions[id] = name as string;
      });
    }

    return html`
      ${DialogRenderer.renderAddPlantDialog(
      this._addPlantDialog,
      strainLibrary,
      {
        onClose: () => this._addPlantDialog = null,
        onConfirm: () => this._confirmAddPlant(),
        onStrainChange: (value) => {
          if (this._addPlantDialog) {
            // When using the dropdown, we now get the unique strain name (string)
            this._addPlantDialog.strain = value;

            // Attempt to pre-fill phenotype from library (first match)
            const entry = strainLibrary.find(s => s.strain === value);
            if (entry && entry.phenotype) {
              this._addPlantDialog.phenotype = entry.phenotype;
            } else {
              // No default phenotype or not found, keep current or clear?
              // Let's clear it if they switched strains, unless they are typing (but this is a select change)
              this._addPlantDialog.phenotype = '';
            }
            this.requestUpdate();
          }
        },
        onPhenotypeChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.phenotype = value; },
        onVegStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.veg_start = value; },
        onFlowerStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.flower_start = value; },
        onRowChange: (value) => {
          if (this._addPlantDialog) {
            const val = parseInt(value);
            if (!isNaN(val) && val > 0) {
              this._addPlantDialog.row = val - 1;
              this.requestUpdate();
            }
          }
        },
        onColChange: (value) => {
          if (this._addPlantDialog) {
            const val = parseInt(value);
            if (!isNaN(val) && val > 0) {
              this._addPlantDialog.col = val - 1;
              this.requestUpdate();
            }
          }
        },
      }
    )}

      ${DialogRenderer.renderPlantOverviewDialog(
      this._plantOverviewDialog,
      growspaceOptions,
      {
        onClose: () => this._plantOverviewDialog = null,
        onUpdate: () => { this._updatePlant(); },
        onDelete: (plantId: string) => { this._handleDeletePlant(plantId); },
        onHarvest: (plantEntity: PlantEntity) => { this._harvestPlant(plantEntity); },
        onClone: (plantEntity: PlantEntity, numClones: number) => { this.clonePlant(plantEntity, numClones); },
        onTakeClone: (plantEntity: PlantEntity, numClones: number) => { this.clonePlant(plantEntity, numClones); },
        onMoveClone: (plant: PlantEntity, targetGrowspace: string) => {
          this.hass.callService('growspace_manager', 'move_clone', {
            plant_id: plant.attributes.plant_id,
            target_growspace_id: targetGrowspace
          }).then(() => {
            console.log(`Clone ${plant.attributes.friendly_name} moved to ${targetGrowspace}`);
            this._plantOverviewDialog = null; // close dialog or refresh state
          }).catch((err) => {
            console.error('Error moving clone:', err);
          });
        },
        onFinishDrying: (plantEntity: PlantEntity) => { this._finishDryingPlant(plantEntity); },
        _harvestPlant: this._harvestPlant.bind(this),
        _finishDryingPlant: this._finishDryingPlant.bind(this),
        onAttributeChange: (key: string, value: any) => {
          if (this._plantOverviewDialog) {
            this._plantOverviewDialog.editedAttributes[key] = value;
          }
        },
      }
    )}

      ${DialogRenderer.renderStrainLibraryDialog(
      this._strainLibraryDialog,
      {
        onClose: () => this._strainLibraryDialog = null,
        onAddStrain: () => this._addStrain(),
        onRemoveStrain: (strainKey) => this._removeStrain(strainKey),
        onClearAll: () => this._clearStrains(),
        onEditorChange: (field, value) => this._handleStrainEditorChange(field, value),
        onSwitchView: (view, strain) => this._switchStrainView(view, strain),
        onSearch: (query) => this._setStrainSearchQuery(query),
        onToggleCropMode: (active) => this._toggleCropMode(active),
        onToggleImageSelector: (isOpen) => this._toggleImageSelector(isOpen),
        onSelectLibraryImage: (img) => this._handleSelectLibraryImage(img),
      }
    )}

      ${DialogRenderer.renderConfigDialog(
      this._configDialog,
      growspaceOptions,
      {
        onClose: () => this._configDialog = null,
        onSwitchTab: (tab) => { if (this._configDialog) { this._configDialog.currentTab = tab; this.requestUpdate(); } },
        onAddGrowspaceChange: (f, v) => { if (this._configDialog) { (this._configDialog.addGrowspaceData as any)[f] = v; this.requestUpdate(); } },
        onAddGrowspaceSubmit: () => this._handleAddGrowspaceSubmit(),
        onEnvChange: (f, v) => { if (this._configDialog) { (this._configDialog.environmentData as any)[f] = v; this.requestUpdate(); } },
        onEnvSubmit: () => this._handleEnvSubmit(),
        onGlobalChange: (f, v) => { if (this._configDialog) { (this._configDialog.globalData as any)[f] = v; this.requestUpdate(); } },
        onGlobalSubmit: () => this._handleGlobalSubmit(),
      }
    )}
    `;
  }


}
