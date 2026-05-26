# Card Editor Improvements Design

**Date:** 2026-04-29

## Goals

1. Standardize all card editors onto `ha-form` (eliminate raw HTML inputs in main card editor)
2. Eliminate duplicated growspace loading logic across 4 editors
3. Add theme picker and expose all meaningful config fields in the main card editor UI

## Background

The main card editor (`growspace-manager-card-editor.ts`) uses raw HTML `<select>`, `<input type="range">`, and `<ha-form-switch>`. The three sub-card editors already use `ha-form` with schema. Additionally, `_loadGrowspaces()` and the `state_changed` subscription pattern are copy-pasted across all 4 editors (~50 lines of near-identical code).

## Design

### 1. `GrowspaceOptionsController` (new)

A Reactive Controller that owns growspace loading and subscription state. Lives alongside `HassSubscriptionController`.

```typescript
// controllers/growspace-options-controller.ts
export class GrowspaceOptionsController implements ReactiveController {
  options: { id: string; name: string }[] = [];

  constructor(host: ReactiveControllerHost) { ... }

  /** Call from host's updated() whenever hass changes. */
  update(hass: HomeAssistant): void {
    this._loadFromState(hass);
    this._subscribe(hass);
  }

  hostConnected() {}
  hostDisconnected() { this._subscribed = false; }
}
```

- Parses `sensor.growspaces_list` attributes on initial load
- Subscribes to `state_changed` once (guards with `_subscribed` flag)
- Calls `this._host.requestUpdate()` when options change
- Cleans up via the embedded `HassSubscriptionController`

Each editor replaces its `_growspaceOptions` state + `_loadGrowspaces()` + subscription boilerplate with:

```typescript
private _gsController = new GrowspaceOptionsController(this);

updated(changedProps) {
  if (changedProps.has('hass') && this.hass) {
    this._gsController.update(this.hass);
  }
}
```

### 2. Main card editor rewrite

Replace raw HTML inputs with `ha-form` schema:

```typescript
private _computeSchema() {
  return [
    {
      name: 'default_growspace',
      selector: { select: { options: [
        { label: 'Select a growspace...', value: '' },
        ...this._gsController.options.map(gs => ({ label: gs.name, value: gs.id }))
      ]}},
    },
    {
      name: 'theme',
      selector: { select: { options: [
        { label: 'Default', value: 'default' },
        { label: 'Dark', value: 'dark' },
        { label: 'Green', value: 'green' },
      ]}},
    },
    {
      name: 'initial_view_mode',
      selector: { select: { options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Compact (Grid Only)', value: 'compact' },
        { label: 'Header Only', value: 'header' },
      ]}},
    },
    { name: 'keyboard_rotate_enabled', selector: { boolean: {} } },
    { name: 'keyboard_rotate_speed', selector: { number: { min: 0.1, max: 5.0, step: 0.1 } } },
  ];
}
```

The `growspaces` array field is intentionally excluded — each card shows one growspace, so the filter array has no UI value.

### 3. Shared `computeEditorLabel` (new)

```typescript
// lib/editor-utils.ts
const FIELD_LABELS: Record<string, string> = {
  default_growspace:       'Default Growspace',
  growspace_id:            'Parent Growspace',
  subarea_id:              'Subarea',
  theme:                   'Theme',
  initial_view_mode:       'Initial View Mode',
  keyboard_rotate_enabled: 'Keyboard Rotation (3D View)',
  keyboard_rotate_speed:   'Rotation Speed',
};

export const computeEditorLabel = (schema: { name: string }) =>
  FIELD_LABELS[schema.name] ?? schema.name;
```

All editors use `.computeLabel=${computeEditorLabel}`.

## File Changes

| File | Change |
|---|---|
| `controllers/growspace-options-controller.ts` | New |
| `lib/editor-utils.ts` | New |
| `growspace-manager-card-editor.ts` | Rewrite — drop raw HTML, use `ha-form` + controller |
| `cards/editors/growspace-grid-card-editor.ts` | Use controller + shared label |
| `cards/editors/growspace-analytics-card-editor.ts` | Use controller + shared label |
| `cards/editors/growspace-subarea-card-editor.ts` | Use controller + shared label |

## Out of Scope

- `auto_select_growspace` toggle — not requested
- `growspaces` array multi-select — not needed (one growspace per card)
- i18n / translation keys — labels are English strings for now
