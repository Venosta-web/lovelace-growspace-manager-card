# Plant Overview Dialog Analysis

**File:** `src/dialogs/plant-overview-dialog.ts`
**Size:** 1,317 lines
**Date:** 2026-01-27

## Current Architecture

### Component Structure

```
PlantOverviewDialog (1,317 lines)
├── State Management (@state decorators)
│   ├── isEditing
│   ├── showAllDates
│   ├── cloneTargetId
│   ├── _showDeleteConfirmation
│   ├── _activeTab
│   └── _logbookEvents
├── Event Subscriptions
│   ├── _subscribeToEvents (growspace_manager_log_entry)
│   ├── _handleGrowspaceEvent
│   └── _fetchLogbook
├── Business Logic
│   ├── _getAttributesFromPlant
│   ├── willUpdate (state sync logic)
│   └── attribute validation (implicit)
├── Action Handlers (11 methods)
│   ├── _close, _update, _delete, _confirmDelete, _cancelDelete
│   ├── _harvest, _finishDrying, _takeClone, _moveClone
│   └── _openWatering, _openTraining, _openIPM, _openClone, _openStrainEditor
├── UI State Handlers
│   ├── _attributeChange
│   └── _toggleShowAllDates
└── Render Methods (6 methods)
    ├── render (main template)
    ├── _renderDashboard (186 lines)
    ├── _renderActions (25 lines)
    ├── _renderTimeline (162 lines)
    ├── _renderPlantStats (68 lines)
    └── _renderDeleteOverlay (30 lines)
```

## Anti-Patterns Identified

### 1. God Object (Severity: 🔴 Critical)
- **Size**: 1,317 lines in single file
- **Responsibilities**: 7+ distinct responsibilities
  1. Dialog lifecycle management
  2. Event subscription/handling
  3. State management (local + derived)
  4. Business logic (timeline processing, stat calculations)
  5. Action dispatching
  6. UI rendering (multiple complex templates)
  7. Validation

**Impact**:
- Hard to test individual concerns
- Difficult to understand and modify
- High coupling between unrelated features

### 2. Mixed Concerns (Severity: 🔴 Critical)
- **UI + Business Logic**: Render methods contain business logic
- **State + Rendering**: State mutations directly in render flow
- **Subscriptions + Rendering**: Event handling mixed with UI

**Examples**:
```typescript
// Business logic in render method
private _renderTimeline(): TemplateResult {
  // 162 lines of timeline event processing logic
  const milestones = [];
  milestoneFields.forEach((field) => {
    const date = this.plant?.attributes[field.key];
    if (date) {
      milestones.push({ /* ... */ });
    }
  });
  // ... more logic + rendering
}

// State management in lifecycle
willUpdate(changedProps: PropertyValues) {
  // Complex state synchronization logic
  if (changedProps.has('dialog') && this.dialog) {
    this.plant = this.dialog.plant;
    this.editedAttributes = this.dialog.editedAttributes || this._getAttributesFromPlant();
    // ... more mutations
  }
}
```

### 3. Long Methods (Severity: 🟡 Medium)
- `_renderDashboard`: 186 lines
- `_renderTimeline`: 162 lines
- `render`: 224 lines

**Impact**: Cognitive overload, hard to understand control flow

### 4. Duplicate Rendering Patterns (Severity: 🟢 Low)
- Repeated form input patterns across tabs
- Similar card layouts in dashboard
- Stat item rendering logic duplicated

### 5. Tight Coupling to Store (Severity: 🟡 Medium)
- Direct event dispatching through custom events
- Implicit dependency on parent to handle events
- No clear contract between dialog and parent

## Refactoring Opportunities

### 1. Extract ViewModel ✅
**Goal**: Consolidate all business logic and state computations

**PlantOverviewViewModel** should contain:
```typescript
interface PlantOverviewViewModel {
  // Core data
  plant: PlantEntity;
  editedAttributes: PlantOverviewEditedAttributes;

  // UI state
  activeTab: 'dashboard' | 'actions' | 'timeline';
  isEditing: boolean;
  showAllDates: boolean;
  showDeleteConfirmation: boolean;

  // Computed state
  plantId: string;
  stageColor: string;
  stageIcon: string;
  displayName: string;

  // Timeline data (processed)
  timelineEvents: TimelineEvent[];
  milestones: MilestoneEvent[];

  // Plant stats (computed)
  plantStats: PlantStat[];

  // Available actions (computed based on stage)
  availableActions: ActionConfig[];

  // Validation
  hasUnsavedChanges: boolean;
  canSave: boolean;
  validationErrors: Record<string, string>;
}
```

**Dependencies**:
- Store atoms: `$plants`, `$strainLibrary`, `$logbookEvents`
- Single computed atom consolidates all state

### 2. Break Into Smaller Components ✅
**Goal**: Decompose 1,317-line monolith into focused components

**Component Structure**:
```
plant-overview-container (smart component)
├── plant-overview-header (presentational)
│   ├── Input: plant, displayName, stageColor, stageIcon
│   └── Output: @close, @open-strain-editor
├── plant-overview-tabs (presentational)
│   ├── Input: activeTab
│   └── Output: @tab-change
├── plant-overview-dashboard (presentational)
│   ├── Input: plant, editedAttributes, isEditing, showAllDates
│   ├── Components: identity-card, plant-stats-card, lifecycle-dates-card
│   └── Output: @attribute-change, @toggle-dates
├── plant-overview-actions (presentational)
│   ├── Input: availableActions
│   └── Output: @action-click
├── plant-overview-timeline (presentational)
│   ├── Input: timelineEvents, milestones
│   └── Output: (none, read-only)
└── plant-overview-footer (presentational)
    ├── Input: hasUnsavedChanges, canSave, showDeleteConfirmation
    └── Output: @save, @delete, @cancel
```

**Benefits**:
- Each component < 200 lines
- Clear single responsibility
- Easier to test in isolation
- Reusable across other contexts

### 3. Reusable Card Components ✅
Extract repeated patterns:

**PlantStatsCard** (already partially extracted):
```typescript
@customElement('plant-stats-card')
export class PlantStatsCard extends LitElement {
  @property({ attribute: false }) stats!: PlantStat[];

  render() {
    return html`
      <div class="stat-grid">
        ${this.stats.map(stat => this._renderStatItem(stat))}
      </div>
    `;
  }
}
```

**IdentityCard**:
```typescript
@customElement('plant-identity-card')
export class PlantIdentityCard extends LitElement {
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ attribute: false }) editedAttributes!: PlantOverviewEditedAttributes;
  @property({ type: Boolean }) isEditing = false;

  render() {
    // Focused rendering logic
  }
}
```

**LifecycleDatesCard**:
```typescript
@customElement('plant-lifecycle-dates-card')
export class PlantLifecycleDatesCard extends LitElement {
  @property({ attribute: false }) attributes!: PlantOverviewEditedAttributes;
  @property({ type: Boolean }) showAllDates = false;

  render() {
    // Lifecycle date inputs/display
  }
}
```

### 4. Use Base Dialog Layout ✅
Leverage Phase 1 infrastructure:

```typescript
// Use base-dialog.layout for shell
<base-dialog-layout
  .title=${displayName}
  .subtitle=${`${plant.state} Stage • ${phenotype}`}
  .icon=${stageIcon}
  .tabs=${['Dashboard', 'Actions', 'Timeline']}
  .activeTab=${activeTab}
  @tab-change=${this._handleTabChange}
  @close=${this._handleClose}
>
  <div slot="content">
    ${activeTab === 'dashboard' ? html`<plant-overview-dashboard ...>` : nothing}
    ${activeTab === 'actions' ? html`<plant-overview-actions ...>` : nothing}
    ${activeTab === 'timeline' ? html`<plant-overview-timeline ...>` : nothing}
  </div>

  <div slot="actions">
    <plant-overview-footer ...></plant-overview-footer>
  </div>
</base-dialog-layout>
```

**Benefits**:
- Consistent dialog UX
- Reduced code duplication
- Tab management handled by base layout

### 5. Feature Flag Integration ✅
Enable safe A/B testing:

```typescript
// In dialog opening logic
if (FEATURE_FLAGS.USE_NEW_DIALOGS) {
  return html`<plant-overview-container ...>`;
} else {
  return html`<plant-overview-dialog ...>`;
}
```

## Implementation Strategy

### Phase 3.1: Create ViewModel
1. Extract business logic from dialog
2. Create computed atoms for derived state
3. Write comprehensive tests (target: >85% coverage)

### Phase 3.2: Create Tab Components
1. **DashboardTab**: Identity, stats, lifecycle dates
2. **ActionsTab**: Quick action cards
3. **TimelineTab**: Timeline with milestones and events

### Phase 3.3: Create Container
1. Build container connecting ViewModel to tabs
2. Use base-dialog.layout for shell
3. Handle action dispatching

### Phase 3.4: Integration & Testing
1. Add feature flag to dialog manager
2. Test both implementations side-by-side
3. Verify no regressions

## Expected Benefits

### Metrics
- **Lines per file**: 1,317 → ~150-200 per component (8-10 files)
- **Testability**: Monolithic → Unit testable ViewModels + components
- **Maintainability**: 1 file to understand → Clear separation of concerns
- **Reusability**: Dialog-specific → Reusable cards and tabs

### Code Quality
- Clear separation: UI → Container → Business Logic
- Single responsibility per component
- Easier to add new tabs or modify existing ones
- Reduced coupling to store

### Developer Experience
- Faster to locate and modify specific features
- Easier onboarding (smaller components to understand)
- Tests run faster (isolated unit tests)
- Less fear of breaking unrelated functionality

## Next Steps

1. ✅ Complete this analysis (Task #1)
2. Create PlantOverviewViewModel (Task #2)
3. Break into smaller UI components (Task #3)
4. Create container (Task #4)
5. Add feature flag (Task #5)
6. Write tests (Task #6)
7. Verify and commit (Task #7)
