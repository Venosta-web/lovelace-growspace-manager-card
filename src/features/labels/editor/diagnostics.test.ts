/**
 * One ordered list of what is wrong, each row pointing at its correction.
 */

import { describe, expect, it } from 'vitest';

import { collectDiagnostics, controlForPath, copyKeys, countBySeverity } from './diagnostics';

function diagnostic(overrides: Record<string, unknown> = {}) {
  return {
    code: 'profile.text_below_comfort_threshold',
    severity: 'warning',
    layer: 'profile_compilation',
    message: 'Element 01J… text is 2.0 mm',
    path: '',
    element_id: 'name',
    parameters: {},
    recovery: 'edit_element',
    ...overrides,
  };
}

describe('ordering', () => {
  it('puts errors first, then warnings, then notes, whatever order they came in', () => {
    const entries = collectDiagnostics(null, {
      diagnostics: [
        diagnostic({ severity: 'info', code: 'a.note' }),
        diagnostic({ severity: 'warning', code: 'b.warn' }),
        diagnostic({ severity: 'error', code: 'c.error' }),
      ],
    });

    expect(entries.map((entry) => entry.severity)).toEqual(['error', 'warning', 'info']);
  });

  it('orders one severity by the layer that produced it, then as listed', () => {
    const entries = collectDiagnostics(null, {
      diagnostics: [
        diagnostic({ severity: 'error', layer: 'raster', code: 'raster.first' }),
        diagnostic({ severity: 'error', layer: 'document', code: 'document.second' }),
        diagnostic({ severity: 'error', layer: 'raster', code: 'raster.third' }),
        diagnostic({ severity: 'error', layer: 'unheard_of', code: 'x.last' }),
      ],
    });

    expect(entries.map((entry) => entry.code)).toEqual([
      'document.second',
      'raster.first',
      'raster.third',
      'x.last',
    ]);
  });

  it('lists a problem both sources report once', () => {
    const shared = diagnostic({
      severity: 'error',
      layer: 'document',
      path: '/elements/0/frame/x_mm',
    });
    const entries = collectDiagnostics(
      { operation: 'publish', allowed: false, diagnostics: [shared] },
      { diagnostics: [shared] }
    );

    expect(entries).toHaveLength(1);
  });

  it('counts each severity for the heading and the live region', () => {
    const entries = collectDiagnostics(null, {
      diagnostics: [
        diagnostic({ severity: 'error', code: 'one' }),
        diagnostic({ severity: 'warning', code: 'two' }),
        diagnostic({ severity: 'warning', code: 'three' }),
        diagnostic({ severity: 'bogus', code: 'four' }),
      ],
    });

    expect(countBySeverity(entries)).toEqual({ error: 1, warning: 2, info: 1 });
  });
});

describe('destinations', () => {
  it('maps a document path to the exact inspector control', () => {
    expect(controlForPath('/elements/2/frame/width_mm')).toBe('width_mm');
    expect(controlForPath('/elements/2/style/font_size_mm')).toBe('font_size_mm');
    expect(controlForPath('/elements/2/content/literal')).toBe('literal');
    expect(controlForPath('/elements/2/content')).toBe('binding');
    expect(controlForPath('/elements/2/rotation')).toBeNull();
    expect(controlForPath('/label_size_id')).toBeNull();
    expect(controlForPath('')).toBeNull();
  });

  it('maps a pathless profile diagnostic to its control by code', () => {
    const [entry] = collectDiagnostics(null, { diagnostics: [diagnostic()] });

    expect(entry.destination).toBe('element');
    expect(entry.control).toBe('font_size_mm');
  });

  it('routes device problems to profile selection and calibration, not the element', () => {
    const entries = collectDiagnostics(null, {
      diagnostics: [
        diagnostic({ code: 'profile.stock_mismatch', recovery: 'select_profile' }),
        diagnostic({ code: 'calibration.thing', recovery: 'calibrate' }),
        diagnostic({ code: 'raster.render_failed', recovery: 'retry', element_id: null }),
        diagnostic({ code: 'x.template', recovery: 'restore_template' }),
      ],
    });

    expect(entries.map((entry) => entry.destination)).toEqual([
      'profile',
      'calibration',
      'retry',
      'template',
    ]);
    expect(entries.every((entry) => entry.control === null)).toBe(true);
  });

  it('offers nothing for an element correction with no element to go to', () => {
    const [entry] = collectDiagnostics(null, {
      diagnostics: [diagnostic({ element_id: null, recovery: 'edit_content' })],
    });

    expect(entry.destination).toBe('none');
    expect(entry.control).toBeNull();
  });

  it('offers no retry for a missing font, which asking again cannot fix', () => {
    const [entry] = collectDiagnostics(null, {
      diagnostics: [
        diagnostic({ code: 'raster.text_unmeasured', layer: 'raster', recovery: 'retry' }),
      ],
    });

    expect(entry.destination).toBe('none');
  });

  it('treats an unknown recovery verb as nothing to do', () => {
    const [entry] = collectDiagnostics(null, {
      diagnostics: [diagnostic({ recovery: 'reticulate_splines' })],
    });

    expect(entry.destination).toBe('none');
  });
});

describe('copy', () => {
  it('looks up reviewed copy by code, then layer and severity, then severity alone', () => {
    expect(
      copyKeys({
        code: 'profile.text_below_readable_floor',
        layer: 'profile_compilation',
        severity: 'error',
      })
    ).toEqual([
      'diagnostic_profile_text_below_readable_floor',
      'diagnostic_layer_profile_compilation_error',
      'diagnostic_severity_error',
    ]);
  });
});
