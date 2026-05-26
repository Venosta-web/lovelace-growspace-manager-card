# Root Level Cleanup - Architecture Reorganization Design

**Date:** 2026-01-26
**Status:** Approved
**Goal:** Transform cluttered root `src/` directory into well-organized, domain-driven structure

## Problem Statement

The current `src/` directory has several organizational issues:
- **Misplaced files:** Components, services, and utilities at root level
- **Massive type file:** `types.ts` with 851 lines mixing all domains
- **Large constants file:** `constants.ts` with 342 lines of mixed concerns
- **Poor discoverability:** Hard to find related code
- **Unclear boundaries:** Shared vs domain-specific not obvious

## Design Principles

1. **Co-location by domain** - Related files live together
2. **Clear boundaries** - Shared/global vs domain-specific is obvious
3. **Minimal root directory** - Only entry points and global config
4. **Backwards compatibility** - Use re-export barrels during migration
5. **No breaking changes** - Existing code continues to work

## Proposed Structure

```
src/
├── index.ts                          # Entry point (stays)
├── growspace-manager-card.ts         # Main card (stays)
├── growspace-manager-card-editor.ts  # Editor (stays)
│
├── lib/                              # NEW: Shared infrastructure
│   ├── context.ts                    # Lit contexts (moved from root)
│   ├── constants.ts                  # Core global constants
│   ├── events/                       # Organized event classes
│   │   ├── index.ts                  # Re-export all events
│   │   ├── plant-events.ts           # Plant-related events
│   │   ├── grid-events.ts            # Grid/drag-drop events
│   │   └── library-events.ts         # Library export events
│   └── types/                        # Core types only
│       ├── index.ts                  # Re-export all
│       ├── config.ts                 # Card configuration
│       ├── hass.ts                   # Home Assistant integration
│       └── dialog.ts                 # Dialog state types
│
├── features/                         # NEW: Feature-specific code
│   ├── environment/                  # Environmental monitoring feature
│   │   ├── components/
│   │   │   └── env-chart.ts          # Moved from src/growspace-env-chart.ts
│   │   ├── types.ts                  # Environment-specific types
│   │   ├── constants.ts              # Environment constants (MetricKey, etc.)
│   │   └── utils/
│   │       ├── chart-utils.ts        # Chart utilities (if needed)
│   │       └── graph-transformer.ts  # Moved from src/graph-data-transformer.ts
│   │
│   └── plants/                       # Plant management feature
│       ├── types.ts                  # Plant-specific types
│       └── constants.ts              # Plant constants (stages, etc.)
│
├── services/                         # Services (reorganized)
│   ├── index.ts                      # Re-export all services
│   ├── data-service.ts               # Moved from root
│   ├── types.ts                      # Service/API types
│   ├── api/                          # API services (existing)
│   ├── sync-service.ts               # Existing
│   ├── timeline-service.ts           # Existing
│   └── undo-redo-manager.ts          # Existing
│
├── store/                            # Existing - stays as-is ✅
│   └── ui/
│       └── dialog-types.ts           # Moved from src/ui-state.ts
│
├── components/                       # Existing - stays as-is ✅
├── dialogs/                          # Existing - stays as-is ✅
├── controllers/                      # Existing - stays as-is ✅
├── adapters/                         # Existing - stays as-is ✅
├── schemas/                          # Existing - stays as-is ✅
├── localize/                         # Existing - stays as-is ✅
├── styles/                           # Existing - stays as-is ✅
└── utils/                            # Existing - stays as-is ✅
```

## File Movement Details

### 1. Create New Infrastructure (`lib/`)

**`src/lib/context.ts`**
- Move from: `src/context.ts`
- Content: Lit context definitions (hassContext, configContext, etc.)
- Impact: Core infrastructure, used everywhere

**`src/lib/constants.ts`**
- New file
- Content: Only truly global constants (DOMAIN, VERSION)
- Most constants move to domain-specific files

**`src/lib/events/`**
- Split from: `src/events.ts` (150 lines)
- Files:
  - `plant-events.ts` - PlantClickEvent, AddPlantClickEvent, UpdatePlantEvent, DeletePlantEvent, HarvestPlantEvent, FinishDryingEvent, TakeCloneEvent, MoveCloneEvent
  - `grid-events.ts` - PlantDropEvent, SelectionChangedEvent
  - `library-events.ts` - LibraryExportReadyEvent
  - `index.ts` - Re-export all events + global event map

**`src/lib/types/`**
- Split from: `src/types.ts` (851 lines)
- Files:
  - `config.ts` - GrowspaceManagerCardConfig, LovelaceCardEditor interface
  - `hass.ts` - HomeAssistant extensions, entity types
  - `dialog.ts` - All *DialogState types
  - `index.ts` - Re-export all types

### 2. Create Feature Directories

**`src/features/environment/`**

Components:
- `components/env-chart.ts` - Move from `src/growspace-env-chart.ts` (1075 lines)

Types (`types.ts`):
- SensorHistories
- GraphDataPoint
- GraphSeries
- TooltipData
- HistorySensorState
- Metric-related types

Constants (`constants.ts`):
- MetricKey enum
- METRIC_CONFIG
- METRIC_SORT_ORDER
- SENSOR_CHART_DEFAULTS
- ChartType enum
- ScrollDirection enum
- StatusLevel enum
- STATUS_COLORS
- BINARY_ON_STATES

Utils:
- `utils/graph-transformer.ts` - Move from `src/graph-data-transformer.ts` (160 lines)

**`src/features/plants/`**

Types (`types.ts`):
- PlantEntity
- PlantStage
- PlantLifecycleEvent
- CropMeta
- GrowthPhase
- Plant-related interfaces

Constants (`constants.ts`):
- PlantStage enum values
- Stage colors/icons
- Growth phase defaults
- Lifecycle constants

### 3. Reorganize Services

**`src/services/data-service.ts`**
- Move from: `src/data-service.ts` (356 lines)
- Update imports to new locations

**`src/services/types.ts`**
- New file
- Content: API/Service types
  - GrowspaceAPIResponse
  - StrainEntry
  - NutrientPreset
  - IPMPreset
  - IrrigationStrategy
  - API response types

**`src/services/index.ts`**
- New file
- Re-export all services for convenience

### 4. Move UI State Types

**`src/store/ui/dialog-types.ts`**
- Move from: `src/ui-state.ts` (34 lines)
- Content: ActiveDialogState discriminated union
- Reason: It's UI store state, belongs with UI store

## Backwards Compatibility Strategy

To ensure no breaking changes, we'll create re-export barrels at old locations:

**`src/types.ts`** (deprecated re-export)
```typescript
// @deprecated Import from specific domain instead
// - Config types: import from './lib/types/config'
// - Plant types: import from './features/plants/types'
// - Environment types: import from './features/environment/types'
// - Service types: import from './services/types'
export * from './lib/types';
export * from './features/plants/types';
export * from './features/environment/types';
export * from './services/types';
export * from './store/ui/dialog-types';
```

**`src/constants.ts`** (deprecated re-export)
```typescript
// @deprecated Import from specific domain instead
export * from './lib/constants';
export * from './features/environment/constants';
export * from './features/plants/constants';
```

**`src/events.ts`** (deprecated re-export)
```typescript
// @deprecated Import from './lib/events'
export * from './lib/events';
```

**`src/context.ts`** (deprecated re-export)
```typescript
// @deprecated Import from './lib/context'
export * from './lib/context';
```

**`src/data-service.ts`** (deprecated re-export)
```typescript
// @deprecated Import from './services/data-service'
export { DataService } from './services/data-service';
```

**`src/graph-data-transformer.ts`** (deprecated re-export)
```typescript
// @deprecated Import from './features/environment/utils/graph-transformer'
export { GraphDataTransformer } from './features/environment/utils/graph-transformer';
```

**`src/growspace-env-chart.ts`** (deprecated re-export)
```typescript
// @deprecated Import from './features/environment/components/env-chart'
export { GrowspaceEnvChart } from './features/environment/components/env-chart';
```

## Implementation Phases

### Phase 1: Create Structure (No Breaking Changes)
**Goal:** Set up new directories and files without touching existing code

1. Create new directories
2. Create split type files in new locations
3. Create split constant files in new locations
4. Keep original files as re-export barrels with deprecation comments
5. Run build and tests to ensure compatibility

**Success Criteria:**
- All new files created
- Build succeeds
- All tests pass
- No imports need updating yet

### Phase 2: Move Components & Services
**Goal:** Relocate misplaced files to proper directories

1. Move `growspace-env-chart.ts` → `features/environment/components/env-chart.ts`
2. Move `data-service.ts` → `services/data-service.ts`
3. Move `graph-data-transformer.ts` → `features/environment/utils/graph-transformer.ts`
4. Update imports in moved files to use new type/constant locations
5. Create deprecated re-exports at old locations
6. Run build and tests

**Success Criteria:**
- Files moved successfully
- Internal imports updated
- Re-exports work correctly
- Build succeeds
- All tests pass

### Phase 3: Organize Events & Context
**Goal:** Split events file and move context

1. Create `lib/events/` directory
2. Split events into domain files
3. Create event index barrel
4. Move `context.ts` to `lib/context.ts`
5. Move `ui-state.ts` to `store/ui/dialog-types.ts`
6. Update imports in moved files
7. Create deprecated re-exports
8. Run build and tests

**Success Criteria:**
- Events organized by domain
- Context in lib directory
- UI state with UI store
- Build succeeds
- All tests pass

### Phase 4: Update Imports (Gradual)
**Goal:** Migrate to new import paths (can be done over time)

1. Update imports in newly moved files
2. Update imports in main card files
3. Update imports in components progressively
4. Update imports in dialogs progressively
5. Update imports in store files progressively
6. Eventually remove deprecated re-exports (optional)

**Success Criteria:**
- Imports use new paths
- No deprecated import warnings
- Build succeeds
- All tests pass

## Testing Strategy

After each phase:
1. **Build:** Run `npm run build` to ensure no compilation errors
2. **Unit Tests:** Run `npm run test:unit` to verify behavior unchanged
3. **E2E Tests:** Run `npm run test:e2e` to verify UI works correctly
4. **Linting:** Run `npm run lint` to catch any issues
5. **Type Check:** Verify TypeScript compilation

## Rollback Plan

If issues arise:
1. **Phase 1:** Simply delete new directories, nothing broken
2. **Phase 2:** Revert file moves, re-export barrels ensure compatibility
3. **Phase 3:** Revert event splits, re-exports provide fallback
4. **Phase 4:** Old imports still work due to re-export barrels

## Benefits

**For Developers:**
- Easier navigation: "Where do plant types live?" → `features/plants/types.ts`
- Clear boundaries: Shared vs domain-specific obvious
- Better co-location: Related code together
- Reduced cognitive load: Smaller, focused files

**For Maintenance:**
- Easier refactoring: Plant changes stay in plant folder
- Better tree-shaking: Bundler eliminates unused domains
- Clearer dependencies: Feature folders show dependencies
- Easier testing: Test features in isolation

**For Onboarding:**
- Self-documenting: Structure shows what app does
- Predictable: Follow conventions to find things
- Less overwhelming: Browse one feature at a time

## Future Enhancements

After this reorganization, we can consider:
1. **Feature slicing:** Move more code into feature folders (components, dialogs)
2. **Component organization:** Better organize the 38+ component files
3. **Dialog decomposition:** Break down large dialog files
4. **Type safety improvements:** Remove `any` types (184 instances)

## Migration Timeline

- **Phase 1:** 1-2 hours (create structure)
- **Phase 2:** 2-3 hours (move files, update imports)
- **Phase 3:** 1-2 hours (organize events)
- **Phase 4:** Ongoing (update imports gradually)

**Total Estimated Time:** 4-7 hours for core reorganization

## Conclusion

This reorganization provides:
- ✅ Clean, predictable structure
- ✅ Better separation of concerns
- ✅ Backwards compatibility
- ✅ Foundation for future improvements
- ✅ No breaking changes

The phased approach allows us to validate each step and provides clear rollback points if needed.
