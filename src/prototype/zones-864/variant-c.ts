/**
 * PROTOTYPE — growspace_manager#864. Throwaway; never merge.
 *
 * Variant C — "Map + day timeline". Zones live where the plants are: the main
 * card's plant grid is tinted by zone, each zone carries a status tag on its
 * first cell, and probes sit on their cells as markers. The dialog gains a
 * "Today" swimlane timeline (one lane per zone, the cap below), and a spatial
 * "Zone layout" editor where probes are placed by picking a token and a cell.
 * A single-zone grower's screen is unchanged unless a probe stops responding,
 * which marks that probe's cell on the grid itself.
 */
import { LitElement, css, html, nothing, svg } from 'lit';
import {
  hm,
  PROBE_CHOICES,
  VALVE_CHOICES,
  type ProtoAttempt,
  type ProtoWorld,
  type ProtoZone,
} from './fixture';
import {
  baseStyles,
  capByZone,
  causeLine,
  outcomeLabel,
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

/* ── Main card: per-cell decoration ───────────────────────────────────────── */
class ZpCCell extends ZpBase {
  static properties = { cell: { type: String } };
  declare cell: string;
  static styles = [
    baseStyles,
    css`
      :host {
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: inherit;
        z-index: 2;
      }
      .tint {
        position: absolute;
        inset: 0;
        border-radius: 12px;
      }
      .tag {
        position: absolute;
        top: 6px;
        left: 6px;
        right: 6px;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 3px 7px;
        border-radius: 8px;
        font-size: 10.5px;
        font-weight: 600;
        color: #fff;
        background: rgba(0, 0, 0, 0.62);
        backdrop-filter: blur(3px);
        white-space: nowrap;
        overflow: hidden;
      }
      .probe {
        position: absolute;
        bottom: 6px;
        right: 6px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 12px;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
      }
      .probe.bad {
        background: var(--zp-err);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--zp-err) 40%, transparent);
      }
      .probe.sub {
        background: var(--zp-warn);
      }
      .alert {
        position: absolute;
        left: 6px;
        right: 6px;
        bottom: 6px;
        margin-right: 30px;
        padding: 3px 6px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 600;
        background: var(--zp-err);
        color: #fff;
      }
    `,
  ];

  render() {
    if (ui.variant !== 'C') return nothing;
    const w = world();
    const z = w.zones.find((x) => x.cells.includes(this.cell));
    if (!z) return nothing;
    const probe = z.probes.find((p) => p.cell === this.cell);
    const bad = probe && probe.health !== 'ok';
    if (w.implicit) {
      if (!bad) return nothing;
      return html`<span class="probe bad" title="${probe.name}: ${probe.health}">!</span>
        <span class="alert">Probe not responding</span>`;
    }
    const first = z.cells[0] === this.cell;
    const tone = statusTone(z);
    const pattern =
      z.status === 'degraded'
        ? `repeating-linear-gradient(45deg, ${z.color}55 0 6px, transparent 6px 12px)`
        : z.status === 'fallback'
          ? `repeating-linear-gradient(90deg, ${z.color}40 0 3px, transparent 3px 9px)`
          : `${z.color}26`;
    return html`<div
        class="tint"
        style="background:${pattern};box-shadow: inset 0 0 0 2px ${z.color}"
      ></div>
      ${first
        ? html`<span class="tag"
            ><span class="dot" style="background:${z.color}"></span>${z.name} · ${z.phase} ·
            ${z.vwc !== null ? `${z.vwc}%` : '—'}
            ${tone === 'err' || tone === 'warn'
              ? html`<span style="color:${tone === 'err' ? 'var(--zp-err)' : 'var(--zp-warn)'}"
                  >▲</span
                >`
              : tone === 'info'
                ? html`<span style="color:var(--zp-info)">●</span>`
                : nothing}</span
          >`
        : nothing}
      ${probe
        ? html`<span
            class="probe ${bad ? 'bad' : probe.substituting ? 'sub' : ''}"
            title="${probe.name} (${probe.role})${bad ? `: ${probe.health}` : ''}"
            >${probe.role === 'control' ? '◉' : '○'}</span
          >`
        : nothing}`;
  }
}

/* ── Dialog › Today: swimlane timeline ────────────────────────────────────── */
class ZpCToday extends ZpBase {
  /** D: embedded in A's scoped Overview — one zone's lane, or every lane. */
  static properties = { only: { type: String }, embedded: { type: Boolean } };
  declare only: string | undefined;
  declare embedded: boolean;
  static styles = [
    baseStyles,
    css`
      svg {
        width: 100%;
        height: auto;
        display: block;
      }
      .mark {
        cursor: pointer;
      }
      .panel {
        margin-top: 10px;
        padding: 10px 12px;
        border: 1px solid var(--zp-line);
        border-radius: 10px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
      }
      .legend {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        font-size: 11px;
        color: var(--zp-muted);
        margin: 6px 0 10px;
      }
    `,
  ];

  render() {
    const w = world();
    const W = 720;
    const L = 118;
    const R = W - 12;
    const laneH = 50;
    const top = 22;
    const capH = 70;
    const lanes = this.only ? w.zones.filter((z) => z.id === this.only) : w.zones;
    const H = top + laneH * lanes.length + capH + 12;
    const x = (m: number) => L + ((m - w.lightsOn) / (w.lightsOff - w.lightsOn)) * (R - L);
    const hours = [];
    for (let h = w.lightsOn; h <= w.lightsOff; h += 120) hours.push(h);
    const sel = w.attempts.find((a) => a.id === ui.selectedAttempt);
    const troubled = this.embedded ? [] : w.zones.filter((z) => troubleSentence(z, w));

    const mark = (a: ProtoAttempt, laneY: number, z: ProtoZone) => {
      const h = Math.max(4, Math.min(34, a.chargedL * 20));
      const base = laneY + laneH - 8;
      const cx = x(a.at);
      const isSel = ui.selectedAttempt === a.id;
      const pick = () => set({ selectedAttempt: isSel ? null : a.id });
      const wait =
        a.dueAt !== undefined && a.at - a.dueAt >= 0.2
          ? svg`<line x1=${x(a.dueAt)} x2=${cx} y1=${base + 3} y2=${base + 3} stroke=${z.color} stroke-dasharray="2 2"/>`
          : nothing;
      if (a.outcome === 'suppressed')
        return svg`<g class="mark" @click=${pick}><text x=${cx} y=${base - 2} fill="var(--zp-warn)" font-size="13" text-anchor="middle">×</text></g>`;
      const fill =
        a.outcome === 'queued'
          ? 'none'
          : a.trigger === 'fallback'
            ? 'url(#zp-stripe)'
            : a.outcome === 'aborted'
              ? 'none'
              : z.color;
      const stroke =
        a.outcome === 'aborted'
          ? 'var(--zp-err)'
          : a.outcome === 'queued' || a.outcome === 'running'
            ? '#fff'
            : isSel
              ? '#fff'
              : 'none';
      return svg`${wait}<rect class="mark" @click=${pick} x=${cx - 3} y=${base - h} width="6" height=${h} rx="1.5"
        fill=${fill} stroke=${stroke} stroke-width=${isSel ? 2 : 1.2} stroke-dasharray=${a.outcome === 'queued' ? '3 2' : ''}/>
        ${a.trigger === 'manual' ? svg`<text x=${cx} y=${base - h - 3} font-size="9" fill="#fff" text-anchor="middle">M</text>` : nothing}`;
    };

    // Cumulative charge for the cap lane.
    const capY0 = top + laneH * lanes.length + 10;
    const yCap = (l: number) => capY0 + capH - 14 - (l / w.cap.capL) * (capH - 26);
    let run = 0;
    const pts: string[] = [`${x(w.lightsOn)},${yCap(0)}`];
    for (const a of w.attempts) {
      if (a.outcome === 'suppressed' || a.outcome === 'queued') continue;
      pts.push(`${x(a.at)},${yCap(run)}`);
      run += a.chargedL;
      pts.push(`${x(a.at)},${yCap(run)}`);
    }
    pts.push(`${x(w.now)},${yCap(run)}`);
    // Zone scope: that zone's own share of the shared cap, in its colour.
    const own: string[] = [];
    const ownZone = this.only ? w.zones.find((z) => z.id === this.only) : undefined;
    if (ownZone) {
      let r2 = 0;
      own.push(`${x(w.lightsOn)},${yCap(0)}`);
      for (const a of w.attempts) {
        if (a.zoneId !== ownZone.id || a.outcome === 'suppressed' || a.outcome === 'queued')
          continue;
        own.push(`${x(a.at)},${yCap(r2)}`);
        r2 += a.chargedL;
        own.push(`${x(a.at)},${yCap(r2)}`);
      }
      own.push(`${x(w.now)},${yCap(r2)}`);
    }

    return html`${this.embedded
        ? nothing
        : html`<div class="protonote">
            PROTOTYPE C · Crop Steering › Today — click a mark for its attempt
          </div>`}
      ${troubled.map(
        (z) =>
          html`<div class="banner ${statusTone(z) === 'err' ? 'err' : 'warn'}">
            <span>⚠</span>
            <div><b>${z.name}: ${causeLine(z)}</b>${troubleSentence(z, w)}</div>
          </div>`
      )}
      <div class="legend">
        <span>▮ delivered (height = litres)</span><span>⬚ queued / running</span
        ><span>× not sent</span><span>▥ replay</span><span>M manual run</span
        ><span>- - wait for pump</span><span>▨ holding</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Today's deliveries by zone">
        <defs>
          <pattern
            id="zp-hatch"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="8" fill="rgba(219,68,55,0.28)" />
          </pattern>
          <pattern id="zp-stripe" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="2" height="4" fill="#ffa600" />
          </pattern>
        </defs>
        ${hours.map(
          (
            h
          ) => svg`<line x1=${x(h)} x2=${x(h)} y1=${top - 6} y2=${H - 8} stroke="rgba(255,255,255,0.07)"/>
            <text x=${x(h)} y=${12} fill="var(--zp-muted)" font-size="10" text-anchor="middle">${hm(h)}</text>`
        )}
        <rect
          x=${x(w.p2Stop)}
          y=${top}
          width=${R - x(w.p2Stop)}
          height=${laneH * lanes.length}
          fill="rgba(0,0,0,0.25)"
        />
        <text x=${x(w.p2Stop) + 4} y=${top + 10} fill="var(--zp-muted)" font-size="9">P3</text>
        ${lanes.map((z, i) => {
          const y = top + i * laneH;
          const band =
            (z.status === 'degraded' || z.status === 'fallback') && z.since !== undefined
              ? svg`<rect x=${x(z.since)} y=${y + 2} width=${x(w.now) - x(z.since)} height=${laneH - 4}
                  fill=${z.status === 'degraded' ? 'url(#zp-hatch)' : 'rgba(255,166,0,0.10)'} />
                  <text x=${x(z.since) + 4} y=${y + 12} font-size="9" fill=${z.status === 'degraded' ? 'var(--zp-err)' : 'var(--zp-warn)'}>
                    ${z.status === 'degraded' ? 'holding' : `replaying ${z.referenceDay} at 80%`}</text>`
              : nothing;
          return svg`<line x1=${L} x2=${R} y1=${y + laneH} y2=${y + laneH} stroke="rgba(255,255,255,0.08)"/>
            <rect x="4" y=${y + 16} width="8" height="8" rx="2" fill=${z.color}/>
            <text x="16" y=${y + 24} fill="var(--primary-text-color)" font-size="11">${z.name}</text>
            <text x="16" y=${y + 38} fill="var(--zp-muted)" font-size="9">${z.phase} · ${z.vwc !== null ? `${z.vwc}%` : 'no reading'}</text>
            ${band}
            ${w.attempts.filter((a) => a.zoneId === z.id).map((a) => mark(a, y, z))}`;
        })}
        <text x="16" y=${capY0 + 24} fill="var(--primary-text-color)" font-size="11">
          ${ownZone ? 'Tent cap' : 'Daily cap'}
        </text>
        <text x="16" y=${capY0 + 38} fill="var(--zp-muted)" font-size="9">
          ${w.cap.liters.toFixed(1)} / ${w.cap.capL} L
        </text>
        <line
          x1=${L}
          x2=${R}
          y1=${yCap(w.cap.capL)}
          y2=${yCap(w.cap.capL)}
          stroke="var(--zp-err)"
          stroke-dasharray="4 3"
        />
        <polyline points=${pts.join(' ')} fill="none" stroke="var(--zp-info)" stroke-width="1.6" />
        ${ownZone
          ? svg`<polyline points=${own.join(' ')} fill="none" stroke=${ownZone.color} stroke-width="2"/>`
          : nothing}
        ${w.cap.cappedAt !== undefined
          ? svg`<circle cx=${x(w.cap.cappedAt)} cy=${yCap(w.cap.capL)} r="4" fill="var(--zp-err)"/>
             <text x=${x(w.cap.cappedAt) + 6} y=${yCap(w.cap.capL) - 5} font-size="10" fill="var(--zp-err)">cap reached ${hm(w.cap.cappedAt)}</text>`
          : nothing}
        <line
          x1=${x(w.now)}
          x2=${x(w.now)}
          y1=${top - 4}
          y2=${H - 8}
          stroke="#fff"
          stroke-width="1"
        />
        <text x=${x(w.now)} y=${H - 1} font-size="9" fill="#fff" text-anchor="middle">now</text>
      </svg>
      ${sel
        ? this._panel(w, sel)
        : html`<div class="muted" style="margin-top:8px;">${this._capWho(w)}</div>`}`;
  }

  private _capWho(w: ProtoWorld) {
    return html`Cap so far:
    ${capByZone(w).map((p, i) => html`${i ? ' · ' : ''}${p.z.name} ${p.liters.toFixed(1)} L`)}`;
  }

  private _panel(w: ProtoWorld, a: ProtoAttempt) {
    const z = w.zones.find((x) => x.id === a.zoneId)!;
    return html`<div class="panel">
      <div>
        <b>${hm(a.at)} · ${zoneLabel(z)} · ${triggerText(a)}</b>
        <div class="muted">${volumeText(a)}</div>
        ${waitedText(a)
          ? html`<div class="muted">Claimed ${hm(a.dueAt!)}, ${waitedText(a)}</div>`
          : nothing}
        <div class="muted">
          Planned ${a.plannedS}s at ${z.flowMlPerSec} ml/s · calibration ${z.calibration}
        </div>
      </div>
      <div>${outcomeLabel(a)}</div>
    </div>`;
  }
}

/* ── Dialog › Zone layout: spatial editor ─────────────────────────────────── */
class ZpCLayout extends ZpBase {
  static styles = [
    baseStyles,
    css`
      .palette {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
      }
      .sw {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 2px solid transparent;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        min-width: 130px;
      }
      .sw.on {
        border-color: #fff;
      }
      .sw select {
        font-size: 11px;
        padding: 3px;
      }
      .grid {
        display: grid;
        gap: 6px;
      }
      .cell {
        min-height: 78px;
        border-radius: 12px;
        border: 2px solid;
        position: relative;
        padding: 8px;
        font-size: 11px;
        cursor: pointer;
        user-select: none;
      }
      .cell .pr {
        position: absolute;
        right: 6px;
        bottom: 6px;
        padding: 2px 6px;
        border-radius: 999px;
        font-size: 10px;
        background: rgba(0, 0, 0, 0.55);
      }
      .tray {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin: 12px 0 4px;
        align-items: center;
      }
      .tok {
        padding: 3px 9px;
        border-radius: 999px;
        border: 1px dashed var(--zp-line);
        cursor: pointer;
        font-size: 11px;
      }
      .tok.on {
        border-style: solid;
        border-color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }
      .foot {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
      }
    `,
  ];

  private _painting = false;
  private _placed: Record<string, { cell: string; role: 'control' | 'witness' }> = {};

  render() {
    const w = world();
    if (!Object.keys(this._placed).length) {
      for (const z of w.zones)
        for (const p of z.probes) this._placed[p.entity] = { cell: p.cell, role: p.role };
    }
    const probeAt = (cell: string) => Object.entries(this._placed).find(([, v]) => v.cell === cell);
    return html`<div class="protonote">
        PROTOTYPE C · Equipment › Zone layout — pick a zone, drag across plants; pick a probe token,
        click its cell
      </div>
      <div class="palette">
        ${w.zones.map(
          (z) =>
            html`<div
              class="sw ${ui.brush === z.id && !ui.pickedProbe ? 'on' : ''}"
              @click=${() => set({ brush: z.id, pickedProbe: null })}
            >
              <span>${zoneLabel(z)}</span>
              <select @click=${(e: Event) => e.stopPropagation()}>
                ${z.valves.length ? nothing : html`<option>valve…</option>`}
                ${VALVE_CHOICES.map(
                  (v) =>
                    html`<option ?selected=${z.valves[0]?.entity === v.entity}>${v.name}</option>`
                )}
              </select>
              <span class="muted" style="font-size:10px;"
                >${z.valves.length} valve(s) · ${z.cells.length} cells</span
              >
            </div>`
        )}
        <div class="sw" @click=${addZone} style="justify-content:center;align-items:center;">
          ＋ Add zone
        </div>
      </div>
      <div
        class="grid"
        style="grid-template-columns:repeat(${w.cols},1fr);"
        @pointerup=${() => (this._painting = false)}
        @pointerleave=${() => (this._painting = false)}
      >
        ${Array.from({ length: w.rows * w.cols }, (_, i) => {
          const cell = `${Math.floor(i / w.cols) + 1},${(i % w.cols) + 1}`;
          const z = w.zones.find((x) => x.cells.includes(cell));
          const pr = probeAt(cell);
          return html`<div
            class="cell"
            style="border-color:${z?.color ?? 'var(--zp-line)'};background:${z
              ? `${z.color}1f`
              : 'transparent'}"
            @pointerdown=${() => {
              if (ui.pickedProbe) {
                this._placed[ui.pickedProbe] = {
                  cell,
                  role: this._placed[ui.pickedProbe]?.role ?? 'witness',
                };
                set({ pickedProbe: null });
                return;
              }
              this._painting = true;
              assignCell(cell, ui.brush);
            }}
            @pointerenter=${() => this._painting && !ui.pickedProbe && assignCell(cell, ui.brush)}
          >
            <b>${w.plants[cell] ?? html`<span class="muted">empty</span>`}</b>
            <div class="muted">r${cell.replace(',', ' c')}</div>
            ${pr
              ? html`<span
                  class="pr"
                  title="Click to switch role"
                  @pointerdown=${(e: Event) => {
                    e.stopPropagation();
                    pr[1].role = pr[1].role === 'control' ? 'witness' : 'control';
                    this.requestUpdate();
                  }}
                  >${pr[1].role === 'control' ? '◉ control' : '○ witness'} ·
                  ${PROBE_CHOICES.find((p) => p.entity === pr[0])?.name}</span
                >`
              : nothing}
          </div>`;
        })}
      </div>
      <div class="tray">
        <span class="muted">Probes:</span>
        ${PROBE_CHOICES.map(
          (p) =>
            html`<span
              class="tok ${ui.pickedProbe === p.entity ? 'on' : ''}"
              @click=${() => set({ pickedProbe: ui.pickedProbe === p.entity ? null : p.entity })}
              >${this._placed[p.entity] ? '📍' : '＋'} ${p.name}</span
            >`
        )}
      </div>
      <div class="muted" style="font-size:12px;">
        A probe belongs to the zone its cell is in. Each zone needs one control probe; the rest
        witness.
      </div>
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
        <button class="btn primary" @click=${saveLayout}>Save layout</button>
      </div>
      ${toastView()}`;
  }
}

/* ── Overview, single zone only: point at the grid ────────────────────────── */
class ZpCOverview extends ZpBase {
  static styles = [baseStyles];
  render() {
    const w = world();
    if (!w.implicit) {
      return html`<div class="protonote">
        PROTOTYPE C · zones live on the main card grid and in Crop Steering › Today
      </div>`;
    }
    const t = troubleSentence(w.zones[0], w);
    return t
      ? html`<div class="protonote">
            PROTOTYPE C · single zone: the probe's cell is marked on the grid too
          </div>
          <div class="banner err">
            <span>⚠</span>
            <div><b>Probe not responding</b>${t}</div>
          </div>`
      : html`<div class="protonote">PROTOTYPE C · single zone: nothing new</div>`;
  }
}

const def = (tag: string, c: CustomElementConstructor) => {
  if (!customElements.get(tag)) customElements.define(tag, c);
};
def('zp-c-cell', ZpCCell);
def('zp-c-today', ZpCToday);
def('zp-c-layout', ZpCLayout);
def('zp-c-overview', ZpCOverview);
