import { css } from 'lit';

export const plantCardStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
    contain: layout paint style;
  }

  .plant-card-rich {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 16px;
    overflow: hidden;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: var(--glass-border);
    box-shadow: var(--ha-card-box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1));
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    aspect-ratio: 1;
    box-sizing: border-box;
    color: var(--primary-text-color);
    will-change: transform;
    user-select: none;
  }

  /* Stage color bar — 3px accent at top of tile */
  .plant-card-rich::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--stage-color, transparent);
    z-index: 6;
    border-radius: 16px 16px 0 0;
  }

  .plant-card-rich:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    border-color: var(--primary-color, rgba(255, 255, 255, 0.2));
  }
  .plant-card-rich:focus {
    outline: 2px solid var(--primary-color, #22c55e);
    outline-offset: 2px;
  }

  .plant-card-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    z-index: 0;
    transition: filter 0.3s ease;
  }

  .plant-card-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.9) 0%,
      rgba(0, 0, 0, 0.6) 50%,
      rgba(0, 0, 0, 0.3) 100%
    );
    z-index: 1;
  }

  .plant-card-checkbox {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    padding: 10px; /* Increased from 4px — 24px icon + 20px padding = 44px touch target */
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .plant-card-checkbox:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.1);
  }

  .plant-card-content {
    position: relative;
    z-index: 2;
    display: grid;
    flex-direction: column;
    justify-content: stretch;
    gap: 16px;
    padding: 16px;
    box-sizing: border-box;
    align-content: stretch;
    align-items: end;
    justify-items: center;
    margin-top: auto;
  }

  .pc-info {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    backdrop-filter: blur(1px);
    -webkit-backdrop-filter: blur(1px);

    border-top: 1px solid rgba(0, 0, 0, 0.2);
    color: white;
    --primary-text-color: white;
    --secondary-text-color: rgba(255, 255, 255, 0.8);
  }

  .pc-strain-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--primary-text-color, #fff);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .pc-pheno {
    font-size: 0.9rem;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
    font-weight: 500;
  }

  .pc-stage {
    font-size: 1rem;
    font-weight: 600;
    margin-top: 8px;
    color: var(--stage-color);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    text-transform: capitalize;
  }

  /* Age pill — top-left corner showing days in stage */
  .age-pill {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 6;
    display: inline-flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 0.65rem;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    pointer-events: none;
    line-height: 1.4;
  }

  /* Alert dot — pulsing red indicator for plants with problems */
  .alert-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f44336;
    box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.3);
    flex-shrink: 0;
    animation: pulse-alert 2s infinite;
    align-self: center;
  }

  @keyframes pulse-alert {
    0% {
      box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.5);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(244, 67, 54, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
    }
  }

  .status-icons {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    flex-direction: row;
    gap: 8px;
    z-index: 5;
    pointer-events: none;
    justify-content: flex-start;
    flex-wrap: wrap;
    /* Allow ::before touch-area extensions to render outside container bounds.
       The parent overflow: hidden still clips at the card edge, but the 12px
       inset means extensions stay within the card in all common layouts. */
    overflow: visible;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .plant-card-rich:hover .status-icons {
    opacity: 1;
  }

  .status-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease;
    pointer-events: auto;
    /* Extend touch area to ~44×44px without changing visual size (WCAG 2.5.8) */
    position: relative;
  }

  .status-icon::before {
    content: '';
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    /* Must be explicit: .status-icons has pointer-events: none, so pseudo-elements
       inherit none by default. Setting auto here enables the extended tap area. */
    pointer-events: auto;
  }

  .status-icon:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.1);
  }

  .status-icon.training {
    color: var(--gm-warning-color, #ff9800); /* Orange for training */
  }

  .status-icon.watering {
    color: var(--gm-info-color, #2196f3); /* Blue for watering */
  }

  .status-icon.problem {
    color: var(--gm-error-color, #f44336); /* Red for problem */
  }

  .status-icon.ipm {
    color: var(--gm-ipm-color, #9c27b0); /* Purple for IPM */
  }

  .status-icon.phi {
    color: var(--gm-phi-color, #ff9800); /* Orange for PHI */
  }

  .status-icon.preset-recommended {
    color: var(--gm-primary-color);
  }

  .status-icon ha-svg-icon,
  .status-icon md-icon {
    --mdc-icon-size: 16px;
  }

  .plant-card-rich.dragging {
    opacity: 0.5;
    transform: rotate(5deg);
  }

  .plant-card-rich.dragging-mobile {
    opacity: 0.8;
    transform: scale(1.05);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    pointer-events: none;
  }

  /* Respect user motion preferences (WCAG 2.3.3) */
  @media (prefers-reduced-motion: reduce) {
    .plant-card-rich {
      transition: none;
    }

    .plant-card-rich:hover {
      transform: none;
    }

    .plant-card-rich.dragging {
      transform: none;
    }

    .plant-card-rich.dragging-mobile {
      transform: none;
    }

    .status-icon {
      transition: none;
    }

    .status-icon:hover {
      transform: none;
    }
  }
`;
