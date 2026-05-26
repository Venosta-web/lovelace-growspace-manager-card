import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { BaseRenderer } from './base-renderer';
import { SensorTypeUtils } from '../../sensor-type-utils';

export class SensorRenderer extends BaseRenderer {
  public render() {
    const { device, volatileGroup, hass, selectedMetric, visibility } = this.context;
    const sensorCoords = device.environmentAttributes?.sensorCoordinates || {};
    const width = device.dimensions?.width ?? 120;
    const height = device.dimensions?.height ?? 200;
    const depth = device.dimensions?.length ?? (device.dimensions as any)?.depth ?? 120;

    const allSensorEntities = Object.keys(sensorCoords);
    const currentSensorIds = new Set<string>();

    allSensorEntities.forEach((entityId) => {
      // Skip entities handled by specialized renderers
      if (
        SensorTypeUtils.isFan(device, entityId) ||
        SensorTypeUtils.isExhaust(device, entityId) ||
        SensorTypeUtils.isIrrigationPump(device, entityId) ||
        SensorTypeUtils.isDrainPump(device, entityId) ||
        SensorTypeUtils.isIrrigationTank(device, entityId) ||
        SensorTypeUtils.isHumidifier(device, entityId) ||
        SensorTypeUtils.isDehumidifier(device, entityId)
      )
        return;

      const isLight = SensorTypeUtils.isLight(device, hass, entityId);
      const matchesMetric = this.isMetric(entityId, selectedMetric);
      const isVisible = matchesMetric || isLight;

      const coords = sensorCoords[entityId];
      if (!coords) return;

      let sensorModel = this.cache.get(entityId);
      const val = this.getValue(entityId);
      if (isNaN(val)) {
        // Remove if it exists in cache but now has invalid value
        if (sensorModel) {
          volatileGroup.remove(sensorModel);
          this.cache.delete(entityId);
          this.context.sensorMeshes.delete(entityId);
        }
        return;
      }

      // ONLY mark as current if it's a valid sensor and not skipped
      currentSensorIds.add(entityId);

      const healthColor = isLight ? '#ffeb3b' : '#4caf50';

      if (!sensorModel) {
        if (isLight) {
          const geo = this.getSharedGeometry(
            'lightSensorGeo',
            () => new THREE.SphereGeometry(width * 0.02, 16, 16)
          );
          const mat = this.getSharedMaterial(
            'lightSensorMat',
            () => new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.9 })
          );
          sensorModel = new THREE.Mesh(geo, mat);
        } else {
          sensorModel = this.createSensorProbeModel(healthColor);
        }
        this.cache.set(entityId, sensorModel);
        volatileGroup.add(sensorModel);

        // Create Label ONLY ONCE
        const labelDiv = document.createElement('div');
        labelDiv.className = 'sensor-label';
        const label = new CSS2DObject(labelDiv);
        label.name = 'label';
        sensorModel.add(label);
      }

      // Update Transforms and Visibility
      sensorModel.position.set(coords.x - width / 2, coords.z, coords.y - depth / 2);
      sensorModel.visible = isVisible;

      const types: string[] = [];
      if (isLight) types.push('light');
      if (SensorTypeUtils.isTemperature(device, hass, entityId)) types.push('temperature');
      if (SensorTypeUtils.isHumidity(device, hass, entityId)) types.push('humidity');
      if (SensorTypeUtils.isVPD(device, hass, entityId)) types.push('vpd');
      if (SensorTypeUtils.isCO2(device, entityId)) types.push('co2');
      if (SensorTypeUtils.isSoilMoisture(device, entityId)) types.push('soil_moisture');
      sensorModel.userData = { ...sensorModel.userData, entityId, types };

      this.context.sensorMeshes.set(entityId, sensorModel);

      // Update Label Content
      const label = sensorModel.getObjectByName('label') as CSS2DObject;
      if (label) {
        label.visible = isVisible && (visibility?.tooltips ?? true);
        if (isVisible) {
          const icon = SensorTypeUtils.getSensorIcon(device, hass, entityId);
          const unit = this.getUnit(entityId, selectedMetric, isLight);
          const prefix = this.getPrefix(entityId, isLight);

          const newHTML = `
                        <div class="sensor-icon" style="background: ${healthColor}33; border-color: ${healthColor}">
                            <ha-icon icon="${icon}" style="color: ${healthColor}; --mdc-icon-size: 10px"></ha-icon>
                        </div>
                        <span style="color: ${healthColor}">${prefix}: ${val.toFixed(1)}${unit}</span>
                    `;
          if (label.element.innerHTML !== newHTML) {
            label.element.innerHTML = newHTML;
          }
        }
      }
    });

    // Cleanup stale sensors
    this.cache.forEach((obj, key) => {
      if (!currentSensorIds.has(key)) {
        volatileGroup.remove(obj);
        this.disposeObject(obj);
        this.cache.delete(key);
        this.context.sensorMeshes.delete(key);
      }
    });
  }

  private isMetric(id: string, metric: string): boolean {
    const { device, hass } = this.context;
    const types = device.environmentAttributes?.sensorTypes;
    if (types && types[id] === metric) return true;
    if (SensorTypeUtils.isLight(device, hass, id)) return false;
    if (metric === 'temperature') return SensorTypeUtils.isTemperature(device, hass, id);
    if (metric === 'humidity') return SensorTypeUtils.isHumidity(device, hass, id);
    if (metric === 'vpd') return SensorTypeUtils.isVPD(device, hass, id);
    if (metric === 'co2') return SensorTypeUtils.isCO2(device, id);
    if (metric === 'soil_moisture') return SensorTypeUtils.isSoilMoisture(device, id);
    return false;
  }

  private getUnit(id: string, selectedMetric: string, isLight: boolean): string {
    if (isLight) return '%';
    if (selectedMetric === 'temperature') return '°C';
    if (selectedMetric === 'vpd') return 'kPa';
    if (selectedMetric === 'co2') return 'ppm';
    return '%';
  }

  private getPrefix(id: string, isLight: boolean): string {
    const { device, hass } = this.context;
    if (isLight) return 'L';
    if (SensorTypeUtils.isTemperature(device, hass, id)) return 'T';
    return 'S';
  }

  private getValue(entityId: string): number {
    const { timelineIndex, historyData, hass } = this.context;
    if (timelineIndex >= 0 && historyData[entityId]) {
      // History fetch
      const point = historyData[entityId][timelineIndex] as any;
      return point ? parseFloat(point.s) : 0;
    }
    const state = hass?.states[entityId];
    return state && state.state ? parseFloat(state.state) : 0;
  }

  private createSensorProbeModel(color: string): THREE.Group {
    const group = new THREE.Group();

    const cableMat = this.getSharedMaterial(
      'cableMat',
      () => new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 })
    );
    const glandMat = this.getSharedMaterial(
      'glandMat',
      () => new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 })
    );
    const bodyMat = this.getSharedMaterial(
      'probeBodyMat',
      () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    const filterMat = this.getSharedMaterial(
      'probeFilterMat',
      () => new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.6, roughness: 0.3 })
    );

    // 1. Cable
    const cableGeo = this.getSharedGeometry('cableGeo', () => {
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, 40, 0),
        new THREE.Vector3(0, 20, 0),
        new THREE.Vector3(0, 10, 5),
        new THREE.Vector3(0, 5, 0)
      );
      return new THREE.TubeGeometry(curve, 10, 0.4, 8, false);
    });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    group.add(cable);

    // 2. Gland
    const glandGeo = this.getSharedGeometry(
      'glandGeo',
      () => new THREE.CylinderGeometry(1.2, 1.2, 3, 12)
    );
    const gland = new THREE.Mesh(glandGeo, glandMat);
    gland.position.y = 3.5;
    group.add(gland);

    // 3. Body
    const bodyGeo = this.getSharedGeometry(
      'probeBodyGeo',
      () => new THREE.CylinderGeometry(2.5, 2.5, 12, 16)
    );
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -4;
    group.add(body);

    // 4. Cage/Filter
    const cageGroup = new THREE.Group();
    cageGroup.position.y = -12;

    const filterGeo = this.getSharedGeometry(
      'probeFilterGeo',
      () => new THREE.CylinderGeometry(1, 1, 1, 16)
    );
    const filter = new THREE.Mesh(filterGeo, filterMat);
    filter.scale.set(2.4, 6, 2.4);
    cageGroup.add(filter);

    const ringGeo = this.getSharedGeometry(
      'probeRingGeo',
      () => new THREE.TorusGeometry(2.5, 0.1, 8, 24)
    );
    for (let i = -1; i <= 1; i++) {
      const ring = new THREE.Mesh(ringGeo, glandMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = i * 2.5;
      cageGroup.add(ring);
    }
    group.add(cageGroup);

    // 5. Diode (Color specific)
    const diodeGeo = this.getSharedGeometry(
      'probeDiodeGeo',
      () => new THREE.TorusGeometry(2.51, 0.2, 8, 24)
    );
    const diodeMatKey = `diodeMat_${color.replace('#', '')}`;
    const diodeMat = this.getSharedMaterial(
      diodeMatKey,
      () =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          emissive: new THREE.Color(color),
          emissiveIntensity: 1,
          transparent: true,
          opacity: 0.9,
        })
    );
    const diode = new THREE.Mesh(diodeGeo, diodeMat);
    diode.rotation.x = Math.PI / 2;
    diode.position.y = -10;
    group.add(diode);

    group.scale.set(0.3, 0.3, 0.3);
    return group;
  }
}
