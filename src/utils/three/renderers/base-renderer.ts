import * as THREE from 'three';
import type { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry } from '../../../types';

export interface RendererContext {
  scene: THREE.Scene;
  volatileGroup: THREE.Group;
  device: GrowspaceDevice;
  hass: HomeAssistant;
  selectedMetric: string;
  timelineIndex: number;
  historyData: Record<string, unknown[]>;
  requestUpdate?: () => void;
  getSensorValue?: (entityId: string, metric: string) => number | null;
  strainLibrary?: StrainEntry[];
  sensorMeshes: Map<string, THREE.Object3D>;
  visibility: {
    plants: boolean;
    lights: boolean;
    fans: boolean;
    heatmap: boolean;
    tooltips: boolean;
  };
  camera: THREE.PerspectiveCamera;
}

export abstract class BaseRenderer {
  protected context: RendererContext;
  protected cache: Map<string, THREE.Object3D> = new Map();

  constructor(context: RendererContext) {
    this.context = context;
  }

  public updateContext(newContext: Partial<RendererContext>) {
    this.context = { ...this.context, ...newContext };
  }

  // Called whenever the scene needs a full update (e.g. data change)
  public abstract render(): void;

  // Called on every frame for animations
  public animate(deltaTime: number): void {
    // Optional override
  }

  // Cleanup resources
  public dispose(): void {
    this.cache.forEach((obj) => {
      this.context.volatileGroup.remove(obj);
      this.disposeObject(obj);
    });
    this.cache.clear();
  }

  // Shared Assets for Performance across all renderers
  private static _geometries: Record<string, THREE.BufferGeometry> = {};
  private static _materials: Record<string, THREE.Material> = {};

  protected getSharedGeometry(
    key: string,
    creator: () => THREE.BufferGeometry
  ): THREE.BufferGeometry {
    if (!BaseRenderer._geometries[key]) {
      BaseRenderer._geometries[key] = creator();
    }
    return BaseRenderer._geometries[key];
  }

  protected getSharedMaterial(key: string, creator: () => THREE.Material): THREE.Material {
    if (!BaseRenderer._materials[key]) {
      BaseRenderer._materials[key] = creator();
    }
    return BaseRenderer._materials[key];
  }

  protected disposeObject(obj: THREE.Object3D) {
    obj.traverse((child: THREE.Object3D & { isCSS2DObject?: boolean; element?: Element }) => {
      if (child.isCSS2DObject && child.element) {
        child.element.remove();
      }
      // Note: We don't dispose shared geometries/materials here
      // as they are reused. They stay in memory until the whole card is destroyed.
    });
  }
}
