import { css } from 'lit';

export const plantStatsStyles = css`
  :host {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    color: var(--primary-text-color, #fff);
  }

  .current-stage {
  }
`;
