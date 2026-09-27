/**
 * PROTOTYPE — growspace_manager#864. Throwaway; never merge.
 *
 * Small shared atoms. Deliberately no shared layout: each variant owns its own.
 */
import { css, html, nothing } from 'lit';
import {
  CAUSE_TEXT,
  REASON_TEXT,
  STATUS_TEXT,
  hm,
  type ProtoAttempt,
  type ProtoWorld,
  type ProtoZone,
} from './fixture';
import { ui } from './store';

export const baseStyles = css`
  :host {
    display: block;
    color: var(--primary-text-color, #e1e1e1);
    font-size: 13px;
    --zp-ok: var(--success-color, #43a047);
    --zp-warn: var(--warning-color, #ffa600);
    --zp-err: var(--error-color, #db4437);
    --zp-info: var(--info-color, #039be5);
    --zp-muted: var(--secondary-text-color, #9b9b9b);
    --zp-line: var(--divider-color, rgba(225, 225, 225, 0.12));
    --zp-surface: rgba(255, 255, 255, 0.04);
  }
  * {
    box-sizing: border-box;
  }
  .muted {
    color: var(--zp-muted);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    background: rgba(255, 255, 255, 0.08);
  }
  .pill.ok {
    color: var(--zp-ok);
    background: color-mix(in srgb, var(--zp-ok) 16%, transparent);
  }
  .pill.warn {
    color: var(--zp-warn);
    background: color-mix(in srgb, var(--zp-warn) 16%, transparent);
  }
  .pill.err {
    color: var(--zp-err);
    background: color-mix(in srgb, var(--zp-err) 16%, transparent);
  }
  .pill.info {
    color: var(--zp-info);
    background: color-mix(in srgb, var(--zp-info) 16%, transparent);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    display: inline-block;
    flex-shrink: 0;
  }
  .meter {
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
    display: flex;
  }
  .meter > span {
    height: 100%;
  }
  button.btn {
    font: inherit;
    padding: 6px 12px;
    border-radius: 18px;
    border: 1px solid var(--zp-line);
    background: rgba(255, 255, 255, 0.06);
    color: inherit;
    cursor: pointer;
  }
  button.btn.primary {
    background: var(--primary-color, #03a9f4);
    color: #fff;
    border-color: transparent;
  }
  input,
  select {
    font: inherit;
    color: inherit;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--zp-line);
    border-radius: 8px;
    padding: 5px 8px;
  }
  select option {
    background: #1c1c1c;
  }
  .toast {
    position: sticky;
    bottom: 0;
    margin-top: 12px;
    padding: 10px 14px;
    border-radius: 10px;
    background: #3a2323;
    border: 1px solid var(--zp-err);
    font-size: 12px;
  }
  .toast.good {
    background: #1f3323;
    border-color: var(--zp-ok);
  }
  .banner {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--zp-line);
    background: var(--zp-surface);
    margin-bottom: 10px;
  }
  .banner.err {
    border-color: color-mix(in srgb, var(--zp-err) 60%, transparent);
    background: color-mix(in srgb, var(--zp-err) 10%, transparent);
  }
  .banner.warn {
    border-color: color-mix(in srgb, var(--zp-warn) 60%, transparent);
    background: color-mix(in srgb, var(--zp-warn) 10%, transparent);
  }
  .banner b {
    display: block;
    margin-bottom: 2px;
  }
  .protonote {
    font-size: 11px;
    color: #ff1f8e;
    letter-spacing: 0.02em;
    margin-bottom: 8px;
  }
`;

export const statusTone = (z: ProtoZone) =>
  z.status === 'degraded'
    ? 'err'
    : z.status === 'fallback' || z.status === 'substituting' || z.cause
      ? 'warn'
      : z.status === 'running' || z.status === 'queued'
        ? 'info'
        : 'ok';

export const statusPill = (z: ProtoZone) =>
  html`<span class="pill ${statusTone(z)}">${STATUS_TEXT[z.status]}</span>`;

export const causeLine = (z: ProtoZone) =>
  z.cause
    ? html`${CAUSE_TEXT[z.cause] ?? z.cause}${z.since ? ` since ${hm(z.since)}` : ''}`
    : nothing;

/** What the grower must know about a zone in trouble, as one sentence. */
export function troubleSentence(z: ProtoZone, w: ProtoWorld): string | null {
  const ctrl = z.probes.find((p) => p.role === 'control');
  if (z.status === 'fallback')
    return `${ctrl?.name ?? 'Probe'} stopped reporting at ${hm(z.since!)}. Replaying ${z.referenceDay}'s shots at 80% — ${z.replayLeft} left before P2 stop.`;
  if (z.status === 'degraded' && z.cause === 'probe_unresponsive')
    return `VWC stayed flat through 3 shots. Holding — check the probe is in the pot and the emitter is dripping. Replay is off; ${z.referenceDay} could be replayed.`;
  if (z.status === 'degraded')
    return `No trustworthy probe since ${hm(z.since!)}. Holding: no VWC shots until it recovers. Turn on replay to repeat ${z.referenceDay} at 80%.`;
  if (z.cause === 'sensor_implausible') {
    const w2 = z.probes.find((p) => p.substituting);
    return `${ctrl?.name} reads ${ctrl?.vwc}%, which is implausible. Steering on witness ${w2?.name} with its learned offset; learning paused.`;
  }
  void w;
  return null;
}

export function outcomeLabel(a: ProtoAttempt) {
  switch (a.outcome) {
    case 'completed':
      return html`<span class="pill ok">Delivered</span>`;
    case 'running':
      return html`<span class="pill info">Running</span>`;
    case 'queued':
      return html`<span class="pill info">Queued</span>`;
    case 'aborted':
      return html`<span class="pill err">Aborted</span>`;
    case 'suppressed':
      return html`<span class="pill warn">Not sent</span>`;
  }
}

export const triggerText = (a: ProtoAttempt) =>
  a.trigger === 'manual'
    ? 'Manual Run'
    : a.trigger === 'fallback'
      ? 'Replay (80%)'
      : `${a.phase} shot`;

export const volumeText = (a: ProtoAttempt) => {
  if (a.outcome === 'suppressed') return REASON_TEXT[a.reason ?? ''] ?? a.reason ?? '';
  if (a.outcome === 'queued') return `${a.chargedL.toFixed(2)} L planned`;
  const got = a.meteredL ?? a.estimatedL;
  const src = a.meteredL !== undefined ? 'metered' : 'est.';
  return `${got.toFixed(2)} L ${src} · ${a.chargedL.toFixed(2)} L to cap`;
};

export const waitedText = (a: ProtoAttempt) =>
  a.dueAt !== undefined && a.at - a.dueAt >= 0.5
    ? `waited ${Math.round(a.at - a.dueAt)} min for the pump`
    : '';

/** Charged litres per zone today — the answer to "who used my cap?". */
export function capByZone(w: ProtoWorld) {
  return w.zones.map((z) => ({
    z,
    liters: +w.attempts
      .filter(
        (a) =>
          a.zoneId === z.id &&
          (a.outcome === 'completed' || a.outcome === 'aborted' || a.outcome === 'running')
      )
      .reduce((s, a) => s + a.chargedL, 0)
      .toFixed(2),
    cycles: w.attempts.filter(
      (a) =>
        a.zoneId === z.id &&
        (a.outcome === 'completed' || a.outcome === 'aborted' || a.outcome === 'running')
    ).length,
    refused: w.attempts.filter((a) => a.zoneId === z.id && a.outcome === 'suppressed').length,
  }));
}

export function capMeter(w: ProtoWorld, stacked: boolean) {
  const parts = capByZone(w);
  const pct = (l: number) => `${Math.min(100, (l / w.cap.capL) * 100)}%`;
  return html`<div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
      <span>Toward daily cap <b>${w.cap.liters.toFixed(1)} / ${w.cap.capL} L</b></span>
      <span class="muted">${w.cap.cycles} / ${w.cap.maxCycles} cycles</span>
    </div>
    <div class="meter">
      ${stacked && !w.implicit
        ? parts.map(
            (p) => html`<span style="width:${pct(p.liters)};background:${p.z.color}"></span>`
          )
        : html`<span
            style="width:${pct(w.cap.liters)};background:${w.cap.cappedAt
              ? 'var(--zp-err)'
              : 'var(--zp-info)'}"
          ></span>`}
    </div>
    ${w.cap.cappedAt !== undefined
      ? html`<div style="margin-top:6px;color:var(--zp-err);font-size:12px;">
          Cap reached at ${hm(w.cap.cappedAt)} — every zone's shots since then were not sent. It
          resets at midnight.
        </div>`
      : nothing}
  </div>`;
}

export const toastView = () =>
  ui.toast
    ? html`<div class="toast ${ui.toast.startsWith('Zones saved') ? 'good' : ''}">${ui.toast}</div>`
    : nothing;

export const zoneLabel = (z: ProtoZone) =>
  html`<span style="display:inline-flex;align-items:center;gap:6px;"
    ><span class="dot" style="background:${z.color}"></span>${z.name}</span
  >`;
