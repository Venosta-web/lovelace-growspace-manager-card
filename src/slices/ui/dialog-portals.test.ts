/**
 * Portal registry and the ownership test the dialog host renders through.
 * Regression cover for #913 / ADR-0055.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  mountedDialogPortals$,
  registerDialogPortal,
  unregisterDialogPortal,
  portalOwnsDialog,
} from './dialog-portals';

describe('slices/ui dialog portal registry', () => {
  beforeEach(() => {
    mountedDialogPortals$.set([]);
  });

  it('lists registered portals in registration order', () => {
    registerDialogPortal('a');
    registerDialogPortal('b');
    expect(mountedDialogPortals$.get()).toEqual(['a', 'b']);
  });

  it('withdraws one registration and leaves the others', () => {
    registerDialogPortal('a');
    registerDialogPortal('b');
    unregisterDialogPortal('a');
    expect(mountedDialogPortals$.get()).toEqual(['b']);
  });

  it('drops one registration of a duplicated id, not both', () => {
    registerDialogPortal('a');
    registerDialogPortal('a');
    unregisterDialogPortal('a');
    expect(mountedDialogPortals$.get()).toEqual(['a']);
  });

  it('ignores a withdrawal of an id it never held', () => {
    registerDialogPortal('a');
    unregisterDialogPortal('b');
    expect(mountedDialogPortals$.get()).toEqual(['a']);
  });
});

describe('portalOwnsDialog', () => {
  it('claims a dialog whose payload names this portal', () => {
    expect(portalOwnsDialog('a', 'a', ['a', 'b'])).toBe(true);
  });

  it('stands down for a dialog that names another mounted portal', () => {
    expect(portalOwnsDialog('a', 'b', ['a', 'b'])).toBe(false);
  });

  it('claims a dialog that names no portal at all', () => {
    expect(portalOwnsDialog('a', undefined, ['a', 'b'])).toBe(true);
  });

  // A card can provide the store context without mounting a portal (analytics,
  // subarea, tank, logbook, AI-insight). An opener there names a portal nobody
  // has, and a dialog that opens nowhere is worse than one that opens twice.
  it('claims a dialog that names a portal which is not mounted', () => {
    expect(portalOwnsDialog('a', 'not-mounted', ['a', 'b'])).toBe(true);
  });

  it('claims a dialog when this host has no identity of its own', () => {
    expect(portalOwnsDialog(undefined, undefined, [])).toBe(true);
  });
});
