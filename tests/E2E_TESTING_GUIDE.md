# E2E Testing Guide - Growspace Manager Card

## Overview

The Growspace Manager card has **two E2E test suites**:

1. **`tests/e2e/`** - Comprehensive integration tests (existing)
2. **`tests/e2e-new/`** - Simplified UI smoke tests (new)

---

## Test Suite Comparison

### Existing Tests (`tests/e2e/`)

**Purpose**: Full integration testing with real HA instance

**Setup**:
- Handles complete HA onboarding flow
- Creates admin user (username: `admin`, password: `password`)
- Saves authentication state to `.auth/user.json`
- Uses code coverage tracking via `coveragePage`

**Coverage** (1,690 lines across 14 test files):
- ✅ Plant Management (270 lines)
- ✅ Integration Install (245 lines)
- ✅ Plant Timeline (219 lines)
- ✅ Environment Graphs (186 lines)
- ✅ Growspace Strains (178 lines)
- ✅ Lifecycle Progression (124 lines)
- ✅ Screenshots (80 lines)
- ✅ Growspace Config (77 lines)
- ✅ Sanity (76 lines)
- ✅ Nutrient Management (61 lines)
- ✅ AI Interactions (49 lines)
- ✅ Responsive Design (48 lines)
- ✅ Maintenance Logbook (41 lines)
- ✅ Accessibility Navigation (36 lines)

**Key Features**:
```typescript
// Proper Shadow DOM event handling
await element.dispatchEvent('click', { bubbles: true, composed: true });

// Actual working selectors
card.locator('growspace-plant-card')           // Plant cards
card.locator('.plant-card-empty')              // Empty cells
card.locator('growspace-dialog-host ha-dialog') // Dialogs
card.locator('.row-col-badge')                 // Position badges

// Persistence verification
await page.reload({ waitUntil: 'domcontentloaded' });
await expect(cardReloaded.locator('growspace-plant-card')
  .filter({ hasText: '#AddMe' })).toBeVisible();
```

**Running**:
```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:coverage     # Run with coverage report
```

---

### New Tests (`tests/e2e-new/`)

**Purpose**: Quick UI smoke tests with long-lived tokens

**Setup**:
- Uses long-lived access token (no onboarding)
- Works with existing HA installation
- Simplified fixtures for rapid testing
- No code coverage tracking

**Coverage** (Basic smoke tests):
- ✅ Card loads and displays
- ✅ Menu opens
- ✅ Add plant dialog appears
- ✅ Plant cards display

**Key Features**:
```typescript
// Token-based authentication
const context = await browser.newContext({
  extraHTTPHeaders: {
    'Authorization': `Bearer ${process.env.HA_ACCESS_TOKEN}`
  }
});

// Simplified Page Objects
growspaceCard.openMenu()
growspaceCard.clickMenuItem(/add.*plant/i)
```

**Running**:
```bash
cd tests/e2e-new
npm test                    # Run all smoke tests
npm run test:headed         # Watch tests run
npm run test:ui            # Interactive UI mode
```

---

## When to Use Which Suite

### Use Existing Tests (`tests/e2e/`) When:
- ✅ Testing full integration workflows
- ✅ Verifying data persistence across reloads
- ✅ Testing complex multi-step processes
- ✅ Need code coverage metrics
- ✅ Testing onboarding/installation
- ✅ CI/CD pipeline execution

### Use New Tests (`tests/e2e-new/`) When:
- ✅ Quick sanity checks during development
- ✅ Testing on existing HA instance
- ✅ Rapid iteration without onboarding overhead
- ✅ Local development workflow
- ✅ Simple UI interaction validation

---

## Test Scenarios Coverage Matrix

| Feature | Existing E2E | New E2E |
|---------|--------------|---------|
| **Plant Management** |
| Add plant | ✅ Comprehensive | ❌ |
| Edit plant | ✅ Full validation | ❌ |
| Delete plant | ✅ With confirmation | ❌ |
| Move plant | ❌ Missing | ❌ |
| Duplicate position check | ✅ | ❌ |
| Invalid date inputs | ✅ | ❌ |
| **Environment** |
| Graphs display | ✅ All types | ❌ |
| Time range selector | ✅ | ❌ |
| Link graphs | ✅ | ❌ |
| Humidity history | ✅ | ❌ |
| **Strains** |
| Create strain | ✅ | ❌ |
| Delete strain | ✅ | ❌ |
| Empty state | ✅ | ❌ |
| **Timeline** |
| Events display | ✅ | ❌ |
| Milestone events | ✅ | ❌ |
| Day grouping | ✅ | ❌ |
| Filter by plant | ✅ | ❌ |
| Training events | ✅ | ❌ |
| **Lifecycle** |
| Stage transitions | ✅ Veg→Flower | ❌ |
| Stats updates | ✅ | ❌ |
| **Nutrients** |
| Create preset | ✅ | ❌ |
| Manual watering log | ✅ | ❌ |
| **UI/UX** |
| Menu opens | ✅ | ✅ |
| Dialogs appear | ✅ | ✅ |
| Responsive layout | ✅ | ❌ |
| Keyboard navigation | ✅ | ❌ |
| Screenshots | ✅ | ❌ |
| **Integration** |
| Installation | ✅ | ❌ |
| Configuration | ✅ | ❌ |
| **AI** |
| GrowMaster interaction | ✅ | ❌ |

---

## Enhancement Opportunities

### Gaps to Fill in Existing Tests:

**Priority 1: Missing Core Features**
- ❌ **Move plant** (drag & drop or position change)
- ❌ **Switch plants** (swap positions)
- ❌ **Clone operations** (take clone, move clone)
- ❌ **Harvest workflow** (harvest → dry → cure)
- ❌ **Irrigation management** (schedules, times)
- ❌ **IPM applications** (pest/disease management)

**Priority 2: Configuration & Settings**
- ❌ **Grid dimension changes**
- ❌ **Display options** (compact mode, list view)
- ❌ **Environment sensor configuration**
- ❌ **Threshold settings** (stress, mold)

**Priority 3: Data Flow & Sync**
- ❌ **Real-time updates** (coordinator refresh)
- ❌ **WebSocket state sync**
- ❌ **Multi-tab synchronization**

**Priority 4: Edge Cases**
- ❌ **Max grid capacity** handling
- ❌ **Concurrent operations**
- ❌ **Network failure recovery**
- ❌ **Large datasets** (100+ plants)

### Enhancements for New Tests:

**Add Missing UI Tests**:
- ✅ Card loads → Expand to verify all sections
- ✅ Menu opens → Test all menu items
- ✅ Dialog appears → Test all dialog types
- ❌ Form validation → Add input validation tests
- ❌ Error states → Test error messages
- ❌ Loading states → Test spinners/skeletons

---

## Selector Reference

### Existing Tests (Verified Working):

```typescript
// Plant Cards
'growspace-plant-card'                    // Plant card element
'.plant-card-rich'                        // Clickable card surface
'.plant-card-empty'                       // Empty slot
'.row-col-badge'                          // Position badge (R6 C6)

// Dialogs
'growspace-dialog-host ha-dialog'        // Dialog container
'.dialog-overlay'                         // Overlay/backdrop

// Forms
'md3-select[label="Strain *"] select'    // Strain dropdown
'md3-text-input[label="Phenotype"] input' // Phenotype input
'md3-number-input[label="Row"] input'    // Row number
'md3-number-input[label="Col"] input'    // Col number

// Notifications
'growspace-toast'                         // Toast notifications

// Events
.dispatchEvent('click', { bubbles: true, composed: true })  // Shadow DOM clicks
```

### New Tests (Need Verification):

```typescript
// Card
'growspace-manager-card'                  // Main card
'button#menu-trigger'                     // Menu button
'#header-menu'                            // Menu dropdown
'.menu-item'                              // Menu items

// Dialogs (These may be wrong - use existing test selectors)
'add-plant-dialog'                        // ❌ May not work
'config-dialog'                           // ❌ May not work

// Use these instead:
'growspace-dialog-host ha-dialog'        // ✅ Verified working
```

---

## Documentation Improvements Needed

### Existing Tests:
- ❌ **README missing** - No setup/running instructions
- ❌ **Test strategy undocumented** - Why certain approaches chosen
- ❌ **Selector guide missing** - No reference for Shadow DOM selectors
- ❌ **Coverage reports** - Where to find, how to interpret

### New Tests:
- ✅ **README exists** - Basic setup instructions
- ❌ **Integration guide** - How it relates to existing tests
- ❌ **Selector correction** - Update to use verified selectors

---

## Recommended Next Steps

### Phase 1: Documentation (Immediate)
1. ✅ Create this guide (E2E_TESTING_GUIDE.md)
2. ⬜ Add README to `tests/e2e/` with setup instructions
3. ⬜ Document selector patterns and Shadow DOM handling
4. ⬜ Create test writing guide for contributors

### Phase 2: Fix New Tests (Short-term)
1. ⬜ Update `e2e-new` selectors to match verified patterns
2. ⬜ Add form validation tests
3. ⬜ Add error state tests
4. ⬜ Test all dialog types

### Phase 3: Fill Gaps in Existing Tests (Medium-term)
1. ⬜ Add move plant tests
2. ⬜ Add clone workflow tests
3. ⬜ Add harvest workflow tests
4. ⬜ Add irrigation tests
5. ⬜ Add IPM tests
6. ⬜ Add configuration tests

### Phase 4: Advanced Testing (Long-term)
1. ⬜ Real-time sync tests
2. ⬜ Performance tests (large datasets)
3. ⬜ Network failure scenarios
4. ⬜ Multi-user concurrent operations
5. ⬜ Visual regression testing

---

## How to Contribute Tests

### For Existing Test Suite:

1. **Follow established patterns**:
```typescript
test('Feature - Specific Behavior', async ({ coveragePage: page }) => {
  const card = page.locator('growspace-manager-card').first();

  // Cleanup if needed
  // ... cleanup code ...

  // Main test
  await card.locator('.element').dispatchEvent('click', {
    bubbles: true,
    composed: true
  });

  // Verification
  await expect(card.locator('.result')).toBeVisible();

  // Persistence check (if applicable)
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(cardReloaded.locator('.result')).toBeVisible();
});
```

2. **Use coverage helper**:
   - Import from `'../coverage-helper'`
   - Use `coveragePage` instead of `page`

3. **Handle cleanup**:
   - Clear test data before each test
   - Use try-finally if needed

4. **Test persistence**:
   - Reload page after state changes
   - Verify data survives reload

### For New Test Suite:

1. **Use Page Objects**:
```typescript
import { GrowspaceCard } from '../pages/GrowspaceCard';

test('feature test', async ({ page, testContext }) => {
  const card = new GrowspaceCard(page);
  await card.navigate(testContext.dashboardPath);
  await card.openMenu();
  // ... test logic ...
});
```

2. **Focus on UI interactions**:
   - Test what users see
   - Don't verify backend state
   - Quick smoke tests only

---

## Running Both Test Suites

### Setup `.env.test` for New Tests:

```bash
cd tests/e2e-new
cp .env.test.example .env.test
# Edit .env.test with your HA access token and growspace ID
```

### Run All Tests:

```bash
# From card root directory
npm run test:e2e          # Existing comprehensive tests
cd tests/e2e-new && npm test  # New smoke tests
```

### CI/CD Integration:

```yaml
# .github/workflows/e2e-tests.yml
jobs:
  e2e-tests:
    steps:
      - name: Run comprehensive E2E tests
        run: npm run test:e2e

      # Optional: Run smoke tests separately
      - name: Run smoke tests
        working-directory: tests/e2e-new
        run: npm test
```

---

## Summary

- **Existing tests** = Comprehensive, battle-tested, full integration
- **New tests** = Quick, simple, development-focused
- **Use both** for different purposes
- **Enhance both** with missing scenarios and documentation

**Immediate Action**: Update new test selectors to use verified patterns from existing tests.
