import { createContext } from '@lit/context';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceManagerCardConfig } from './types';
import type { GrowspaceStore } from './store/growspace-store';

export const hassContext = createContext<HomeAssistant>('hass');
export const configContext = createContext<GrowspaceManagerCardConfig>('config');
export const strainLibraryContext =
  createContext<import('./types').StrainEntry[]>('strain-library');
export const storeContext = createContext<GrowspaceStore>('store');
