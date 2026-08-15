/**
 * Phone-viewport contract for the Config Dialog tab interiors (issue #545).
 *
 * The tabs are mounted inside a 335px box — the measured width of the dialog's
 * content pane at a 390x844 viewport — and asserted against the two properties
 * the issue names: nothing overlaps, and every control clears 44x44.
 *
 * These are deliberately programmatic rather than pixel snapshots: the fix is
 * container-relative (a flex basis), so a fixed-width host reproduces the phone
 * layout exactly and the assertion checks the requirement itself.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { page } from 'vitest/browser';

import './config-sensors-tab';
import './config-climate-tab';
import './config-humidity-tab';
import './config-irrigation-tab';
import './config-tanks-tab';
import './config-vpd-targets-tab';
import './config-notifications-tab';
import './config-heatmap-tab';
import './config-subareas-tab';

import { createInitialSM } from '../../../dialogs/config-dialog-sm';
import {
  FAN_VPD_STAGE_COLORS,
  FAN_VPD_STAGE_DEFAULTS,
  FAN_VPD_STAGE_KEYS,
  FAN_VPD_STAGE_LABELS,
} from '../../environment/constants';
import { TRIGGER_OPTIONS } from '../viewmodels/notifications-tab.viewmodel';

const PHONE = { width: 390, height: 844 };
/** Measured width of the dialog content pane at 390px, minus its 16px padding. */
const PANE_WIDTH = 335;
const TAP_TARGET = 44;

const LONG_ENTITY = 'sensor.north_flowering_room_substrate_temperature_probe_channel_two';

/* ── view models (mirrors of the per-tab unit-test builders) ───────────── */

const envDefaults = createInitialSM().environmentDraft;

const sensorsVm = () => ({
  moistureBand: null,
  lst: null,
  fields: [
    {
      key: 'temperatureSensors',
      label: 'Temperature Sensors',
      multi: true,
      value: [LONG_ENTITY],
      options: [],
    },
    {
      key: 'humiditySensors',
      label: 'Humidity Sensors',
      multi: true,
      value: [LONG_ENTITY],
      options: [],
    },
    { key: 'vpdSensors', label: 'VPD Sensors', multi: true, value: [], options: [] },
    {
      key: 'soilMoistureSensor',
      label: 'Soil Moisture Sensor',
      multi: false,
      value: '',
      options: [],
    },
    { key: 'co2Sensor', label: 'CO2 Sensor', multi: false, value: '', options: [] },
    { key: 'lightSensors', label: 'Light Sensors', multi: true, value: [], options: [] },
    {
      key: 'substrateTemperatureSensors',
      label: 'Substrate Temperature Sensors',
      multi: true,
      value: [LONG_ENTITY],
      options: [],
    },
  ],
});

const climateVm = () => ({
  control: {
    exhaustFanEntities: [],
    exhaustFanOptions: [],
    circulationFanEntities: [],
    circulationFanOptions: [],
    exhaustFanAcInfinityDevices: [],
    circulationFanAcInfinityDevices: [],
    acInfinityModeOptions: [],
    acInfinitySpeedOptions: [],
    acInfinityConflicts: {},
    acInfinityPortDevices: [],
    exhaustFanPortDeviceIds: [],
    circulationFanPortDeviceIds: [],
    exhaustFanPrefillWarnings: [],
    circulationFanPrefillWarnings: [],
    exhaustFanDuplicateWarnings: [],
    circulationFanDuplicateWarnings: [],
    stressThreshold: 0.7,
    moldThreshold: 0.85,
  },
  fan: {
    config: envDefaults.circulationFanConfig,
    disabled: false,
    mode: 'vpd',
    showStageVpd: true,
    vpdTargetLabel: 'VPD Target (kPa)',
    vpdTargetDimmed: false,
    showTempOverride: true,
    showWind: false,
  },
  stageVpd: {
    visible: true,
    stages: FAN_VPD_STAGE_KEYS.map((id) => ({
      id,
      label: FAN_VPD_STAGE_LABELS[id],
      color: FAN_VPD_STAGE_COLORS[id],
      open: false,
      current: false,
      fan: FAN_VPD_STAGE_DEFAULTS[id],
      exhaust: FAN_VPD_STAGE_DEFAULTS[id],
    })),
  },
  exhaust: {
    config: envDefaults.exhaustFanConfig,
    disabled: false,
    vpdTargetLabel: 'VPD Target (kPa)',
    vpdTargetDimmed: false,
  },
  units: { temperature: '°C', pressure: 'kPa', currentTemperature: '24.0 °C' },
  language: 'en',
});

const humidityVm = () => ({
  humidifierEntities: [LONG_ENTITY],
  humidifierOptions: [],
  dehumidifierEntities: [],
  dehumidifierOptions: [],
  humidifierAcInfinityDevices: [],
  dehumidifierAcInfinityDevices: [],
  acInfinityModeOptions: [],
  acInfinitySpeedOptions: [],
  acInfinityConflicts: {},
  acInfinityPortDevices: [],
  humidifierPortDeviceIds: [],
  dehumidifierPortDeviceIds: [],
  humidifierPrefillWarnings: [],
  dehumidifierPrefillWarnings: [],
  humidifierDuplicateWarnings: [],
  dehumidifierDuplicateWarnings: [],
  humidifierControlEnabled: true,
  dehumidifierControlEnabled: true,
  stages: [
    {
      id: 'veg',
      label: 'Vegetative',
      color: '#4caf50',
      open: true,
      dehumKey: 'veg',
      humKey: 'veg',
      dehum: { day: { on: 0.6, off: 0.7 }, night: { on: 0.65, off: 0.75 } },
      hum: { day: { on: 1.0, off: 0.8 }, night: { on: 0.85, off: 0.65 } },
    },
  ],
});

const irrigationField = (key: string) => ({ key, label: key, value: [LONG_ENTITY], options: [] });
const irrigationVm = () => ({
  monitoring: [
    irrigationField('phSensors'),
    irrigationField('feedEcSensors'),
    irrigationField('runoffEcSensors'),
    irrigationField('drainVolumeSensors'),
    irrigationField('irrigationFlowSensors'),
    irrigationField('powerSensors'),
    irrigationField('energySensors'),
  ],
  substrate: [irrigationField('bulkEcSensors'), irrigationField('poreEcSensors')],
});

const tanksVm = () => ({
  tanks: [
    {
      index: 0,
      displayName: 'Main reservoir',
      sensorEntity: LONG_ENTITY,
      volumeLiters: 100,
      warningLevel: 20,
    },
  ],
  editing: {
    sensorEntity: LONG_ENTITY,
    name: 'Main reservoir',
    volumeLiters: 100,
    warningLevel: 20,
  },
  sensorOptions: [],
  showEmpty: true,
});

const vpdTargetsVm = () => ({
  stages: [
    {
      key: 'veg',
      label: 'Vegetative',
      color: '#4caf50',
      open: true,
      day: { low: 0.8, high: 1.2 },
      night: { low: 0.7, high: 1.0 },
    },
  ],
});

const notificationsVm = () => ({
  draft: {
    criticalCooldownMinutes: 90,
    warningCooldownMinutes: 45,
    recoveryCooldownMinutes: 10,
    escalationDelayMinutes: 20,
    minStressDurationSeconds: 120,
    warningPersistenceMinutes: 30,
    aiAutoAlerts: false,
  },
  timedNotifications: [],
  sub: { kind: 'idle' },
  growspaceOptions: [{ id: 'gs1', name: 'Tent 1' }],
  triggerOptions: [...TRIGGER_OPTIONS],
});

const heatmapVm = () => ({
  showEmpty: false,
  groups: [
    { id: 'g1', name: 'Canopy probes — north bench', x: 1, y: 2, z: 3, sensors: [] },
    { id: 'g2', name: 'Canopy probes — south bench', x: 4, y: 5, z: 6, sensors: [] },
  ],
});

const subareasVm = () => ({
  hasGrowspace: true,
  adding: null,
  loading: false,
  showEmpty: false,
  subareas: [
    { subarea: { id: 'sa1', name: 'Zone A — propagation shelf' }, confirmingDelete: false },
    { subarea: { id: 'sa2', name: 'Zone B — flowering bench' }, confirmingDelete: true },
  ],
});

const TABS: Array<{ name: string; tag: string; vm: () => unknown }> = [
  { name: 'Sensors', tag: 'config-sensors-tab', vm: sensorsVm },
  { name: 'Climate', tag: 'config-climate-tab', vm: climateVm },
  { name: 'Humidity', tag: 'config-humidity-tab', vm: humidityVm },
  { name: 'Irrigation', tag: 'config-irrigation-tab', vm: irrigationVm },
  { name: 'Tanks', tag: 'config-tanks-tab', vm: tanksVm },
  { name: 'VPD Targets', tag: 'config-vpd-targets-tab', vm: vpdTargetsVm },
  { name: 'Notifications', tag: 'config-notifications-tab', vm: notificationsVm },
  // Not named in #545, but they carried the same row-action defect and were fixed with it.
  { name: 'Heatmap', tag: 'config-heatmap-tab', vm: heatmapVm },
  { name: 'Subareas', tag: 'config-subareas-tab', vm: subareasVm },
];

/* ── harness ───────────────────────────────────────────────────────────── */

async function mountTab(tag: string, vm: unknown, width = PANE_WIDTH): Promise<HTMLElement> {
  const pane = document.createElement('div');
  pane.id = 'pane';
  pane.style.cssText = `width:${width}px;box-sizing:border-box;font-family:Roboto,sans-serif;`;
  const el = document.createElement(tag) as HTMLElement & {
    vm: unknown;
    updateComplete: Promise<unknown>;
  };
  el.vm = vm;
  pane.appendChild(el);
  document.body.appendChild(pane);
  await el.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await el.updateComplete;
  return pane;
}

/** Walk light and shadow DOM, collecting rendered elements. */
function walk(root: ParentNode, out: Element[] = []): Element[] {
  for (const el of Array.from(root.querySelectorAll('*'))) {
    out.push(el);
    if (el.shadowRoot) walk(el.shadowRoot, out);
  }
  return out;
}

function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const s = getComputedStyle(el);
  return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
}

/** Leaf elements carrying their own visible text. */
function textLeaves(pane: Element): Element[] {
  return walk(pane).filter((el) => {
    if (!isVisible(el)) return false;
    if (el.querySelector('*')) return false; // not a leaf
    if (el.shadowRoot) return false;
    return (el.textContent ?? '').trim().length > 0;
  });
}

const INTERACTIVE = 'button, input, select, textarea, [role="button"], .checkbox-label';

function interactives(pane: Element): Element[] {
  return walk(pane).filter((el) => el.matches(INTERACTIVE) && isVisible(el));
}

function overlapArea(a: DOMRect, b: DOMRect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Containment across shadow boundaries — `contains` does not pierce them. */
function related(a: Element, b: Element): boolean {
  const chain = (el: Element): Element[] => {
    const out: Element[] = [];
    let node: Node | null = el;
    while (node) {
      if (node instanceof Element) out.push(node);
      node = node.parentNode ?? (node as ShadowRoot).host ?? null;
      if (node instanceof ShadowRoot) node = node.host;
    }
    return out;
  };
  return chain(a).includes(b) || chain(b).includes(a);
}

/** Pairs of text leaves whose rendered boxes genuinely intersect. */
function collisionsIn(pane: Element): string[] {
  const leaves = textLeaves(pane);
  expect(leaves.length).toBeGreaterThan(0);

  const collisions: string[] = [];
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i];
      const b = leaves[j];
      if (related(a, b)) continue;
      // Absolutely-positioned floating labels are a deliberate overlay.
      if (getComputedStyle(a).position === 'absolute') continue;
      if (getComputedStyle(b).position === 'absolute') continue;
      const area = overlapArea(a.getBoundingClientRect(), b.getBoundingClientRect());
      if (area > 4) {
        collisions.push(
          `"${a.textContent?.trim().slice(0, 30)}" overlaps "${b.textContent?.trim().slice(0, 30)}" (${Math.round(area)}px²)`
        );
      }
    }
  }
  return collisions;
}

beforeEach(async () => {
  await page.viewport(PHONE.width, PHONE.height);
});

afterEach(async () => {
  document.body.innerHTML = '';
  await page.viewport(1280, 720);
});

/* ── the contract ──────────────────────────────────────────────────────── */

describe.each(TABS)('$name tab at 390x844', ({ tag, vm }) => {
  it('renders no overlapping text', async () => {
    const pane = await mountTab(tag, vm());
    expect(collisionsIn(pane)).toEqual([]);
  });

  it('keeps every control inside the pane and at a 44px tap target', async () => {
    const pane = await mountTab(tag, vm());
    // The tap floors live behind a 560px media query, which resolves against the
    // viewport. Without this guard the assertions below would pass vacuously if
    // the body ever ran at desktop width (every control would simply be smaller).
    expect(window.innerWidth).toBe(PHONE.width);
    const paneRect = pane.getBoundingClientRect();

    const tooSmall: string[] = [];
    const outside: string[] = [];
    for (const el of interactives(pane)) {
      const r = el.getBoundingClientRect();
      const label = `${el.tagName.toLowerCase()}.${el.className || '-'}`;
      // Checkboxes are activated through their 44px-tall label wrapper.
      const isCheckbox = el instanceof HTMLInputElement && el.type === 'checkbox';
      if (!isCheckbox && (r.height < TAP_TARGET || r.width < TAP_TARGET)) {
        tooSmall.push(`${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      if (r.right > paneRect.right + 1 || r.left < paneRect.left - 1) {
        outside.push(`${label} at ${Math.round(r.left)}..${Math.round(r.right)}`);
      }
    }
    expect(tooSmall).toEqual([]);
    expect(outside).toEqual([]);
  });
});

/*
 * 450px and 560px are both breakpoints; between them the layout is single-column
 * but still on the dialog's wide padding. Nothing else exercises that band.
 */
describe('between the 450px and 560px breakpoints', () => {
  it.each([
    { name: 'Sensors', tag: 'config-sensors-tab', vm: sensorsVm },
    { name: 'Climate', tag: 'config-climate-tab', vm: climateVm },
  ])('$name renders no overlapping text at 500px', async ({ tag, vm }) => {
    await page.viewport(500, 844);
    const pane = await mountTab(tag, vm(), 452);
    expect(window.innerWidth).toBe(500);

    expect(collisionsIn(pane)).toEqual([]);
  });
});

describe('entity chips', () => {
  it('truncate long entity IDs and expose the full value via title', async () => {
    const pane = await mountTab('config-sensors-tab', sensorsVm());
    const chipLabels = walk(pane).filter((el) => el.classList.contains('chip-label'));
    expect(chipLabels.length).toBeGreaterThan(0);

    for (const label of chipLabels) {
      expect(label.getAttribute('title')).toBe(LONG_ENTITY);
      expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
      // Truncated rather than pushing the chip past its container.
      expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    }
  });

  it('keeps the remove control visible and tappable beside a long value', async () => {
    const pane = await mountTab('config-sensors-tab', sensorsVm());
    const paneRect = pane.getBoundingClientRect();
    const removes = walk(pane).filter((el) => el.classList.contains('chip-remove'));
    expect(removes.length).toBeGreaterThan(0);

    for (const btn of removes) {
      const r = btn.getBoundingClientRect();
      expect(r.width).toBeGreaterThanOrEqual(TAP_TARGET);
      expect(r.height).toBeGreaterThanOrEqual(TAP_TARGET);
      expect(r.right).toBeLessThanOrEqual(paneRect.right + 1);
    }
  });
});

describe('phone-viewport appearance', () => {
  const darkTheme: Record<string, string> = {
    '--card-background-color': '#1c1c1e',
    '--primary-background-color': '#111111',
    '--secondary-background-color': '#2a2a2c',
    '--primary-text-color': '#f5f5f7',
    '--secondary-text-color': '#b5b5bb',
    '--divider-color': 'rgba(255, 255, 255, 0.16)',
  };

  it.each([
    { name: 'Sensors', tag: 'config-sensors-tab', vm: sensorsVm },
    { name: 'Climate', tag: 'config-climate-tab', vm: climateVm },
  ])('$name tab at 390x844', async ({ tag, vm }) => {
    const pane = await mountTab(tag, vm());
    for (const [prop, value] of Object.entries(darkTheme)) pane.style.setProperty(prop, value);
    pane.style.background = darkTheme['--card-background-color'];
    pane.style.padding = '16px';
    // Capture one phone screen rather than the full scroll height: a mostly-blank
    // tall image is nearly insensitive at the configured mismatch ratio.
    pane.style.height = `${PHONE.height}px`;
    pane.style.overflow = 'hidden';
    document.body.style.background = darkTheme['--primary-background-color'];
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    await expect(page.elementLocator(pane)).toMatchScreenshot();
  });
});

describe('column wrapping', () => {
  it('collapses row-col-grid to a single column in a phone-width pane', async () => {
    const pane = await mountTab('config-sensors-tab', sensorsVm());
    const grid = pane
      .querySelector('config-sensors-tab')!
      .shadowRoot!.querySelector('.row-col-grid')!;
    const children = Array.from(grid.children).filter((c) => isVisible(c));
    expect(children.length).toBe(2);

    const [first, second] = children.map((c) => c.getBoundingClientRect());
    expect(second.top).toBeGreaterThanOrEqual(first.bottom);
    // Each column spans the full grid width — one per row, not two shrunken ones.
    expect(first.width).toBeCloseTo(grid.getBoundingClientRect().width, 0);
  });
});
