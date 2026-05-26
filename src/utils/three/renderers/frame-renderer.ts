import * as THREE from 'three';
import { BaseRenderer } from './base-renderer';

export class FrameRenderer extends BaseRenderer {
  private aluminumMaterial?: THREE.MeshStandardMaterial;

  public render() {
    const { device, volatileGroup } = this.context;
    const width = device.dimensions?.width ?? 120;
    const height = device.dimensions?.height ?? 200;
    const depth = device.dimensions?.length ?? (device.dimensions as any)?.depth ?? 120;

    const cacheKey = `${width}_${height}_${depth}`;
    let frameGroup = this.cache.get('frame') as THREE.Group;

    if (frameGroup) {
      if (frameGroup.userData.dimensions !== cacheKey) {
        volatileGroup.remove(frameGroup);
        this.disposeObject(frameGroup);
        frameGroup = this.createFrameModel(width, height, depth);
        this.cache.set('frame', frameGroup);
        volatileGroup.add(frameGroup);
      }
    } else {
      frameGroup = this.createFrameModel(width, height, depth);
      this.cache.set('frame', frameGroup);
      volatileGroup.add(frameGroup);
    }

    // Helper Grid
    const gridHelper = this.getSharedGeometry('gridHelper', () => {
      const h = new THREE.GridHelper(500, 10, 0x222222, 0x111111);
      return h.geometry;
    });
    const gridMat = this.getSharedMaterial(
      'gridMat',
      () => new THREE.LineBasicMaterial({ color: 0x222222 })
    );
    const grid = new THREE.LineSegments(gridHelper, gridMat);
    grid.scale.set((Math.max(width, depth) * 1.5) / 500, 1, (Math.max(width, depth) * 1.5) / 500);
    volatileGroup.add(grid);
  }

  private createFrameModel(width: number, height: number, depth: number): THREE.Group {
    const group = new THREE.Group();
    group.userData.dimensions = `${width}_${height}_${depth}`;

    const aluminumMat = this.getSharedMaterial(
      'aluminum',
      () =>
        new THREE.MeshStandardMaterial({
          color: 0xf0f0f0,
          metalness: 0.6,
          roughness: 0.4,
        })
    );
    const connectorMat = this.getSharedMaterial(
      'connector',
      () => new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.2 })
    );

    const poleRadius = 1.0;
    const poleGeo = this.getSharedGeometry(
      'poleGeo',
      () => new THREE.CylinderGeometry(1, 1, 1, 12)
    );
    const connectorGeo = this.getSharedGeometry(
      'connectorGeo',
      () => new THREE.BoxGeometry(2.4, 2.4, 2.4)
    );

    // Vertical Poles
    const vPositions = [
      { x: -width / 2, z: -depth / 2 },
      { x: width / 2, z: -depth / 2 },
      { x: -width / 2, z: depth / 2 },
      { x: width / 2, z: depth / 2 },
    ];
    vPositions.forEach((pos) => {
      const pole = new THREE.Mesh(poleGeo, aluminumMat);
      pole.scale.set(poleRadius, height, poleRadius);
      pole.position.set(pos.x, height / 2, pos.z);
      group.add(pole);
    });

    // Width Poles
    const wPositions = [
      { y: 0, z: -depth / 2 },
      { y: height, z: -depth / 2 },
      { y: 0, z: depth / 2 },
      { y: height, z: depth / 2 },
    ];
    wPositions.forEach((pos) => {
      const pole = new THREE.Mesh(poleGeo, aluminumMat);
      pole.scale.set(poleRadius, width, poleRadius);
      pole.rotation.z = Math.PI / 2;
      pole.position.set(0, pos.y, pos.z);
      group.add(pole);
    });

    // Depth Poles
    const dPositions = [
      { y: 0, x: -width / 2 },
      { y: height, x: -width / 2 },
      { y: 0, x: width / 2 },
      { y: height, x: width / 2 },
    ];
    dPositions.forEach((pos) => {
      const pole = new THREE.Mesh(poleGeo, aluminumMat);
      pole.scale.set(poleRadius, depth, poleRadius);
      pole.rotation.x = Math.PI / 2;
      pole.position.set(pos.x, pos.y, 0);
      group.add(pole);
    });

    // Corners
    const corners = [
      { x: -width / 2, y: 0, z: -depth / 2 },
      { x: width / 2, y: 0, z: -depth / 2 },
      { x: -width / 2, y: height, z: -depth / 2 },
      { x: width / 2, y: height, z: -depth / 2 },
      { x: -width / 2, y: 0, z: depth / 2 },
      { x: width / 2, y: 0, z: depth / 2 },
      { x: -width / 2, y: height, z: depth / 2 },
      { x: width / 2, y: height, z: depth / 2 },
    ];
    corners.forEach((pos) => {
      const connector = new THREE.Mesh(connectorGeo, connectorMat);
      connector.position.set(pos.x, pos.y, pos.z);
      group.add(connector);
    });

    return group;
  }
}
