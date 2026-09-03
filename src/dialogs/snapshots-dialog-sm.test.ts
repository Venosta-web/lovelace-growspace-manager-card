import { describe, it, expect } from 'vitest';
import { createInitialSM, transition, type SM } from './snapshots-dialog-sm';

const A = '/local/a.jpg';
const B = '/local/b.jpg';
const C = '/local/c.jpg';

const comparing = (): SM =>
  transition(transition(createInitialSM(), { type: 'CompareRequested', path: A }), {
    type: 'CompareBPicked',
    path: B,
  });

describe('snapshots-dialog SM — initial state', () => {
  it('starts with no explicit selection so the newest frame leads', () => {
    expect(createInitialSM().selectedPath).toBeNull();
  });

  it('opens the findings panel, because a finding is the reason to look', () => {
    expect(createInitialSM().panelOpen).toBe(true);
  });
});

describe('snapshots-dialog SM — selection', () => {
  it('FrameSelected sets the hero', () => {
    const sm = transition(createInitialSM(), { type: 'FrameSelected', path: A });
    expect(sm.selectedPath).toBe(A);
  });

  it('FrameSelected leaves compare, so the rail always means "show me this"', () => {
    const sm = transition(comparing(), { type: 'FrameSelected', path: C });
    expect(sm.compare.kind).toBe('off');
    expect(sm.selectedPath).toBe(C);
  });
});

describe('snapshots-dialog SM — playback', () => {
  it('PlayToggled flips playback', () => {
    const sm = transition(createInitialSM(), { type: 'PlayToggled' });
    expect(sm.playing).toBe(true);
    expect(transition(sm, { type: 'PlayToggled' }).playing).toBe(false);
  });

  it('refuses to start playback while comparing', () => {
    expect(transition(comparing(), { type: 'PlayToggled' }).playing).toBe(false);
  });

  it('PlaybackStopped is a no-op when already stopped', () => {
    const sm = createInitialSM();
    expect(transition(sm, { type: 'PlaybackStopped' })).toBe(sm);
  });

  it('opening the lightbox stops playback', () => {
    const playing = transition(createInitialSM(), { type: 'PlayToggled' });
    const sm = transition(playing, { type: 'LightboxOpened' });
    expect(sm.playing).toBe(false);
    expect(sm.lightboxOpen).toBe(true);
  });

  it('entering compare stops playback and closes the lightbox', () => {
    let sm = transition(createInitialSM(), { type: 'PlayToggled' });
    sm = transition(sm, { type: 'CompareRequested', path: A });
    expect(sm.playing).toBe(false);
    expect(sm.lightboxOpen).toBe(false);
  });
});

describe('snapshots-dialog SM — dark filter', () => {
  it('clears the selection when hiding dark frames, since it may be one of them', () => {
    let sm = transition(createInitialSM(), { type: 'FrameSelected', path: A });
    sm = transition(sm, { type: 'DarkFilterToggled' });
    expect(sm.hideDark).toBe(true);
    expect(sm.selectedPath).toBeNull();
  });

  it('keeps the selection when showing dark frames again — it is still visible', () => {
    let sm = transition(createInitialSM(), { type: 'DarkFilterToggled' });
    sm = transition(sm, { type: 'FrameSelected', path: A });
    sm = transition(sm, { type: 'DarkFilterToggled' });
    expect(sm.hideDark).toBe(false);
    expect(sm.selectedPath).toBe(A);
  });
});

describe('snapshots-dialog SM — compare', () => {
  it('CompareRequested opens the picker with A pinned', () => {
    const sm = transition(createInitialSM(), { type: 'CompareRequested', path: A });
    expect(sm.compare).toEqual({ kind: 'picking', aPath: A });
  });

  it('CompareBPicked starts the wipe centred', () => {
    expect(comparing().compare).toEqual({ kind: 'on', aPath: A, bPath: B, pct: 50 });
  });

  it('refuses to compare a frame with itself', () => {
    const picking = transition(createInitialSM(), { type: 'CompareRequested', path: A });
    expect(transition(picking, { type: 'CompareBPicked', path: A })).toBe(picking);
  });

  it('ignores CompareBPicked when no picker is open', () => {
    const sm = createInitialSM();
    expect(transition(sm, { type: 'CompareBPicked', path: B })).toBe(sm);
  });

  it('clamps the wipe position to 0–100', () => {
    expect(transition(comparing(), { type: 'ComparePctChanged', pct: 140 }).compare).toMatchObject({
      pct: 100,
    });
    expect(transition(comparing(), { type: 'ComparePctChanged', pct: -20 }).compare).toMatchObject({
      pct: 0,
    });
  });

  it('ignores a wipe change while still picking', () => {
    const picking = transition(createInitialSM(), { type: 'CompareRequested', path: A });
    expect(transition(picking, { type: 'ComparePctChanged', pct: 10 })).toBe(picking);
  });

  it('CompareClosed also cancels the picker', () => {
    const picking = transition(createInitialSM(), { type: 'CompareRequested', path: A });
    expect(transition(picking, { type: 'CompareClosed' }).compare.kind).toBe('off');
  });
});

describe('snapshots-dialog SM — FramesLoaded', () => {
  it('keeps a selection the refresh still contains', () => {
    const sm = transition(transition(createInitialSM(), { type: 'FrameSelected', path: A }), {
      type: 'FramesLoaded',
      paths: [A, B],
    });
    expect(sm.selectedPath).toBe(A);
  });

  it('drops a selection the refresh pruned, rather than pointing at a 404', () => {
    const sm = transition(transition(createInitialSM(), { type: 'FrameSelected', path: A }), {
      type: 'FramesLoaded',
      paths: [B, C],
    });
    expect(sm.selectedPath).toBeNull();
  });

  it('keeps a comparison whose frames both survive', () => {
    const sm = transition(comparing(), { type: 'FramesLoaded', paths: [A, B, C] });
    expect(sm.compare).toMatchObject({ kind: 'on', aPath: A, bPath: B });
  });

  it('drops a comparison when either frame is gone', () => {
    const sm = transition(comparing(), { type: 'FramesLoaded', paths: [A, C] });
    expect(sm.compare.kind).toBe('off');
  });

  it('drops a picker whose A frame is gone', () => {
    const picking = transition(createInitialSM(), { type: 'CompareRequested', path: A });
    expect(transition(picking, { type: 'FramesLoaded', paths: [B] }).compare.kind).toBe('off');
  });
});

describe('snapshots-dialog SM — view', () => {
  it('opens on the captures browser', () => {
    expect(createInitialSM().view).toBe('captures');
  });

  it('ViewSelected switches surface', () => {
    const sm = transition(createInitialSM(), { type: 'ViewSelected', view: 'evidence' });
    expect(sm.view).toBe('evidence');
  });

  it('is a no-op when the surface is already selected', () => {
    const sm = createInitialSM();
    expect(transition(sm, { type: 'ViewSelected', view: 'captures' })).toBe(sm);
  });

  it('quiesces the captures chrome on the way out, so nothing plays unseen', () => {
    const playing = transition(transition(createInitialSM(), { type: 'PlayToggled' }), {
      type: 'LightboxOpened',
    });
    const sm = transition(playing, { type: 'ViewSelected', view: 'evidence' });

    expect(sm.playing).toBe(false);
    expect(sm.lightboxOpen).toBe(false);
  });

  it('keeps the selected frame, so returning to the browser lands where it left', () => {
    const selected = transition(createInitialSM(), { type: 'FrameSelected', path: A });
    const away = transition(selected, { type: 'ViewSelected', view: 'evidence' });
    const back = transition(away, { type: 'ViewSelected', view: 'captures' });

    expect(back.selectedPath).toBe(A);
  });
});
