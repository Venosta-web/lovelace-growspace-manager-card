/**
 * Generates the HA YAML for the simulated sensors/switches that
 * tests/e2e/fixtures/e2e-setup.ts links to each E2E growspace via
 * configure_environment / set_irrigation_settings.
 *
 * Entity naming must match buildSensors() in e2e-setup.ts exactly:
 *   non-VWC growspaces -> sensor.e2e_<slug>_<suffix>   (oscillating template sensors)
 *   VWC growspaces      -> input_number.e2e_<slug>_<suffix> (directly settable by specs)
 *   all growspaces      -> switch.sim_e2e_<slug>_irrigation_pump / _drain_pump (optimistic)
 *
 * Usage:
 *   node tests/e2e/ha-config/generate-simulated-entities.js > tests/e2e/ha-config/growspace_manager_e2e.yaml
 */

const NON_VWC_SLUGS = ['mother', 'clone', 'veg', 'flower', 'dry', 'cure'];
const VWC_SLUGS = ['vwc_veg', 'vwc_flower'];
const ALL_SLUGS = [...NON_VWC_SLUGS, ...VWC_SLUGS];

// suffix -> { unit, deviceClass, base, amplitude, periodMinutes, decimals, clampNonNegative,
//             inputNumber: { min, max, step } }
const SUFFIXES = {
  temperature: { unit: '°C', deviceClass: 'temperature', base: 23, amplitude: 2, period: 5, decimals: 1,
    inputNumber: { min: 10, max: 40, step: 0.1 } },
  humidity: { unit: '%', deviceClass: 'humidity', base: 60, amplitude: 8, period: 5, decimals: 0,
    inputNumber: { min: 0, max: 100, step: 1 } },
  vpd: { unit: 'kPa', deviceClass: 'pressure', base: 1.2, amplitude: 0.3, period: 10, decimals: 2,
    inputNumber: { min: 0, max: 3, step: 0.05 } },
  co2: { unit: 'ppm', deviceClass: 'carbon_dioxide', base: 900, amplitude: 200, period: 10, decimals: 0,
    inputNumber: { min: 300, max: 3000, step: 10 } },
  feed_ec: { unit: 'mS/cm', deviceClass: null, base: 1.8, amplitude: 0.3, period: 12, decimals: 2,
    inputNumber: { min: 0, max: 5, step: 0.05 } },
  bulk_ec: { unit: 'mS/cm', deviceClass: null, base: 2.5, amplitude: 0.5, period: 12, decimals: 2,
    inputNumber: { min: 0, max: 5, step: 0.05 } },
  pore_ec: { unit: 'mS/cm', deviceClass: null, base: 2.8, amplitude: 0.5, period: 12, decimals: 2,
    inputNumber: { min: 0, max: 5, step: 0.05 } },
  runoff_ec: { unit: 'mS/cm', deviceClass: null, base: 2.0, amplitude: 0.4, period: 12, decimals: 2,
    inputNumber: { min: 0, max: 5, step: 0.05 } },
  ph: { unit: 'pH', deviceClass: null, base: 6.0, amplitude: 0.3, period: 14, decimals: 2,
    inputNumber: { min: 0, max: 14, step: 0.1 } },
  substrate_temperature: { unit: '°C', deviceClass: 'temperature', base: 21, amplitude: 1.5, period: 5, decimals: 1,
    inputNumber: { min: 10, max: 40, step: 0.1 } },
  substrate_moisture: { unit: '%', deviceClass: 'moisture', base: 55, amplitude: 10, period: 15, decimals: 0,
    inputNumber: { min: 0, max: 100, step: 1 } },
  power: { unit: 'W', deviceClass: 'power', base: 250, amplitude: 50, period: 6, decimals: 0,
    inputNumber: { min: 0, max: 2000, step: 1 } },
  energy: { unit: 'kWh', deviceClass: null, base: 3.5, amplitude: 1.5, period: 20, decimals: 2,
    inputNumber: { min: 0, max: 100, step: 0.1 } },
  drain_volume: { unit: 'L', deviceClass: null, base: 2, amplitude: 2, period: 8, decimals: 2, clampNonNegative: true,
    inputNumber: { min: 0, max: 100, step: 0.1 } },
  irrigation_flow: { unit: 'L/min', deviceClass: null, base: 3, amplitude: 3, period: 8, decimals: 2, clampNonNegative: true,
    inputNumber: { min: 0, max: 50, step: 0.1 } },
  irrigation_tank: { unit: '%', deviceClass: null, base: 70, amplitude: 15, period: 16, decimals: 0,
    inputNumber: { min: 0, max: 100, step: 1 } },
};

const SUFFIX_NAMES = Object.keys(SUFFIXES);

function round(n) {
  // trims floating point noise from the small per-slug phase offsets below
  return Math.round(n * 1000) / 1000;
}

function templateSensorBlock(slug, suffix, spec, slugIndex) {
  const entityId = `e2e_${slug}_${suffix}`;
  const base = round(spec.base + slugIndex * spec.amplitude * 0.08);
  const roundExpr = spec.decimals === 0 ? `round(0) | int` : `round(${spec.decimals})`;
  const raw = `(base + amplitude * sin(minutes / ${spec.period} * 3.14159))`;
  const valueExpr = spec.clampNonNegative ? `[${raw}, 0] | max` : raw;

  const lines = [];
  lines.push(`      - name: "${entityId}"`);
  lines.push(`        unique_id: ${entityId}`);
  lines.push(`        unit_of_measurement: "${spec.unit}"`);
  if (spec.deviceClass) lines.push(`        device_class: ${spec.deviceClass}`);
  lines.push(`        state: >`);
  lines.push(`          {% set minutes = now().minute + (now().second / 60) %}`);
  lines.push(`          {% set base = ${base} %}`);
  lines.push(`          {% set amplitude = ${spec.amplitude} %}`);
  lines.push(`          {{ ${valueExpr} | ${roundExpr} }}`);
  return lines.join('\n');
}

function templateSwitchBlock(slug, kind) {
  const entityId = `sim_e2e_${slug}_${kind}`;
  return [
    `      - name: "${entityId}"`,
    `        unique_id: ${entityId}`,
    `        optimistic: true`,
  ].join('\n');
}

function inputNumberEntry(slug, suffix, spec) {
  const entityId = `e2e_${slug}_${suffix}`;
  const { min, max, step } = spec.inputNumber;
  const initial = Math.min(max, Math.max(min, spec.base));
  const lines = [];
  lines.push(`  ${entityId}:`);
  lines.push(`    name: "${entityId}"`);
  lines.push(`    min: ${min}`);
  lines.push(`    max: ${max}`);
  lines.push(`    step: ${step}`);
  lines.push(`    initial: ${initial}`);
  lines.push(`    unit_of_measurement: "${spec.unit}"`);
  return lines.join('\n');
}

function generate() {
  const out = [];
  out.push('# ==========================================================================');
  out.push('# Growspace Manager E2E — Simulated Sensors & Devices');
  out.push('# ==========================================================================');
  out.push('# AUTO-GENERATED — do not hand-edit.');
  out.push('# Source: lovelace-growspace-manager-card/tests/e2e/ha-config/generate-simulated-entities.js');
  out.push('# Regenerate:');
  out.push('#   node tests/e2e/ha-config/generate-simulated-entities.js > <path-to-this-file>');
  out.push('#');
  out.push('# Provides every sim_e2e_*/e2e_* entity that tests/e2e/fixtures/e2e-setup.ts links to');
  out.push('# the 8 E2E growspaces (mother, clone, veg, flower, dry, cure, vwc_veg, vwc_flower).');
  out.push('# Included as a package from the main configuration.yaml — see AGENTS.md.');
  out.push('# ==========================================================================');
  out.push('');

  // --- input_number helpers for VWC growspaces (directly settable by specs) ---
  out.push('input_number:');
  for (const slug of VWC_SLUGS) {
    out.push(`  # --- ${slug} ---`);
    for (const suffix of SUFFIX_NAMES) {
      out.push(inputNumberEntry(slug, suffix, SUFFIXES[suffix]));
    }
  }
  out.push('');

  // --- template: sensors (non-VWC, oscillating) + switches (all growspaces, optimistic pumps) ---
  out.push('template:');
  out.push('  - sensor:');
  NON_VWC_SLUGS.forEach((slug, slugIndex) => {
    out.push(`      # --- ${slug} ---`);
    for (const suffix of SUFFIX_NAMES) {
      out.push(templateSensorBlock(slug, suffix, SUFFIXES[suffix], slugIndex));
    }
  });
  out.push('  - switch:');
  for (const slug of ALL_SLUGS) {
    out.push(`      # --- ${slug} ---`);
    out.push(templateSwitchBlock(slug, 'irrigation_pump'));
    out.push(templateSwitchBlock(slug, 'drain_pump'));
  }
  out.push('');

  return out.join('\n');
}

process.stdout.write(generate() + '\n');
