import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
});

// tests/setup.ts for browser mode
// Mocks for JSDOM are likely unnecessary or harmful in real browsers.
// We only keep mocks that are absolutely required for logic isolation.
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

// Suppress Lit's "dev mode" warning. The warning fires via queueMicrotask and
// checks globalThis.litIssuedWarnings before printing. Pre-populating the set
// with the warning code stops it before it runs — without touching module resolution
// or changing which Lit build is loaded.
(globalThis as any).litIssuedWarnings ??= new Set();
(globalThis as any).litIssuedWarnings.add('dev-mode');

// Provide the build-time constant so src/index.ts can be imported in tests.
(globalThis as any).__VERSION__ = 'test';

// Disable all CSS animations and transitions so visual snapshots are stable.
// Without this, transitions like `transition: all 300ms` keep changing the DOM
// between Playwright's consecutive screenshot captures, triggering "could not
// capture a stable screenshot" failures.
const noMotionStyle = document.createElement('style');
noMotionStyle.textContent =
  '*, *::before, *::after {' +
  '  animation-duration: 0s !important;' +
  '  animation-delay: 0s !important;' +
  '  animation-iteration-count: 1 !important;' +
  '  transition-duration: 0s !important;' +
  '  transition-delay: 0s !important;' +
  '}';
document.head.appendChild(noMotionStyle);

// Only mock native APIs if the browser doesn't have them or we need to force a state.
// Chromium has matchMedia and ResizeObserver natively.
