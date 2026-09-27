/**
 * PROTOTYPE — growspace_manager#864, variant C: "Supply timeline".
 *
 * The shared pump is the subject. One lane per zone across the lit day, every
 * Delivery Attempt a mark on it: its wait from `due_at`, its ON time, a cross
 * where it was not started, a hatched bar where it was a replay. The cap is a
 * cumulative line above the lanes, so the minute it ran out is a place you can
 * point at. A degraded lane is striped from the moment it degraded. Zones are
 * edited in a table, one row per zone, with a preview grid.
 * A single-zone grower gets the same timeline with one unlabelled lane — which
 * is new to them.
 */

import { LitElement, css, html, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GrowspaceDevice } from '../../../services/types';
import {
  REASON_LABEL,
  TONE_COLOR,
  capUse,
  cellKey,
  deliveredToday,
  hhmm,
  t,
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
  protoBaseStyles,
  removeZone,
  saveProblems,
  saveZones,
  toggleValve,
  triggerText,
} from './shared';

const W = 1000;

@customElement('proto864-variant-c')
export class Proto864VariantC extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) s!: ProtoScenario;

  @state() private _sel: ProtoAttempt | null = null;
  @state() private _why = false;
  @state() private _editing = false;
  @state() private _msg: { ok: boolean; text: string } | null = null;
  @state() private _conflict = false;
  @state() private _zoom = false;

  static styles = [
    protoBaseStyles,
    css`
      .supply {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(33, 150, 243, 0.08);
        margin-bottom: 12px;
        font-size: 13px;
      }
      .supply .pump {
        font-weight: 600;
      }
      .lanes {
        display: grid;
        grid-template-columns: 170px minmax(0, 1fr);
        align-items: center;
        row-gap: 4px;
      }
      .lname {
        font-size: 12px;
        line-height: 1.25;
        padding-right: 8px;
      }
      .lname b {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .lname small {
        display: block;
        font-size: 11px;
      }
      svg {
        display: block;
        width: 100%;
        overflow: visible;
      }
      svg text {
        fill: var(--secondary-text-color);
        font-size: 18px;
      }
      .mark {
        cursor: pointer;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        font-size: 11px;
        color: var(--secondary-text-color);
        margin: 8px 0 0 170px;
      }
      .detail {
        margin-top: 12px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 10px;
        padding: 10px 14px;
      }
      .detail h4 {
        margin: 0 0 6px;
        font-size: 14px;
      }
      .steps {
        display: flex;
        gap: 4px;
        margin: 6px 0 10px;
        font-size: 12px;
      }
      .steps span {
        padding: 3px 10px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.06);
        color: var(--secondary-text-color);
      }
      .steps span.on {
        background: rgba(33, 150, 243, 0.25);
        color: var(--primary-text-color);
      }
      .steps span.bad {
        background: rgba(244, 67, 54, 0.25);
        color: var(--primary-text-color);
      }
      .why {
        margin-top: 10px;
        font-size: 13px;
        line-height: 1.5;
        background: rgba(244, 67, 54, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th {
        text-align: left;
        font-weight: 500;
        color: var(--secondary-text-color);
        font-size: 11px;
        padding: 4px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      td {
        padding: 6px 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        vertical-align: top;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
      }
      .chip {
        font-size: 11px;
        padding: 2px 7px;
        border-radius: 10px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        background: transparent;
        color: var(--primary-text-color);
        cursor: pointer;
      }
      .chip[aria-pressed='true'] {
        background: rgba(255, 255, 255, 0.16);
      }
      .chip[disabled] {
        opacity: 0.35;
      }
      .preview {
        display: grid;
        gap: 2px;
        width: 180px;
      }
      .preview div {
        aspect-ratio: 1;
        border-radius: 3px;
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
    `,
  ];

  private get _multi(): boolean {
    return this.s.zones.length > 1;
  }

  private get _range(): [number, number] {
    return this._zoom ? [this.s.now - 120, this.s.now + 30] : [this.s.lightsOn, this.s.lightsOff];
  }

  private _x(m: number): number {
    const [a, b] = this._range;
    return ((m - a) / (b - a)) * W;
  }

  render(): TemplateResult {
    if (this._editing) return this._renderEditor();
    return html`
      <p class="proto-note">Variant C · the pump's day: one lane per zone, every attempt a mark</p>
      ${this._renderSupply()}
      <div class="lanes">
        <div class="lname" style="color:var(--secondary-text-color)">
          Toward daily cap<br /><b style="color:var(--primary-text-color)"
            >${capUse(this.s).liters} / ${this.s.cap.litersCap} L</b
          >
          ${this.s.cap.hitAt !== null
            ? html`<br /><button
                  class="lnk"
                  style="color:${TONE_COLOR.danger};font-size:11px"
                  @click=${() => (this._why = !this._why)}
                >
                  full ${hhmm(this.s.cap.hitAt)} — why?
                </button>`
            : nothing}
        </div>
        ${this._renderCapLine()} ${this.s.zones.map((z) => this._renderLane(z))}
        <div></div>
        ${this._renderAxis()}
      </div>
      <div class="legend">
        <span>▮ delivered</span><span>┄▮ waited for the pump</span
        ><span style="color:#ba68c8">▨ replay</span>
        <span style="color:${TONE_COLOR.danger}">✕ not started</span
        ><span>▯ no water (pump unconfirmed)</span>
        <span>▒ lane degraded</span>
        <button class="lnk" @click=${() => (this._zoom = !this._zoom)}>
          ${this._zoom ? 'Whole day' : 'Last 2 h'}
        </button>
      </div>
      ${this._why ? this._renderWhy() : nothing}
      ${this._sel ? this._renderDetail(this._sel) : nothing}
      <div
        style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:12px;color:var(--secondary-text-color)"
      >
        <span>Liters today ${deliveredToday(this.s)} L (what the plants got)</span>
        <button class="btn" @click=${() => ((this._editing = true), (this._msg = null))}>
          ${this._multi ? 'Edit zones' : 'Split into zones…'}
        </button>
      </div>
    `;
  }

  private _renderSupply(): TemplateResult {
    const running = this.s.zones.find((z) => z.id === this.s.runningZone);
    const open = this.s.attempts.find((a) => a.outcome === 'open');
    const queued = this.s.queue.map((id) => this.s.zones.find((z) => z.id === id)!);
    if (this.s.cap.hitAt !== null) {
      return html`<div class="supply" style="background:rgba(244,67,54,.1)">
        <span class="pump">Pump held</span> — daily cap reached at ${hhmm(this.s.cap.hitAt)}; every
        zone waits for midnight.
        <button class="lnk" @click=${() => (this._why = !this._why)}>Why?</button>
      </div>`;
    }
    return html`<div class="supply">
      <span class="pump">Pump</span>
      ${running && open
        ? html`<span
            >→ ${this._multi ? running.name : 'watering'} ·
            ${Math.round((this.s.now - open.onAt!) * 60)} of ${open.plannedS} s</span
          >`
        : html`<span>idle</span>`}
      ${queued.length
        ? html`<span style="color:var(--secondary-text-color)">
            Next: ${queued.map((z) => html`${z.name} (due ${z.claim?.dueAt}) `)}
          </span>`
        : nothing}
      ${this._multi
        ? nothing
        : this.s.zones[0].degraded
          ? html`<span style="color:${TONE_COLOR.danger}"
              >Held — ${REASON_LABEL[this.s.zones[0].degraded.cause]}</span
            >`
          : nothing}
    </div>`;
  }

  private _renderAxis(): TemplateResult {
    const [a, b] = this._range;
    const step = this._zoom ? 30 : 120;
    const ticks: number[] = [];
    for (let m = Math.ceil(a / step) * step; m <= b; m += step) ticks.push(m);
    return html`<div
      style="position:relative;height:20px;font-size:11px;color:var(--secondary-text-color)"
    >
      ${ticks.map(
        (m) =>
          html`<span
            style="position:absolute;left:${(this._x(m) / W) * 100}%;transform:translateX(-50%)"
            >${hhmm(m)}</span
          >`
      )}
    </div>`;
  }

  private _nowLine(h: number): TemplateResult {
    const x = this._x(this.s.now);
    return svg`<line x1=${x} x2=${x} y1="0" y2=${h} stroke="rgba(255,255,255,.6)" stroke-dasharray="4 3" />`;
  }

  /** Cumulative charged litres through the day, against the cap. */
  private _renderCapLine(): TemplateResult {
    const H = 40;
    const cap = this.s.cap.litersCap;
    let acc = 0;
    const pts: string[] = [`${this._x(this.s.lightsOn)},${H}`];
    for (const a of this.s.attempts) {
      if (a.chargedL <= 0) continue;
      const x = this._x(a.onAt ?? a.requestedAt);
      pts.push(`${x},${H - (acc / cap) * H}`);
      acc += a.chargedL;
      pts.push(`${x},${H - (acc / cap) * H}`);
    }
    pts.push(`${this._x(this.s.now)},${H - (acc / cap) * H}`);
    const hit = this.s.cap.hitAt;
    return html`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" height=${H}>
      <defs>
        <clipPath id="clip"><rect x="0" y="-4" width=${W} height=${H + 8} /></clipPath>
      </defs>
      <g clip-path="url(#clip)">
        <line
          x1="0"
          x2=${W}
          y1="0.5"
          y2="0.5"
          stroke="${TONE_COLOR.danger}"
          stroke-dasharray="6 4"
        />
        <polyline
          points=${pts.join(' ')}
          fill="none"
          stroke="${TONE_COLOR.active}"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
        ${hit !== null
          ? svg`<g class="mark" @click=${() => (this._why = !this._why)}>
              <circle cx=${this._x(hit)} cy="2" r="7" fill="${TONE_COLOR.danger}" />
            </g>`
          : nothing}
        ${this._nowLine(H)}
      </g>
    </svg>`;
  }

  private _renderLane(z: ProtoZone): TemplateResult {
    const H = 40;
    const h = zoneHeadline(z, this.s);
    const mine = this.s.attempts.filter((a) => a.zoneId === z.id);
    const since = z.degraded ? t(z.degraded.since) : null;
    const subSince = z.substitution ? t(z.substitution.since) : null;
    const pid = `hatch-${z.id}`;
    return html`
      <div class="lname">
        ${this._multi
          ? html`<b><span class="dot" style="background:${z.color}"></span>${z.name}</b>`
          : html`<b>Today</b>`}
        <small style="color:${TONE_COLOR[h.tone]}">${h.label}</small>
        ${z.degraded
          ? html`<small style="color:var(--secondary-text-color)"
              >${REASON_LABEL[z.degraded.cause]} since
              ${z.degraded.since}${z.state === 'fallback' ? ' · 80%' : ''}</small
            >`
          : nothing}
        ${z.substitution
          ? html`<small style="color:var(--secondary-text-color)"
              >on ${z.substitution.witness} (+${z.substitution.offset}) since
              ${z.substitution.since}</small
            >`
          : nothing}
        ${mine.some((a) => a.count)
          ? html`<small style="color:${TONE_COLOR.danger}"
              >${mine
                .filter((a) => a.outcome === 'suppressed')
                .reduce((n, a) => n + (a.count ?? 1), 0)}
              not started</small
            >`
          : nothing}
      </div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" height=${H}>
        <defs>
          <pattern
            id=${pid}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect
              width="4"
              height="8"
              fill="${z.state === 'fallback' ? 'rgba(255,152,0,.18)' : 'rgba(244,67,54,.2)'}"
            />
          </pattern>
          <pattern
            id="rp-${z.id}"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="2.5" height="5" fill="#ba68c8" />
          </pattern>
          <clipPath id="lc-${z.id}"><rect x="0" y="0" width=${W} height=${H} /></clipPath>
        </defs>
        <g clip-path="url(#lc-${z.id})">
          <rect x="0" y="0" width=${W} height=${H} fill="rgba(255,255,255,.03)" />
          <rect
            x=${this._x(this.s.p2Stop)}
            y="0"
            width=${W}
            height=${H}
            fill="rgba(121,134,203,.08)"
          />
          ${since !== null
            ? svg`<rect x=${this._x(since)} y="0" width=${this._x(this.s.now) - this._x(since)} height=${H} fill="url(#${pid})" />
`
            : nothing}
          ${subSince !== null
            ? svg`<line x1=${this._x(subSince)} x2=${this._x(this.s.now)} y1=${H - 2} y2=${H - 2} stroke="${TONE_COLOR.warn}" stroke-width="3" stroke-dasharray="6 4" />
`
            : nothing}
          ${mine.map((a) => this._mark(a, z, H))}
          ${z.claim && this.s.queue.includes(z.id)
            ? svg`<line x1=${this._x(t(z.claim.dueAt))} x2=${this._x(this.s.now)} y1=${H / 2 + 6} y2=${H / 2 + 6} stroke="${TONE_COLOR.active}" stroke-dasharray="3 3" />
                <circle cx=${this._x(t(z.claim.dueAt))} cy=${H / 2 + 6} r="4" fill="none" stroke="${TONE_COLOR.active}" />`
            : nothing}
          ${z.fallback?.nextShot
            ? svg`<rect x=${this._x(t(z.fallback.nextShot))} y="10" width="6" height="16" fill="none" stroke="#ba68c8" stroke-dasharray="2 2" />`
            : nothing}
          ${this._nowLine(H)}
        </g>
      </svg>
    `;
  }

  private _mark(a: ProtoAttempt, z: ProtoZone, H: number): TemplateResult {
    const x0 = this._x(a.requestedAt);
    const sel = this._sel?.id === a.id;
    const click = () => (this._sel = sel ? null : a);
    const wait = a.requestedAt - a.dueAt >= 1;
    const whisker = wait
      ? svg`<line x1=${this._x(a.dueAt)} x2=${x0} y1=${H / 2 + 6} y2=${H / 2 + 6} stroke="rgba(255,255,255,.45)" stroke-dasharray="2 2" />`
      : nothing;
    const stroke = sel ? '#fff' : 'none';
    if (a.outcome === 'suppressed') {
      const x1 = a.lastAt ? this._x(a.lastAt) : x0;
      return svg`<g class="mark" @click=${click}>
        ${a.lastAt ? svg`<line x1=${x0} x2=${x1} y1=${H / 2 + 6} y2=${H / 2 + 6} stroke="${TONE_COLOR.danger}" stroke-dasharray="2 3" />` : nothing}
        <line x1=${x0 - 5} x2=${x0 + 5} y1=${H / 2 - 5} y2=${H / 2 + 5} stroke="${TONE_COLOR.danger}" stroke-width="2.5" vector-effect="non-scaling-stroke" />
        <line x1=${x0 - 5} x2=${x0 + 5} y1=${H / 2 + 5} y2=${H / 2 - 5} stroke="${TONE_COLOR.danger}" stroke-width="2.5" vector-effect="non-scaling-stroke" />

      </g>`;
    }
    const x = this._x(a.onAt ?? a.requestedAt);
    const w = Math.max(
      5,
      this._x((a.offAt ?? (a.outcome === 'open' ? this.s.now : a.requestedAt + 0.3)) as number) - x
    );
    if (a.outcome === 'not_delivered') {
      return svg`<g class="mark" @click=${click}>${whisker}<rect x=${x} y="10" width=${w} height="16" fill="none" stroke="${TONE_COLOR.danger}" stroke-width="2" /></g>`;
    }
    const fill =
      a.trigger === 'fallback'
        ? `url(#rp-${z.id})`
        : a.outcome === 'aborted'
          ? TONE_COLOR.warn
          : a.outcome === 'open'
            ? '#fff'
            : this._multi
              ? z.color
              : TONE_COLOR.active;
    return svg`<g class="mark" @click=${click}>${whisker}<rect x=${x} y="10" width=${w} height="16" rx="2" fill=${fill} stroke=${stroke} stroke-width="2">
      ${a.outcome === 'open' ? svg`<animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite" />` : nothing}
    </rect></g>`;
  }

  private _renderDetail(a: ProtoAttempt): TemplateResult {
    const z = this.s.zones.find((x) => x.id === a.zoneId);
    const closed = a.outcome !== 'open';
    const actuated = a.onAt !== undefined;
    return html`<div class="detail">
      <h4>
        ${this._multi ? html`${z?.name} · ` : nothing}${triggerText(a)} requested
        ${hhmm(a.requestedAt)}
        ${a.count ? html`(and ${a.count - 1} more to ${hhmm(a.lastAt!)})` : nothing}
      </h4>
      <div class="steps">
        <span class="on">Requested</span>
        <span
          class=${actuated
            ? 'on'
            : a.outcome === 'suppressed' || a.outcome === 'not_delivered'
              ? 'bad'
              : ''}
          >Actuated</span
        >
        <span class=${closed ? (a.outcome === 'completed' ? 'on' : 'bad') : ''}
          >Closed · ${outcomeText(a)}</span
        >
      </div>
      ${lifecycle(a)}
    </div>`;
  }

  private _renderWhy(): TemplateResult {
    const use = capUse(this.s);
    const disputed = this.s.zones.find((z) => z.calibration === 'disputed');
    return html`<div class="why">
      <b>Where today's ${this.s.cap.litersCap} L went</b>
      ${this.s.zones.map(
        (z) =>
          html`<div style="display:flex;gap:8px;align-items:center">
            <span class="dot" style="background:${z.color}"></span
            ><span style="flex:1">${z.name}</span>
            <span
              >${(use.byZone[z.id] ?? 0).toFixed(1)} L ·
              ${this.s.attempts.filter((a) => a.zoneId === z.id && a.chargedL > 0).length}
              shots</span
            >
          </div>`
      )}
      ${disputed?.proposal
        ? html`<div style="margin-top:6px">
            ${disputed.name}'s meter read ${Math.round((disputed.proposal.ratio - 1) * 100)}% more
            than its configured ${disputed.proposal.from} mL/s on every shot, and the cap charges
            the higher figure. <button class="lnk">Set ${disputed.proposal.to} mL/s</button> and its
            shots will be sized for the water they really give.
          </div>`
        : nothing}
      <div style="margin-top:6px;color:var(--secondary-text-color)">
        Resets at midnight. The cap is shared by the growspace; it is never split between zones.
      </div>
    </div>`;
  }

  // ── Table editor ─────────────────────────────────────────────────────────

  private _renderEditor(): TemplateResult {
    const grid = cells(this.s, this.device);
    const rows = grid.length;
    const cols = grid[0]?.length ?? 1;
    const taken = new Map<string, string>();
    for (const o of this.s.zones) for (const v of o.valves) taken.set(v, o.name);
    const used = new Set(this.s.zones.flatMap((z) => z.probes.map((p) => p.entity)));
    const problems = saveProblems(this.s);
    const rowOwner = (r: number) => {
      const owners = new Set(grid[r].map((c) => c.zone?.id));
      return owners.size === 1 ? [...owners][0] : null;
    };
    return html`
      <p class="proto-note">Variant C · zones as a table — benches are usually whole rows</p>
      <div style="display:flex;gap:16px;align-items:flex-start">
        <table style="flex:1">
          <thead>
            <tr>
              <th>Zone</th>
              <th>Rows</th>
              <th>Valves</th>
              <th>Control probe</th>
              <th>Witnesses</th>
              <th>Probe fails</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${this.s.zones.map((z) => {
              const control = z.probes.find((p) => p.role === 'control');
              return html`<tr>
                <td>
                  <span class="dot" style="background:${z.color}"></span>
                  <input
                    type="text"
                    style="width:90px"
                    .value=${z.name}
                    @input=${(e: Event) => (
                      (z.name = (e.target as HTMLInputElement).value),
                      touch()
                    )}
                  />
                </td>
                <td>
                  <div class="chips">
                    ${Array.from(
                      { length: rows },
                      (_, r) =>
                        html`<button
                          class="chip"
                          aria-pressed=${rowOwner(r) === z.id}
                          @click=${() => {
                            for (let c = 0; c < cols; c++) assignCell(this.s, cellKey(r, c), z.id);
                            touch();
                            this.requestUpdate();
                          }}
                        >
                          ${String.fromCharCode(65 + r)}
                        </button>`
                    )}
                  </div>
                </td>
                <td>
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
                        ${v.replace('switch.valve_', '')}
                      </button>`;
                    })}
                  </div>
                </td>
                <td>
                  <select
                    @change=${(e: Event) => {
                      const v = (e.target as HTMLSelectElement).value;
                      if (!z.probes.some((p) => p.entity === v)) {
                        const cell = z.cells[0]?.split(',').map(Number) as
                          | [number, number]
                          | undefined;
                        const r = placeProbe(this.s, z.id, v, cell ?? null);
                        if (r) this._msg = { ok: false, text: r };
                      }
                      makeControl(this.s, z.id, v);
                      touch();
                      this.requestUpdate();
                    }}
                  >
                    <option value="" ?selected=${!control}>—</option>
                    ${this.s.probeEntities
                      .filter((p) => !used.has(p) || z.probes.some((x) => x.entity === p))
                      .map(
                        (p) =>
                          html`<option value=${p} ?selected=${control?.entity === p}>
                            ${p.replace('sensor.', '')}
                          </option>`
                      )}
                  </select>
                  ${control?.cell
                    ? html`<div style="font-size:11px;color:var(--secondary-text-color)">
                        at ${cellLabel(control.cell[0], control.cell[1])}
                      </div>`
                    : nothing}
                </td>
                <td>
                  ${z.probes
                    .filter((p) => p.role === 'witness')
                    .map((p) => p.name)
                    .join(', ') || '—'}
                </td>
                <td>
                  <select
                    @change=${(e: Event) => (
                      (z.degradedFallback = (e.target as HTMLSelectElement).value as
                        | 'hold'
                        | 'replay'),
                      touch()
                    )}
                  >
                    <option value="hold" ?selected=${z.degradedFallback === 'hold'}>Hold</option>
                    <option value="replay" ?selected=${z.degradedFallback === 'replay'}>
                      Replay
                    </option>
                  </select>
                </td>
                <td>
                  <button
                    class="lnk"
                    @click=${() => {
                      const r = removeZone(this.s, z.id);
                      if (r) this._msg = { ok: true, text: r };
                      touch();
                      this.requestUpdate();
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>`;
            })}
          </tbody>
        </table>
        <div>
          <div class="preview" style="grid-template-columns:repeat(${cols},1fr)">
            ${grid
              .flat()
              .map(
                (c) =>
                  html`<div
                    title=${cellLabel(c.r, c.c)}
                    style="background:${c.zone ? c.zone.color + (c.plant ? 'cc' : '44') : '#333'}"
                  ></div>`
              )}
          </div>
          <div style="font-size:11px;color:var(--secondary-text-color);margin-top:4px;width:180px">
            Solid = a plant stands there. Layout rev ${this.s.layoutRevision}.
          </div>
        </div>
      </div>
      <button
        class="btn"
        style="margin-top:8px"
        @click=${() => {
          const r = addZone(this.s);
          if (typeof r === 'string') this._msg = { ok: false, text: r };
          touch();
          this.requestUpdate();
        }}
      >
        + Add zone
      </button>
      <label style="font-size:12px;display:flex;gap:6px;align-items:center;margin-top:10px">
        <input
          type="checkbox"
          .checked=${this._conflict}
          @change=${(e: Event) => (this._conflict = (e.target as HTMLInputElement).checked)}
        />
        Simulate a plant moved meanwhile
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
          Save zones
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'proto864-variant-c': Proto864VariantC;
  }
}
