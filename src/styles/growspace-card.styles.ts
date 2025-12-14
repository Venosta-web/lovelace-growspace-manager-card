import { css } from 'lit';

export const growspaceCardStyles = css`
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

  /* Unified Card Container - Glassmorphism 2.0 */
  .unified-growspace-card {
    /* Glass effect provided by .glass-surface .glass-panel */
    display: flex;
    flex-direction: column;
    gap: 24px;
    position: relative;
    overflow: hidden;
  }
  /* Edit Mode Banner */
  .edit-mode-banner {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.25));
    border: 1px solid rgba(76, 175, 80, 0.4);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    animation: slideDown 0.3s ease;
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
    color: #fff;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .banner-content svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  .stat-chip svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
    opacity: 0.8;
    pointer-events: none; /* Ensure key events pass through to chip/container */
  }

  @keyframes pulse-red {
    0% {
      box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
    }
  }

  .stat-chip.status-warning {
    color: #ffa726 !important;
    border-color: rgba(255, 167, 38, 0.5) !important;
    background: rgba(255, 167, 38, 0.1) !important;
  }

  .stat-chip.status-danger {
    color: #ef5350 !important;
    border-color: rgba(239, 83, 80, 0.5) !important;
    background: rgba(239, 83, 80, 0.1) !important;
    animation: pulse-red 2s infinite;
  }
  .banner-actions {
    display: flex;
    gap: 8px;
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
    stroke: var(--primary-light-color, #ffeb3b);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .chart-gradient-fill {
    fill: url(#gradient);
    opacity: 0.2;
  }

  /* Time Range Selector - MD3 Tonal Chips */
  .time-range-selector {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    justify-content: flex-end;
  }
  .range-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.7);
    border-radius: 8px; /* Small rounding for compact look */
    padding: 6px 12px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    letter-spacing: 0.5px;
  }
  .range-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .range-btn.active {
    background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.15);
    color: var(--primary-color, #4caf50);
    border-color: rgba(var(--rgb-primary-color, 76, 175, 80), 0.3);
    font-weight: 600;
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

  /* Accessibility */
  .sr-only-announcer {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .gs-tooltip {
    position: absolute;
    top: 10px;
    background: rgba(30, 30, 35, 0.9);
    color: #fff;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.75rem;
    pointer-events: none;
    transform: translate(-50%, 0);
    z-index: 10;
    white-space: nowrap;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    line-height: 1.4;
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

  .grid {
    display: grid;
    gap: var(--spacing-md);
  }

  .grid.compact {
    gap: var(--spacing-sm);
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

  /* Empty Plant Card Styles */
  .plant-card-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    aspect-ratio: 1;
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    color: var(--secondary-text-color);
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.02);
  }

  .plant-card-empty:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
  }

  .plant-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
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
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
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
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
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
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    z-index: 10;
  }
  .fab-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
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
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    z-index: 10;
    animation: slideUp 0.3s ease-out;
  }
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .badge {
    background: rgba(255, 255, 255, 0.1);
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
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: fadeIn 0.2s ease-out;
  }

  .rotate-icon {
    transition: transform 0.3s ease;
  }
  .rotate-icon.expanded {
    transform: rotate(180deg);
  }

  /* Allow Grid Items to Scale Down (Fix 5-col Overflow) */
  .plant-card-rich,
  .plant-card-empty {
    min-width: 0;
  }

  /* Force List View for Wide Grids on Desktop */
  .grid.force-list-view {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    /* Remove grid template */
    grid-template-columns: 1fr !important;
    grid-template-rows: auto !important;
  }

  .grid.force-list-view .plant-card-rich {
    min-height: auto;
    aspect-ratio: unset;
    flex-direction: row;
    align-items: center;
    padding: 12px;
    gap: 12px;
  }

  .grid.force-list-view .plant-card-bg {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 8px;
    flex-shrink: 0;
    background-color: rgba(0, 0, 0, 0.2);
  }

  .grid.force-list-view .plant-card-overlay {
    display: none;
  }

  .grid.force-list-view .plant-card-content {
    flex-direction: row;
    padding: 0;
    align-items: center;
    width: 100%;
    justify-content: space-between;
    gap: 8px;
  }

  .grid.force-list-view .pc-info {
    margin-top: 0;
    align-items: flex-start;
    text-align: left;
    flex: 1;
    gap: 2px;
  }

  .grid.force-list-view .pc-strain-name {
    font-size: 1rem;
  }

  .grid.force-list-view .pc-pheno {
    font-size: 0.85rem;
  }

  .grid.force-list-view .pc-stage {
    margin-top: 2px;
    font-size: 0.85rem;
  }

  .grid.force-list-view .pc-stats {
    width: auto;
    padding: 0;
    gap: 12px;
    flex-shrink: 0;
  }

  .grid.force-list-view .pc-stat-item svg {
    width: 20px;
    height: 20px;
  }

  .grid.force-list-view .plant-card-empty {
    min-height: 80px;
    aspect-ratio: unset;
    flex-direction: row;
    justify-content: flex-start;
    padding: 0 24px;
    gap: 16px;
  }

  @media (max-width: 600px) {
    .unified-growspace-card {
      padding: 12px;
    }
    .header {
      flex-direction: column;
      align-items: stretch;
    }
    .selector-container {
      justify-content: center;
    }
    /* Switch Grid to List View */
    .grid {
      display: flex !important;
      flex-direction: column !important;
      gap: var(--spacing-sm);
      grid-template-columns: unset !important;
      grid-template-rows: unset !important;
    }

    /* Mobile List View for Rich Cards */
    .plant-card-rich {
      width: 100%;
      box-sizing: border-box;
      min-height: auto;
      aspect-ratio: unset;
      flex-direction: row;
      align-items: center;
      padding: 12px;
      gap: 12px;
    }

    .plant-card-bg {
      /* Turn background into a thumbnail on mobile */
      position: relative !important;
      width: 64px !important;
      height: 64px !important;
      border-radius: 8px;
      flex-shrink: 0;
      background-color: rgba(0, 0, 0, 0.2);
      object-fit: cover !important;
    }

    .plant-card-overlay {
      display: none;
    }

    .plant-card-content {
      position: static;
      z-index: auto;
      display: flex;
      flex: 1;
      min-width: 0;
      width: 100%;
      flex-direction: row;
      padding: 0;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .pc-info {
      display: flex;
      flex-direction: column;
      margin-top: 0;
      align-items: flex-start;
      text-align: left;
      flex: 1;
      gap: 2px;
      min-width: 0;
    }

    .pc-strain-name {
      font-size: 0.9rem;
      color: #fff !important;
      font-weight: 700;
    }

    .pc-pheno {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.7) !important;
    }

    .pc-stage {
      margin-top: 2px;
      font-size: 0.8rem;
      color: var(--stage-color, #fff) !important;
      font-weight: 600;
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

    /* Hide non-current stages on mobile */
    .pc-stat-item:not(.current-stage) {
      display: none;
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
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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


`;
