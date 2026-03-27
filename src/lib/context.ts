import { createContext } from '@lit/context';
import { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from './types/config';
import type { GrowspaceStore } from '../store/core/growspace-store';
import type { StrainEntry } from '../features/plants/types';

export const hassContext = createContext<HomeAssistant>('hass');
export const configContext = createContext<GrowspaceManagerCardConfig>('config');
export const strainLibraryContext = createContext<StrainEntry[]>('strain-library');
export const storeContext = createContext<GrowspaceStore>('store');
