// @deprecated Import from specific domain instead:
// - Global constants: import from './lib/constants'
// - Environment constants: import from './features/environment/constants'
// - Plant constants: import from './features/plants/constants'
// - HASS constants: import from './lib/types/hass'

// Re-export everything for backwards compatibility
export * from './lib/constants';
export * from './lib/types/hass'; // For EntityState, BINARY_ON_STATES
export * from './features/environment/constants';
export * from './features/plants/constants';
export * from './features/plants/types'; // For GrowspaceType enum
