# Directory Migration Design

Consolidate the legacy `src/components/` tree into the `src/features/` structure, leaving `src/components/` empty and deleted.

## Target Mapping

| Legacy path | New path |
|---|---|
| `components/ui/md3-date-input.ts` | `features/shared/ui/` |
| `components/ui/md3-number-input.ts` | `features/shared/ui/` |
| `components/ui/md3-select.ts` | `features/shared/ui/` |
| `components/ui/md3-switch.ts` | `features/shared/ui/` |
| `components/ui/md3-text-input.ts` | `features/shared/ui/` |
| `components/ui/scroll-container.ts` | `features/shared/ui/` |
| `components/ui/gs-help-tooltip.ts` | `features/shared/ui/` |
| `components/ui/confirm-delete-dialog.ts` | `features/shared/ui/` |
| `components/ui/quick-note-input.ts` | `features/shared/ui/` |
| `components/ui/nutrient-stock-chip.ts` | `features/shared/ui/` |
| `components/ui/growspace-logbook.ts` | `features/shared/ui/` |
| `components/ui/growspace-timeline.ts` | `features/shared/ui/` |
| `components/ui/vpd-heatmap.ts` | `features/environment/components/` |
| `components/plant/plant-stats.ts` | `features/plants/components/` |
| `components/plant/plant-timeline.ts` | `features/plants/components/` |
| `components/views/growspace-view-compact.ts` | `features/shared/layouts/` |
| `components/views/growspace-view-header.ts` | `features/shared/layouts/` |
| `components/views/growspace-view-heatmap.ts` | `features/shared/layouts/` |
| `components/views/growspace-view-standard.ts` | `features/shared/layouts/` |
| `components/growspace-view-switcher.ts` | `features/shared/layouts/` |
| `components/heatmap-3d.ts` | `features/environment/components/` |
| `components/transplant-source-panel.ts` | `features/plants/components/` |
| `components/error-boundary.ts` | `features/shared/ui/` |
| `components/growspace-chip.ts` | `features/shared/ui/` |

## Approach

Move files bottom-up: shared primitives first, feature-specific second, layouts last.

For each file:
1. Move to new location
2. Fix its own relative imports (depth changes)
3. Update all external importers to point to new path
4. Remove empty directories when a group is fully migrated

## Watch Points

- `src/components/ui/index.ts` is a barrel re-exporting everything — delete it and update any importer using the directory path instead of a specific file.
- `plant-timeline-tab.ts` imports `../../../components/plant/plant-timeline` — update when `plant-timeline.ts` moves.
- TypeScript path aliases (if any in `tsconfig.json`) may need updating.
