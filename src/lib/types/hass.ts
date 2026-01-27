import { HassEntity } from 'home-assistant-js-websocket';
import { GrowspaceType } from '../../features/plants/types';

export interface GrowspaceOverviewEntity extends HassEntity {
  attributes: {
    growspace_id: string;
    friendly_name?: string;
    type?: string;
    plantsPerRow?: number;
    rows?: number;
  };
}

export enum EntityState {
  ON = 'on',
  OFF = 'off',
  UNAVAILABLE = 'unavailable',
  UNKNOWN = 'unknown',
  TRUE = 'true',
  FALSE = 'false',
  ACTIVE = 'active',
  IDLE = 'idle',
}

export const BINARY_ON_STATES = [
  EntityState.ON,
  EntityState.TRUE,
  '1',
  'heating',
  'drying',
  EntityState.ACTIVE,
];

export const BINARY_OFF_STATES = [EntityState.OFF, EntityState.FALSE, '0', EntityState.IDLE];
