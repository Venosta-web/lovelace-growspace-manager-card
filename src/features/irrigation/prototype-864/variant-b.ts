/**
 * PROTOTYPE — growspace_manager#864, variant B: "Grid is the map".
 *
 * The growspace grid is the zone surface. Cells are tinted by zone, probes are
 * pins on their cells, a degraded zone is hatched where it stands, and the
 * running zone pulses. Clicking a zone opens its panel: its state sentence,
 * a dot strip of today's shots and requested-vs-delivered bars. The cap is a
 * bar segmented by the zones that spent it. Editing happens on the same grid:
 * drag to paint, tap a cell to drop a probe.
 * A single-zone grower sees the grid untinted, with no zone word — only the
 * probe pin, which turns red when it is unresponsive.
 */

import { LitElement, css, html, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GrowspaceDevice } from '../../../services/types';
import {
  REASON_LABEL,
  TONE_COLOR,
  capUse,
  deliveredToday,
  hhmm,
  touch,
  zoneHeadline,
  type ProtoAttempt,
  type ProtoScenario,
  type ProtoZone,
} from './state';
import {
  addZone,
  assignCell,
  cellLabel,
  cells,
  lifecycle,
  makeControl,
  outcomeText,
  placeProbe,
  plantCount,
  protoBaseStyles,
  removeProbe,
  saveProblems,
  saveZones,
  toggleValve,
  triggerText,
  type CellInfo,
} from './shared';

type Tool = 'paint' | 'probe';

@customElement('proto864-variant-b')
export class Proto864VariantB extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) s!: ProtoScenario;

  @state() private _zone = '';
  @state() private _editing = false;
  @state() private _tool: Tool = 'paint';
  @state() private _probeEntity = '';
  @state() private _attempt: ProtoAttempt | null = null;
  @state() private _msg: { ok: boolean; text: string } | null = null;
  @state() private _conflict = false;
  private _painting = false;

  static styles = [
    protoBaseStyles,
    css`
      .wrap {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }
      @media (max-width: 760px) {
        .wrap {
          grid-template-columns: 1fr;
        }
      }
      .grid {
        display: grid;
        gap: 3px;
        user-select: none;
        position: relative;
      }
      .cell {
        position: relative;
        aspect-ratio: 1 / 0.85;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        padding: 5px;
        font-size: 10px;
        line-height: 1.2;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .cell .strain {
        color: var(--primary-text-color);
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cell .pos {
        position: absolute;
        top: 4px;
        left: 5px;
        color: var(--secondary-text-color);
        font-size: 9px;
      }
      .cell.hatch::after {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          -45deg,
          rgba(255, 152, 0, 0.18) 0 6px,
          transparent 6px 12px
        );
        pointer-events: none;
      }
      .cell.hatch.held::after {
        background: repeating-linear-gradient(
          -45deg,
          rgba(244, 67, 54, 0.22) 0 6px,
          transparent 6px 12px
        );
      }
      .cell.pulse {
        animation: pulse 1.6s ease-in-out infinite;
      }
      @keyframes pulse {
        50% {
          box-shadow: inset 0 0 0 2px rgba(79, 195, 247, 0.8);
        }
      }
      .pin {
        position: absolute;
        top: 3px;
        right: 4px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        border: 2px solid #fff;
        background: #263238;
        color: #fff;
      }
      .pin.witness {
        background: transparent;
        border-style: dashed;
      }
      .pin.bad {
        background: var(--error-color, #f44336);
        border-color: var(--error-color, #f44336);
      }
      .pin.sub {
        border-color: var(--warning-color, #ff9800);
        background: var(--warning-color, #ff9800);
        color: #111;
      }
      .zlabel {
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 8px 0 3px;
      }
      .zlabel .st {
        font-weight: 400;
      }
      .panel {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 12px;
        padding: 12px 14px;
      }
      .panel h3 {
        margin: 0 0 4px;
        font-size: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .sentence {
        font-size: 13px;
        line-height: 1.45;
        color: var(--secondary-text-color);
        margin: 6px 0 12px;
      }
      .sentence b {
        color: var(--primary-text-color);
      }
      .bars {
        display: grid;
        gap: 6px;
        margin: 10px 0;
      }
      .bar-row {
        display: grid;
        grid-template-columns: 70px 1fr 56px;
        gap: 8px;
        align-items: center;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      .track {
        height: 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.07);
        overflow: hidden;
      }
      .track span {
        display: block;
        height: 100%;
        border-radius: 4px;
      }
      .cap {
        margin-top: 14px;
      }
      .cap .seg {
        display: flex;
        height: 14px;
        border-radius: 7px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.07);
      }
      .cap .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        font-size: 12px;
        margin-top: 6px;
        color: var(--secondary-text-color);
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        margin-bottom: 10px;
      }
      .swatch {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 14px;
        border: 2px solid transparent;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        color: var(--primary-text-color);
        font: inherit;
        font-size: 12px;
      }
      .msg {
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 13px;
      }
      .msg.ok {
        background: rgba(76, 175, 80, 0.15);
      }
      .msg.bad {
        background: rgba(244, 67, 54, 0.15);
      }
      .popover {
        margin-top: 10px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        padding: 10px 12px;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .chip {
        font-size: 12px;
        padding: 3px 8px;
        border-radius: 12px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        background: transparent;
        color: var(--primary-text-color);
        cursor: pointer;
      }
      .chip[aria-pressed='true'] {
        background: rgba(255, 255, 255, 0.15);
      }
      .chip[disabled] {
        opacity: 0.4;
      }
      svg text {
        fill: var(--secondary-text-color);
        font-size: 9px;
      }
    `,
  ];

  private get _multi(): boolean {
    return this.s.zones.length > 1;
  }

  private get _current(): ProtoZone {
    return (
      this.s.zones.find((z) => z.id === this._zone) ??
      this.s.zones.find((z) => z.degraded || z.substitution) ??
      this.s.zones[0]
    );
  }

  render(): TemplateResult {
    const grid = cells(this.s, this.device);
    return html`
      <p class="proto-note">
        Variant B · the grid is the zone surface — tap a zone, or edit it where it stands
      </p>
      ${this._editing ? this._renderToolbar() : nothing}
      <div class="wrap">
        <div>${this._renderGrid(grid)} ${this._editing ? nothing : this._renderCap()}</div>
        <div>${this._editing ? this._renderEditPanel(grid) : this._renderPanel(grid)}</div>
      </div>
    `;
  }

  // ── Grid ─────────────────────────────────────────────────────────────────

  private _renderGrid(grid: CellInfo[][]): TemplateResult {
    const cols = grid[0]?.length ?? 1;
    // Zone labels above the first row each zone owns.
    const seen = new Set<string>();
    return html`
      <div
        class="grid"
        style="grid-template-columns:repeat(${cols},1fr)"
        @pointerup=${() => (this._painting = false)}
        @pointerleave=${() => (this._painting = false)}
      >
        ${grid.map((row) => {
          const z = row[0]?.zone;
          const label =
            this._multi && z && !seen.has(z.id) && row.every((c) => c.zone?.id === z.id)
              ? (seen.add(z.id), this._zoneLabel(z))
              : nothing;
          return html`${label
            ? html`<div style="grid-column:1/-1">${label}</div>`
            : nothing}${row.map((c) => this._cell(c))}`;
        })}
      </div>
      ${this._multi
        ? html`<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px">
            ${this.s.zones.filter((z) => !seen.has(z.id)).map((z) => this._zoneLabel(z))}
          </div>`
        : nothing}
    `;
  }

  private _zoneLabel(z: ProtoZone): TemplateResult {
    const h = zoneHeadline(z, this.s);
    return html`<div class="zlabel" @click=${() => (this._zone = z.id)} style="cursor:pointer">
      <span class="dot" style="background:${z.color}"></span>${z.name}
      <span class="st" style="color:${TONE_COLOR[h.tone]}">${h.label}</span>
      <span class="st" style="color:var(--secondary-text-color)"
        >· ${z.valves.length} valve${z.valves.length === 1 ? '' : 's'}</span
      >
    </div>`;
  }

  private _cell(c: CellInfo): TemplateResult {
    const z = c.zone;
    const tint = this._multi && z ? `${z.color}33` : 'rgba(255,255,255,.04)';
    const border = this._multi && z ? `${z.color}66` : 'rgba(255,255,255,.06)';
    const hatch = z?.degraded ? `hatch ${z.state === 'fallback' ? '' : 'held'}` : '';
    const pulse = z && this.s.runningZone === z.id && !this._editing ? 'pulse' : '';
    const selected = this._multi && !this._editing && z?.id === this._current.id;
    return html`<div
      class="cell ${hatch} ${pulse}"
      style="background:${tint};border-color:${selected ? z!.color : border}"
      title=${`${cellLabel(c.r, c.c)}${z && this._multi ? ` · ${z.name}` : ''}`}
      @pointerdown=${() => this._down(c)}
      @pointerenter=${() =>
        this._editing && this._tool === 'paint' && this._painting && this._paintCell(c)}
    >
      <span class="pos">${cellLabel(c.r, c.c)}</span>
      ${c.probes.map((p) => {
        const zone = this.s.zones.find((x) => x.probes.includes(p));
        const sub = zone?.substitution?.witness === p.name;
        const bad = p.health !== 'ok';
        return html`<span
          class="pin ${p.role} ${bad ? 'bad' : ''} ${sub ? 'sub' : ''}"
          title="${p.name} · ${p.role}${bad ? ` · ${p.health}` : ''}${sub
            ? ' · steering in its place'
            : ''}"
          >${bad ? '!' : sub ? '⇄' : p.role === 'control' ? 'C' : 'W'}</span
        >`;
      })}
      ${c.plant ? html`<span class="strain">${c.plant.strain}</span>` : nothing}
    </div>`;
  }

  private _down(c: CellInfo) {
    if (!this._editing) {
      if (c.zone) this._zone = c.zone.id;
      return;
    }
    if (this._tool === 'paint') {
      this._painting = true;
      this._paintCell(c);
    } else if (this._probeEntity && c.zone) {
      const r = placeProbe(this.s, c.zone.id, this._probeEntity, [c.r, c.c]);
      this._msg = r ? { ok: false, text: r } : null;
      this._probeEntity = '';
      touch();
      this.requestUpdate();
    }
  }

  private _paintCell(c: CellInfo) {
    assignCell(this.s, c.key, this._current.id);
    touch();
    this.requestUpdate();
  }

  // ── Zone panel ───────────────────────────────────────────────────────────

  private _renderPanel(grid: CellInfo[][]): TemplateResult {
    const z = this._current;
    const h = zoneHeadline(z, this.s);
    const control = z.probes.find((p) => p.role === 'control');
    const mine = this.s.attempts.filter((a) => a.zoneId === z.id);
    const asked = mine.reduce((n, a) => n + a.plannedL * (a.count ?? 1), 0);
    const charged = mine.reduce((n, a) => n + a.chargedL, 0);
    const got = deliveredToday(this.s, z.id);
    const max = Math.max(asked, charged, got, 0.1);
    return html`
      <div class="panel">
        <h3>
          ${this._multi
            ? html`<span class="dot" style="background:${z.color}"></span>${z.name}`
            : 'Irrigation'}
          <span style="font-size:12px;font-weight:400;color:${TONE_COLOR[h.tone]}">${h.label}</span>
        </h3>
        <div class="sentence">${this._sentence(z, control?.name)}</div>
        <div style="font-size:12px;color:var(--secondary-text-color)">
          ${z.phase ?? '—'} ·
          ${z.vwc != null
            ? html`<b style="color:var(--primary-text-color)">${z.vwc}%</b> VWC`
            : 'no reading'}
          ${this._multi ? html` · ${plantCount(z, grid)} plants` : nothing}
        </div>
        ${this._renderDots(z)}
        <div class="bars">
          ${[
            ['Asked', asked, 'rgba(255,255,255,.35)'],
            ['Charged', charged, TONE_COLOR.warn],
            ['Got', got, TONE_COLOR.active],
          ].map(
            ([k, v, col]) =>
              html`<div class="bar-row">
                <span>${k}</span>
                <span class="track"
                  ><span style="width:${((v as number) / max) * 100}%;background:${col}"></span
                ></span>
                <span>${(v as number).toFixed(1)} L</span>
              </div>`
          )}
        </div>
        ${this._attempt && this._attempt.zoneId === z.id
          ? html`<div class="popover">
              <div style="font-weight:600;margin-bottom:4px">
                ${hhmm(this._attempt.requestedAt)} · ${triggerText(this._attempt)} —
                ${outcomeText(this._attempt)}
              </div>
              ${lifecycle(this._attempt)}
            </div>`
          : html`<div style="font-size:12px;color:var(--secondary-text-color)">
              Tap a dot for that shot.
            </div>`}
        ${z.proposal
          ? html`<div class="popover" style="border-left:3px solid ${TONE_COLOR.warn}">
              Meter reads ${Math.round((z.proposal.ratio - 1) * 100)}% above the configured flow
              rate over ${z.calibrationEvidence} shots.
              <button class="lnk">Set ${z.proposal.to} mL/s</button>
            </div>`
          : nothing}
        <div style="display:flex;justify-content:flex-end;margin-top:12px">
          <button class="btn" @click=${() => ((this._editing = true), (this._msg = null))}>
            ${this._multi ? 'Edit zones' : 'Split into zones…'}
          </button>
        </div>
      </div>
    `;
  }

  private _sentence(z: ProtoZone, control?: string): TemplateResult | string {
    if (this.s.cap.hitAt !== null)
      return html`<b>Daily cap reached at ${hhmm(this.s.cap.hitAt)}.</b> Nothing waters until
        midnight; the cap bar shows who spent it.`;
    if (z.state === 'fallback' && z.fallback)
      return html`<b>${control} has not risen after 3 shots</b> since ${z.degraded?.since}.
        Replaying ${z.fallback.referenceDay}'s shots at
        80%${z.fallback.nextShot ? html`, next at ${z.fallback.nextShot}` : ''}. Check the emitter
        as well as the probe.`;
    if (z.degraded)
      return html`<b>Held: ${REASON_LABEL[z.degraded.cause]}</b> since ${z.degraded.since}. The pin
        marks the probe. Probe out of the pot, or water not reaching it — check both.
        ${z.fallback?.referenceDay
          ? html`<br /><button class="lnk">
                Replay ${z.fallback.referenceDay} at 80% instead
              </button>`
          : nothing}`;
    if (z.state === 'running') return html`<b>Watering now</b> — 50 s P2 shot, started 13:31.`;
    if (z.state === 'queued' && z.claim)
      return html`<b>Due since ${z.claim.dueAt}</b>, waiting for ${z.claim.ahead.join(', ')} to
        finish.${z.substitution
          ? html` Steering on witness ${z.substitution.witness} (+${z.substitution.offset}) —
            ${control} stopped reporting at ${z.substitution.since}.`
          : nothing}`;
    if (z.substitution)
      return html`Steering on witness <b>${z.substitution.witness}</b> since
        ${z.substitution.since}.`;
    return 'Steering normally.';
  }

  /** 06:00–18:00 strip, one mark per attempt. */
  private _renderDots(z: ProtoZone): TemplateResult {
    const w = 300;
    const x = (m: number) =>
      ((m - this.s.lightsOn) / (this.s.lightsOff - this.s.lightsOn)) * (w - 10) + 5;
    const mine = this.s.attempts.filter((a) => a.zoneId === z.id);
    return html`<svg viewBox="0 0 ${w} 34" width="100%" style="margin-top:8px">
      <line x1="5" x2=${w - 5} y1="14" y2="14" stroke="rgba(255,255,255,.15)" />
      ${z.degraded
        ? svg`<rect x=${x(Number(z.degraded.since.split(':')[0]) * 60 + Number(z.degraded.since.split(':')[1]))} y="8" width=${w} height="12" fill="${z.state === 'fallback' ? 'rgba(255,152,0,.15)' : 'rgba(244,67,54,.15)'}" />`
        : nothing}
      <line
        x1=${x(this.s.now)}
        x2=${x(this.s.now)}
        y1="4"
        y2="24"
        stroke="rgba(255,255,255,.5)"
        stroke-dasharray="2 2"
      />
      ${mine.map((a) => {
        const cx = x(a.requestedAt);
        const sel = this._attempt?.id === a.id;
        const r = sel ? 6 : 4.5;
        const click = () => (this._attempt = a);
        if (a.outcome === 'suppressed' || a.outcome === 'not_delivered')
          return svg`<g @click=${click} style="cursor:pointer"><circle cx=${cx} cy="14" r=${r} fill="none" stroke="${TONE_COLOR.danger}" stroke-width="1.5"/><line x1=${cx - 3} x2=${cx + 3} y1="11" y2="17" stroke="${TONE_COLOR.danger}"/></g>`;
        if (a.trigger === 'fallback')
          return svg`<circle @click=${click} style="cursor:pointer" cx=${cx} cy="14" r=${r} fill="none" stroke="#ba68c8" stroke-width="2" stroke-dasharray="2 1.5"/>`;
        if (a.outcome === 'aborted')
          return svg`<circle @click=${click} style="cursor:pointer" cx=${cx} cy="14" r=${r} fill="${TONE_COLOR.warn}"/>`;
        return svg`<circle @click=${click} style="cursor:pointer" cx=${cx} cy="14" r=${r} fill="${a.outcome === 'open' ? '#fff' : z.color}"/>`;
      })}
      <text x="5" y="32">${hhmm(this.s.lightsOn)}</text>
      <text x=${w - 30} y="32">${hhmm(this.s.lightsOff)}</text>
    </svg>`;
  }

  private _renderCap(): TemplateResult {
    const use = capUse(this.s);
    const cap = this.s.cap;
    return html`
      <div class="cap">
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span
            >Toward daily cap <b>${use.liters} / ${cap.litersCap} L</b> · ${use.cycles} /
            ${cap.cyclesCap} cycles</span
          >
          <span style="color:var(--secondary-text-color)"
            >Liters today ${deliveredToday(this.s)} L</span
          >
        </div>
        <div class="seg" style="margin-top:6px">
          ${this.s.zones.map(
            (z) =>
              html`<span
                title="${z.name}: ${(use.byZone[z.id] ?? 0).toFixed(1)} L"
                style="width:${((use.byZone[z.id] ?? 0) / cap.litersCap) * 100}%;background:${this
                  ._multi
                  ? z.color
                  : TONE_COLOR.active}"
              ></span>`
          )}
        </div>
        ${this._multi
          ? html`<div class="legend">
              ${this.s.zones.map(
                (z) =>
                  html`<span
                    ><span class="dot" style="background:${z.color}"></span> ${z.name}
                    ${(use.byZone[z.id] ?? 0).toFixed(1)} L</span
                  >`
              )}
            </div>`
          : nothing}
        ${cap.hitAt !== null
          ? html`<div style="font-size:12px;color:${TONE_COLOR.danger};margin-top:4px">
              Full at ${hhmm(cap.hitAt)} —
              ${this.s.attempts
                .filter((a) => a.reason === 'cap_volume')
                .reduce((n, a) => n + (a.count ?? 1), 0)}
              shots not started since.
            </div>`
          : nothing}
      </div>
    `;
  }

  // ── Editing on the grid ──────────────────────────────────────────────────

  private _renderToolbar(): TemplateResult {
    const used = new Set(this.s.zones.flatMap((z) => z.probes.map((p) => p.entity)));
    return html`
      <div class="toolbar">
        ${this.s.zones.map(
          (z) =>
            html`<button
              class="swatch"
              style="border-color:${z.id === this._current.id ? z.color : 'transparent'}"
              @click=${() => (this._zone = z.id)}
            >
              <span class="dot" style="background:${z.color}"></span>${z.name}
            </button>`
        )}
        <button
          class="swatch"
          @click=${() => {
            const r = addZone(this.s);
            if (typeof r === 'string') this._msg = { ok: false, text: r };
            else this._zone = r.id;
            touch();
            this.requestUpdate();
          }}
        >
          + Zone
        </button>
        <span style="flex:1"></span>
        <button
          class="btn"
          aria-pressed=${this._tool === 'paint'}
          @click=${() => (this._tool = 'paint')}
        >
          Paint cells
        </button>
        <button
          class="btn"
          aria-pressed=${this._tool === 'probe'}
          @click=${() => (this._tool = 'probe')}
        >
          Place probe
        </button>
        ${this._tool === 'probe'
          ? html`<select
              @change=${(e: Event) => (this._probeEntity = (e.target as HTMLSelectElement).value)}
            >
              <option value="">pick a sensor, then a cell…</option>
              ${this.s.probeEntities
                .filter((p) => !used.has(p))
                .map((p) => html`<option value=${p}>${p}</option>`)}
            </select>`
          : nothing}
      </div>
    `;
  }

  private _renderEditPanel(grid: CellInfo[][]): TemplateResult {
    const z = this._current;
    const taken = new Map<string, string>();
    for (const o of this.s.zones) for (const v of o.valves) taken.set(v, o.name);
    const problems = saveProblems(this.s);
    return html`
      <div class="panel">
        <h3>
          <span class="dot" style="background:${z.color}"></span>
          <input
            type="text"
            .value=${z.name}
            @input=${(e: Event) => {
              z.name = (e.target as HTMLInputElement).value;
              touch();
            }}
          />
        </h3>
        <div style="font-size:12px;color:var(--secondary-text-color);margin:6px 0">
          ${z.cells.length} cells · ${plantCount(z, grid)} plants — drag across the grid to give it
          cells
        </div>
        <div style="font-size:11px;color:var(--secondary-text-color);margin-top:10px">Valves</div>
        <div class="chips">
          ${this.s.valves.map((v) => {
            const owner = taken.get(v);
            const mine = z.valves.includes(v);
            return html`<button
              class="chip"
              aria-pressed=${mine}
              ?disabled=${!!owner && !mine}
              title=${owner && !mine ? `opens ${owner}` : v}
              @click=${() => {
                const r = toggleValve(this.s, z.id, v);
                this._msg = r ? { ok: false, text: r } : null;
                touch();
                this.requestUpdate();
              }}
            >
              ${v.replace('switch.', '')}
            </button>`;
          })}
        </div>
        <div style="font-size:11px;color:var(--secondary-text-color);margin-top:10px">
          Probes (tap to make control)
        </div>
        <div class="chips">
          ${z.probes.map(
            (p) =>
              html`<button
                class="chip"
                aria-pressed=${p.role === 'control'}
                @click=${() => {
                  makeControl(this.s, z.id, p.entity);
                  touch();
                  this.requestUpdate();
                }}
              >
                ${p.role === 'control' ? 'C' : 'W'}
                ${p.name}${p.cell ? ` @ ${cellLabel(p.cell[0], p.cell[1])}` : ''}
                <span
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    removeProbe(this.s, z.id, p.entity);
                    touch();
                    this.requestUpdate();
                  }}
                  >×</span
                >
              </button>`
          )}
        </div>
        <div style="font-size:11px;color:var(--secondary-text-color);margin-top:10px">
          If its control probe fails
        </div>
        <div class="chips">
          ${(['hold', 'replay'] as const).map(
            (m) =>
              html`<button
                class="chip"
                aria-pressed=${z.degradedFallback === m}
                @click=${() => {
                  z.degradedFallback = m;
                  touch();
                  this.requestUpdate();
                }}
              >
                ${m === 'hold' ? 'Hold' : 'Replay last clean day'}
              </button>`
          )}
        </div>
        <label style="font-size:12px;display:flex;gap:6px;align-items:center;margin-top:12px">
          <input
            type="checkbox"
            .checked=${this._conflict}
            @change=${(e: Event) => (this._conflict = (e.target as HTMLInputElement).checked)}
          />
          Simulate a plant moved meanwhile (rev ${this.s.layoutRevision})
        </label>
        ${problems.length ? html`<div class="msg bad">${problems.join(' ')}</div>` : nothing}
        ${this._msg
          ? html`<div class="msg ${this._msg.ok ? 'ok' : 'bad'}">${this._msg.text}</div>`
          : nothing}
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button class="btn" @click=${() => (this._editing = false)}>Done</button>
          <button
            class="btn primary"
            @click=${() => {
              const r = saveZones(this.s, this._conflict);
              this._msg = { ok: r.ok, text: r.message };
              touch();
            }}
          >
            Save
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'proto864-variant-b': Proto864VariantB;
  }
}
