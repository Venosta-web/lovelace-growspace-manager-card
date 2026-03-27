// tests/setup.ts for browser mode
// Mocks for JSDOM are likely unnecessary or harmful in real browsers.
// We only keep mocks that are absolutely required for logic isolation.
import { vi } from 'vitest';

// Only mock native APIs if the browser doesn't have them or we need to force a state.
// Chromium has matchMedia and ResizeObserver natively.
