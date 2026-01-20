/**
 * Strongly-typed Home Assistant wrapper for Growspace Manager.
 *
 * This file provides type-safe access to HASS state entities and services
 * to eliminate `any` types throughout the codebase.
 */

import { HomeAssistant } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import { GrowspaceOverviewEntity, PlantEntity } from '../types';

/**
 * Type-safe HASS wrapper with Growspace-specific entity access
 */
export interface GrowspaceHASS extends Omit<HomeAssistant, 'states'> {
  states: Record<string, HassEntity | GrowspaceOverviewEntity | PlantEntity>;
}

/**
 * Type guard to check if an entity is a Growspace Overview entity
 */
export function isGrowspaceOverviewEntity(
  entity: HassEntity | undefined
): entity is GrowspaceOverviewEntity {
  return entity?.attributes?.growspace_id !== undefined;
}

/**
 * Type guard to check if an entity is a Plant entity
 */
export function isPlantEntity(entity: HassEntity | undefined): entity is PlantEntity {
  return entity?.attributes?.plant_id !== undefined && entity?.attributes?.strain !== undefined;
}

/**
 * Safely get a Growspace Overview entity from HASS state
 */
export function getGrowspaceOverview(
  hass: HomeAssistant,
  entityId: string
): GrowspaceOverviewEntity | undefined {
  const entity = hass.states[entityId];
  return isGrowspaceOverviewEntity(entity) ? entity : undefined;
}

/**
 * Safely get a Plant entity from HASS state
 */
export function getPlantEntity(hass: HomeAssistant, entityId: string): PlantEntity | undefined {
  const entity = hass.states[entityId];
  return isPlantEntity(entity) ? entity : undefined;
}

/**
 * Raw history data point from Home Assistant history API
 */
export interface RawHistoryDataPoint {
  /** Timestamp when the state last changed */
  last_changed: string;
  /** Entity state value (numeric, 'on', 'off', or string) */
  state: string;
  /** Optional entity attributes at this point in time */
  attributes?: Record<string, unknown>;
}

/**
 * Type-safe history response for a single entity
 */
export type EntityHistory = RawHistoryDataPoint[];

/**
 * Normalized history point with parsed numeric value
 */
export interface NormalizedHistoryPoint {
  /** Unix timestamp in milliseconds */
  time: number;
  /** Parsed numeric value */
  value: number;
  /** Optional metadata from attributes */
  meta?: unknown;
}

/**
 * Event handler type for Custom Events
 */
export interface CustomEventDetail<T = unknown> {
  detail: T;
}

/**
 * Input event type for form elements
 */
export interface InputEvent extends Event {
  target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
}

/**
 * Change event type for form elements
 */
export interface ChangeEvent extends Event {
  target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
}
