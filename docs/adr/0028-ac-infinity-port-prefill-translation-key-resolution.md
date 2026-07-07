# AC Infinity Port Pre-fill via Translation-Key Resolution; Storage Stays the Explicit Entity Bundle

The integration's ADR-0024 rejected "one picker + device-registry resolution" for AC Infinity
bundles, accepting ~6 manual entity pickers per grow light (and 2 per actuator role) for
convention-consistency and zero upstream coupling. That friction is real: configuring one port
means hand-picking the `active_mode` select, on/off `time` entities, `on_power` number, and
sunrise switch + duration out of flat platform-filtered lists — even though the `ac_infinity`
integration already groups exactly those entities under one device per port.

**Decision:** add a device picker to every AC Infinity editor in the Config Dialog (grow light
tab + the four actuator roles on the Climate and Humidity tabs) that **pre-fills the existing
entity pickers** — and change nothing else. The user picks an `ac_infinity` *device* (a port);
the card resolves the bundle's member entities from the frontend entity registry
(`hass.entities`), matching by `device_id` + `platform === 'ac_infinity'` + `translation_key`
+ domain:

| Bundle field | Domain | `translation_key` |
| --- | --- | --- |
| `mode_entity` | `select` | `active_mode` |
| `speed_entity` / `power_entity` | `number` | `on_power` |
| `on_time_entity` | `time` | `schedule_mode_on_time` |
| `off_time_entity` | `time` | `schedule_mode_off_time` |
| `sunrise_switch_entity` | `switch` | `sunrise_timer_enabled` |
| `sunrise_duration_entity` | `number` | `sunrise_timer_minutes` |

Picking a device **overwrites all role fields**: resolved roles are filled, unresolved roles
are cleared (never left stale from a previously picked port) with an inline warning naming
what wasn't found. The saved config remains the explicit entity bundle of integration
ADR-0022/0024 — resolution never happens at save time or runtime, only at the moment of the
pick. The picker itself is ephemeral UI state (not part of the Shared Environment Draft); on
reopen it displays the device derived live from the saved `mode_entity`'s `device_id`. A
[[Duplicate Port Warning]] (passive, Automated-Mode-Conflict style) fires when the picked
port's mode entity already appears in another role bundle of the same growspace draft.

## Considered Options

- **Store `device_id`, resolve at setup/runtime (supersede ADR-0024).** Cleanest UX and
  rename-proof, but hard-couples the *backend* to `ac_infinity`'s internal keys and requires a
  storage migration — exactly the coupling ADR-0024 exists to avoid. Rejected.
- **Resolve once at save, hide the entity pickers.** Same storage shape, simpler-looking UI,
  but a mis-resolution is invisible until control silently fails. Rejected: the pre-fill
  variant keeps every field visible and correctable.
- **Card + options-flow.** Also adding a `DeviceSelector` + resolution to
  `environment_config_handler.py` would put the translation-key coupling into the backend and
  double the work for a rarely used fallback surface. Rejected; card only.

## Consequences

- Coupling to `ac_infinity`'s translation keys now exists — but only as best-effort autofill.
  An upstream key rename degrades the pre-fill to today's manual flow; nothing stored or
  running breaks. This is why ADR-0024 is **amended, not overturned** (a note there points
  here).
- Disabled entities don't appear in `hass.entities` (`list_for_display` filters
  `disabled_by`), so a manually disabled entity resolves as missing → cleared field + warning.
  All relevant `ac_infinity` entities ship enabled by default.
- The picker lists only devices exposing an `ac_infinity` `active_mode` select (what makes a
  device a controllable port, vs. the controller parent device), labeled with the
  device-registry name.
- Duplicate-port detection is draft-scoped: it does not catch the same port claimed by a
  *different growspace*. Accepted for v1.
