import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GridSliceRef } from '../slices/grid';
import { devices$ } from '../slices/grid';
import type { GrowspaceManagerCardConfig } from '../lib/types/config';
import { fetchRawCollection } from '../slices/growspace';
import { hydrate } from '../services/hydrate';
import type { GrowspaceAPIResponse } from '../types';

/**
 * Bootstrap controller — ADR-0022.
 *
 * Per-card Lit ReactiveController that owns hydration lifecycle:
 *   - in-flight fetch guard (_isFetching)
 *   - watched-entity optimization (_watchedEntities)
 *   - default-growspace auto-select (_defaultApplied)
 *   - loading flag (triggers host.requestUpdate)
 *
 * Two updateHass() paths:
 *   1. No collection cached → fetchRawCollection() → hydrate → cache collection
 *   2. Collection cached, watched entity changed → hydrate(_lastCollection, hass.states)
 */
export class BootstrapController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _grid: GridSliceRef;
  private _config: GrowspaceManagerCardConfig;

  private _lastHassRef: HomeAssistant | undefined;
  private _isFetching = false;
  private _lastCollection: Record<string, GrowspaceAPIResponse> | null = null;
  private _watchedEntities = new Set<string>();
  private _defaultApplied = false;

  loading = false;

  constructor(
    host: ReactiveControllerHost,
    grid: GridSliceRef,
    config: GrowspaceManagerCardConfig
  ) {
    this._host = host;
    this._grid = grid;
    this._config = config;
    host.addController(this);
  }

  hostConnected(): void {}
  hostDisconnected(): void {}

  setCardConfig(config: GrowspaceManagerCardConfig): void {
    if (config.default_growspace !== this._config?.default_growspace) {
      this._defaultApplied = false;
    }
    this._config = config;
  }

  async refresh(): Promise<void> {
    if (this._isFetching) return;
    this._isFetching = true;
    if (devices$.get().length === 0) {
      this.loading = true;
      this._host.requestUpdate();
    }
    try {
      const collection = await fetchRawCollection();
      this._lastCollection = collection;
      const hassStates = this._lastHassRef?.states ?? {};
      this._watchedEntities = hydrate(collection, hassStates);
      this._autoSelect();
    } finally {
      this._isFetching = false;
      this.loading = false;
      this._host.requestUpdate();
    }
  }

  async updateHass(hass: HomeAssistant): Promise<void> {
    if (this._lastHassRef === hass) return;

    if (!this._lastCollection) {
      this._lastHassRef = hass;
      await this.refresh();
      return;
    }

    if (this._watchedEntities.size > 0 && this._lastHassRef) {
      let changed = false;
      for (const entityId of this._watchedEntities) {
        if (hass.states[entityId] !== this._lastHassRef.states[entityId]) {
          changed = true;
          break;
        }
      }
      this._lastHassRef = hass;
      if (!changed) return;
    } else {
      this._lastHassRef = hass;
    }

    this._watchedEntities = hydrate(this._lastCollection, hass.states);
    this._autoSelect();
  }

  private _autoSelect(): void {
    if (this._defaultApplied) return;
    const devs = devices$.get();
    if (devs.length === 0) return;

    const currentDevice = this._grid.$selectedDevice.get();
    if (currentDevice && this._defaultApplied) return;

    const defaultId = this._config?.default_growspace;
    const target = defaultId
      ? devs.find((d) => d.deviceId === defaultId || d.name === defaultId)
      : null;

    this._grid.setSelectedDevice(target ? target.deviceId : devs[0].deviceId);
    this._defaultApplied = true;
  }
}
