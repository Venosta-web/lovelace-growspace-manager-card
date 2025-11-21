import { LitElement, html, css, unsafeCSS, CSSResultGroup, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { mdiPlus, mdiSprout, mdiFlower, mdiDna, mdiCannabis, mdiHairDryer, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiLightbulbOn, mdiLightbulbOff, mdiThermometer, mdiWaterPercent, mdiWeatherCloudy, mdiCloudOutline } from '@mdi/js';
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
  @state() private selectedDevice: string | null = null;
  @state() private _draggedPlant: PlantEntity | null = null;
  @state() private _isCompactView: boolean = false;
  @state() private _historyData: any[] | null = null;


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

      /* Growspace Header Styles - Glassmorphism & Gradient */
      .growspace-header-card {
        /* Fallback */
        background: rgba(30, 30, 35, 0.6);
        /* Gradient approximating the screenshot */
        background-image: linear-gradient(135deg, rgba(50, 50, 60, 0.8) 0%, rgba(40, 30, 60, 0.8) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);

        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 24px;
        margin-bottom: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: #fff;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
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
        background: linear-gradient(90deg, rgba(255, 235, 59, 0.8), rgba(253, 216, 53, 0.6));
        color: #000;
        box-shadow: 0 0 15px rgba(253, 216, 53, 0.4);
        border: none;
      }

      .light-status-chip.off {
         background: rgba(0, 0, 0, 0.3);
         color: rgba(255, 255, 255, 0.7);
      }

      /* 24h Chart */
      .gs-chart-container {
         margin-top: 8px;
      }

      .gs-chart-label {
         font-size: 0.85rem;
         color: rgba(255, 255, 255, 0.7);
         margin-bottom: 6px;
      }

      .gs-chart-bars {
         display: flex;
         gap: 4px;
         height: 40px;
         width: 100%;
         align-items: flex-end;
      }

      .chart-bar {
         flex: 1;
         height: 100%;
         background: transparent;
         border-radius: 4px;
         border: 1px solid rgba(255, 255, 255, 0.1);
         position: relative;
         overflow: hidden;
      }

      .chart-bar.active {
         background: rgba(255, 235, 59, 0.7); /* Yellowish */
         border: none;
         box-shadow: 0 0 8px rgba(255, 235, 59, 0.3);
      }

      /* Time markers for chart */
      .chart-markers {
         display: flex;
         justify-content: space-between;
         margin-top: 4px;
         font-size: 0.7rem;
         color: rgba(255, 255, 255, 0.5);
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
        border-bottom: 2px solid var(--divider-color);
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
        margin-top: var(--spacing-lg);
        padding: var(--spacing-sm);
      }

      .grid.compact {
        gap: var(--spacing-sm);
      }

      .plant {
        border: 2px solid transparent;
        border-radius: var(--border-radius-md);
        text-align: center;
        padding: var(--spacing-md);
        background: var(--growspace-card-bg);
        box-shadow: var(--card-shadow);
        transition: var(--transition-medium);
        min-height: 100px;
        display: grid; 
          grid-template-columns: 1fr; 
          grid-template-rows: 2fr 1fr 1fr 2fr; 
          gap: 0px 0px; 
          grid-template-areas: 
            "icon"
            "name"
            "stage"
            "days"; 
        align-items: center;
        justify-items: center;
        cursor: pointer;
        aspect-ratio: 1;
        position: relative;
        overflow: hidden;
      }

      .plant::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--plant-border-color-default);
        transition: var(--transition-medium);
      }

      .plant:hover {
        transform: translateY(-4px);
        box-shadow: var(--card-shadow-hover);
        border-color: var(--plant-border-color-default);
      }

      .plant.empty {
        background: var(--growspace-empty-bg);
        border: 2px dashed var(--divider-color);
        opacity: 0.7;
      }

      .plant.empty:hover {
        opacity: 1;
        background: var(--growspace-empty-bg-hover);
        border-color: var(--plant-border-color-default);
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
        font-weight: var(--font-weight-bold);
        color: var(--growspace-card-text);
        font-size: var(--font-size-lg);
        margin-bottom: var(--spacing-xs);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .plant-stage {
        color: var(--stage-color, var(--secondary-text-color));
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--spacing-xs);
        text-transform: capitalize;
      }

      .plant-phenotype {
        color: var(--secondary-text-color);
        font-size: var(--font-size-md);
        margin-bottom: var(--spacing-xs);
        font-style: italic;
      }

      .plant-days {
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
         transform: rotate(90deg);
      }

      @media (max-width: 600px) {
        .header {
          flex-direction: column;
          align-items: stretch;
        }
        .selector-container {
          justify-content: center;
        }
        .grid {
          gap: var(--spacing-sm);
        }
        .plant {
          min-height: 80px;
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
        newStrain: '',
        newPhenotype: '',
        strains: currentStrains,
        searchQuery: '',
        isAddFormOpen: false,
        expandedStrains: [],
        confirmClearAll: false
    };
  }

  private _toggleStrainExpansion(strain: string) {
      if (!this._strainLibraryDialog) return;

      const currentExpanded = this._strainLibraryDialog.expandedStrains || [];
      const isExpanded = currentExpanded.includes(strain);

      if (isExpanded) {
          this._strainLibraryDialog.expandedStrains = currentExpanded.filter(s => s !== strain);
      } else {
          this._strainLibraryDialog.expandedStrains = [...currentExpanded, strain];
      }
      this.requestUpdate();
  }

  private _setStrainSearchQuery(query: string) {
      if (this._strainLibraryDialog) {
          this._strainLibraryDialog.searchQuery = query;
          this.requestUpdate();
      }
  }

  private _toggleAddStrainForm() {
      if (this._strainLibraryDialog) {
          this._strainLibraryDialog.isAddFormOpen = !this._strainLibraryDialog.isAddFormOpen;
          this.requestUpdate();
      }
  }

  private _promptClearAll() {
      if (this._strainLibraryDialog) {
          this._strainLibraryDialog.confirmClearAll = true;
          this.requestUpdate();
      }
  }

  private _cancelClearAll() {
      if (this._strainLibraryDialog) {
          this._strainLibraryDialog.confirmClearAll = false;
          this.requestUpdate();
      }
  }

  private async _addStrain() {
    if (!this._strainLibraryDialog?.newStrain) return;

    const strainName = this._strainLibraryDialog.newStrain;
    const phenotype = this._strainLibraryDialog.newPhenotype;

    try {
      await this.dataService.addStrain(strainName, phenotype);
      // Optimistically update the list
      const key = `${strainName}|${phenotype || 'default'}`;
      const newEntry: StrainEntry = {
        strain: strainName,
        phenotype: phenotype,
        key: key
      };

      if (!this._strainLibraryDialog.strains.some(s => s.key === key)) {
        this._strainLibraryDialog.strains.push(newEntry);
      }
      this._strainLibraryDialog.newStrain = '';
      this._strainLibraryDialog.newPhenotype = '';
      this._strainLibraryDialog.isAddFormOpen = false; // Close form after adding
      this.requestUpdate();
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

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        ${!this._isCompactView ? this.renderGrowspaceHeader(selectedDeviceData) : ''}
        ${this.renderHeader(devices)}
        ${this.renderGrid(grid, effectiveRows, selectedDeviceData.plants_per_row)}
      </ha-card>
      
      ${this.renderDialogs()}
    `;
  }

  private renderGrowspaceHeader(device: GrowspaceDevice): TemplateResult {
    const dominant = PlantUtils.getDominantStage(device.plants);

    // Fetch Environmental Data
    let slug = device.name.toLowerCase().replace(/\s+/g, '_');
    if (device.overview_entity_id) {
       slug = device.overview_entity_id.replace('sensor.', '');
    }
    const envEntityId = `binary_sensor.${slug}_optimal_conditions`;
    const envEntity = this.hass.states[envEntityId];

    const getAttr = (ent: any, attr: string) => ent?.attributes?.[attr];
    const temp = getAttr(envEntity, 'temperature');
    const hum = getAttr(envEntity, 'humidity');
    const vpd = getAttr(envEntity, 'vpd');
    const co2 = getAttr(envEntity, 'co2');

    // Light Status Logic with History
    const isLightsOn = envEntity?.attributes?.is_lights_on === true;
    let durationDisplay = "0h 0m";
    let hourlyStatus: boolean[] = new Array(24).fill(false);

    if (this._historyData && this._historyData.length > 0) {
        // 1. Calculate duration
        // Sort history Newest -> Oldest
        const sortedHistory = [...this._historyData].sort((a, b) => new Date(b.last_changed).getTime() - new Date(a.last_changed).getTime());

        const currentState = isLightsOn;

        // Find the index of the first entry that does NOT match the current state
        // The entry *before* that (index - 1) is the transition TO the current state.
        const mismatchIndex = sortedHistory.findIndex(h => {
            const histLightsOn = h.attributes?.is_lights_on === true;
            return histLightsOn !== currentState;
        });

        let startTime: Date | null = null;

        if (mismatchIndex === 0) {
             // The newest history entry doesn't match current state (lag?), assume just changed
             startTime = new Date();
        } else if (mismatchIndex === -1) {
             // No mismatch found, state has been consistent for the entire history duration
             if (sortedHistory.length > 0) {
                 startTime = new Date(sortedHistory[sortedHistory.length - 1].last_changed);
                 durationDisplay = "> 24h"; // Or calculate from that time
             }
        } else {
             // Found a mismatch at mismatchIndex.
             // The entry at mismatchIndex - 1 is the start of the current block.
             const startEntry = sortedHistory[mismatchIndex - 1];
             startTime = new Date(startEntry.last_changed);
        }

        if (startTime) {
            const diffMs = new Date().getTime() - startTime.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (durationDisplay !== "> 24h") {
                const h = Math.floor(diffMins / 60);
                const m = diffMins % 60;
                durationDisplay = `${h}h ${m}m`;
            }
        }

        // 2. Build hourly status for chart (last 24h)
        const now = new Date();
        for (let i = 0; i < 24; i++) {
            const sampleTime = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
            // Find the latest history entry that is BEFORE sampleTime
            const entry = sortedHistory.find(h => new Date(h.last_changed) <= sampleTime);

            if (entry) {
                hourlyStatus[i] = entry.attributes?.is_lights_on === true;
            } else {
                if (sortedHistory.length > 0) {
                     const oldest = sortedHistory[sortedHistory.length - 1];
                     hourlyStatus[i] = oldest.attributes?.is_lights_on === true;
                }
            }
        }
    }

    return html`
      <div class="growspace-header-card">
         <div class="gs-header-top">
            <div class="gs-title-group">
               <h3 class="gs-title">${device.name}</h3>
               ${dominant ? html`
               <div class="gs-stage-chip">
                 <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${PlantUtils.getPlantStageIcon(dominant.stage)}"></path></svg>
                 ${dominant.stage.charAt(0).toUpperCase() + dominant.stage.slice(1)} • Day ${dominant.days}
               </div>
               ` : ''}
            </div>

            <div class="gs-stats-chips">
                ${temp !== undefined ? html`<div class="stat-chip"><svg viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>${temp}°C</div>` : ''}
                ${hum !== undefined ? html`<div class="stat-chip"><svg viewBox="0 0 24 24"><path d="${mdiWaterPercent}"></path></svg>${hum}%</div>` : ''}
                ${vpd !== undefined ? html`<div class="stat-chip"><svg viewBox="0 0 24 24"><path d="${mdiCloudOutline}"></path></svg>${vpd} kPa</div>` : ''}
                ${co2 !== undefined ? html`<div class="stat-chip"><svg viewBox="0 0 24 24"><path d="${mdiWeatherCloudy}"></path></svg>${co2} ppm</div>` : ''}

                ${envEntity ? html`
                <div class="light-status-chip ${isLightsOn ? 'on' : 'off'}">
                   <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${isLightsOn ? mdiLightbulbOn : mdiLightbulbOff}"></path>
                   </svg>
                   ${isLightsOn ? 'ON' : 'OFF'} • ${durationDisplay}
                </div>
                ` : ''}
            </div>
         </div>

         <div class="gs-chart-container">
            <div class="gs-chart-label">24h Light Cycle</div>
            <div class="gs-chart-bars">
               ${hourlyStatus.map(isOn => html`
                 <div class="chart-bar ${isOn ? 'active' : ''}"></div>
               `)}
            </div>
            <div class="chart-markers">
               <span>-24h</span>
               <span>-12h</span>
               <span>Now</span>
            </div>
         </div>
      </div>
    `;
  }

  private renderHeader(devices: GrowspaceDevice[]): TemplateResult {
    const selectedDevice = devices.find(d => d.device_id === this.selectedDevice);

    return html`
      <div class="header">
        ${this._config?.title ? html`<h2 class="header-title">${this._config.title}</h2>` : ''}
        
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
          ` : html`<span class="selected-growspace">${selectedDevice?.name}</span>`}
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
      </div>
    `;
  }

  private renderGrid(grid: (PlantEntity | null)[][], rows: number, cols: number): TemplateResult {
    return html`
      <div class="grid ${this._isCompactView ? 'compact' : ''}" 
           style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
        ${grid.flat().map((plant, index) => {
      const row = Math.floor(index / cols) + 1;
      const col = (index % cols) + 1;

      if (!plant) {
        return this.renderEmptySlot(row, col);
      }

      return this.renderPlantSlot(plant, row, col);
    })}
      </div>
    `;
  }

  private renderEmptySlot(row: number, col: number): TemplateResult {
    return html`
      <div 
        class="plant empty" 
        style="grid-row: ${row}; grid-column: ${col}" 
        @click=${() => this._openAddPlantDialog(row - 1, col - 1)}
        @dragover=${this._handleDragOver}
        @drop=${(e: DragEvent) => this._handleDrop(e, row, col, null)}
      >
        <div class="plant-header">
          <svg class="plant-icon" viewBox="0 0 24 24">
            <path d="${mdiPlus}"></path>
          </svg>
        </div>
        <div class="plant-name">Add Plant</div>
        <div class="plant-stage">Empty Slot</div>
      </div>
    `;
  }

  private renderPlantSlot(plant: PlantEntity, row: number, col: number): TemplateResult {
    const stageColor = PlantUtils.getPlantStageColor(plant.state);
    const stageIcon = PlantUtils.getPlantStageIcon(plant.state);

    return html`
      <div 
        class="plant" 
        style="grid-row: ${row}; grid-column: ${col}; --stage-color: ${stageColor}" 
        draggable="true"
        @dragstart=${(e: DragEvent) => this._handleDragStart(e, plant)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${(e: DragEvent) => this._handleDrop(e, row, col, plant)}
        @click=${() => this._handlePlantClick(plant)}
      >
        <div class="plant-header">
          <svg class="plant-icon" viewBox="0 0 24 24">
            <path d="${stageIcon}"></path>
          </svg>
        </div>

        <!-- Always render strain slot -->
        <div class="plant-name">
          ${plant.attributes?.strain || '—'}
        </div>

        <!-- Always render phenotype slot -->
        <div class="plant-phenotype">
          ${plant.attributes?.phenotype || '—'}
        </div>

        <!-- Always render state slot -->
        <div class="plant-stage">
          ${plant.state || '—'}
        </div>

        <!-- Always render plant-days slot -->
        <div class="plant-days">
          ${!this._isCompactView ? this.renderPlantDays(plant) : '—'}
        </div>
      </div>
    `;
  }

  private renderPlantDays(plant: PlantEntity): TemplateResult {
    const days = [
      { days: plant.attributes?.seedling_days, icon: mdiSprout, title: "Days in Seedling", stage: "seedling" },
      { days: plant.attributes?.mother_days, icon: mdiSprout, title: "Days in Mother", stage: "mother" },
      { days: plant.attributes?.clone_days, icon: mdiSprout, title: "Days in Clone", stage: "clone" },
      { days: plant.attributes?.veg_days, icon: mdiSprout, title: "Days in Vegetative", stage: "vegetative" },
      { days: plant.attributes?.flower_days, icon: mdiFlower, title: "Days in Flower", stage: "flower" },
      { days: plant.attributes?.dry_days, icon: mdiHairDryer, title: "Days in Dry", stage: "dry" },
      { days: plant.attributes?.cure_days, icon: mdiCannabis, title: "Days in Cure", stage: "cure" }
    ].filter(d => d.days);

    if (!days.length) return html``;

    return html`
      <div class="plant-days">
        ${days.map(({ days, icon, title, stage }) => {
          const color = PlantUtils.getPlantStageColor(stage);
          return html`
            <span title="${title}" style="color: ${color}">
              <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${icon}"></path>
              </svg>
              ${days}d
            </span>
          `;
        })}
      </div>
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
        onNewStrainChange: (value) => {
          if (this._strainLibraryDialog) this._strainLibraryDialog.newStrain = value;
        },
        onNewPhenotypeChange: (value) => {
          if (this._strainLibraryDialog) this._strainLibraryDialog.newPhenotype = value;
        },
        onEnterKey: (e) => { if (e.key === 'Enter') this._addStrain(); },
        onToggleExpand: (strain) => this._toggleStrainExpansion(strain),
        onSearch: (query) => this._setStrainSearchQuery(query),
        onToggleAddForm: () => this._toggleAddStrainForm(),
        onPromptClear: () => this._promptClearAll(),
        onCancelClear: () => this._cancelClearAll()
      }
    )}
    `;
  }


}
