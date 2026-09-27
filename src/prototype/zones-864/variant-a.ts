/**
 * PROTOTYPE — growspace_manager#864. Throwaway; never merge.
 *
 * Variant A — "Zone scope switcher". Zones are a scope over the dialog that
 * already exists: a segmented control in the content header picks Whole tent
 * or one zone, the Overview reads that scope, and zones are edited on a
 * "Zones" rail item under Equipment with a paint-the-grid editor. A single-zone
 * grower sees nothing new except a "Split into zones" row on Configuration and,
 * if it happens, the probe_unresponsive banner.
 */
import { LitElement, css, html, nothing } from 'lit';
import { hm, PROBE_CHOICES, VALVE_CHOICES, type ProtoWorld, type ProtoZone } from './fixture';
import {
  baseStyles,
  capByZone,
  capMeter,
  causeLine,
  outcomeLabel,
  statusPill,
  statusTone,
  toastView,
  triggerText,
  troubleSentence,
  volumeText,
  waitedText,
  zoneLabel,
} from './atoms';
import { addZone, assignCell, bind, saveLayout, set, ui, world } from './store';

class ZpBase extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    bind(this);
  }
}

/* ── Header scope control ─────────────────────────────────────────────────── */
class ZpAScope extends ZpBase {
  static styles = [
    baseStyles,
    css`
      .seg {
        display: inline-flex;
        border: 1px solid var(--zp-line);
        border-radius: 999px;
        overflow: hidden;
      }
      button {
        all: unset;
        cursor: pointer;
        padding: 5px 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        border-right: 1px solid var(--zp-line);
      }
      button:last-child {
        border-right: none;
      }
      button.on {
        background: rgba(255, 255, 255, 0.12);
        font-weight: 600;
      }
      .glyph {
        font-size: 11px;
      }
      .glyph.err {
        color: var(--zp-err);
      }
      .glyph.warn {
        color: var(--zp-warn);
      }
      .glyph.info {
        color: var(--zp-info);
      }
    `,
  ];

  render() {
    const w = world();
    const glyph = (z: ProtoZone) => {
      const t = statusTone(z);
      return t === 'ok'
        ? nothing
        : html`<span class="glyph ${t}">${t === 'info' ? '●' : '▲'}</span>`;
    };
    return html`<div class="seg" role="tablist" aria-label="Irrigation scope">
      <button class=${ui.scope === 'tent' ? 'on' : ''} @click=${() => set({ scope: 'tent' })}>
        Whole tent
      </button>
      ${w.zones.map(
        (z) =>
          html`<button class=${ui.scope === z.id ? 'on' : ''} @click=${() => set({ scope: z.id })}>
            <span class="dot" style="background:${z.color}"></span>${z.name}${glyph(z)}
          </button>`
      )}
    </div>`;
  }
}

/* ── Overview, scoped ─────────────────────────────────────────────────────── */
class ZpAOverview extends ZpBase {
  static styles = [
    baseStyles,
    css`
      .card {
        border: 1px solid var(--zp-line);
        border-radius: 12px;
        padding: 12px 14px;
        margin-bottom: 12px;
        background: var(--zp-surface);
      }
      h4 {
        margin: 0 0 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--zp-muted);
      }
      .zrow {
        display: grid;
        grid-template-columns: 1.4fr 0.6fr 0.9fr 1.4fr;
        gap: 8px;
        align-items: center;
        padding: 7px 4px;
        border-top: 1px solid var(--zp-line);
        cursor: pointer;
      }
      .zrow:hover {
        background: rgba(255, 255, 255, 0.04);
      }
      .log {
        display: grid;
        grid-template-columns: 48px 1fr auto;
        gap: 2px 10px;
        font-size: 12px;
      }
      .log > div {
        padding: 5px 0;
        border-top: 1px solid var(--zp-line);
      }
      .log .sup {
        opacity: 0.7;
      }
      .kv {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      .kv b {
        display: block;
        font-size: 18px;
        font-weight: 500;
      }
      .supply {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 10px;
      }
    `,
  ];

  render() {
    const w = world();
    if (w.implicit) {
      const z = w.zones[0];
      const t = troubleSentence(z, w);
      return t
        ? html`<div class="protonote">PROTOTYPE A · single zone: only this banner is new</div>
            <div class="banner err">
              <span>⚠</span>
              <div><b>Probe not responding</b>${t}</div>
            </div>`
        : html`<div class="protonote">PROTOTYPE A · single zone: nothing new on Overview</div>`;
    }
    const z = w.zones.find((x) => x.id === ui.scope);
    return html`<div class="protonote">
        PROTOTYPE ${ui.variant} · scope:
        ${z ? z.name : 'Whole tent'}${ui.variant === 'D' ? ' — click a mark for its attempt' : ''}
      </div>
      ${z ? this._zone(w, z) : this._tent(w)}`;
  }

  private _tent(w: ProtoWorld) {
    const open = w.zones.find((z) => z.id === w.supply.openZone);
    const troubled = w.zones.filter((z) => troubleSentence(z, w));
    return html`
      ${troubled.map(
        (z) =>
          html`<div class="banner ${statusTone(z) === 'err' ? 'err' : 'warn'}">
            <span>⚠</span>
            <div><b>${z.name}: ${causeLine(z)}</b>${troubleSentence(z, w)}</div>
          </div>`
      )}
      <div class="card">
        <h4>Pump</h4>
        <div class="supply">
          <span
            >${open
              ? html`Watering ${zoneLabel(open)}`
              : html`<span class="muted">Idle</span>`}</span
          >
          ${w.queue.map((q) => {
            const qz = w.zones.find((z) => z.id === q.zoneId)!;
            return html`<span class="pill info">Next: ${qz.name} (due ${hm(q.dueAt)})</span>`;
          })}
        </div>
        ${capMeter(w, true)}
      </div>
      <div class="card">
        <h4>Zones</h4>
        ${w.zones.map((z) => {
          const c = capByZone(w).find((p) => p.z.id === z.id)!;
          return html`<div class="zrow" @click=${() => set({ scope: z.id })}>
            ${zoneLabel(z)}
            <span>${z.phase} · ${z.vwc !== null ? `${z.vwc}%` : '—'}</span>
            <span class="muted">${c.liters.toFixed(1)} L today</span>
            <span>${statusPill(z)}</span>
          </div>`;
        })}
      </div>
      <div class="card">
        <h4>Today's deliveries</h4>
        ${ui.variant === 'D' ? html`<zp-c-today embedded></zp-c-today>` : this._log(w, null)}
      </div>
    `;
  }

  private _zone(w: ProtoWorld, z: ProtoZone) {
    const ctrl = z.probes.find((p) => p.role === 'control');
    const t = troubleSentence(z, w);
    return html`
      ${t
        ? html`<div class="banner ${statusTone(z) === 'err' ? 'err' : 'warn'}">
            <span>⚠</span>
            <div><b>${causeLine(z)}</b>${t}</div>
          </div>`
        : nothing}
      <div class="card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"
        >
          ${zoneLabel(z)} ${statusPill(z)}
        </div>
        <div class="kv">
          <div><span class="muted">Phase</span><b>${z.phase}</b></div>
          <div>
            <span class="muted">VWC (${ctrl?.name ?? '—'})</span
            ><b>${z.vwc !== null ? `${z.vwc}%` : '—'}</b>
          </div>
          <div><span class="muted">Target</span><b>${z.targetVwc}%</b></div>
          <div>
            <span class="muted">Calibration</span><b style="font-size:14px;">${z.calibration}</b>
          </div>
        </div>
        ${z.recipe
          ? html`<div style="margin-top:10px;" class="muted">
              Recipe: ${z.recipe.name} · rev ${z.recipe.revision}
              ${z.recipe.latest > z.recipe.revision
                ? html`<span class="pill info">Recipe updated to rev ${z.recipe.latest}</span>`
                : nothing}
              ${z.recipe.drifted ? html`<span class="pill warn">Hand-tuned</span>` : nothing}
            </div>`
          : nothing}
      </div>
      <div class="card">
        <h4>${z.name} · today's deliveries</h4>
        ${ui.variant === 'D'
          ? html`<zp-c-today embedded .only=${z.id}></zp-c-today>${this._log(w, z.id)}`
          : this._log(w, z.id)}
      </div>
    `;
  }

  private _log(w: ProtoWorld, zoneId: string | null) {
    const rows = w.attempts.filter((a) => !zoneId || a.zoneId === zoneId).reverse();
    return html`<div class="log">
      ${rows.map((a) => {
        const z = w.zones.find((x) => x.id === a.zoneId)!;
        return html`
          <div class="muted ${a.outcome === 'suppressed' ? 'sup' : ''}">${hm(a.at)}</div>
          <div class=${a.outcome === 'suppressed' ? 'sup' : ''}>
            ${zoneId ? nothing : html`${zoneLabel(z)} · `}${triggerText(a)}
            <div class="muted">${volumeText(a)}${waitedText(a) ? ` · ${waitedText(a)}` : ''}</div>
          </div>
          <div>${outcomeLabel(a)}</div>
        `;
      })}
    </div>`;
  }
}

/* ── Zones editor (Equipment › Zones) ─────────────────────────────────────── */
class ZpAZones extends ZpBase {
  static styles = [
    baseStyles,
    css`
      .wrap {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) minmax(260px, 1fr);
        gap: 16px;
      }
      @media (max-width: 760px) {
        .wrap {
          grid-template-columns: 1fr;
        }
      }
      .grid {
        display: grid;
        gap: 4px;
      }
      .cell {
        aspect-ratio: 1;
        border-radius: 8px;
        border: 2px solid transparent;
        display: grid;
        place-items: center;
        font-size: 10px;
        text-align: center;
        cursor: crosshair;
        padding: 2px;
        position: relative;
        user-select: none;
      }
      .cell .p {
        position: absolute;
        top: 3px;
        right: 4px;
        font-size: 10px;
      }
      .brushes {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 10px 0;
      }
      .brush {
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 999px;
        border: 2px solid transparent;
        background: rgba(255, 255, 255, 0.06);
        display: inline-flex;
        gap: 6px;
        align-items: center;
      }
      .brush.on {
        border-color: #fff;
      }
      .zcard {
        border: 1px solid var(--zp-line);
        border-left: 4px solid;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 10px;
        display: grid;
        gap: 8px;
      }
      .row {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .row label {
        width: 64px;
        color: var(--zp-muted);
        font-size: 12px;
      }
      .chip {
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        font-size: 11px;
      }
      .foot {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        align-items: center;
        margin-top: 12px;
      }
    `,
  ];

  private _painting = false;

  render() {
    const w = world();
    const owner = (cell: string) => w.zones.find((z) => z.cells.includes(cell));
    return html`<div class="protonote">
        PROTOTYPE A · Equipment › Zones — pick a brush, then click or drag across cells
      </div>
      <div class="wrap">
        <div>
          <div class="brushes">
            ${w.zones.map(
              (z) =>
                html`<span
                  class="brush ${ui.brush === z.id ? 'on' : ''}"
                  @click=${() => set({ brush: z.id })}
                  ><span class="dot" style="background:${z.color}"></span>${z.name}</span
                >`
            )}
            <span class="brush" @click=${addZone}>＋ Add zone</span>
          </div>
          <div
            class="grid"
            style="grid-template-columns:repeat(${w.cols},1fr);"
            @pointerup=${() => (this._painting = false)}
            @pointerleave=${() => (this._painting = false)}
          >
            ${Array.from({ length: w.rows * w.cols }, (_, i) => {
              const cell = `${Math.floor(i / w.cols) + 1},${(i % w.cols) + 1}`;
              const z = owner(cell);
              const probe = w.zones.flatMap((x) => x.probes).find((p) => p.cell === cell);
              return html`<div
                class="cell"
                style="background:${z ? `${z.color}33` : 'transparent'};border-color:${z?.color ??
                'var(--zp-line)'}"
                @pointerdown=${() => {
                  this._painting = true;
                  assignCell(cell, ui.brush);
                }}
                @pointerenter=${() => this._painting && assignCell(cell, ui.brush)}
              >
                ${probe
                  ? html`<span class="p" title=${probe.name}
                      >${probe.role === 'control' ? '◉' : '○'}</span
                    >`
                  : nothing}
                <span>${w.plants[cell] ?? html`<span class="muted">empty</span>`}</span>
              </div>`;
            })}
          </div>
          <div class="muted" style="margin-top:8px;font-size:12px;">
            ◉ control probe · ○ witness. Plants follow their cell. Every cell belongs to exactly one
            zone.
          </div>
        </div>
        <div>
          ${w.zones.map((z) => this._zoneCard(z))}
          <div class="foot">
            <label class="muted" style="font-size:11px;"
              ><input
                type="checkbox"
                .checked=${ui.conflict}
                @change=${(e: Event) => set({ conflict: (e.target as HTMLInputElement).checked })}
              />
              simulate another device saving first</label
            >
            <span class="muted">layout rev ${ui.savedRevision}</span>
            <button class="btn primary" @click=${saveLayout}>Save zones</button>
          </div>
        </div>
      </div>
      ${toastView()}`;
  }

  private _zoneCard(z: ProtoZone) {
    const ctrl = z.probes.find((p) => p.role === 'control');
    return html`<div class="zcard" style="border-left-color:${z.color}">
      <div class="row">
        <label>Name</label>
        <input
          .value=${z.name}
          @change=${(e: Event) =>
            set({ names: { ...ui.names, [z.id]: (e.target as HTMLInputElement).value } })}
        />
        <span class="muted">${z.cells.length} cells</span>
      </div>
      <div class="row">
        <label>Valves</label>
        ${z.valves.length
          ? z.valves.map((v) => html`<span class="chip">${v.name}</span>`)
          : html`<span class="pill err">needs a valve</span>`}
        <select>
          <option>＋ add valve…</option>
          ${VALVE_CHOICES.map((v) => html`<option>${v.name}</option>`)}
        </select>
      </div>
      <div class="row">
        <label>Control</label>
        <select>
          ${[{ entity: '', name: '— none —' }, ...PROBE_CHOICES].map(
            (p) => html`<option ?selected=${ctrl?.entity === p.entity}>${p.name}</option>`
          )}
        </select>
      </div>
      <div class="row">
        <label>Witness</label>
        ${z.probes
          .filter((p) => p.role === 'witness')
          .map((p) => html`<span class="chip">${p.name}</span>`)}
        <select>
          <option>＋ add witness…</option>
          ${PROBE_CHOICES.map((p) => html`<option>${p.name}</option>`)}
        </select>
      </div>
    </div>`;
  }
}

/* ── Configuration, single zone: the one door into zones ──────────────────── */
class ZpASplit extends ZpBase {
  static styles = [baseStyles];
  render() {
    return html`<div class="protonote">
        PROTOTYPE A · single zone: the only new row on Configuration
      </div>
      <div class="banner">
        <span>▦</span>
        <div style="flex:1;">
          <b>Irrigation zones</b>
          <span class="muted"
            >One zone waters the whole tent. Split it to steer cohorts separately on this
            pump.</span
          >
        </div>
        <button class="btn" @click=${() => set({ scenario: 'multi' })}>Split into zones</button>
      </div>`;
  }
}

const def = (tag: string, c: CustomElementConstructor) => {
  if (!customElements.get(tag)) customElements.define(tag, c);
};
def('zp-a-scope', ZpAScope);
def('zp-a-overview', ZpAOverview);
def('zp-a-zones', ZpAZones);
def('zp-a-split', ZpASplit);
