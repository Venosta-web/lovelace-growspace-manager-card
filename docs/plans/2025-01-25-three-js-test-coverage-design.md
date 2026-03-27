# Three.js Renderer Test Coverage Improvement

## Overview

Increase test coverage for Three.js rendering code, focusing on the two lowest-coverage files:
- `equipment-renderer.ts`: 83% → 95%+
- `plant-renderer.ts`: 89% → 95%+

## Current coverage gaps

### equipment-renderer.ts (lines 791-808, 870-872)

**Pump water particle animation** - The `animate()` method has untested branches for:
- Particles following hose path when pump is active and outside
- Particle progress updates for drain vs irrigation pumps

**Wind particle movement** - Untested branch for:
- Updating particle positions based on velocity when `lifetime > 0`

### plant-renderer.ts (lines 288, 291, 373-410)

**Bud scale factor branches** - `addFlowerDetails()` has untested calculations for:
- Early flower (16-40 days): `budScaleFactor = 0.2 + ((days - 16) / 24) * 0.3`
- Mid flower (40-65 days): `budScaleFactor = 0.5 + ((days - 40) / 25) * 0.5`
- Late flower (65+ days): `budScaleFactor = 1.0`

**extractStrainColors method** - Entire method untested (lines 373-410):
- Uses browser APIs (Image, canvas, getImageData)
- Currently mocked away entirely in tests

## Implementation plan

### Step 1: Create ColorExtractor utility

**New file:** `src/utils/color-extractor.ts`

```typescript
export interface ColorExtractor {
  extractColors(imageUrl: string): Promise<string[]>;
}

export class CanvasColorExtractor implements ColorExtractor {
  private cache: Map<string, string[]> = new Map();

  async extractColors(imageUrl: string): Promise<string[]> {
    if (this.cache.has(imageUrl)) {
      return this.cache.get(imageUrl)!;
    }

    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];

      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);
      const data = ctx.getImageData(0, 0, 100, 100).data;

      // Color extraction logic (moved from plant-renderer.ts)
      const colors: string[] = [];
      this.cache.set(imageUrl, colors);
      return colors;
    } catch {
      return [];
    }
  }
}

export class MockColorExtractor implements ColorExtractor {
  constructor(private colors: string[] = []) {}

  async extractColors(): Promise<string[]> {
    return this.colors;
  }
}
```

### Step 2: Refactor PlantRenderer

**Modify:** `src/utils/three/renderers/plant-renderer.ts`

1. Add `ColorExtractor` to `RendererContext` interface in `base-renderer.ts`:
   ```typescript
   export interface RendererContext {
     // ... existing fields
     colorExtractor?: ColorExtractor;
   }
   ```

2. Update `PlantRenderer` to use injected extractor:
   ```typescript
   private async addFlowerDetails(...) {
     const extractor = this.context.colorExtractor ?? new CanvasColorExtractor();
     // Use extractor.extractColors() instead of this.extractStrainColors()
   }
   ```

3. Remove the `extractStrainColors` method and `_strainColorCache` field

### Step 3: Create ColorExtractor tests

**New file:** `tests/unit/utils/color-extractor.spec.ts`

Test cases:
- Returns cached colors on subsequent calls
- Returns empty array when image fails to load
- Returns empty array when canvas context is null
- Sets crossOrigin to Anonymous
- Extracts colors from image data (with mocked pixel data)

### Step 4: Add equipment-renderer particle tests

**Modify:** `tests/unit/utils/three/renderers/equipment-renderer.spec.ts`

Add test cases:
1. `should animate pump water particles along hose path when pump is active and outside`
   - Setup pump with `isOutside: true`, `isActive: true`, `hosePath` set
   - Set particle `lifetime[i] > 0` and `progress[i]` values
   - Verify `hosePath.getPoint()` is called during animate

2. `should handle drain pump particle direction (reverse progress)`
   - Same setup but with `isDrain: true`
   - Verify progress decreases instead of increases

3. `should animate wind particles position when exhaust fan is active`
   - Setup exhaust fan with `speed > 0`
   - Set particle `lifetime[i] > 0` and velocity values
   - Verify position updates based on velocity

4. `should reset particle position when lifetime expires`
   - Set `lifetime[i] = 0`
   - Verify particle is repositioned to spawn point

### Step 5: Add plant-renderer flower day tests

**Modify:** `tests/unit/utils/three/renderers/plant-renderer.spec.ts`

Add test cases under new `describe('addFlowerDetails bud scaling')`:
1. `should calculate budScaleFactor for early flower (16-40 days)`
   - Mock `calculatePlantAge` to return 25
   - Verify buds are created with early-stage scaling

2. `should calculate budScaleFactor for mid flower (40-65 days)`
   - Mock `calculatePlantAge` to return 50
   - Verify buds are created with mid-stage scaling

3. `should use full budScaleFactor for late flower (65+ days)`
   - Mock `calculatePlantAge` to return 70
   - Verify buds are created with full scaling

4. `should skip flower details for early stage (< 16 days)`
   - Mock `calculatePlantAge` to return 10
   - Verify no buds are added (early return)

### Step 6: Update context initialization

**Modify:** `src/utils/three/scene-manager.ts`

Initialize the color extractor in context:
```typescript
this.context = {
  // ... existing fields
  colorExtractor: new CanvasColorExtractor()
};
```

## File changes summary

| File | Action |
|------|--------|
| `src/utils/color-extractor.ts` | Create |
| `src/utils/three/renderers/base-renderer.ts` | Modify (add to interface) |
| `src/utils/three/renderers/plant-renderer.ts` | Modify (use injected extractor) |
| `src/utils/three/scene-manager.ts` | Modify (initialize extractor) |
| `tests/unit/utils/color-extractor.spec.ts` | Create |
| `tests/unit/utils/three/renderers/equipment-renderer.spec.ts` | Modify (add tests) |
| `tests/unit/utils/three/renderers/plant-renderer.spec.ts` | Modify (add tests) |

## Expected outcomes

| File | Before | After |
|------|--------|-------|
| `equipment-renderer.ts` | 83% stmts, 72% branch | 95%+ stmts, 90%+ branch |
| `plant-renderer.ts` | 89% stmts, 75% branch | 95%+ stmts, 90%+ branch |
| `color-extractor.ts` | N/A | 95%+ all metrics |

## Testing

Run coverage after implementation:
```bash
npm run test:coverage
```

Verify specific files:
```bash
npx vitest run tests/unit/utils/color-extractor.spec.ts --coverage
npx vitest run tests/unit/utils/three/renderers/plant-renderer.spec.ts --coverage
npx vitest run tests/unit/utils/three/renderers/equipment-renderer.spec.ts --coverage
```
