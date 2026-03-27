# Design System: Growspace Manager Card
**Project ID:** lovelace-growspace-manager-card

## 1. Visual Theme & Atmosphere
The design is a **"Dark Ops" Dashboard**. It prioritizes data density, high contrast, and monitoring efficiency.
-   **Background**: specialized dark, almost black (#101010).
-   **Cards**: Dark grey panels (#1c1c1c to #252525) with rounded corners (`12px` to `16px`).
-   **Aesthetic**: Professional monitoring station. Not "glassmorphism", but solid, opaque, clean interfaces.

## 2. Color Palette & Roles

### Semantic Gradients (High Impact)
*   **Vitality Green (Primary)** (`linear-gradient(135deg, #4caf50, #45a049)`): Represents health, growth, and active life. Used for primary actions, healthy states, and the "Veg" stage.
*   **Hydro Blue (Secondary)** (`linear-gradient(135deg, #2196f3, #1976d2)`): Represents water, air, and life support systems. Used for secondary actions, irrigation controls, and the "Cure" stage.
*   **Alert Red (Danger)** (`linear-gradient(135deg, #f44336, #d32f2f)`): Represents errors, critical alerts, or destructive actions. Used for delete buttons and critical error states.

### Plant Stage Indicators (Status)
*   **Vegetative Green** (`#4caf50`): Indicates the vegetative growth stage.
*   **Flowering Orange** (`#ff9800`): Indicates the flowering/bloom stage.
*   **Drying Purple** (`#9c27b0`): Indicates the drying harvest stage.
*   **Curing Blue** (`#2196f3`): Indicates the curing/processing stage.

### Interface Neutrals
*   **Deep Carbon Background** (`#1e1e1e`): The default dark mode card background, providing high contrast for text and colors.
*   **Glass Surface** (`rgba(20, 20, 24, 0.6)` with linear gradient overlay): Used for panels and floating elements to create depth.
*   **Divider White** (`rgba(255, 255, 255, 0.12)`): Subtle separation lines.

## 3. Typography Rules
The typography follows the **Material Design 3 (MD3) Scale**, utilizing a standard sans-serif stack (Roboto/Inter implied by Home Assistant).

*   **Headline Small** (`1.5rem / 24px`, Weight 400): Used for major structural headings.
*   **Title Large** (`1.25rem / 20px`, Weight 400): Used for dialog titles and card headers.
*   **Body Medium** (`1rem / 16px`, Weight 400): Standard text for content and inputs.
*   **Body Small** (`0.875rem / 14px`, Weight 400): Used for secondary text, labels, and hints.
*   **Caption/XS** (`0.6875rem / 11px`, Weight 400): Used for tiny metadata or timestamps.

## 4. Component Stylings

### Buttons
*   **Primary Action:** Pill-shaped (`border-radius: 28px` implied by MD3), filled with **Vitality Green** or **Hydro Blue** gradients. Behaves with a robust hover lift.
*   **Tonal Action:** Pill-shaped, semi-transparent background. Used for secondary choices like "Cancel".
*   **Text Action:** No background, text-only color. Used for subtle dismissals like "Close" icons.

### Plant Image Cards
*   **Layout**: Full-bleed square aspect ratio image.
*   **Overlay**: Gradient fade from bottom black to transparent. Text overlaid at bottom center/left.
*   **Typography on Image**: Plant Name (Bold, White), Breeder (Small, Grey), Stage (Yellow/Orange text).
*   **Actions**: Small icons in top-left (Close, Graph) and bottom corners.

### Circular Dials (Bottom Controls)
*   **Style**: Large circular track. Active portion is colored (e.g., Blue for Dehumidifier).
*   **Center**: Big percentage text "47%".
*   **Controls**: +/- buttons below the circle.

## 4. Typography Rules
*   **Headers**: Roboto/Inter, Bold.
*   **Values**: Monospace or Tabular nums for sensor data (optional, but looks technical).
*   **Labels**: Uppercase, small tracking, low contrast.
