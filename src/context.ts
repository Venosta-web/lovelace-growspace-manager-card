import { createContext } from '@lit/context';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceManagerCardConfig } from './types';

export const hassContext = createContext<HomeAssistant>('hass');
export const configContext = createContext<GrowspaceManagerCardConfig>('config');
