/**
 * PROTOTYPE — growspace_manager#864, variant A: "Zone switcher".
 *
 * Zones are a second axis of the Irrigation dialog: a strip of zone pills sits
 * above every tab and scopes it. The zone's health is a sentence, today's
 * attempts are a ledger table, the cap is a footer tile with a "why?" answer,
 * and zones are edited in a form with a paint-the-grid brush.
 * A single-zone grower sees no strip and no zone word; `probe_unresponsive`
 * reaches them as a banner over the existing Overview and in the safety chip.
 */

import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GrowspaceDevice } from '../../../services/types';
import {
  REASON_LABEL,
  capUse,
  deliveredToday,
  hhmm,
  touch,
  zoneHeadline,
  TONE_COLOR,
  type ProtoAttempt,
  type ProtoScenario,
  type ProtoZone,
} from './state';
import {
  addZone,
  assignCell,
  cellLabel,
  cells,
  deliveredText,
  lifecycle,
  makeControl,
  meterVerdict,
  outcomeText,
  placeProbe,
  plantCount,
  protoBaseStyles,
  removeProbe,
  removeZone,
  saveProblems,
  saveZones,
  toggleValve,
  triggerText,
  waitText,
} from './shared';

@customElement('proto864-variant-a')
export class Proto864VariantA extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) s!: ProtoScenario;

  @state() private _zone = '';
  @state() private _open = new Set<string>();
  @state() private _why = false;
  @state() private _editing = false;
  @state() private _brush = '';
  @state() private _msg: { ok: boolean; text: string } | null = null;
  @state() private _conflict = false;
  private _painting = false;

  static styles = [
    protoBaseStyles,
    css`
      .strip {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
        padding-bottom: 12px;
        margin-bottom: 14px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .pill {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px 6px 10px;
        border-radius: 18px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.14));
        background: rgba(255, 255, 255, 0.04);
        color: var(--primary-text-color);
        cursor: pointer;
        font: inherit;
        text-align: left;
      }
      .pill[aria-selected='true'] {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--primary-text-color);
      }
      .pill small {
        display: block;
        font-size: 11px;
      }
      .spacer {
        flex: 1;
      }
      .banner {
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 14px;
        border-left: 4px solid;
        background: rgba(255, 152, 0, 0.08);
        line-height: 1.45;
      }
      .banner.danger {
        background: rgba(244, 67, 54, 0.1);
      }
      .banner.info {
        background: rgba(33, 150, 243, 0.08);
      }
      .banner b {
        display: block;
        margin-bottom: 2px;
      }
      .facts {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
      .fact {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        border-radius: 10px;
        padding: 10px;
      }
      .fact .k {
        font-size: 11px;
        color: var(--secondary-text-color);
      }
      .fact .v {
        font-size: 18px;
        font-weight: 600;
        margin-top: 2px;
        font-variant-numeric: tabular-nums;
      }
      .fact .sub {
        font-size: 11px;
        color: var(--secondary-text-color);
        margin-top: 2px;
      }
      h3 {
        font-size: 14px;
        margin: 18px 0 8px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
      }
      th {
        text-align: left;
        font-weight: 500;
        color: var(--secondary-text-color);
        font-size: 11px;
        padding: 4px 6px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      td {
        padding: 7px 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        vertical-align: top;
      }
      tr.row {
        cursor: pointer;
      }
      tr.row:hover td {
        background: rgba(255, 255, 255, 0.03);
      }
      tr.muted td {
        color: var(--secondary-text-color);
      }
      tr.queued td {
        background: rgba(33, 150, 243, 0.08);
      }
      tr.detail td {
        background: rgba(255, 255, 255, 0.03);
        padding: 10px 14px;
      }
      .tag {
        font-size: 11px;
        padding: 1px 7px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.08);
        white-space: nowrap;
      }
      .tag.replay {
        background: rgba(186, 104, 200, 0.2);
      }
      .tag.warn {
        background: rgba(255, 152, 0, 0.2);
      }
      .tag.bad {
        background: rgba(244, 67, 54, 0.2);
      }
      .cap {
        margin-top: 18px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        padding-top: 12px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .meter {
        height: 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
        overflow: hidden;
        display: flex;
        margin: 6px 0 4px;
      }
      .meter > span {
        height: 100%;
      }
      .why {
        grid-column: 1 / -1;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 13px;
        line-height: 1.5;
      }
      .why-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      /* editor */
      .editor {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
        gap: 16px;
      }
      .zcard {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 10px;
      }
      .zcard[data-active='true'] {
        border-color: var(--primary-text-color);
      }
      .zcard header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .zcard header input {
        flex: 1;
      }
      .lbl {
        font-size: 11px;
        color: var(--secondary-text-color);
        margin: 8px 0 4px;
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
        cursor: not-allowed;
      }
      .probe-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        margin-bottom: 4px;
      }
      .paint {
        display: grid;
        gap: 4px;
        user-select: none;
      }
      .pc {
        aspect-ratio: 1;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        cursor: crosshair;
        border: 2px solid transparent;
        position: relative;
        overflow: hidden;
        text-align: center;
        line-height: 1.1;
      }
      .pc .probe {
        position: absolute;
        top: 2px;
        right: 3px;
        font-size: 11px;
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
      .overview-mock {
        border: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: 10px;
        padding: 26px;
        text-align: center;
        color: var(--secondary-text-color);
      }
    `,
  ];

  private get _multi(): boolean {
    return this.s.zones.length > 1;
  }

  private get _current(): ProtoZone {
    return this.s.zones.find((z) => z.id === this._zone) ?? this.s.zones[0];
  }

  render(): TemplateResult {
    if (this._editing) return this._renderEditor();
    const z = this._current;
    return html`
      <p class="proto-note">
        Variant A · zones are a second axis: this strip would sit above every tab and scope it
      </p>
      ${this._multi ? this._renderStrip() : nothing} ${this._renderBanner(z)}
      ${this._multi
        ? html`${this._renderFacts(z)} ${this._renderLedger(z)}`
        : html`<div class="overview-mock">Existing Overview tab renders here, unchanged</div>
            ${this._renderLedger(z)}`}
      ${this._renderCap()}
      ${this._multi
        ? nothing
        : html`<p style="font-size:12px;color:var(--secondary-text-color);margin-top:16px">
            In Configuration, beside the pump:
            <button class="lnk" @click=${() => this._startEdit()}>
              Water part of this tent separately…
            </button>
            (the only door into zones for a single-zone grower)
          </p>`}
    `;
  }

  // ── Strip ────────────────────────────────────────────────────────────────

  private _renderStrip(): TemplateResult {
    return html`
      <div class="strip" role="tablist" aria-label="Irrigation zones">
        ${this.s.zones.map((z) => {
          const h = zoneHeadline(z, this.s);
          return html`<button
            class="pill"
            role="tab"
            aria-selected=${z.id === this._current.id}
            @click=${() => (this._zone = z.id)}
          >
            <span class="dot" style="background:${z.color}"></span>
            <span>${z.name}<small style="color:${TONE_COLOR[h.tone]}">${h.label}</small></span>
          </button>`;
        })}
        <span class="spacer"></span>
        <button class="btn" @click=${() => this._startEdit()}>Edit zones</button>
      </div>
    `;
  }

  // ── Banner: the zone's health as one sentence ────────────────────────────

  private _renderBanner(z: ProtoZone): TemplateResult | typeof nothing {
    const name = this._multi ? `${z.name}: ` : '';
    const control = z.probes.find((p) => p.role === 'control');
    if (z.state === 'fallback' && z.degraded && z.fallback) {
      return html`<div class="banner" style="border-color:${TONE_COLOR.warn}">
        <b>${name}replaying ${z.fallback.referenceDay}'s shots at 80%</b>
        Probe ${control?.name}
        ${z.degraded.cause === 'probe_unresponsive'
          ? html`has not risen after 3 shots since ${z.degraded.since}`
          : html`stopped reporting at ${z.degraded.since}`}.
        Steering is paused; the zone waters on ${z.fallback.referenceDay}'s rhythm until the probe
        recovers, and the replay ends on its own once that day ages out.
        ${z.degraded.cause === 'probe_unresponsive'
          ? html`<br />Check the emitter as well as the probe — a blocked dripper looks the same.`
          : nothing}
        ${z.fallback.nextShot ? html`<br />Next replay shot ${z.fallback.nextShot}.` : nothing}
      </div>`;
    }
    if (z.degraded) {
      return html`<div class="banner danger" style="border-color:${TONE_COLOR.danger}">
        <b>${name}watering held — ${REASON_LABEL[z.degraded.cause]}</b>
        ${control?.name ?? 'The probe'} was watered 3 times since ${z.degraded.since} and its
        reading never rose (${control?.vwc}% each time). Either the probe is out of the substrate or
        the water is not reaching it — check both. No VWC shots fire until it responds; Manual Runs
        still work.
        ${z.fallback?.referenceDay
          ? html`<br />This zone could replay
              <b style="display:inline">${z.fallback.referenceDay}</b>'s shots at 80% instead of
              holding. <button class="lnk">Turn on replay fallback</button>`
          : nothing}
      </div>`;
    }
    if (z.substitution) {
      return html`<div class="banner" style="border-color:${TONE_COLOR.warn}">
        <b>${name}steering on witness ${z.substitution.witness}</b>
        Control probe ${control?.name} stopped reporting at ${z.substitution.since}.
        ${z.substitution.witness} stands in with its learned offset (+${z.substitution.offset} pts),
        so watering continues; dryback recording and shot learning are paused until ${control?.name}
        is back.
      </div>`;
    }
    return nothing;
  }

  private _renderFacts(z: ProtoZone): TemplateResult {
    const grid = cells(this.s, this.device);
    const control = z.probes.find((p) => p.role === 'control');
    const source = z.substitution
      ? `on witness ${z.substitution.witness} (+${z.substitution.offset})`
      : control
        ? `on ${control.name}`
        : 'no probe';
    const cal = { verified: 'Verified', unverified: 'Unverified', disputed: 'Disputed' }[
      z.calibration
    ];
    return html`
      <div class="facts">
        <div class="fact">
          <div class="k">VWC · ${z.phase ?? '—'}</div>
          <div class="v">${z.vwc != null ? `${z.vwc}%` : '—'}</div>
          <div class="sub">${z.vwc != null ? source : 'no trustworthy reading'}</div>
        </div>
        <div class="fact">
          <div class="k">Delivered today</div>
          <div class="v">${deliveredToday(this.s, z.id)} L</div>
          <div class="sub">
            ${this.s.attempts.filter((a) => a.zoneId === z.id && a.chargedL > 0).length} shots
          </div>
        </div>
        <div class="fact">
          <div class="k">Plants · valves</div>
          <div class="v">${plantCount(z, grid)} · ${z.valves.length}</div>
          <div class="sub">${z.cells.length} cells</div>
        </div>
        <div class="fact">
          <div class="k">Flow rate</div>
          <div
            class="v"
            style="color:${z.calibration === 'disputed' ? TONE_COLOR.warn : 'inherit'}"
          >
            ${cal}
          </div>
          <div class="sub">
            ${z.proposal
              ? html`meter reads ${Math.round((z.proposal.ratio - 1) * 100)}% more —
                  <button class="lnk">set ${z.proposal.to} mL/s?</button>`
              : z.meter
                ? `${z.calibrationEvidence} metered shots`
                : 'no meter'}
          </div>
        </div>
      </div>
    `;
  }

  // ── Ledger ───────────────────────────────────────────────────────────────

  private _renderLedger(z: ProtoZone): TemplateResult {
    const rows = this.s.attempts
      .filter((a) => a.zoneId === z.id)
      .slice()
      .reverse();
    const queued = this.s.queue.includes(z.id) && z.claim;
    const title = this._multi ? `${z.name} — today` : 'Today’s shots';
    return html`
      <h3>${title}</h3>
      ${!this._multi
        ? html`<p class="proto-note" style="margin-top:-4px">
            Single zone: this table is the one new thing (it lives under Water Analytics)
          </p>`
        : nothing}
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Why</th>
            <th>Asked</th>
            <th>Got</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${queued
            ? html`<tr class="queued">
                <td>${z.claim!.dueAt}</td>
                <td>P2 shot</td>
                <td>—</td>
                <td>—</td>
                <td>
                  Waiting for the pump — ${z.claim!.ahead.join(', ')} is watering first
                  (${Math.round(
                    this.s.now -
                      (this.s.attempts.find((a) => a.outcome === 'open')?.onAt ?? this.s.now)
                  )}
                  min in). Sized when its turn comes.
                </td>
              </tr>`
            : nothing}
          ${rows.map((a) => this._row(a))}
        </tbody>
      </table>
    `;
  }

  private _row(a: ProtoAttempt): TemplateResult {
    const open = this._open.has(a.id);
    const muted = a.outcome === 'suppressed' || a.outcome === 'not_delivered';
    const verdict = meterVerdict(a);
    const wait = waitText(a);
    return html`
      <tr
        class="row ${muted ? 'muted' : ''}"
        @click=${() => {
          const n = new Set(this._open);
          if (n.has(a.id)) n.delete(a.id);
          else n.add(a.id);
          this._open = n;
        }}
      >
        <td>
          ${hhmm(a.requestedAt)}${a.count && a.lastAt ? html`–${hhmm(a.lastAt)}` : nothing}
          ${wait
            ? html`<div style="font-size:11px;color:var(--secondary-text-color)">${wait}</div>`
            : nothing}
        </td>
        <td>
          ${a.trigger === 'fallback'
            ? html`<span class="tag replay">Replay</span>`
            : triggerText(a)}
        </td>
        <td>${a.plannedS} s · ${a.plannedL.toFixed(2)} L</td>
        <td>
          ${deliveredText(a)} ${verdict ? html`<span class="tag warn">${verdict}</span>` : nothing}
        </td>
        <td>
          ${a.count ? html`<span class="tag bad">×${a.count}</span> ` : nothing}${outcomeText(a)}
        </td>
      </tr>
      ${open
        ? html`<tr class="detail">
            <td colspan="5">${lifecycle(a)}</td>
          </tr>`
        : nothing}
    `;
  }

  // ── Cap: Dispensed Volume against its cap, and "why?" ────────────────────

  private _renderCap(): TemplateResult {
    const use = capUse(this.s);
    const cap = this.s.cap;
    const pct = Math.min(1, use.liters / cap.litersCap);
    const hit = cap.hitAt !== null;
    return html`
      <div class="cap">
        <div>
          <div style="font-size:12px;color:var(--secondary-text-color)">Toward daily cap</div>
          <div style="font-weight:600;font-variant-numeric:tabular-nums">
            ${use.liters} / ${cap.litersCap} L · ${use.cycles} / ${cap.cyclesCap} cycles
          </div>
          <div class="meter">
            ${this._multi
              ? this.s.zones.map(
                  (z) =>
                    html`<span
                      style="width:${((use.byZone[z.id] ?? 0) / cap.litersCap) *
                      100}%;background:${z.color}"
                    ></span>`
                )
              : html`<span
                  style="width:${pct * 100}%;background:${hit
                    ? TONE_COLOR.danger
                    : TONE_COLOR.active}"
                ></span>`}
          </div>
          ${hit
            ? html`<div style="color:${TONE_COLOR.danger};font-size:12px">
                Reached at ${hhmm(cap.hitAt!)} — every zone is held until midnight.
                <button class="lnk" @click=${() => (this._why = !this._why)}>Why?</button>
              </div>`
            : html`<button
                class="lnk"
                style="font-size:12px"
                @click=${() => (this._why = !this._why)}
              >
                Who used it?
              </button>`}
        </div>
        <div>
          <div style="font-size:12px;color:var(--secondary-text-color)">Liters today</div>
          <div style="font-weight:600">${deliveredToday(this.s)} L</div>
          <div style="font-size:12px;color:var(--secondary-text-color)">
            what the plants got (Aggregate Water Use)
          </div>
        </div>
        ${this._why ? this._renderWhy(use) : nothing}
      </div>
    `;
  }

  private _renderWhy(use: ReturnType<typeof capUse>): TemplateResult {
    const cap = this.s.cap;
    const suppressed = this.s.attempts.filter((a) => a.reason === 'cap_volume');
    return html`
      <div class="why">
        ${this.s.zones.map(
          (z) =>
            html`<div class="why-row">
              <span class="dot" style="background:${z.color}"></span>
              <span style="flex:1">${this._multi ? z.name : 'Charged'}</span>
              <span style="font-variant-numeric:tabular-nums"
                >${(use.byZone[z.id] ?? 0).toFixed(1)} L</span
              >
            </div>`
        )}
        <div style="margin-top:6px;color:var(--secondary-text-color)">
          The cap counts what each shot was <i>charged</i>: its planned volume at pump ON, raised to
          the meter's reading when a meter reads more. An aborted shot still costs its whole plan.
          ${this.s.zones.some((z) => z.calibration === 'disputed')
            ? html`<br /><b style="color:${TONE_COLOR.warn}"
                  >Bench A's meter reads 30% above its configured flow rate</b
                >, so its shots were charged more than planned — that is what ran the cap out by
                ${cap.hitAt ? hhmm(cap.hitAt) : ''}.
                <button class="lnk">Review the proposed flow rate</button>`
            : nothing}
          ${suppressed.length
            ? html`<br />${suppressed.reduce((n, a) => n + (a.count ?? 1), 0)} shots were not
                started after that, across ${new Set(suppressed.map((a) => a.zoneId)).size} zones.`
            : nothing}
        </div>
      </div>
    `;
  }

  // ── Editor: form + paint grid ────────────────────────────────────────────

  private _startEdit() {
    this._editing = true;
    this._brush = this._current.id;
    this._msg = null;
  }

  private _renderEditor(): TemplateResult {
    const grid = cells(this.s, this.device);
    const cols = grid[0]?.length ?? 1;
    const problems = saveProblems(this.s);
    return html`
      <p class="proto-note">Variant A · editing zones — pick a zone, then paint its cells</p>
      <div class="editor">
        <div>
          ${this.s.zones.map((z) => this._zoneCard(z))}
          <button
            class="btn"
            @click=${() => {
              const r = addZone(this.s);
              if (typeof r === 'string') this._msg = { ok: false, text: r };
              else this._brush = r.id;
              touch();
              this.requestUpdate();
            }}
          >
            + Add zone
          </button>
        </div>
        <div>
          <div
            class="paint"
            style="grid-template-columns:repeat(${cols},1fr)"
            @pointerup=${() => (this._painting = false)}
            @pointerleave=${() => (this._painting = false)}
          >
            ${grid.flat().map(
              (c) =>
                html`<div
                  class="pc"
                  title=${cellLabel(c.r, c.c)}
                  style="background:${c.zone
                    ? c.zone.color + '40'
                    : 'rgba(255,255,255,.04)'};border-color:${c.zone?.id === this._brush
                    ? c.zone.color
                    : 'transparent'}"
                  @pointerdown=${() => {
                    this._painting = true;
                    this._paint(c.key);
                  }}
                  @pointerenter=${() => this._painting && this._paint(c.key)}
                >
                  ${c.plant ? c.plant.strain.slice(0, 12) : cellLabel(c.r, c.c)}
                  ${c.probes.map(
                    (p) =>
                      html`<span class="probe" title=${p.entity}
                        >${p.role === 'control' ? '◉' : '○'}</span
                      >`
                  )}
                </div>`
            )}
          </div>
          <p style="font-size:12px;color:var(--secondary-text-color)">
            Plants follow their cell. Layout revision ${this.s.layoutRevision}; a save made after
            anyone else moved a plant is refused, not merged.
          </p>
          <label style="font-size:12px;display:flex;gap:6px;align-items:center">
            <input
              type="checkbox"
              .checked=${this._conflict}
              @change=${(e: Event) => (this._conflict = (e.target as HTMLInputElement).checked)}
            />
            Simulate someone moving a plant meanwhile
          </label>
        </div>
      </div>
      ${problems.length ? html`<div class="msg bad">${problems.join(' ')}</div>` : nothing}
      ${this._msg
        ? html`<div class="msg ${this._msg.ok ? 'ok' : 'bad'}">${this._msg.text}</div>`
        : nothing}
      <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
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

  private _paint(key: string) {
    if (!this._brush) return;
    assignCell(this.s, key, this._brush);
    touch();
    this.requestUpdate();
  }

  private _zoneCard(z: ProtoZone): TemplateResult {
    const taken = new Map<string, string>();
    for (const o of this.s.zones) for (const v of o.valves) taken.set(v, o.name);
    const used = new Set(this.s.zones.flatMap((o) => o.probes.map((p) => p.entity)));
    return html`
      <div class="zcard" data-active=${z.id === this._brush} @click=${() => (this._brush = z.id)}>
        <header>
          <span class="dot" style="background:${z.color}"></span>
          <input
            type="text"
            .value=${z.name}
            @input=${(e: Event) => {
              z.name = (e.target as HTMLInputElement).value;
              touch();
            }}
          />
          <button
            class="lnk"
            @click=${(e: Event) => {
              e.stopPropagation();
              const r = removeZone(this.s, z.id);
              if (r) this._msg = { ok: true, text: r };
              touch();
              this.requestUpdate();
            }}
          >
            Remove
          </button>
        </header>
        <div style="font-size:12px;color:var(--secondary-text-color)">${z.cells.length} cells</div>
        <div class="lbl">Valves (open together)</div>
        <div class="chips">
          ${this.s.valves.map((v) => {
            const owner = taken.get(v);
            const mine = z.valves.includes(v);
            return html`<button
              class="chip"
              aria-pressed=${mine}
              ?disabled=${!!owner && !mine}
              title=${owner && !mine ? `opens ${owner}` : v}
              @click=${(e: Event) => {
                e.stopPropagation();
                const r = toggleValve(this.s, z.id, v);
                if (r) this._msg = { ok: false, text: r };
                touch();
                this.requestUpdate();
              }}
            >
              ${v.replace('switch.', '')}
            </button>`;
          })}
        </div>
        <div class="lbl">Moisture probes</div>
        ${z.probes.map(
          (p) =>
            html`<div class="probe-row">
              <label style="display:flex;gap:4px;align-items:center">
                <input
                  type="radio"
                  name="ctl-${z.id}"
                  .checked=${p.role === 'control'}
                  @change=${() => {
                    makeControl(this.s, z.id, p.entity);
                    touch();
                    this.requestUpdate();
                  }}
                />${p.role === 'control' ? 'Control' : 'Witness'}
              </label>
              <span style="flex:1">${p.entity.replace('sensor.', '')}</span>
              <span style="color:var(--secondary-text-color)"
                >${p.cell ? `at ${cellLabel(p.cell[0], p.cell[1])}` : 'no cell'}</span
              >
              <button
                class="lnk"
                @click=${() => {
                  removeProbe(this.s, z.id, p.entity);
                  touch();
                  this.requestUpdate();
                }}
              >
                ×
              </button>
            </div>`
        )}
        <select
          @change=${(e: Event) => {
            const v = (e.target as HTMLSelectElement).value;
            if (!v) return;
            const cell = z.cells[0]?.split(',').map(Number) as [number, number] | undefined;
            const r = placeProbe(this.s, z.id, v, cell ?? null);
            if (r) this._msg = { ok: false, text: r };
            (e.target as HTMLSelectElement).value = '';
            touch();
            this.requestUpdate();
          }}
        >
          <option value="">+ Add probe…</option>
          ${this.s.probeEntities
            .filter((p) => !used.has(p))
            .map((p) => html`<option value=${p}>${p}</option>`)}
        </select>
        <div class="lbl">When its probe fails</div>
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
                ${m === 'hold' ? 'Hold watering' : 'Replay last clean day at 80%'}
              </button>`
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'proto864-variant-a': Proto864VariantA;
  }
}
