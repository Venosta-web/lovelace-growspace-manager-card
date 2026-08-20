# Growspace Manager E2E Tests (Simplified)

**Quick UI smoke tests** for rapid development iteration.

> **⚠️ Important**: This is a **simplified test suite** for quick local testing. For comprehensive integration tests, see `../e2e/README.md`.
>
> **Key Differences**:
> - Uses long-lived access tokens (not onboarding flow)
> - UI-only testing (no backend verification)
> - Simplified Page Objects (selectors may need updates)
> - No code coverage tracking
>
> See `../E2E_TESTING_GUIDE.md` for comparison of both test suites.

## Setup

### 1. Install Dependencies

```bash
cd tests/e2e
npm install
npx playwright install chromium
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.test.example .env.test
```

Edit `.env.test` and set:

```bash
# Home Assistant URL
HA_BASE_URL=http://localhost:8123

# Long-lived access token
# Generate in HA: Profile → Security → Long-Lived Access Tokens
HA_ACCESS_TOKEN=your_token_here

# Dashboard path with Growspace Manager card
TEST_DASHBOARD_PATH=/dashboard-tesat/0

# Existing growspace ID to use for tests
TEST_GROWSPACE_ID=your_growspace_id_here
```

### 3. Verify Home Assistant is Running

Ensure HA is accessible at `http://localhost:8123` and you have:
- A dashboard at the configured path
- The Growspace Manager card on that dashboard
- At least one growspace configured

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npm test smoke.spec.ts
```

### Debug Mode (Headed Browser)
```bash
npm run test:headed
```

### Interactive UI Mode
```bash
npm run test:ui
```

### Debug Mode with Playwright Inspector
```bash
npm run test:debug
```

## Test Structure

```
tests/e2e/
├── fixtures/          # Test fixtures and helpers
│   ├── authentication.ts  # Token-based auth
│   ├── ha-setup.ts       # HA service helpers
│   └── types.ts          # TypeScript types
├── pages/             # Page Object Model
│   ├── GrowspaceCard.ts  # Main card interactions
│   ├── Dialogs.ts        # Dialog components
│   └── types.ts          # Page object types
├── specs/             # Test specifications
│   └── smoke.spec.ts     # Basic smoke tests
├── playwright.config.ts  # Playwright configuration
└── package.json          # Dependencies
```

## Writing Tests

### Basic Test Template

```typescript
import { haTest as test, expect } from '../fixtures/ha-setup';
import { GrowspaceCard } from '../pages/GrowspaceCard';

test.describe('Feature Name', () => {
  let growspaceCard: GrowspaceCard;

  test.beforeEach(async ({ page, testContext }) => {
    growspaceCard = new GrowspaceCard(page);
    await growspaceCard.navigate(testContext.dashboardPath);
    await growspaceCard.waitForCardReady();
  });

  test('specific behavior', async () => {
    // Test implementation
  });
});
```

### Available Page Objects

**GrowspaceCard**: Main card interactions
- `navigate(dashboardPath)` - Go to dashboard
- `openMenu()` - Open header menu
- `clickMenuItem(text)` - Click menu item
- `allPlantCards()` - Get all plant cards
- `getPlantCount()` - Count plant cards

**AddPlantDialog**: Add plant dialog
- `waitForOpen()` - Wait for dialog
- `fillForm(data)` - Fill form fields
- `submit()` - Save and close
- `cancel()` - Cancel and close

**ConfigDialog**: Configuration dialog
- Similar methods as AddPlantDialog

### Testing Strategy

These tests focus on **UI functionality**:
- ✅ Verify elements are visible
- ✅ Test user interactions (clicks, forms)
- ✅ Validate UI updates after actions
- ❌ Skip backend state verification (use HA dev tools for that)

## Troubleshooting

### "HA_ACCESS_TOKEN environment variable is required"
- Copy `.env.test.example` to `.env.test`
- Generate token in HA and add to `.env.test`

### "TEST_GROWSPACE_ID environment variable is required"
- Add a growspace ID from your HA instance to `.env.test`
- Find ID in HA dev tools or configuration

### Tests timing out
- Verify HA is running at `http://localhost:8123`
- Check dashboard path exists
- Ensure Growspace Manager card is on the dashboard

### Element not found
- Inspect actual card DOM in browser dev tools
- Update selectors in Page Objects if needed
- Card uses Shadow DOM - Playwright auto-pierces it

### Dialog doesn't open
- Check menu item text matches actual menu
- Verify permissions for the action
- Look for error messages in browser console

## Next Steps

1. **Run smoke tests**: Verify basic setup works
2. **Add plant management tests**: Test adding/removing plants via UI
3. **Add interaction tests**: Test menu items, dialogs, forms
4. **Add visual regression**: Screenshot comparisons for key states
5. **Expand coverage**: More dialogs, more workflows

## Notes

- Tests run **sequentially** (workers: 1) for stability
- Tests **retry twice** on failure for flaky network/timing issues
- Screenshots saved on failure in `test-results/`
- Uses **real Home Assistant instance** - not mocked
- Tests modify UI only - no backend cleanup needed (UI reflects backend)
