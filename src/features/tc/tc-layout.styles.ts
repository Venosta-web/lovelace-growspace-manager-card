import { css } from 'lit';

/**
 * The spatial system every Tissue Culture surface shares.
 *
 * The same surfaces are mounted by two hosts of very different widths: the
 * standalone `growspace-tc-card`, often one narrow dashboard column, and the
 * Tissue Culture dialog, which takes the whole Home Assistant surface. A
 * viewport media query cannot tell those apart, so each surface is its own
 * inline-size container and lays itself out against the width it was given.
 *
 * Three primitives, used the same way on every tab:
 *
 * - **Surface head** — the title and its explainer on the left, the surface's
 *   own controls on the right, wrapping under once they no longer fit.
 * - **Record** — one row of a list: an identity (what this is), a detail (what
 *   it holds) and its actions. Stacked when narrow. From 36rem a short pair of
 *   actions joins the identity's line (a full set of five waits for 44rem and
 *   takes the right of both lines), and from 60rem (72rem for five) the three
 *   sit side by side with the identity on a fixed track, so the detail column starts at the same x
 *   on every row and scans as a column. Whatever a record expands into
 *   (`.record-more`) spans the full row beneath it.
 * - **Split** — a form whose two halves are independent (the phenotype picker
 *   beside the fields it feeds) goes to two columns from 45rem, instead of
 *   stretching single inputs across the dialog.
 */
export const tcLayoutStyles = css`
  :host {
    container-type: inline-size;
  }

  /* A field's min-height is its whole height, so an input and a select in the
     same row come out the same size. */
  input,
  select,
  textarea {
    box-sizing: border-box;
    min-width: 0;
  }

  .surface-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px 24px;
    margin-bottom: 16px;
  }

  .surface-head .title {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    max-width: 65ch;
  }

  .surface-head h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .surface-head .title p {
    margin: 0;
  }

  .surface-head .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .record {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'identity'
      'detail'
      'actions'
      'more';
    gap: 8px 24px;
    align-items: start;
  }

  .record-identity {
    grid-area: identity;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
  }

  .record-detail {
    grid-area: detail;
    min-width: 0;
  }

  .record-actions {
    grid-area: actions;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .record-more {
    grid-area: more;
    min-width: 0;
  }

  .record-more:empty {
    display: none;
  }

  /* A record whose actions are a short pair can share the identity's line
     early; a full set of five cannot until there is room for all three. */
  @container (min-width: 36rem) {
    .record:not(.many-actions) {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'identity actions'
        'detail detail'
        'more more';
    }

    .record:not(.many-actions) .record-actions {
      justify-content: flex-end;
    }
  }

  @container (min-width: 44rem) {
    .record.many-actions {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'identity actions'
        'detail actions'
        'more more';
    }

    .record.many-actions .record-actions {
      justify-content: flex-end;
      align-self: center;
    }
  }

  @container (min-width: 60rem) {
    .record:not(.many-actions) {
      grid-template-columns: minmax(0, 17rem) minmax(0, 1fr) auto;
      grid-template-areas:
        'identity detail actions'
        'more more more';
    }
  }

  /* Five actions take ~30rem on their own, so the detail column only has room
     beside them once the container is this wide. */
  @container (min-width: 72rem) {
    .record.many-actions {
      grid-template-columns: minmax(0, 17rem) minmax(0, 1fr) auto;
      grid-template-areas:
        'identity detail actions'
        'more more more';
    }
  }

  /* Label over value, as many to a row as fit. For a record's facts, where a
     label beside every value would spend the width on repetition. */
  dl.spec {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 9rem), 1fr));
    gap: 10px 20px;
    margin: 0;
    font-size: 0.8125rem;
  }

  dl.spec > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  dl.spec > div.wide {
    grid-column: 1 / -1;
  }

  dl.spec dt {
    font-size: 0.75rem;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
  }

  dl.spec dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px 24px;
    align-items: start;
  }

  .split > .column {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  @container (min-width: 45rem) {
    .split {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }
`;
