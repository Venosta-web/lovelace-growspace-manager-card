/**
 * PROTOTYPE — growspace_manager#864. Throwaway; never merge.
 *
 * Variant B — "Zone board". Zones get their own rail group at the top of the
 * dialog: one dense table, a row per zone, which expands in place into its
 * probes and its Delivery Attempts. Editing is the same table switched into an
 * edit mode, with cells assigned from a matrix of dropdowns rather than
 * painted. The rest of the dialog is left alone. Single-zone growers get no
 * zone UI at all, but the Overview gains a "Today's deliveries" ledger for
 * everyone, because attempts and the cap exist with one zone too.
 */
import { LitElement, css, html, nothing } from 'lit';
import {
  hm,
  CAUSE_TEXT,
  PROBE_CHOICES,
  VALVE_CHOICES,
  type ProtoWorld,
  type ProtoZone,
} from './fixture';
import {
  baseStyles,
  capByZone,
  capMeter,
  outcomeLabel,
  statusPill,
  toastView,
  triggerText,
  troubleSentence,
  volumeText,
  waitedText,
} from './atoms';
import { addZone, assignCell, bind, saveLayout, set, ui, world } from './store';

class ZpBase extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    bind(this);
  }
}

const tableStyles = css`
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    text-align: left;
    font-weight: 600;
    color: var(--zp-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 6px 8px;
    border-bottom: 1px solid var(--zp-line);
  }
  td {
    padding: 7px 8px;
    border-bottom: 1px solid var(--zp-line);
    vertical-align: middle;
  }
  tr.z {
    cursor: pointer;
  }
  tr.z:hover td {
    background: rgba(255, 255, 255, 0.03);
  }
  tr.detail > td {
    background: rgba(255, 255, 255, 0.025);
    padding: 10px 12px 14px;
  }
  .sw {
    width: 4px;
    padding: 0;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
`;

/* ── Header summary chip ──────────────────────────────────────────────────── */
class ZpBSummary extends ZpBase {
  static styles = [baseStyles];
  render() {
    const w = world();
    const bad = w.zones.filter((z) => troubleSentence(z, w)).length;
    return html`<span class="pill ${bad ? 'warn' : ''}"
      >${w.zones.length} zones${bad ? ` · ${bad} need attention` : ''}</span
    >`;
  }
}

/* ── The board ────────────────────────────────────────────────────────────── */
class ZpBBoard extends ZpBase {
  static styles = [
    baseStyles,
    tableStyles,
    css`
      .top {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: 16px;
        align-items: end;
        margin-bottom: 14px;
      }
      .ledger {
        margin-top: 8px;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 16px;
      }
      .probe {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .matrix {
        display: grid;
        gap: 4px;
        margin-top: 12px;
      }
      .matrix select {
        width: 100%;
        font-size: 11px;
        padding: 4px;
      }
      .matrix .h {
        font-size: 10px;
        color: var(--zp-muted);
        text-align: center;
      }
      a {
        color: var(--primary-color);
        cursor: pointer;
      }
    `,
  ];

  private _ledger = false;

  render() {
    const w = world();
    return html`<div class="protonote">PROTOTYPE B · Zones › Board — click a row to expand</div>
      <div class="top">
        <div>
          <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;">
            Pump
          </div>
          ${w.supply.openZone
            ? html`Watering <b>${w.zones.find((z) => z.id === w.supply.openZone)!.name}</b>`
            : html`<span class="muted">Idle</span>`}
          ${w.queue.map(
            (q) =>
              html` · next <b>${w.zones.find((z) => z.id === q.zoneId)!.name}</b> (due
                ${hm(q.dueAt)})`
          )}
        </div>
        <div>
          ${capMeter(w, false)}
          <a
            style="font-size:12px;"
            @click=${() => {
              this._ledger = !this._ledger;
              this.requestUpdate();
            }}
            >${this._ledger ? 'Hide' : 'Who used the cap?'}</a
          >
          ${this._ledger ? this._capLedger(w) : nothing}
        </div>
      </div>
      <div class="toolbar">
        <span class="muted">${w.zones.length} zones on ${w.supply.name}</span>
        ${ui.editing
          ? html`<span>
              <button class="btn" @click=${addZone}>＋ Add zone</button>
              <button class="btn" @click=${() => set({ editing: false })}>Cancel</button>
              <button class="btn primary" @click=${saveLayout}>
                Save · rev ${ui.savedRevision}
              </button>
            </span>`
          : html`<button class="btn" @click=${() => set({ editing: true })}>Edit zones</button>`}
      </div>
      ${ui.editing ? this._editTable(w) : this._table(w)} ${toastView()}`;
  }

  private _capLedger(w: ProtoWorld) {
    return html`<table class="ledger">
      <tr>
        <th>Zone</th>
        <th>Charged</th>
        <th>Cycles</th>
        <th>Not sent</th>
      </tr>
      ${capByZone(w).map(
        (p) =>
          html`<tr>
            <td>${p.z.name}</td>
            <td class="num">${p.liters.toFixed(2)} L</td>
            <td class="num">${p.cycles}</td>
            <td class="num">${p.refused || '—'}</td>
          </tr>`
      )}
    </table>`;
  }

  private _table(w: ProtoWorld) {
    return html`<table>
      <tr>
        <th class="sw"></th>
        <th>Zone</th>
        <th>Plants</th>
        <th>Phase</th>
        <th>VWC / target</th>
        <th>Status</th>
        <th>Last shot</th>
        <th>Today</th>
        <th>Calibration</th>
      </tr>
      ${w.zones.map((z) => {
        const mine = w.attempts.filter((a) => a.zoneId === z.id);
        const last = [...mine]
          .reverse()
          .find((a) => a.outcome === 'completed' || a.outcome === 'aborted');
        const liters = capByZone(w).find((p) => p.z.id === z.id)!.liters;
        const open = ui.expanded.has(z.id);
        return html`<tr
            class="z"
            @click=${() => {
              const e = new Set(ui.expanded);
              if (open) e.delete(z.id);
              else e.add(z.id);
              set({ expanded: e });
            }}
          >
            <td class="sw" style="background:${z.color}"></td>
            <td><b>${z.name}</b> <span class="muted">${open ? '▾' : '▸'}</span></td>
            <td class="num">${z.cells.filter((c) => w.plants[c]).length}</td>
            <td>${z.phase}</td>
            <td class="num">${z.vwc !== null ? `${z.vwc}%` : '—'} / ${z.targetVwc}%</td>
            <td>
              ${statusPill(z)}
              ${z.cause
                ? html`<div class="muted" style="font-size:11px;">${CAUSE_TEXT[z.cause]}</div>`
                : nothing}
            </td>
            <td class="num">${last ? hm(last.at) : '—'}</td>
            <td class="num">${liters.toFixed(1)} L</td>
            <td>${z.calibration}</td>
          </tr>
          ${open
            ? html`<tr class="detail">
                <td colspan="9">${this._detail(w, z)}</td>
              </tr>`
            : nothing}`;
      })}
    </table>`;
  }

  private _detail(w: ProtoWorld, z: ProtoZone) {
    const t = troubleSentence(z, w);
    return html`
      ${t
        ? html`<div class="banner ${z.status === 'degraded' ? 'err' : 'warn'}">
            <span>⚠</span>
            <div>${t}</div>
          </div>`
        : nothing}
      <div class="detail-grid">
        <div>
          <div class="muted" style="margin-bottom:4px;">Probes</div>
          ${z.probes.map(
            (p) =>
              html`<div class="probe">
                <span
                  >${p.role === 'control' ? '◉' : '○'}
                  ${p.name}${p.substituting ? ' (substituting)' : ''}</span
                >
                <span class=${p.health === 'ok' ? '' : 'muted'}
                  >${p.vwc !== null ? `${p.vwc}%` : p.health}</span
                >
              </div>`
          )}
          <div class="muted" style="margin:10px 0 4px;">Valves</div>
          ${z.valves.map((v) => html`<div>${v.name}</div>`)}
          ${z.recipe
            ? html`<div class="muted" style="margin:10px 0 4px;">Recipe</div>
                <div>${z.recipe.name} · rev ${z.recipe.revision}</div>
                ${z.recipe.latest > z.recipe.revision
                  ? html`<span class="pill info">Updated to rev ${z.recipe.latest}</span>`
                  : nothing}`
            : nothing}
        </div>
        <table>
          <tr>
            <th>Time</th>
            <th>Shot</th>
            <th>Volume</th>
            <th>Result</th>
          </tr>
          ${[...w.attempts]
            .filter((a) => a.zoneId === z.id)
            .reverse()
            .map(
              (a) =>
                html`<tr>
                  <td class="num">${hm(a.at)}</td>
                  <td>
                    ${triggerText(a)}${waitedText(a)
                      ? html`<div class="muted">${waitedText(a)}</div>`
                      : nothing}
                  </td>
                  <td class="num">${volumeText(a)}</td>
                  <td>${outcomeLabel(a)}</td>
                </tr>`
            )}
        </table>
      </div>
    `;
  }

  private _editTable(w: ProtoWorld) {
    const owner = (cell: string) => w.zones.find((z) => z.cells.includes(cell))?.id ?? '';
    return html`<table>
        <tr>
          <th class="sw"></th>
          <th>Name</th>
          <th>Valves</th>
          <th>Control probe</th>
          <th>Witnesses</th>
          <th>Cells</th>
        </tr>
        ${w.zones.map(
          (z) =>
            html`<tr>
              <td class="sw" style="background:${z.color}"></td>
              <td>
                <input
                  .value=${z.name}
                  @change=${(e: Event) =>
                    set({ names: { ...ui.names, [z.id]: (e.target as HTMLInputElement).value } })}
                />
              </td>
              <td>
                <select multiple size="2" style="min-width:110px;">
                  ${VALVE_CHOICES.map(
                    (v) =>
                      html`<option ?selected=${z.valves.some((x) => x.entity === v.entity)}>
                        ${v.name}
                      </option>`
                  )}
                </select>
              </td>
              <td>
                <select>
                  <option>— none —</option>
                  ${PROBE_CHOICES.map(
                    (p) =>
                      html`<option
                        ?selected=${z.probes.some(
                          (x) => x.role === 'control' && x.entity === p.entity
                        )}
                      >
                        ${p.name}
                      </option>`
                  )}
                </select>
              </td>
              <td>
                ${z.probes
                  .filter((p) => p.role === 'witness')
                  .map((p) => p.name)
                  .join(', ') || '—'}
              </td>
              <td class="num">${z.cells.length}</td>
            </tr>`
        )}
      </table>
      <div class="muted" style="margin-top:14px;">Cell → zone</div>
      <div class="matrix" style="grid-template-columns:24px repeat(${w.cols},1fr);">
        <span></span>
        ${Array.from({ length: w.cols }, (_, c) => html`<span class="h">col ${c + 1}</span>`)}
        ${Array.from({ length: w.rows }, (_, r) => [
          html`<span class="h" style="align-self:center;">r${r + 1}</span>`,
          ...Array.from({ length: w.cols }, (_, c) => {
            const cell = `${r + 1},${c + 1}`;
            const o = owner(cell);
            const z = w.zones.find((x) => x.id === o);
            return html`<select
              style="border-left:4px solid ${z?.color ?? 'transparent'}"
              title=${w.plants[cell] ?? 'empty'}
              @change=${(e: Event) => assignCell(cell, (e.target as HTMLSelectElement).value)}
            >
              ${w.zones.map(
                (x) => html`<option value=${x.id} ?selected=${x.id === o}>${x.name}</option>`
              )}
            </select>`;
          }),
        ])}
      </div>`;
  }
}

/* ── Overview addition for everyone, zones or not ─────────────────────────── */
class ZpBDeliveries extends ZpBase {
  static styles = [
    baseStyles,
    tableStyles,
    css`
      .card {
        border: 1px solid var(--zp-line);
        border-radius: 12px;
        padding: 12px 14px;
        margin-bottom: 12px;
      }
    `,
  ];
  render() {
    const w = world();
    const z0 = w.zones[0];
    const t = w.implicit ? troubleSentence(z0, w) : null;
    const rows = [...w.attempts].reverse().slice(0, 6);
    return html`<div class="protonote">
        PROTOTYPE B · Overview: a deliveries ledger for every
        grower${w.implicit ? ' (no zone words anywhere)' : ''}
      </div>
      ${t
        ? html`<div class="banner err">
            <span>⚠</span>
            <div><b>Probe not responding</b>${t}</div>
          </div>`
        : nothing}
      <div class="card">
        ${capMeter(w, false)}
        <table style="margin-top:10px;">
          ${rows.map(
            (a) =>
              html`<tr>
                <td class="num">${hm(a.at)}</td>
                <td>
                  ${w.implicit
                    ? ''
                    : html`<b>${w.zones.find((z) => z.id === a.zoneId)!.name}</b> · `}${triggerText(
                    a
                  )}
                </td>
                <td class="num muted">${volumeText(a)}</td>
                <td>${outcomeLabel(a)}</td>
              </tr>`
          )}
        </table>
        ${w.implicit
          ? nothing
          : html`<div class="muted" style="margin-top:6px;font-size:12px;">
              Per-zone detail is on Zones › Board.
            </div>`}
      </div>`;
  }
}

const def = (tag: string, c: CustomElementConstructor) => {
  if (!customElements.get(tag)) customElements.define(tag, c);
};
def('zp-b-summary', ZpBSummary);
def('zp-b-board', ZpBBoard);
def('zp-b-deliveries', ZpBDeliveries);
