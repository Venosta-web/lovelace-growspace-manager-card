import { css } from 'lit';

export const headerStyles = css`
  :host {
    display: block;
  }

  .gs-stats-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 24px;
  }

  /* ABSOLUTE OVERLAY TRICK for Auto-Width Select */
  .select-wrapper {
    position: relative;
    display: inline-flex; /* Use inline-flex for tight wrapping */
    align-items: center;
    max-width: 100%;
    vertical-align: middle;
  }

  /* The visible text element that drives width */
  .select-sizer {
    font-family: 'Roboto', sans-serif;
    font-size: 1.75rem;
    font-weight: 400;
    margin: 0;
    line-height: 1.1;
    letter-spacing: -0.01em;
    text-transform: capitalize;
    background: linear-gradient(
      135deg,
      var(--primary-text-color, #ffffff) 0%,
      var(--secondary-text-color, rgba(255, 255, 255, 0.8)) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: pre;
    pointer-events: none;
    visibility: visible;
  }

  /* The functional select element, invisible but clickable */
  .growspace-select-header {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0; /* Invisible */
    cursor: pointer;
    appearance: none;
    font-size: 2.5rem; /* Match size for approximate sizing if fallback */
    margin: 0;
    padding: 0;
  }

  .growspace-select-header option {
    color: initial; /* Reset color for dropdown options */
    background-color: initial;
  }

  /* --- Header Top Section --- */
  .gs-header-top {
    display: grid;
    grid-template-columns: minmax(280px, 25%) minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-items: center;
    gap: 4px 16px;
  }

  .header-title-area {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .header-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .gs-title {
    font-size: 1.75rem;
    font-weight: 400;
    margin: 0;
    line-height: 1.1;
    letter-spacing: -0.01em;
    background: linear-gradient(
      135deg,
      var(--primary-text-color, #ffffff) 0%,
      var(--secondary-text-color, rgba(255, 255, 255, 0.8)) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-meta-row {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 0.78rem;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
    font-variant-numeric: tabular-nums;
  }

  .header-meta-stat .num {
    color: var(--primary-text-color, #fff);
    font-weight: 500;
    margin-right: 3px;
  }

  .header-meta-stat.alert {
    color: #ffb74d;
  }

  .header-meta-stat.alert .num {
    color: #ffb74d;
  }

  /* New component slots */
  growspace-header-actions {
    grid-column: 2;
    grid-row: 1;
  }

  .header-stage-area-wrapper {
    grid-column: 1;
    grid-row: 2;
    display: flex;
    align-items: center;
    min-width: 0;
    position: relative;
    /* height for scroll container consistency */
  }

  /* --- Secondary Strip (Scrollable) --- */
  .secondary-strip-container {
    position: relative;
    border-radius: 16px;
    grid-column: 2;
    min-width: 0;
    width: 100%;
    height: 60px; /* specific height for generic scroll container usage */
    overflow: hidden;
    box-sizing: border-box;
  }

  .secondary-strip {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
    flex: 1;
    width: 100%;
    height: 100%;
    padding: 0 4px;
  }

  .secondary-strip > growspace-chip:first-child {
    margin-left: auto;
  }

  /* --- Mobile stage context (above name, hidden on desktop) --- */
  .mobile-stage-context {
    display: none;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.55));
    margin-bottom: 4px;
  }

  .mobile-stage-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .mobile-stage-sep {
    opacity: 0.35;
  }

  /* --- Mobile & Responsive --- */
  @media (max-width: 600px) {
    .mobile-stage-context {
      display: flex;
    }

    .header-meta-row {
      display: none;
    }

    .gs-header-top {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 8px;
    }

    .header-title-area {
      flex: 1;
      min-width: 0;
      max-width: none;
    }

    .header-actions {
      flex-shrink: 0;
      align-self: flex-start;
    }

    .header-stage-area-wrapper,
    .secondary-strip-container {
      display: none;
    }

    .gs-title {
      font-size: 1.5rem;
    }

    .select-sizer {
      font-size: 1.5rem;
    }
  }
`;
