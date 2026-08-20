# Live camera capture drives getUserMedia directly, not `<input capture>`

Image capture that needs the device camera (strain library photos, logbook/timeline note
photos) is driven by a shared `<camera-capture>` component that opens a live camera stream
via `navigator.mediaDevices.getUserMedia` and renders its own fullscreen preview / capture
/ front-back-switch overlay — **not** by an `<input type="file" accept="image/*"
capture="environment">`. The component owns the whole post-trigger flow (a bottom-sheet
"Take Photo / Choose from Library" menu, both hidden file inputs, and the camera overlay)
and emits captured `File`(s) to the consumer; persistence stays with each consumer
(strain → WS `upload_strain_image` → path; notes → inline base64).

## Context

Inside the Home Assistant companion-app WebView (Android/iOS) the `capture` attribute is
**ignored** — the picker only ever opens the gallery/camera roll, so a grower cannot take a
fresh photo from within the card. `getUserMedia` is the only reliable way to reach the live
camera there. The strain editor already solved this; this ADR records consolidating that
~100-line block into one shared component so the logbook note photo button (which had the
broken `<input>`-only flow) gets identical behaviour instead of a second copy.

## Considered Options

- **`<input capture="environment">`** — rejected: silently ignored in the HA WebView, which
  is the primary runtime. This is the exact bug being fixed; it is kept only as the fallback
  when `navigator.mediaDevices.getUserMedia` is unavailable.
- **Copy the getUserMedia block into the note input** — rejected: ~100 lines duplicated
  across two call sites that would drift; chose a shared component used by both.

## Consequences

- The component requires a secure context (HTTPS / localhost) for `getUserMedia`; the
  hidden-file-input fallback and a user-facing error message cover the denied / unavailable
  cases.
- The strain editor's photo-menu state-machine states (`sub.kind === 'photo-menu'`,
  `PhotoMenuClosed`) are removed in favour of the component's self-contained internal state.
- `multiple` is a per-consumer flag on the component (note = multi-select from library +
  preview gallery; strain = single). Live camera always emits one `File` per capture.
