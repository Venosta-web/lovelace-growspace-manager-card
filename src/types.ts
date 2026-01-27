// @deprecated Import from specific domain instead:
// - Config types: import from './lib/types/config'
// - Plant types: import from './features/plants/types'
// - Environment types: import from './features/environment/types'
// - Service types: import from './services/types'

// Re-export everything for backwards compatibility
export * from './lib/types';
export * from './features/plants/types';
export * from './features/plants/constants';
export * from './features/environment/types';
export * from './features/environment/constants';
export * from './services/types';

// Re-export specific aliases for compatibility
export { GridOverlayMode as GridOverlayModeEnum } from './features/environment/constants';
export { GrowspaceType as GrowspaceTypeEnum } from './features/plants/types';
