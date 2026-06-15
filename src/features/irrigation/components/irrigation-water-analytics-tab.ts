/**
 * Irrigation Water Analytics Tab Component (ADR-0019)
 *
 * The dumb presentational element for the Irrigation Dialog's read-mostly Water
 * Analytics tab. `@property .vm: WaterAnalyticsTabViewModel` in, no `@state()` of
 * its own — all state lives in the Dialog Shell / Tab ViewModel.
 *
 * Read-mostly: the tab has exactly two interactive controls, surfaced as Tab
 * Intents (not SM events):
 *   - `water-analytics-open-steering` — the "edit in Steering →" link.
 *   - `water-analytics-reset-tracking` — the Maintenance "Reset All Data" button.
 *
 * Clock/locale formatting kept here (per ADR-0019, to keep the VM factory
 * deterministic): the 24h consumption-bucket chart and the recent-refills list
 * are derived in-component from the VM's raw `tankEvents`, and timestamps are
 * `toLocaleString`-formatted here.
 *
 * Markup is transcribed verbatim from the former inline `_renderWaterAnalyticsTab`
 * in `irrigation-dialog.container.ts` so the rendered output stays byte-identical.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { TankWaterEvent } from '../../../types';
import type {
  WaterAnalyticsTabViewModel,
  WaterAnalyticsScheduleRow,
} from '../viewmodels/water-analytics-tab.viewmodel';

@customElement('irrigation-water-analytics-tab')
export class IrrigationWaterAnalyticsTab extends LitElement {
  @property({ attribute: false }) vm!: WaterAnalyticsTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];

  private _emit(type: string): void {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }));
  }

  private _kpiCard(
    label: string,
    value: string,
    unit: string,
    color = 'rgba(255,255,255,0.7)',
    sub?: string
  ): TemplateResult {
    return html`
      <div
        style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:4px;"
      >
        <div style="font-size:0.78rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;">
          ${label}
        </div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span style="font-size:1.6rem;font-weight:700;color:${color};">${value}</span>
          <span style="font-size:0.82rem;opacity:0.6;">${unit}</span>
        </div>
        ${sub ? html`<div style="font-size:0.75rem;opacity:0.5;">${sub}</div>` : nothing}
      </div>
    `;
  }

  private _fmtCycle(ts: number | string | null): string | null {
    if (ts == null) return null;
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  render(): TemplateResult {
    const vm = this.vm;

    const lastCycle = this._fmtCycle(vm.lastCycleTimestamp);
    const nextCycle = this._fmtCycle(vm.nextScheduledCycle);

    return html`
      ${this._renderCycleTelemetry(vm, lastCycle, nextCycle)}
      ${this._renderTodaysUsage(vm)}
      ${this._renderTankLevels(vm)}
      ${this._renderTankDerivedUsage(vm)}
      ${this._renderScheduleSummary(vm)}
      ${this._renderStageAggregates(vm)}
      ${this._renderVolumeHistory(vm)}
      ${this._renderMaintenance()}
    `;
  }

  private _renderCycleTelemetry(
    vm: WaterAnalyticsTabViewModel,
    lastCycle: string | null,
    nextCycle: string | null
  ): TemplateResult | typeof nothing {
    if (!vm.hasPump) return nothing;
    const volToday = vm.volumeDispensedToday;
    return html`
      <div class="detail-card">
        <h3 style="margin-top:0;margin-bottom:16px;">Cycle Telemetry</h3>
        <div
          style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:0;"
        >
          ${this._kpiCard('Cycles today', String(vm.cyclesToday), '', '#4fc3f7')}
          ${this._kpiCard(
            'Dispensed today',
            volToday > 0 ? volToday.toFixed(2) : '—',
            volToday > 0 ? 'L' : '',
            '#81c784'
          )}
          ${lastCycle
            ? this._kpiCard('Last cycle', lastCycle, '', 'rgba(255,255,255,0.7)')
            : this._kpiCard('Last cycle', '—', '', 'rgba(255,255,255,0.4)')}
          ${nextCycle
            ? this._kpiCard('Next cycle', nextCycle, '', '#ce93d8')
            : this._kpiCard('Next cycle', '—', '', 'rgba(255,255,255,0.4)')}
        </div>
      </div>
    `;
  }

  private _renderTodaysUsage(vm: WaterAnalyticsTabViewModel): TemplateResult | typeof nothing {
    if (!vm.hasPump) return nothing;
    const wu = vm.waterUsage;
    const avgRunoff = vm.avgRunoff;
    return html`
      <div class="detail-card">
        <h3 style="margin-top:0;margin-bottom:16px;">Today's Usage</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
          ${wu?.litersToday != null
            ? this._kpiCard('Liters today', wu.litersToday.toFixed(1), 'L', '#4fc3f7')
            : this._kpiCard('Liters today', '—', '', 'rgba(255,255,255,0.4)')}
          ${wu?.litersPerPlantPerDay != null
            ? this._kpiCard('Per plant / day', wu.litersPerPlantPerDay.toFixed(2), 'L', '#81c784')
            : this._kpiCard('Per plant / day', '—', '', 'rgba(255,255,255,0.4)')}
          ${wu?.waterEfficiency != null
            ? this._kpiCard(
                'Water efficiency',
                (wu.waterEfficiency * 100).toFixed(0),
                '%',
                wu.waterEfficiency >= 0.85
                  ? '#4caf50'
                  : wu.waterEfficiency >= 0.65
                    ? '#FF9800'
                    : '#f44336',
                wu.waterEfficiency >= 0.85
                  ? 'Excellent'
                  : wu.waterEfficiency >= 0.65
                    ? 'Good'
                    : 'Review schedule'
              )
            : this._kpiCard('Water efficiency', '—', '', 'rgba(255,255,255,0.4)')}
          ${avgRunoff !== null
            ? this._kpiCard(
                'Avg runoff',
                avgRunoff.toFixed(1),
                '%',
                '#ce93d8',
                `from ${vm.readingsWithVolumesCount} reading${vm.readingsWithVolumesCount !== 1 ? 's' : ''}`
              )
            : this._kpiCard(
                'Avg runoff',
                '—',
                '',
                'rgba(255,255,255,0.4)',
                'Log volumes in Drain EC tab'
              )}
        </div>
      </div>
    `;
  }

  private _renderTankLevels(vm: WaterAnalyticsTabViewModel): TemplateResult | typeof nothing {
    if (vm.tanks.length === 0) return nothing;
    return html`
      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;">Tank Levels</h3>
          ${vm.warningTankCount > 0
            ? html`
                <span
                  style="background:rgba(244,67,54,0.2);color:#f44336;border:1px solid rgba(244,67,54,0.4);border-radius:20px;padding:3px 10px;font-size:0.78rem;font-weight:600;"
                >
                  ⚠ ${vm.warningTankCount} tank${vm.warningTankCount > 1 ? 's' : ''} low
                </span>
              `
            : vm.avgTankLevel !== null
              ? html`
                  <span style="font-size:0.82rem;opacity:0.5;"
                    >Avg ${vm.avgTankLevel.toFixed(0)}%</span
                  >
                `
              : nothing}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${vm.tanks.map((tank) => {
            const pct = tank.fillLevel ?? 0;
            const c = tank.isWarning
              ? '#f44336'
              : (tank.hoursRemaining ?? 999) < 24
                ? '#FF9800'
                : '#4caf50';
            return html`
              <div>
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
                  <span style="font-weight:500;">${tank.name}</span>
                  <span style="color:${c};font-weight:600;"
                    >${tank.fillLevel !== null ? pct.toFixed(0) + '%' : '—'}</span
                  >
                </div>
                <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
                  <div
                    style="height:100%;width:${Math.max(
                      0,
                      Math.min(100, pct)
                    )}%;background:${c};border-radius:3px;transition:width 0.4s ease;"
                  ></div>
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private _renderTankDerivedUsage(
    vm: WaterAnalyticsTabViewModel
  ): TemplateResult | typeof nothing {
    if (!(vm.hasTankSensors && vm.hasTankHistory)) return nothing;

    // 24h consumption buckets (15 min) + recent refills — clock-dependent, derived here.
    const now = new Date();
    const bucket15Min = 15 * 60 * 1000;
    const bucketCount24h = 96;
    const chartEnd = Math.ceil(now.getTime() / bucket15Min) * bucket15Min;
    const chartStart = chartEnd - bucketCount24h * bucket15Min;
    const consumptionBuckets24h = Array.from({ length: bucketCount24h }, (_, i) => ({
      start: chartStart + i * bucket15Min,
      liters: 0,
    }));
    for (const ev of vm.tankEvents) {
      if ((ev as TankWaterEvent).event_type !== 'consumption') continue;
      const ts = new Date((ev as TankWaterEvent).timestamp).getTime();
      if (ts < chartStart || ts >= chartEnd) continue;
      const idx = Math.floor((ts - chartStart) / bucket15Min);
      if (idx >= 0 && idx < bucketCount24h)
        consumptionBuckets24h[idx].liters += (ev as TankWaterEvent).liters;
    }
    const maxBucketLiters = Math.max(...consumptionBuckets24h.map((b) => b.liters), 0.01);
    const recentRefills = vm.tankEvents
      .filter((e) => e.event_type === 'refill')
      .slice(-10)
      .reverse();

    return html`
      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;">Tank-Derived Water Usage</h3>
          <span
            style="font-size:0.78rem;opacity:0.5;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.25);border-radius:20px;padding:2px 10px;"
            >inferred from tank level</span
          >
        </div>
        <div
          style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;"
        >
          ${this._kpiCard(
            'Consumed today',
            vm.tankLitersToday > 0 ? vm.tankLitersToday.toFixed(1) : '—',
            vm.tankLitersToday > 0 ? 'L' : '',
            '#4fc3f7'
          )}
          ${this._kpiCard(
            'Last 7 days',
            vm.tankLiters7d > 0 ? vm.tankLiters7d.toFixed(1) : '—',
            vm.tankLiters7d > 0 ? 'L' : '',
            '#81c784'
          )}
          ${this._kpiCard(
            'Avg per day',
            vm.tankAvgPerDay > 0 ? vm.tankAvgPerDay.toFixed(1) : '—',
            vm.tankAvgPerDay > 0 ? 'L/day' : '',
            '#ce93d8'
          )}
        </div>
        <div style="margin-bottom:6px;">
          <div
            style="font-size:0.78rem;opacity:0.55;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;"
          >
            Consumption — last 24 hours (15 min buckets)
          </div>
          <div
            style="display:flex;align-items:flex-end;gap:1px;height:60px;background:rgba(255,255,255,0.03);border-radius:6px;padding:6px 4px 0;"
          >
            ${consumptionBuckets24h.map((b) => {
              const hp = (b.liters / maxBucketLiters) * 100;
              const label = new Date(b.start).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              return html`
                <div
                  title="${label} — ${b.liters.toFixed(2)} L"
                  style="flex:1;height:${Math.max(2, hp)}%;background:${b.liters > 0
                    ? '#4fc3f7'
                    : 'rgba(255,255,255,0.06)'};border-radius:2px 2px 0 0;min-width:0;"
                ></div>
              `;
            })}
          </div>
          <div
            style="display:flex;justify-content:space-between;font-size:0.68rem;opacity:0.45;margin-top:4px;padding:0 2px;"
          >
            <span>24h ago</span><span>12h ago</span><span>now</span>
          </div>
        </div>
        ${recentRefills.length > 0
          ? html`
              <div style="margin-top:16px;">
                <div
                  style="font-size:0.78rem;opacity:0.55;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
                >
                  Recent refills
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  ${recentRefills.map(
                    (ev) => html`
                      <div
                        style="display:flex;justify-content:space-between;align-items:center;background:rgba(129,199,132,0.08);border-radius:6px;padding:5px 10px;font-size:0.82rem;"
                      >
                        <span style="opacity:0.65;"
                          >${new Date(ev.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}</span
                        >
                        <span style="color:#81c784;font-weight:600;">+${ev.liters.toFixed(1)} L</span>
                      </div>
                    `
                  )}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderScheduleRow(row: WaterAnalyticsScheduleRow, bg: string): TemplateResult {
    return html`
      <div
        style="display:flex;justify-content:space-between;background:${bg};border-radius:6px;padding:4px 10px;font-size:0.8rem;"
      >
        <span style="font-weight:500;">${row.time.substring(0, 5)}</span>
        <span style="opacity:0.5;">${row.duration}s</span>
      </div>
    `;
  }

  private _renderScheduleSummary(vm: WaterAnalyticsTabViewModel): TemplateResult | typeof nothing {
    if (vm.isCropSteering) return this._renderCropSteeringSummary(vm);
    if (vm.schedule.totalIrrig > 0 || vm.schedule.totalDrain > 0)
      return this._renderPlainScheduleSummary(vm);
    return nothing;
  }

  private _renderCropSteeringSummary(vm: WaterAnalyticsTabViewModel): TemplateResult {
    const cs = vm.cropSteering;
    const { drainDuration } = cs;
    return html`
      <div class="detail-card">
        <h3 style="margin-top:0;margin-bottom:16px;">Schedule Summary</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div>
            <div
              style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
            >
              Irrigation
            </div>
            ${cs.shots.length === 0
              ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">No strategy configured</p>`
              : html`
                  <div style="font-size:1.3rem;font-weight:700;color:#4fc3f7;">
                    ${cs.shots.length}
                    <span style="font-size:0.85rem;font-weight:400;opacity:0.7;">shots/day</span>
                  </div>
                  <div style="font-size:0.75rem;opacity:0.5;margin-top:2px;">
                    Managed automatically ·
                    <a
                      href="#"
                      style="color:#4CAF50;"
                      @click=${(e: Event) => {
                        e.preventDefault();
                        this._emit('water-analytics-open-steering');
                      }}
                      >edit in Steering →</a
                    >
                  </div>
                  <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                    ${cs.shots.slice(0, 5).map(
                      (s) => html`
                        <div
                          style="display:flex;justify-content:space-between;background:rgba(79,195,247,0.08);border-radius:6px;padding:4px 10px;font-size:0.8rem;"
                        >
                          <span style="font-weight:500;">${s.time.substring(0, 5)}</span>
                          <span style="opacity:0.5;">${s.duration}s</span>
                        </div>
                      `
                    )}
                    ${cs.shots.length > 5
                      ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">
                          +${cs.shots.length - 5} more
                        </div>`
                      : nothing}
                  </div>
                `}
          </div>
          <div>
            <div
              style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
            >
              Drain
            </div>
            ${cs.totalDrain === 0
              ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">No events scheduled</p>`
              : html`
                  <div style="font-size:1.3rem;font-weight:700;color:#a5d6a7;">
                    ${cs.totalDrain}
                    <span style="font-size:0.85rem;font-weight:400;opacity:0.7;">events/day</span>
                  </div>
                  ${drainDuration
                    ? html`<div style="font-size:0.82rem;opacity:0.6;margin-top:2px;">
                        ${drainDuration}s per event
                      </div>`
                    : nothing}
                  <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                    ${cs.drainRows
                      .slice(0, 5)
                      .map((row) => this._renderScheduleRow(row, 'rgba(165,214,167,0.08)'))}
                    ${cs.totalDrain > 5
                      ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">
                          +${cs.totalDrain - 5} more
                        </div>`
                      : nothing}
                  </div>
                `}
          </div>
        </div>
      </div>
    `;
  }

  private _renderPlainScheduleSummary(vm: WaterAnalyticsTabViewModel): TemplateResult {
    const s = vm.schedule;
    return html`
      <div class="detail-card">
        <h3 style="margin-top:0;margin-bottom:16px;">Schedule Summary</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div>
            <div
              style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
            >
              Irrigation
            </div>
            ${s.totalIrrig === 0
              ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">No events scheduled</p>`
              : html`
                  <div style="font-size:1.3rem;font-weight:700;color:#4fc3f7;">
                    ${s.totalIrrig}
                    <span style="font-size:0.85rem;font-weight:400;opacity:0.7;">events/day</span>
                  </div>
                  ${s.irrigDuration
                    ? html`<div style="font-size:0.82rem;opacity:0.6;margin-top:2px;">
                        ${s.irrigDuration}s per event
                      </div>`
                    : nothing}
                  <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                    ${s.irrigRows
                      .slice(0, 5)
                      .map((row) => this._renderScheduleRow(row, 'rgba(79,195,247,0.08)'))}
                    ${s.totalIrrig > 5
                      ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">
                          +${s.totalIrrig - 5} more
                        </div>`
                      : nothing}
                  </div>
                `}
          </div>
          <div>
            <div
              style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
            >
              Drain
            </div>
            ${s.totalDrain === 0
              ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">No events scheduled</p>`
              : html`
                  <div style="font-size:1.3rem;font-weight:700;color:#a5d6a7;">
                    ${s.totalDrain}
                    <span style="font-size:0.85rem;font-weight:400;opacity:0.7;">events/day</span>
                  </div>
                  ${s.drainDuration
                    ? html`<div style="font-size:0.82rem;opacity:0.6;margin-top:2px;">
                        ${s.drainDuration}s per event
                      </div>`
                    : nothing}
                  <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                    ${s.drainRows
                      .slice(0, 5)
                      .map((row) => this._renderScheduleRow(row, 'rgba(165,214,167,0.08)'))}
                    ${s.totalDrain > 5
                      ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">
                          +${s.totalDrain - 5} more
                        </div>`
                      : nothing}
                  </div>
                `}
          </div>
        </div>
      </div>
    `;
  }

  private _renderStageAggregates(vm: WaterAnalyticsTabViewModel): TemplateResult | typeof nothing {
    const agg = vm.stageAggregates;
    if (!agg || Object.keys(agg).length === 0) return nothing;
    return html`
      <div class="detail-card">
        <h3 style="margin:0 0 14px;">Water Usage by Growth Stage</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${Object.entries(agg)
            .sort(([, a], [, b]) => b - a)
            .map(
              ([stage, liters]) => html`
                <div
                  style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 14px;font-size:0.88rem;"
                >
                  <span style="text-transform:capitalize;font-weight:500;">${stage}</span>
                  <span style="color:#4fc3f7;font-weight:600;">${liters.toFixed(1)} L</span>
                </div>
              `
            )}
        </div>
      </div>
    `;
  }

  private _renderVolumeHistory(vm: WaterAnalyticsTabViewModel): TemplateResult | typeof nothing {
    if (!vm.hasDrainPumpEntity) return nothing;
    const avgRunoff = vm.avgRunoff;
    return html`
      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;">Volume History</h3>
          <span style="font-size:0.8rem;opacity:0.5;">from drain EC readings</span>
        </div>
        ${vm.volumeRows.length === 0
          ? html`
              <p style="opacity:0.6;text-align:center;padding:20px 0;font-size:0.9rem;">
                No volume data logged yet.<br />
                <span style="font-size:0.8rem;opacity:0.7;"
                  >Log feed and drain volumes in the <strong>Drain EC</strong> tab.</span
                >
              </p>
            `
          : html`
              <div
                style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;background:rgba(255,255,255,0.04);border-radius:10px;padding:12px 16px;font-size:0.88rem;"
              >
                <div style="text-align:center;">
                  <div style="opacity:0.5;font-size:0.75rem;">Total feed</div>
                  <div style="font-weight:700;color:#4fc3f7;">
                    ${(vm.totalFeedMl / 1000).toFixed(1)} L
                  </div>
                </div>
                <div style="text-align:center;">
                  <div style="opacity:0.5;font-size:0.75rem;">Total drain</div>
                  <div style="font-weight:700;color:#a5d6a7;">
                    ${(vm.totalDrainMl / 1000).toFixed(1)} L
                  </div>
                </div>
                <div style="text-align:center;">
                  <div style="opacity:0.5;font-size:0.75rem;">Avg runoff</div>
                  <div
                    style="font-weight:700;color:${avgRunoff !== null &&
                    avgRunoff >= 15 &&
                    avgRunoff <= 35
                      ? '#4caf50'
                      : '#FF9800'};"
                  >
                    ${avgRunoff !== null ? avgRunoff.toFixed(1) + '%' : '—'}
                  </div>
                </div>
              </div>
              <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                  <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.15);opacity:0.7;">
                      <th style="text-align:left;padding:5px 8px;font-weight:500;">Time</th>
                      <th style="text-align:right;padding:5px 8px;font-weight:500;">Feed (mL)</th>
                      <th style="text-align:right;padding:5px 8px;font-weight:500;">Drain (mL)</th>
                      <th style="text-align:right;padding:5px 8px;font-weight:500;">Runoff</th>
                      <th style="text-align:right;padding:5px 8px;font-weight:500;">Δ EC</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vm.volumeRows.map((r) => {
                      const runoffOk = r.runoff !== null && r.runoff >= 10 && r.runoff <= 40;
                      return html`
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                          <td style="padding:5px 8px;opacity:0.65;">
                            ${new Date(r.timestamp).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td style="text-align:right;padding:5px 8px;">${r.feedVolumeMl}</td>
                          <td style="text-align:right;padding:5px 8px;">${r.drainVolumeMl}</td>
                          <td
                            style="text-align:right;padding:5px 8px;font-weight:600;color:${runoffOk
                              ? '#4caf50'
                              : '#FF9800'};"
                          >
                            ${r.runoff !== null ? r.runoff.toFixed(1) + '%' : '—'}
                          </td>
                          <td style="text-align:right;padding:5px 8px;opacity:0.7;">
                            ${r.ecDelta >= 0 ? '+' : ''}${r.ecDelta.toFixed(2)}
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
            `}
      </div>
    `;
  }

  private _renderMaintenance(): TemplateResult {
    return html`
      <div
        class="detail-card"
        style="border:1px dashed rgba(244,67,54,0.3);background:rgba(244,67,54,0.05);margin-top:20px;"
      >
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div style="flex:1;">
            <h3 style="margin:0;color:#f44336;border:none;padding:0;font-size:1.1rem;">
              Maintenance
            </h3>
            <p style="margin:4px 0 0 0;font-size:0.85rem;opacity:0.7;line-height:1.4;">
              Reset irrigation counters, today's water usage, and recent volume history for this
              growspace.
            </p>
          </div>
          <button
            class="md3-button tonal error"
            @click=${() => this._emit('water-analytics-reset-tracking')}
            style="white-space:nowrap;"
          >
            Reset All Data
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-water-analytics-tab': IrrigationWaterAnalyticsTab;
  }
}
