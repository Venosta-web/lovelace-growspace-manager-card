// tests/setup.ts for browser mode
// Mocks for JSDOM are likely unnecessary or harmful in real browsers.
// We only keep mocks that are absolutely required for logic isolation.
import { vi } from 'vitest';

// Simulate HA dark-theme CSS custom properties so cards render as they do in production.
// Without these, fallback values (#fff text, transparent bg) produce invisible white-on-white screenshots.
const haTheme: Record<string, string> = {
    '--primary-text-color': '#e1e1e1',
    '--secondary-text-color': '#9e9e9e',
    '--primary-color': '#4caf50',
    '--accent-color': '#4caf50',
    '--card-background-color': '#1c1c1e',
    '--primary-background-color': '#111111',
    '--secondary-background-color': '#1c1c1e',
    '--divider-color': 'rgba(255, 255, 255, 0.12)',
    '--warning-color': '#ff9800',
    '--error-color': '#f44336',
    '--info-color': '#2196f3',
    '--success-color': '#4caf50',
    '--ha-card-background': '#1c1c1e',
};
for (const [key, value] of Object.entries(haTheme)) {
    document.documentElement.style.setProperty(key, value);
}
document.body.style.backgroundColor = '#111111';

// Only mock native APIs if the browser doesn't have them or we need to force a state.
// Chromium has matchMedia and ResizeObserver natively.
