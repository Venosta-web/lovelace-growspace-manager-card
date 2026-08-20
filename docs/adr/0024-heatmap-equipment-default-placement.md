# 3D heatmap equipment gets render-time default placement, not persisted defaults

When a piece of equipment has no entry in `environmentAttributes.sensorCoordinates`,
its renderer computes a sensible default position **on the fly each render** rather than
writing a default into the backend. Nothing is persisted until the grower drags the item,
at which point a real coordinate is stored and overrides the fallback. This makes lights,
humidifiers, and dehumidifiers visible by default (they previously rendered nothing via
`if (!coords) return`) and replaces the pile-everything-in-one-corner behaviour of fans,
pumps, and tanks with spread-out, type-aware defaults. **Sensors are deliberately excluded** —
they keep their opt-in behaviour.

## Context

The 3D heatmap (`heatmap-3d.ts` + the `src/utils/three/renderers/*` renderers) positions
every device from `sensorCoordinates`. Three renderers (`light`, `equipment` for
hum/dehum, `sensor`) bailed out with `if (!coords) return` when a device had no stored
coordinate, so a fresh growspace showed an empty tent until the grower hand-placed each
item in edit mode. The renderers that *did* default (`fan` → `(0,0)`, `pump` → `(0,0,0)`,
`exhaust` → centre-ceiling, `tank` → mid-left-wall) used a single hard-coded point, so
multiple units of the same type overlapped.

Coordinates are in **HA space**: `X` = width `0→w`, `Y` = depth `0→d`, `Z` = height `0→h`.
Centre-floor is `(w/2, d/2, 0)`; centre-ceiling is `(w/2, d/2, h)`. The renderer maps this
to the scene as `scene.x = X − w/2`, `scene.y = Z`, `scene.z = Y − d/2`.

## Decision: render-time fallback over persisted defaults

Compute defaults at render time. Rejected persisting computed defaults to the backend on
first view-open because it would: silently mutate the config entry just by opening a view,
require a backend round-trip the other renderers don't make, and make "reset to default"
harder (you'd have to delete stored coords rather than just not-store them). Render-time
fallback is non-destructive, matches the pattern fan/pump/exhaust/tank already use, and
keeps drag-to-override as the single persistence trigger. The implementation is uniform:
replace each `if (!coords) return` guard with `coords ?? defaultCoordsFor(type, index, count, dims)`.

## Per-equipment default spec

All positions in HA coords. `index` is the device's position in its type list (0-based),
`count` is the list length.

| Equipment | Single | Multiple | Z (height) | Notes |
|---|---|---|---|---|
| **Light** | `(w/2, d/2)` | spread across the renderer's existing `cols`×`rows` grid, each centred in its cell | `0.9·h` | Reuse the `cols`/`rows` already computed for bar sizing (incl. the `count===2` → 1×2 case) so size and position agree |
| **Exhaust** | `(w/2, d, h)` | spread evenly along the back-wall top edge (`y=d`, `z=h`) | `h` | Back wall = `y=d`. Was centre-ceiling `(w/2, d/2, h)` |
| **Circulation fan** | one corner | cycle the four corners `(0,0)→(w,d)→(w,0)→(0,d)` | `0.7·h` | Renderer snaps x/y to nearest wall, so only corners are reachable; fans auto-face centre |
| **Humidifier** | `(w/3, −40, 0.5·h)` | offset along the front, outside (`y<0`) | `0.5·h` | Outside front wall → renderer draws supply hose; `z` is the hose entry height → canopy level |
| **Dehumidifier** | `(2w/3, −40, 0.5·h)` | offset along the front, outside (`y<0`) | `0.5·h` | Right-of-centre so it doesn't stack on the humidifier |
| **Irrigation pump** | `(0, d/3, 0)` | along left wall | `0` | Beside the tank wall; linked pumps still snap onto their tank |
| **Drain pump** | `(0, 2d/3, 0)` | along left wall | `0` | Separated from irrigation pump to avoid overlap |
| **Tank** | `(0, d/2, 0)` | spread evenly along left wall depth (`x=0`) | `0` | Pumps share this wall by design (they draw from tanks) |
| **Sensor** (temp/hum/vpd) | — | — | — | **No default.** Position is the heatmap's interpolation sample point; a guessed position yields a misleading field. Stays opt-in. `sensor-renderer` iterates `Object.keys(sensorCoordinates)`, so a coord-less sensor isn't in the loop |

## Consequences

- Lights, humidifiers, and dehumidifiers become visible on a fresh growspace with no manual
  placement — the headline behaviour change.
- Multi-unit setups (2+ fans, 2 pumps, 2+ tanks, hum+dehum) no longer overlap.
- The heatmap field remains truthful: it only ever interpolates from sensor positions the
  grower actually set, because sensors are excluded from defaulting.
- A future "reset placement" feature is trivial — delete the stored coord and the fallback
  takes over.
