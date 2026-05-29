/**
 * Breeder Manager State Machine
 *
 * Pure module — no Lit, no DOM. All interaction state for GsBreederManager lives here.
 * The component calls `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Structure:
 *   BreederManagerSM
 *     .activeView  — 'list' | 'editor'
 *     .views       — one typed state object per view (draft + sub-state)
 *     .status      — async save/delete lifecycle
 *     .toast       — transient message
 */

// ─── BreederDraft ─────────────────────────────────────────────────────────────

export interface BreederDraft {
  name: string;
  logo: string;
  /** null = creating a new breeder; non-null = editing an existing one */
  originalName: string | null;
}

// ─── View states ──────────────────────────────────────────────────────────────

export type ListSubState =
  | { kind: 'idle' }
  | { kind: 'confirm-delete'; name: string };

export interface ListViewState {
  sub: ListSubState;
}

export type EditorSubState =
  | { kind: 'idle' }
  | { kind: 'uploading' };

export interface EditorViewState {
  draft: BreederDraft;
  sub: EditorSubState;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export type Status =
  | { kind: 'idle' }
  | { kind: 'applying' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

// ─── Root SM ──────────────────────────────────────────────────────────────────

export interface BreederManagerSM {
  activeView: 'list' | 'editor';
  views: {
    list: ListViewState;
    editor: EditorViewState;
  };
  status: Status;
  toast?: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type BreederManagerEvent =
  | { type: 'EDIT_REQUESTED'; name?: string; logo?: string }
  | { type: 'BACK_TO_LIST' }
  | { type: 'FIELD_CHANGED'; field: keyof Pick<BreederDraft, 'name' | 'logo'>; value: string }
  | { type: 'LOGO_UPLOAD_STARTED' }
  | { type: 'LOGO_UPLOAD_RESOLVED'; base64: string }
  | { type: 'DELETE_REQUESTED'; name: string }
  | { type: 'CANCEL_DELETE' }
  | { type: 'DELETE_CONFIRMED' }
  | { type: 'DELETE_RESOLVED' }
  | { type: 'DELETE_FAILED'; message: string }
  | { type: 'SAVE_REQUESTED' }
  | { type: 'SAVE_RESOLVED' }
  | { type: 'SAVE_FAILED'; message: string }
  | { type: 'SET_TOAST'; message: string | undefined };

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createInitialSM(): BreederManagerSM {
  return {
    activeView: 'list',
    views: {
      list: { sub: { kind: 'idle' } },
      editor: {
        draft: { name: '', logo: '', originalName: null },
        sub: { kind: 'idle' },
      },
    },
    status: { kind: 'idle' },
    toast: undefined,
  };
}

// ─── Transition ───────────────────────────────────────────────────────────────

export function transition(sm: BreederManagerSM, event: BreederManagerEvent): BreederManagerSM {
  switch (event.type) {
    case 'EDIT_REQUESTED':
      return {
        ...sm,
        activeView: 'editor',
        views: {
          ...sm.views,
          editor: {
            draft: {
              name: event.name ?? '',
              logo: event.logo ?? '',
              originalName: event.name != null ? event.name : null,
            },
            sub: { kind: 'idle' },
          },
        },
      };

    case 'BACK_TO_LIST':
      return { ...sm, activeView: 'list' };

    case 'FIELD_CHANGED':
      return {
        ...sm,
        views: {
          ...sm.views,
          editor: {
            ...sm.views.editor,
            draft: { ...sm.views.editor.draft, [event.field]: event.value },
          },
        },
      };

    case 'LOGO_UPLOAD_STARTED':
      return {
        ...sm,
        views: {
          ...sm.views,
          editor: { ...sm.views.editor, sub: { kind: 'uploading' } },
        },
      };

    case 'LOGO_UPLOAD_RESOLVED':
      return {
        ...sm,
        views: {
          ...sm.views,
          editor: {
            ...sm.views.editor,
            draft: { ...sm.views.editor.draft, logo: event.base64 },
            sub: { kind: 'idle' },
          },
        },
      };

    case 'DELETE_REQUESTED':
      return {
        ...sm,
        views: {
          ...sm.views,
          list: { sub: { kind: 'confirm-delete', name: event.name } },
        },
      };

    case 'CANCEL_DELETE':
      return {
        ...sm,
        views: { ...sm.views, list: { sub: { kind: 'idle' } } },
      };

    case 'DELETE_CONFIRMED':
      return { ...sm, status: { kind: 'applying' } };

    case 'DELETE_RESOLVED':
      return {
        ...sm,
        status: { kind: 'idle' },
        views: { ...sm.views, list: { sub: { kind: 'idle' } } },
        toast: 'Breeder removed',
      };

    case 'DELETE_FAILED':
      return { ...sm, status: { kind: 'error', message: event.message } };

    case 'SAVE_REQUESTED':
      return { ...sm, status: { kind: 'applying' } };

    case 'SAVE_RESOLVED':
      return {
        ...sm,
        activeView: 'list',
        status: { kind: 'idle' },
        toast: 'Breeder saved',
      };

    case 'SAVE_FAILED':
      return { ...sm, status: { kind: 'error', message: event.message } };

    case 'SET_TOAST':
      return { ...sm, toast: event.message };

    default:
      return sm;
  }
}
