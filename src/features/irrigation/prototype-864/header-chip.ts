/**
 * PROTOTYPE — growspace_manager#864. The card-header "at a glance" chip each
 * variant implies, rendered beside the real safety chip. Throwaway.
 *
 * A: one sentence for the worst zone, folded into the safety chip's wording.
 * B: one dot per zone, coloured by its state.
 * C: the supply — what the pump is doing and how much cap is left.
 */

import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { GrowspaceDevice } from '../../../services/types';
import { openIrrigationDialog } from '../../../slices/ui/dialogs';
import {
  REASON_LABEL,
  TONE_COLOR,
  capUse,
  proto864$,
  protoRevision$,
  scenarioFor,
  zoneHeadline,
} from './state';
import { gridSize } from './shared';

const RANK = { danger: 4, warn: 3, active: 2, ok: 1, quiet: 0 } as const;

@customElement('proto864-header-chip')
export class Proto864HeaderChip extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;

  @consume({ context: storeContext, subscribe: true })
  public store?: GrowspaceStore;

  private _sel = new StoreController(this, proto864$);
  private _rev = new StoreController(this, protoRevision$);

  static styles = css`
    :host {
      display: inline-flex;
    }
    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 14px;
      border: 1px dashed rgba(255, 224, 130, 0.7);
      background: rgba(255, 255, 255, 0.06);
      color: var(--primary-text-color);
      font: inherit;
      font-size: 12px;
      padding: 3px 10px;
      cursor: pointer;
      white-space: nowrap;
    }
    .d {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
  `;

  private _open() {
    openIrrigationDialog({
      growspaceId: this.device?.deviceId,
      initialTab: 'zones',
      portalId: (this.store as unknown as { instanceId?: string } | undefined)?.instanceId,
    });
  }

  render(): TemplateResult | typeof nothing {
    void this._rev.value;
    const sel = this._sel.value;
    if (!sel.enabled) return nothing;
    const { rows, cols } = gridSize(this.device);
    const s = scenarioFor(sel.scenario, rows, cols);
    const multi = s.zones.length > 1;
    const heads = s.zones.map((z) => ({ z, h: zoneHeadline(z, s) }));
    const worst = heads.slice().sort((a, b) => RANK[b.h.tone] - RANK[a.h.tone])[0];
    const title = 'Prototype #864 — what this chip would say';

    if (sel.variant === 'A') {
      if (!multi && !s.zones[0].degraded) return nothing;
      const text = multi
        ? `${worst.z.name}: ${worst.h.label}`
        : `Held · ${REASON_LABEL[s.zones[0].degraded!.cause]}`;
      const more = heads.filter((x) => x.h.tone === 'warn' || x.h.tone === 'danger').length - 1;
      return html`<button title=${title} @click=${this._open}>
        <span class="d" style="background:${TONE_COLOR[worst.h.tone]}"></span>${text}${more > 0
          ? ` +${more}`
          : ''}
      </button>`;
    }
    if (sel.variant === 'B') {
      if (!multi && !s.zones[0].degraded) return nothing;
      return html`<button title=${title} @click=${this._open}>
        ${heads.map(
          ({ z, h }) =>
            html`<span
              class="d"
              title="${z.name}: ${h.label}"
              style="background:${TONE_COLOR[
                h.tone
              ]};outline:2px solid ${z.color};outline-offset:1px"
            ></span>`
        )}
        ${multi ? 'Zones' : 'Probe'}
      </button>`;
    }
    const use = capUse(s);
    const running = s.zones.find((z) => z.id === s.runningZone);
    return html`<button title=${title} @click=${this._open}>
      💧
      ${s.cap.hitAt !== null
        ? 'Cap reached'
        : running
          ? multi
            ? `${running.name} watering`
            : 'Watering'
          : 'Pump idle'}${s.queue.length ? ` · ${s.queue.length} waiting` : ''}
      · ${use.liters}/${s.cap.litersCap} L
    </button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'proto864-header-chip': Proto864HeaderChip;
  }
}
