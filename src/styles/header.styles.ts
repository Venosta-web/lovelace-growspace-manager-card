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
        font-size: 3.5rem;
        font-weight: 300;
        margin: 0;
        line-height: 1.1;
        text-transform: capitalize;
        background: linear-gradient(135deg, var(--primary-text-color, #ffffff) 0%, var(--secondary-text-color, rgba(255, 255, 255, 0.9)) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        white-space: pre;
        pointer-events: none; /* Let clicks pass through to select */
        visibility: visible; /* Ensure it is seen */
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
        align-items: center;
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

    /* --- Mobile & Responsive --- */
    @media (max-width: 600px) {
        .gs-title { font-size: 2rem; }
        .header-title-area {
          max-width: 70%;
        }
        
        growspace-header-actions {
            grid-column: 1;
            grid-row: 3;
            justify-content: flex-start;
            justify-self: auto;
        }

        .gs-header-top {
            grid-template-columns: minmax(0, 1fr);
            position: relative; /* For absolute actions */
            gap: 8px;
        }

        /* Wrap secondary strip when link mode active - managed via props now or css? */
        /* Since secondary-strip is now inside generic scroll-container, wrapping is harder unless scroll-container supports it */
        /* Or we just allow scrolling on mobile always */

        .secondary-strip-container {
            grid-row: 4;
            grid-column: 1;
        }
    }
`;
