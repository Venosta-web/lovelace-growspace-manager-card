/**
 * Harvest Scoring Dialog State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall. All interaction state for
 * HarvestScoringDialog lives here. The component calls `transition(sm, event)`
 * and replaces its single `@state() _sm`.
 *
 * Structure:
 *   SM
 *     .activeTab          — 'scoring' | 'metrics'
 *     .status             — root-level async lifecycle (idle / confirming / applying / done / error)
 *     .toast              — transient feedback message
 *     .tabs               — one typed state object per tab (draft + sub)
 */

import type { HarvestScoringDialogState } from '../lib/types/dialog';

// ─── Tab IDs ──────────────────────────────────────────────────────────────────

export type TabId = 'scoring' | 'metrics';

// ─── Scoring tab ──────────────────────────────────────────────────────────────

export interface ScoringDraft {
  vigor: number | null;
  internodal_spacing: number | null;
  terpene_intensity: number | null;
  resin: number | null;
  mold_resistance: number | null;
}

export interface ScoringTabState {
  draft: ScoringDraft;
  sub: { kind: 'idle' };
}

// ─── Metrics tab ──────────────────────────────────────────────────────────────

export interface MetricsDraft {
  wetWeight: string;
  dryWeight: string;
  trimWeight: string;
  thcPercentage: string;
  cbdPercentage: string;
  terpeneProfile: string;
}

export interface MetricsTabState {
  draft: MetricsDraft;
  sub: { kind: 'idle' };
}

// ─── Root SM ──────────────────────────────────────────────────────────────────

export interface TabStates {
  scoring: ScoringTabState;
  metrics: MetricsTabState;
}

export type HarvestMode = 'save' | 'skip';

export type Status =
  | { kind: 'idle' }
  | { kind: 'confirming'; mode: HarvestMode }
  | { kind: 'applying'; mode: HarvestMode }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export interface SM {
  activeTab: TabId;
  tabs: TabStates;
  status: Status;
  toast: string | undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type SMEvent =
  // Navigation
  | { type: 'TabSelected'; tab: TabId }
  // Draft mutations
  | { type: 'DraftFieldChanged'; tab: 'scoring'; field: keyof ScoringDraft; value: number | null }
  | { type: 'DraftFieldChanged'; tab: 'metrics'; field: keyof MetricsDraft; value: string }
  // Save lifecycle — "save" includes scores + metrics; "skip" harvests without scoring
  | { type: 'SaveRequested' }
  | { type: 'SkipRequested' }
  | { type: 'HarvestConfirmed' }
  | { type: 'HarvestCancelled' }
  | { type: 'SaveResolved' }
  | { type: 'SaveFailed'; message: string }
  | { type: 'StatusReset' }
  // Toast
  | { type: 'SetToast'; message: string | undefined };

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(seed?: HarvestScoringDialogState): SM {
  return {
    activeTab: 'scoring',
    tabs: {
      scoring: {
        draft: {
          vigor: seed?.vigor ?? null,
          internodal_spacing: seed?.internodal_spacing ?? null,
          terpene_intensity: seed?.terpene_intensity ?? null,
          resin: seed?.resin ?? null,
          mold_resistance: seed?.mold_resistance ?? null,
        },
        sub: { kind: 'idle' },
      },
      metrics: {
        draft: {
          wetWeight: '',
          dryWeight: '',
          trimWeight: '',
          thcPercentage: '',
          cbdPercentage: '',
          terpeneProfile: '',
        },
        sub: { kind: 'idle' },
      },
    },
    status: { kind: 'idle' },
    toast: undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isScoringEmpty(sm: SM): boolean {
  return Object.values(sm.tabs.scoring.draft).every((v) => v === null);
}

export interface ParsedMetrics {
  wet_weight?: number;
  dry_weight?: number;
  trim_weight?: number;
  thc_percentage?: number;
  cbd_percentage?: number;
  terpene_profile?: string;
}

export function parseMetrics(draft: MetricsDraft): ParsedMetrics {
  const parseF = (v: string): number | undefined => {
    const n = parseFloat(v.trim());
    return v.trim() !== '' && !isNaN(n) ? n : undefined;
  };
  const result: ParsedMetrics = {};
  const ww = parseF(draft.wetWeight);
  const dw = parseF(draft.dryWeight);
  const tw = parseF(draft.trimWeight);
  const thc = parseF(draft.thcPercentage);
  const cbd = parseF(draft.cbdPercentage);
  if (ww !== undefined) result.wet_weight = ww;
  if (dw !== undefined) result.dry_weight = dw;
  if (tw !== undefined) result.trim_weight = tw;
  if (thc !== undefined) result.thc_percentage = thc;
  if (cbd !== undefined) result.cbd_percentage = cbd;
  if (draft.terpeneProfile.trim()) result.terpene_profile = draft.terpeneProfile.trim();
  return result;
}

// ─── Transition ───────────────────────────────────────────────────────────────

export function transition(sm: SM, event: SMEvent): SM {
  switch (event.type) {
    case 'TabSelected':
      if (sm.status.kind !== 'idle') return sm;
      return { ...sm, activeTab: event.tab };

    case 'DraftFieldChanged':
      if (event.tab === 'scoring') {
        return {
          ...sm,
          tabs: {
            ...sm.tabs,
            scoring: {
              ...sm.tabs.scoring,
              draft: { ...sm.tabs.scoring.draft, [event.field]: event.value },
            },
          },
        };
      }
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          metrics: {
            ...sm.tabs.metrics,
            draft: { ...sm.tabs.metrics.draft, [event.field]: event.value },
          },
        },
      };

    case 'SaveRequested':
      if (sm.status.kind !== 'idle') return sm;
      return { ...sm, status: { kind: 'confirming', mode: 'save' } };

    case 'SkipRequested':
      if (sm.status.kind !== 'idle') return sm;
      return { ...sm, status: { kind: 'confirming', mode: 'skip' } };

    case 'HarvestConfirmed':
      if (sm.status.kind !== 'confirming') return sm;
      return { ...sm, status: { kind: 'applying', mode: sm.status.mode } };

    case 'HarvestCancelled':
      if (sm.status.kind !== 'confirming') return sm;
      return { ...sm, status: { kind: 'idle' } };

    case 'SaveResolved':
      if (sm.status.kind !== 'applying') return sm;
      return { ...sm, status: { kind: 'done' } };

    case 'SaveFailed':
      if (sm.status.kind !== 'applying') return sm;
      return { ...sm, status: { kind: 'error', message: event.message } };

    case 'StatusReset':
      return { ...sm, status: { kind: 'idle' }, toast: undefined };

    case 'SetToast':
      return { ...sm, toast: event.message };

    default:
      return sm;
  }
}
