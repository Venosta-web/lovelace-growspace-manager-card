# UX & Accessibility Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the top 5 highest-impact UX and accessibility improvements identified in the UI/UX audit, bringing the card from 4/10 to 8/10 on accessibility and significantly improving mobile usability.

**Architecture:** All changes are isolated to CSS style files and the `base-dialog.layout.ts` component shell. The `FocusTrapController` already exists at `src/features/shared/controllers/focus-trap.controller.ts` and only needs to be wired into the base dialog layout. No backend or store changes are required.

**Tech Stack:** Lit 3.3, TypeScript, CSS custom properties, WCAG 2.1 AA guidelines, Material Design 3

---

## Task 1: Wire Focus Trap + ARIA + Escape Key into `base-dialog.layout.ts`

This is the single highest-impact change. The `FocusTrapController` already exists but is not connected to the dialog shell.

**Files:**
- Modify: `src/features/shared/layouts/base-dialog.layout.ts`

**Context on `FocusTrapController` API:**
```typescript
// Already exists at src/features/shared/controllers/focus-trap.controller.ts
// Constructor: new FocusTrapController(hostElement, { selector: 'css-selector', restoreFocus: true, delay: 100 })
// hostConnected(): stores previous focus, focuses selector after delay
// hostDisconnected(): restores previous focus
// Does NOT trap Tab key within the dialog — that must be done separately
```

**What the dialog currently lacks:**
- No `role="dialog"` on the `.dialog` div
- No `aria-modal="true"`
- No `aria-labelledby` linking title to dialog
- No Escape key handler
- No initial focus on open
- No focus restoration on close

**Step 1: Add imports for FocusTrapController and update class**

Open `src/features/shared/layouts/base-dialog.layout.ts`.

At the top, after the existing import of `mdiClose`, add:
```typescript
import { FocusTrapController } from '../controllers/focus-trap.controller.js';
```

Inside the class body, after the `@property` declarations (around line 52), add:
```typescript
private _focusTrap?: FocusTrapController;
```

**Step 2: Wire focus trap on `open` property change**

Add an `updated()` lifecycle method to the class (before the `render()` method):

```typescript
updated(changedProps: Map<string, unknown>): void {
  super.updated(changedProps);
  if (changedProps.has('open')) {
    if (this.open) {
      // Initialize focus trap when dialog opens
      if (!this._focusTrap) {
        this._focusTrap = new FocusTrapController(this, {
          selector: '.dialog-close-button',
          restoreFocus: true,
          delay: 50,
        });
      }
    }
  }
}
```

**Step 3: Add Escape key handler**

Add a `connectedCallback` and `disconnectedCallback` to bind the Escape key listener:

```typescript
connectedCallback(): void {
  super.connectedCallback();
  this._handleKeydown = this._handleKeydown.bind(this);
  document.addEventListener('keydown', this._handleKeydown);
}

disconnectedCallback(): void {
  super.disconnectedCallback();
  document.removeEventListener('keydown', this._handleKeydown);
}

private _handleKeydown(e: KeyboardEvent): void {
  if (this.open && e.key === 'Escape') {
    e.stopPropagation();
    this._handleClose();
  }
}
```

Also add the property declaration near the other private fields:
```typescript
private _handleKeydown!: (e: KeyboardEvent) => void;
```

**Step 4: Add ARIA attributes to `.dialog` div and title**

In the `render()` method, change the `.dialog` div opening tag from:
```typescript
<div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
```
to:
```typescript
<div class="dialog"
     role="dialog"
     aria-modal="true"
     aria-labelledby="dialog-title-${this.title.replace(/\s+/g, '-').toLowerCase()}"
     @click=${(e: Event) => e.stopPropagation()}>
```

In `_renderHeader()`, change the `<h2>` from:
```typescript
<h2 class="dialog-title">${this.title}</h2>
```
to:
```typescript
<h2 class="dialog-title"
    id="dialog-title-${this.title.replace(/\s+/g, '-').toLowerCase()}">
  ${this.title}
</h2>
```

**Step 5: Add tab focus styling to close button**

The close button already has `aria-label="Close dialog"`. Add `:focus-visible` style to the `.dialog-close-button` in `static styles`:

```css
.dialog-close-button:focus-visible {
  outline: 2px solid var(--primary-color, #4caf50);
  outline-offset: 2px;
}
```

**Step 6: Add dialog tab keyboard navigation**

In `_renderTabs()`, update each tab button to include `aria-selected` and a `role`:

```typescript
<button
  class="dialog-tab ${tab.id === this.activeTab ? 'active' : ''}"
  role="tab"
  aria-selected="${tab.id === this.activeTab}"
  @click=${() => this._handleTabClick(tab.id)}
>
```

Wrap the tabs container in a `role="tablist"`:
```typescript
<div class="dialog-tabs" role="tablist">
```

**Step 7: Build and verify**

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
npm run build
```

Expected: Build completes without TypeScript errors.

**Step 8: Run unit tests**

```bash
npm run test:unit
```

Expected: All tests pass (no regressions).

**Step 9: Commit**

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
git add src/features/shared/layouts/base-dialog.layout.ts
git commit -m "feat(a11y): wire focus trap, ARIA roles, and Escape key into base dialog"
```

---

## Task 2: Fix Touch Targets — Status Icons and Checkboxes

Status icons are 24×24px and checkboxes are ~32px. WCAG 2.5.8 requires minimum 24×24px CSS size with sufficient spacing, or 44×44px interactive area. We'll add invisible hit-area padding without changing the visual size.

**Files:**
- Modify: `src/styles/plant-card.styles.ts`

**Step 1: Increase status icon touch area**

Find the `.status-icons` block (around line 145) and the `.status-icon` block (around line 159).

Change the status icons container to allow pointer events and give each icon a larger tap area via `padding` instead of relying on the 24px size:

Replace this block:
```css
.status-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
  pointer-events: auto;
}
```

With:
```css
.status-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
  pointer-events: auto;
  /* WCAG 2.5.8: Extend touch target without changing visual size */
  position: relative;
}

.status-icon::before {
  content: '';
  position: absolute;
  inset: -10px; /* Extends touch area to ~44x44px */
  border-radius: 50%;
}
```

**Step 2: Increase checkbox touch area**

Find the `.plant-card-checkbox` block (around line 69). Change `padding: 4px` to `padding: 10px`:

```css
.plant-card-checkbox {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  padding: 10px;  /* Was 4px — increased for 44px touch target */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
```

**Step 3: Also fix the dialog close button in `base-dialog.layout.ts`**

In `base-dialog.layout.ts` `static styles`, update the close button padding from `8px` to `12px`:

```css
.dialog-close-button {
  background: transparent;
  border: none;
  color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
  cursor: pointer;
  padding: 12px;  /* Was 8px — 20px icon + 24px padding = 44px total */
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
```

**Step 4: Build and verify**

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
npm run build
```

Expected: Build completes without errors.

**Step 5: Commit**

```bash
git add src/styles/plant-card.styles.ts src/features/shared/layouts/base-dialog.layout.ts
git commit -m "feat(a11y): increase touch targets to WCAG 2.5.8 minimum (44px) for status icons and checkboxes"
```

---

## Task 3: Fix Hardcoded Colors → CSS Variables

Two hardcoded hex colors in `plant-card.styles.ts` bypass the theme system and break in custom light themes.

**Files:**
- Modify: `src/styles/plant-card.styles.ts`
- Modify: `src/styles/theme-variables.ts`

**Step 1: Add missing semantic variables to `theme-variables.ts`**

Open `src/styles/theme-variables.ts`. After the existing `--gm-primary-color` block (around line 17), add two new variables in the `:host` block:

```css
/* IPM and PHI specific semantic colors */
--gm-ipm-color: var(--gm-primary-color, #9c27b0); /* Purple - overridable */
--gm-phi-color: var(--gm-warning-color, #ff9800);  /* Orange - same as warning */
```

**Step 2: Replace hardcoded colors in `plant-card.styles.ts`**

Find (around line 191):
```css
.status-icon.ipm {
  color: #9c27b0; /* Purple for IPM */
}

.status-icon.phi {
  color: #ff9800; /* Orange for PHI */
}
```

Replace with:
```css
.status-icon.ipm {
  color: var(--gm-ipm-color, #9c27b0);
}

.status-icon.phi {
  color: var(--gm-phi-color, #ff9800);
}
```

**Step 3: Build and verify**

```bash
npm run build
```

Expected: No errors.

**Step 4: Commit**

```bash
git add src/styles/theme-variables.ts src/styles/plant-card.styles.ts
git commit -m "fix(theme): replace hardcoded #9c27b0 and #ff9800 with CSS custom properties"
```

---

## Task 4: Add `prefers-reduced-motion` Support

Users who have enabled "reduce motion" in their OS settings experience no reduction in animations today. This violates WCAG 2.3.3 (Animation from Interactions).

**Files:**
- Modify: `src/styles/growspace-card.styles.ts`
- Modify: `src/styles/plant-card.styles.ts`
- Modify: `src/styles/ui.styles.ts`

**Context:** Animations to disable when `prefers-reduced-motion: reduce`:
- `slideDown`, `slideUp`, `fadeIn`, `pulse-red` in `growspace-card.styles.ts`
- `transform: translateY(-4px)` hover on plant cards in `plant-card.styles.ts`
- `slideUpFade` and `spin` in `ui.styles.ts`

**Step 1: Add reduced-motion block to `growspace-card.styles.ts`**

At the very end of the CSS template string in `src/styles/growspace-card.styles.ts` (before the closing backtick), add:

```css
/* Respect user motion preferences (WCAG 2.3.3) */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 2: Add reduced-motion override to `plant-card.styles.ts`**

At the end of the CSS template string in `src/styles/plant-card.styles.ts` (before the closing backtick), add:

```css
/* Respect user motion preferences (WCAG 2.3.3) */
@media (prefers-reduced-motion: reduce) {
  .plant-card-rich {
    transition: none;
  }

  .plant-card-rich:hover {
    transform: none;
  }

  .plant-card-rich.dragging {
    transform: none;
  }

  .plant-card-rich.dragging-mobile {
    transform: none;
  }

  .status-icon {
    transition: none;
  }

  .status-icon:hover {
    transform: none;
  }
}
```

**Step 3: Add reduced-motion override to `ui.styles.ts`**

At the end of the CSS template in `src/styles/ui.styles.ts`, add:

```css
/* Respect user motion preferences (WCAG 2.3.3) */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 4: Build and verify**

```bash
npm run build
```

Expected: No errors.

**Step 5: Commit**

```bash
git add src/styles/growspace-card.styles.ts src/styles/plant-card.styles.ts src/styles/ui.styles.ts
git commit -m "feat(a11y): add prefers-reduced-motion support across all animation styles"
```

---

## Task 5: Mobile Bottom Sheet Dialogs + Tablet Breakpoint

On mobile (<600px) dialogs should slide up from the bottom like a Material Design 3 bottom sheet. The current `border-radius: 0` full-screen modal is jarring. Also add a missing 768px tablet breakpoint to the header hero grid.

**Files:**
- Modify: `src/features/shared/layouts/base-dialog.layout.ts`
- Modify: `src/styles/header.styles.ts`

**Step 1: Add bottom sheet mobile styles to `base-dialog.layout.ts`**

In `static styles`, find the existing mobile media query block:
```css
@media (max-width: 768px) {
  .dialog {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
}
```

Replace it with a two-tier responsive approach:

```css
/* Tablet: constrain width */
@media (max-width: 768px) {
  .dialog {
    max-width: 100%;
    max-height: 92vh;
  }
}

/* Mobile: bottom sheet slide-up */
@media (max-width: 600px) {
  .dialog-container {
    align-items: flex-end;
    padding: 0;
  }

  .dialog {
    width: 100%;
    max-width: 100%;
    max-height: 92vh;
    border-radius: 20px 20px 0 0;
    animation: slideUpFromBottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideUpFromBottom {
    from {
      transform: translateY(100%);
      opacity: 0.8;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dialog-header {
    padding: 12px 16px 8px;
  }

  /* Visual handle indicator for bottom sheet */
  .dialog::before {
    content: '';
    display: block;
    width: 36px;
    height: 4px;
    background: var(--divider-color, rgba(255, 255, 255, 0.3));
    border-radius: 2px;
    margin: 8px auto 0;
  }

  .dialog-content {
    padding: 16px;
  }

  .dialog-actions {
    padding: 12px 16px;
    /* Extra bottom padding for iOS home indicator */
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
}
```

Also add the reduced-motion override inside `static styles`:
```css
@media (prefers-reduced-motion: reduce) {
  .dialog {
    animation: none;
  }
}
```

**Step 2: Add tablet breakpoint to `header.styles.ts`**

Open `src/styles/header.styles.ts`. Find the existing `@media (max-width: 600px)` block and add a new tablet block ABOVE it:

```css
/* Tablet: 2-column hero grid instead of 4 */
@media (max-width: 768px) {
  .gs-hero-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

Note: Check the actual class name for the hero grid container first. Run:
```bash
grep -n "grid-template-columns" /home/maxi/core/core/vendor/lovelace-growspace-manager-card/src/styles/header.styles.ts
```
Use the correct class name from that output.

**Step 3: Build and verify**

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
npm run build
```

Expected: No errors.

**Step 4: Run all unit tests**

```bash
npm run test:unit
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/features/shared/layouts/base-dialog.layout.ts src/styles/header.styles.ts
git commit -m "feat(ux): implement mobile bottom sheet dialogs and add tablet breakpoint to hero grid"
```

---

## Final: Verification Checklist

After all 5 tasks are committed, run a final check:

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
npm run build && npm run test:unit
```

Expected output:
- Build: `✓ N modules transformed`
- Tests: All passing, 0 failures

Manual verification checklist (use browser DevTools):
- [ ] Open any dialog → Tab key stays within dialog
- [ ] Open any dialog → Escape key closes it
- [ ] Screen reader reads `role="dialog"` and announces title
- [ ] Mobile (<600px) → dialog slides up from bottom as sheet
- [ ] Plant card status icons → 44px touch area (check via DevTools > hover)
- [ ] OS "reduce motion" enabled → no animations
- [ ] Custom HA theme → IPM/PHI icons follow theme color

---

## Implementation Notes

- **No TypeScript strict issues expected** — `FocusTrapController` is already typed
- **No store changes** — all changes are presentation layer only
- **No test file changes** — these are visual/CSS changes; existing unit tests cover the logic
- **Build artifact**: The final `growspace-manager-card.js` in the card root is auto-updated by `npm run build`
- **To test in HA**: Copy `growspace-manager-card.js` to your HA `/config/www/` folder and hard-refresh the browser
