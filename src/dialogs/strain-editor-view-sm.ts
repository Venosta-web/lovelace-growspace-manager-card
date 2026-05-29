/**
 * Strain Editor View State Machine
 *
 * Pure module — no Lit, no DOM. All interaction state for StrainEditorView lives here.
 * The component calls `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Structure:
 *   StrainEditorSM
 *     .draft     — flat Partial<StrainEntry> (no tabs)
 *     .history   — lineage drill-down stack; entries pushed on NavigateToRelated, popped on NavigateBack
 *     .status    — async save lifecycle
 *     .toast     — transient error message
 *     .sub       — mutually-exclusive overlay state
 */

import type { StrainEntry } from '../features/plants/types';

// ─── Status ───────────────────────────────────────────────────────────────────

export type Status =
  | { kind: 'idle' }
  | { kind: 'applying' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

// ─── Sub-state ────────────────────────────────────────────────────────────────

export interface BreederDraft {
  name: string;
  logo: string;
  originalName: string;
}

export type SubState =
  | { kind: 'idle' }
  | { kind: 'cropping' }
  | { kind: 'lineage-editing' }
  | { kind: 'importing'; replace: boolean }
  | { kind: 'seedfinder' }
  | { kind: 'breeder-list' }
  | { kind: 'breeder-editing'; draft: BreederDraft }
  | { kind: 'breeder-confirm-delete'; name: string }
  | { kind: 'photo-menu' };

// ─── Root SM ──────────────────────────────────────────────────────────────────

export interface StrainEditorSM {
  draft: Partial<StrainEntry>;
  history: Partial<StrainEntry>[];
  status: Status;
  toast?: string;
  sub: SubState;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type EditorEvent =
  | { type: 'DraftFieldChanged'; field: keyof StrainEntry; value: unknown }
  | { type: 'SaveRequested' }
  | { type: 'SaveResolved' }
  | { type: 'SaveFailed'; message: string }
  | { type: 'NavigateToRelated'; strain: Partial<StrainEntry> }
  | { type: 'NavigateBack' }
  | { type: 'CropRequested' }
  | { type: 'CropExited' }
  | { type: 'LineageEditRequested' }
  | { type: 'LineageEditExited' }
  | { type: 'ImportRequested' }
  | { type: 'ImportReplaceToggled' }
  | { type: 'ImportCompleted' }
  | { type: 'ImportCancelled' }
  | { type: 'SeedfinderOpened' }
  | { type: 'SeedfinderClosed' }
  | { type: 'BreederListOpened' }
  | { type: 'BreederEditRequested'; name: string; logo: string }
  | { type: 'BreederAddRequested' }
  | { type: 'BreederEditFieldChanged'; field: 'name' | 'logo'; value: string }
  | { type: 'BreederSaved' }
  | { type: 'BreederDeleteRequested'; name: string }
  | { type: 'BreederDeleteConfirmed' }
  | { type: 'BreederDeleteCancelled' }
  | { type: 'BreederDialogClosed' }
  | { type: 'PhotoMenuToggled' }
  | { type: 'PhotoMenuClosed' }
  | { type: 'ToastDismissed' };

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createInitialSM(draft: Partial<StrainEntry> = {}): StrainEditorSM {
  return {
    draft,
    history: [],
    status: { kind: 'idle' },
    toast: undefined,
    sub: { kind: 'idle' },
  };
}

// ─── Transition ───────────────────────────────────────────────────────────────

export function transition(sm: StrainEditorSM, event: EditorEvent): StrainEditorSM {
  switch (event.type) {
    case 'DraftFieldChanged':
      return { ...sm, draft: { ...sm.draft, [event.field]: event.value } };

    case 'SaveRequested':
      return { ...sm, status: { kind: 'applying' } };

    case 'SaveResolved':
      return { ...sm, status: { kind: 'done' } };

    case 'SaveFailed':
      return { ...sm, status: { kind: 'error', message: event.message }, toast: event.message };

    case 'NavigateToRelated':
      return { ...sm, draft: event.strain, history: [...sm.history, sm.draft] };

    case 'NavigateBack': {
      if (sm.history.length === 0) return sm;
      const prev = sm.history[sm.history.length - 1];
      return { ...sm, draft: prev, history: sm.history.slice(0, -1) };
    }

    case 'CropRequested':
      return { ...sm, sub: { kind: 'cropping' } };

    case 'CropExited':
      return { ...sm, sub: { kind: 'idle' } };

    case 'LineageEditRequested':
      return { ...sm, sub: { kind: 'lineage-editing' } };

    case 'LineageEditExited':
      return { ...sm, sub: { kind: 'idle' } };

    case 'ImportRequested':
      return { ...sm, sub: { kind: 'importing', replace: false } };

    case 'ImportReplaceToggled':
      if (sm.sub.kind !== 'importing') return sm;
      return { ...sm, sub: { kind: 'importing', replace: !sm.sub.replace } };

    case 'ImportCompleted':
    case 'ImportCancelled':
      return { ...sm, sub: { kind: 'idle' } };

    case 'SeedfinderOpened':
      return { ...sm, sub: { kind: 'seedfinder' } };

    case 'SeedfinderClosed':
      return { ...sm, sub: { kind: 'idle' } };

    case 'BreederListOpened':
      return { ...sm, sub: { kind: 'breeder-list' } };

    case 'BreederEditRequested':
      return {
        ...sm,
        sub: {
          kind: 'breeder-editing',
          draft: { name: event.name, logo: event.logo, originalName: event.name },
        },
      };

    case 'BreederAddRequested':
      return {
        ...sm,
        sub: { kind: 'breeder-editing', draft: { name: '', logo: '', originalName: '' } },
      };

    case 'BreederEditFieldChanged':
      if (sm.sub.kind !== 'breeder-editing') return sm;
      return {
        ...sm,
        sub: { ...sm.sub, draft: { ...sm.sub.draft, [event.field]: event.value } },
      };

    case 'BreederSaved':
      return { ...sm, sub: { kind: 'breeder-list' } };

    case 'BreederDeleteRequested':
      return { ...sm, sub: { kind: 'breeder-confirm-delete', name: event.name } };

    case 'BreederDeleteConfirmed':
    case 'BreederDeleteCancelled':
      return { ...sm, sub: { kind: 'breeder-list' } };

    case 'BreederDialogClosed':
      return { ...sm, sub: { kind: 'idle' } };

    case 'PhotoMenuToggled':
      return { ...sm, sub: sm.sub.kind === 'photo-menu' ? { kind: 'idle' } : { kind: 'photo-menu' } };

    case 'PhotoMenuClosed':
      return { ...sm, sub: { kind: 'idle' } };

    case 'ToastDismissed':
      return { ...sm, toast: undefined };
  }
}

// ─── Predicates ───────────────────────────────────────────────────────────────

export function isEditorDirty(sm: StrainEditorSM, original?: Partial<StrainEntry>): boolean {
  if (!original) {
    return Object.keys(sm.draft).length > 0;
  }
  const keys = new Set([...Object.keys(sm.draft), ...Object.keys(original)]) as Set<keyof StrainEntry>;
  for (const key of keys) {
    if (sm.draft[key] !== original[key]) return true;
  }
  return false;
}
