# Growspace Manager E2E Tests

Comprehensive Playwright E2E tests for the Growspace Manager Lovelace card.

## Overview

This test suite provides **full integration testing** with a real Home Assistant instance, including:
- Complete onboarding flow automation
- Code coverage tracking
- Persistence verification (reload tests)
- Shadow DOM event handling
- 14 test files covering all major features

**Total Coverage**: 1,690 lines across 14 spec files

---

## Quick Start

### Prerequisites

- Docker (for HA test instance)
- Node.js 20+
- Playwright installed

### Setup

```bash
# Install dependencies (from card root)
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Run Tests

```bash
# From card root directory
npm run test:e2e              # Run all E2E tests
npm run test:e2e:coverage     # Run with coverage report
```

The tests will:
1. Build the card (`npm run build`)
2. Start HA test instance (if configured)
3. Run authentication setup
4. Execute all test specs
5. Generate HTML report

---

## Test Structure

```
tests/e2e/
├── auth.setup.ts                    # Authentication & onboarding
├── sanity.spec.ts                   # Basic smoke tests (76 lines)
├── plant-management.spec.ts         # Add/edit/delete plants (270 lines)
├── plant-timeline.spec.ts           # Timeline events (219 lines)
├── integration-install.spec.ts      # Installation flow (245 lines)
├── lifecycle-progression.spec.ts    # Stage transitions (124 lines)
├── environment-graphs.spec.ts       # Environmental graphs (186 lines)
├── growspace-strains.spec.ts        # Strain library (178 lines)
├── growspace-config.spec.ts         # Configuration (77 lines)
├── nutrient-management.spec.ts      # Nutrients & watering (61 lines)
├── maintenance-logbook.spec.ts      # Logbook entries (41 lines)
├── ai-interactions.spec.ts          # GrowMaster AI (49 lines)
├── accessibility-navigation.spec.ts # Keyboard navigation (36 lines)
├── responsive.spec.ts               # Responsive layout (48 lines)
├── screenshots.spec.ts              # Visual regression (80 lines)
├── fixtures/                        # Test fixtures
│   └── configuration.yaml           # HA test config
├── ha-config/                       # HA configuration files
└── docker-compose.test.yml          # Docker setup (optional)
```

---

## Authentication Setup

Tests use a **setup project** that runs once before all tests:

### What `auth.setup.ts` Does:

1. **Navigates to HA** (`http://127.0.0.1:8123`)
2. **Detects state**: Login screen or onboarding wizard
3. **Handles onboarding** (if fresh HA instance):
   - Creates admin user:
     - Name: "E2E User"
     - Username: `admin`
     - Password: `password`
   - Completes wizard steps (location, analytics, etc.)
4. **Logs in** (if onboarding skipped)
5. **Saves auth state** to `.auth/user.json`

All subsequent tests reuse this authentication state.

---

## Test Patterns

### Basic Test Structure

```typescript
import { test, expect } from '../coverage-helper';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ coveragePage: page }) => {
    await page.goto('http://127.0.0.1:8123', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('growspace-manager-card').first())
      .toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000); // Hydration wait
  });

  test('Specific behavior', async ({ coveragePage: page }) => {
    const card = page.locator('growspace-manager-card').first();

    // Test logic here
  });
});
```

### Shadow DOM Click Events

Components use Shadow DOM, so clicks must use `dispatchEvent`:

```typescript
// ❌ Regular click won't work through Shadow DOM
await element.click();

// ✅ Use dispatchEvent with bubbles and composed
await element.dispatchEvent('click', {
  bubbles: true,
  composed: true
});
```

### Persistence Verification

Many tests reload the page to verify data persistence:

```typescript
// Make a change
await dialog.getByRole('button', { name: 'Add Plant' })
  .dispatchEvent('click', { bubbles: true, composed: true });

// Wait for backend to persist
await page.waitForTimeout(2000);

// Reload and verify
await page.reload({ waitUntil: 'domcontentloaded' });
const cardReloaded = page.locator('growspace-manager-card').first();
await expect(cardReloaded.locator('growspace-plant-card')
  .filter({ hasText: '#AddMe' })).toBeVisible();
```

### Cleanup Before Tests

Tests clean up their data to ensure idempotency:

```typescript
test.beforeEach(async ({ coveragePage: page }) => {
  const card = page.locator('growspace-manager-card').first();

  // Remove test plant if it exists
  const targetPlant = card.locator('growspace-plant-card').filter({
    has: page.locator('.row-col-badge').filter({ hasText: /R6\s*C6/i })
  }).first();

  if (await targetPlant.count() > 0) {
    // Click plant to open dialog
    await targetPlant.locator('.plant-card-rich').first()
      .dispatchEvent('click', { bubbles: true, composed: true });

    // Click delete button
    await card.locator('growspace-dialog-host ha-dialog')
      .getByRole('button', { name: /delete/i }).first()
      .dispatchEvent('click', { bubbles: true, composed: true });

    // Confirm deletion
    await page.locator('.dialog-overlay')
      .getByRole('button', { name: 'Delete' })
      .dispatchEvent('click', { bubbles: true, composed: true });

    // Wait for dialog to close
    await expect(card.locator('growspace-dialog-host ha-dialog'))
      .toHaveCount(0, { timeout: 10000 });
  }
});
```

---

## Selectors Reference

### Verified Working Selectors

```typescript
// Card
'growspace-manager-card'                     // Main card element

// Plant Cards
'growspace-plant-card'                       // Plant card element
'.plant-card-rich'                           // Clickable surface
'.plant-card-empty'                          // Empty slot
'.row-col-badge'                             // Position badge (e.g., "R6 C6")

// Dialogs
'growspace-dialog-host ha-dialog'            // Dialog container
'.dialog-overlay'                            // Backdrop/overlay

// Form Inputs (MD3 Components)
'md3-select[label="Strain *"] select'        // Strain dropdown
'md3-text-input[label="Phenotype"] input'    // Phenotype input
'md3-number-input[label="Row"] input'        // Row number
'md3-number-input[label="Col"] input'        // Column number

// Notifications
'growspace-toast'                             // Toast messages

// Filtering Examples
.filter({ has: page.locator('.row-col-badge')
  .filter({ hasText: /R6\s*C6/i }) })        // Find plant at position
.filter({ hasText: '#MyPheno' })             // Find by phenotype
```

---

## Test Coverage

### Coverage Tracking

Tests use a custom `coverage-helper` that wraps Playwright's `test` and `page`:

```typescript
import { test, expect } from '../coverage-helper';

test('my test', async ({ coveragePage: page }) => {
  // Use coveragePage instead of page
  // Coverage is automatically tracked
});
```

### Generate Coverage Report

```bash
npm run test:e2e:coverage
```

Report generated in `playwright-report/` directory.

---

## Common Test Scenarios

### 1. Adding a Plant

```typescript
test('Add plant', async ({ coveragePage: page }) => {
  const card = page.locator('growspace-manager-card').first();

  // Click empty cell
  const addCard = card.locator('.plant-card-empty').first();
  await addCard.dispatchEvent('click', { bubbles: true, composed: true });

  // Fill dialog
  const dialog = card.locator('growspace-dialog-host ha-dialog').first();
  await dialog.locator('md3-select[label="Strain *"] select')
    .selectOption({ label: 'Blue Gem' });
  await dialog.locator('md3-text-input[label="Phenotype"] input')
    .fill('#Test');
  await dialog.locator('md3-number-input')
    .filter({ hasText: /row/i }).getByRole('spinbutton').fill('1');
  await dialog.locator('md3-number-input')
    .filter({ hasText: /col/i }).getByRole('spinbutton').fill('1');

  // Submit
  await dialog.getByRole('button', { name: 'Add Plant' })
    .dispatchEvent('click', { bubbles: true, composed: true });

  // Verify dialog closed
  await expect(card.locator('growspace-dialog-host ha-dialog'))
    .toHaveCount(0, { timeout: 10000 });

  // Verify plant appears
  await expect(card.locator('growspace-plant-card')
    .filter({ hasText: '#Test' })).toBeVisible();
});
```

### 2. Editing a Plant

```typescript
test('Edit plant', async ({ coveragePage: page }) => {
  const card = page.locator('growspace-manager-card').first();

  // Find and click plant
  const plant = card.locator('growspace-plant-card')
    .filter({ hasText: '#Test' }).first();
  await plant.locator('.plant-card-rich')
    .dispatchEvent('click', { bubbles: true, composed: true });

  // Modify in dialog
  const dialog = card.locator('growspace-dialog-host ha-dialog').first();
  await dialog.locator('md3-text-input[label="Phenotype"] input')
    .fill('#Updated');

  // Save
  await dialog.getByRole('button', { name: 'Save' })
    .dispatchEvent('click', { bubbles: true, composed: true });

  // Verify update
  await expect(card.locator('growspace-plant-card')
    .filter({ hasText: '#Updated' })).toBeVisible();
});
```

### 3. Deleting a Plant

```typescript
test('Delete plant', async ({ coveragePage: page }) => {
  const card = page.locator('growspace-manager-card').first();

  // Click plant
  const plant = card.locator('growspace-plant-card').first();
  await plant.locator('.plant-card-rich')
    .dispatchEvent('click', { bubbles: true, composed: true });

  // Click delete in dialog
  await card.locator('growspace-dialog-host ha-dialog')
    .getByRole('button', { name: /delete/i })
    .dispatchEvent('click', { bubbles: true, composed: true });

  // Confirm deletion
  await page.locator('.dialog-overlay')
    .getByRole('button', { name: 'Delete' })
    .dispatchEvent('click', { bubbles: true, composed: true });

  // Verify plant removed
  await expect(plant).not.toBeVisible();
});
```

---

## Debugging Tests

### Run Single Test

```bash
npx playwright test --config=playwright.e2e.config.ts plant-management
```

### Run Specific Test by Name

```bash
npx playwright test --config=playwright.e2e.config.ts -g "Add New Plant"
```

### Headed Mode (Watch Browser)

```bash
npx playwright test --config=playwright.e2e.config.ts --headed
```

### Debug Mode (Step Through)

```bash
npx playwright test --config=playwright.e2e.config.ts --debug
```

### Screenshots and Traces

On test failure, Playwright automatically captures:
- Screenshots in `test-results/`
- Video recordings (on retry)
- Traces (on first retry)

View trace file:
```bash
npx playwright show-trace test-results/.../trace.zip
```

---

## Configuration

### Playwright Config

File: `playwright.e2e.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,      // Serial for single HA instance
  workers: 1,                // Limit workers for stability
  timeout: 15000,            // Test timeout
  expect: { timeout: 10000 }, // Assertion timeout
  use: {
    baseURL: 'http://127.0.0.1:8123',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { storageState: '.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
```

### Home Assistant Test Instance

Option 1: Docker Compose (commented out by default):
```yaml
# tests/e2e/docker-compose.test.yml
services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    ports:
      - "8123:8123"
```

Option 2: Manual HA instance at `http://127.0.0.1:8123`

---

## Troubleshooting

### "home-assistant-main not found"
- HA instance not running at `http://127.0.0.1:8123`
- Start HA or configure Docker Compose

### "dispatchEvent doesn't work"
- Missing `bubbles: true, composed: true` options
- These are required for Shadow DOM events

### "Element not found"
- Component may not be fully loaded
- Add `await page.waitForTimeout(3000)` after navigation
- Increase timeout: `.toBeVisible({ timeout: 15000 })`

### "Auth state invalid"
- Delete `.auth/user.json`
- Re-run tests to regenerate auth

### "Tests interfere with each other"
- Ensure cleanup in `beforeEach`
- Tests run serially (`workers: 1`) to avoid conflicts

---

## Contributing

### Adding New Tests

1. **Choose appropriate test file** or create new one
2. **Import coverage helper**: `import { test, expect } from '../coverage-helper';`
3. **Use `coveragePage`**: `async ({ coveragePage: page })`
4. **Add cleanup**: Clear test data in `beforeEach`
5. **Use Shadow DOM events**: `dispatchEvent` with `bubbles` and `composed`
6. **Test persistence**: Reload page and verify
7. **Run locally**: `npm run test:e2e -- your-file.spec.ts`

### Test Naming Convention

```typescript
test('Category.Number Feature - Specific Behavior', async ({ coveragePage: page }) => {
  // 1.1 Plant Management - Add New Plant
  // 2.3 Environment - Temperature Graph Display
});
```

---

## See Also

- **E2E Testing Guide**: `../E2E_TESTING_GUIDE.md` - Comprehensive overview of both test suites
- **New Test Suite**: `../e2e-new/README.md` - Simplified smoke tests
- **Playwright Docs**: https://playwright.dev/
