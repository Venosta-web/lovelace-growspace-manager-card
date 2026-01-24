
import * as THREE from 'three';
import { BaseRenderer } from './base-renderer';
import { SensorTypeUtils } from '../../sensor-type-utils';

export class VpdCloudRenderer extends BaseRenderer {
    public render() {
        const { device, volatileGroup, visibility, selectedMetric } = this.context;
        if (!selectedMetric || selectedMetric === 'lights') {
            this.dispose();
            return;
        }

        if (!visibility.heatmap) {
            this.dispose();
            return;
        }

        const width = device.dimensions?.width ?? 120;
        const height = device.dimensions?.height ?? 200;
        const depth = device.dimensions?.length ?? (device.dimensions as any)?.depth ?? 120;

        let volMesh = this.cache.get('vpdCloud') as THREE.Mesh;
        const dimensionsKey = `${width}_${height}_${depth}`;

        if (volMesh) {
            if (volMesh.userData.dimensions !== dimensionsKey) {
                volatileGroup.remove(volMesh);
                this.disposeObject(volMesh);
                volMesh = this.createCloudMesh(width, height, depth);
                this.cache.set('vpdCloud', volMesh);
                volatileGroup.add(volMesh);
            }
        } else {
            volMesh = this.createCloudMesh(width, height, depth);
            this.cache.set('vpdCloud', volMesh);
            volatileGroup.add(volMesh);
        }

        this.updateUniforms();
    }

    private createCloudMesh(width: number, height: number, depth: number): THREE.Mesh {
        const volGeometry = this.getSharedGeometry('vpdCloudGeo', () => new THREE.BoxGeometry(1, 1, 1));
        const volMaterial = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.BackSide,
            uniforms: {
                u_sensorPositions: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) },
                u_sensorValues: { value: Array(16).fill(0) },
                u_sensorCount: { value: 0 },
                u_boxSize: { value: new THREE.Vector3(width, height, depth) },
                u_opacity: { value: 0.7 },
                u_thresholds: { value: new THREE.Vector4(0, 0, 0, 0) },
                u_time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vLocalPos;
                varying vec3 vWorldPos;
                void main() {
                    vLocalPos = position;
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                precision highp int;

                varying vec3 vLocalPos;
                varying vec3 vWorldPos;
                uniform vec3 u_sensorPositions[16];
                uniform float u_sensorValues[16];
                uniform int u_sensorCount;
                uniform vec3 u_boxSize;
                uniform float u_opacity;
                uniform vec4 u_thresholds; // x: dLow, y: wLow, z: wHigh, w: dHigh

                vec3 getHealthColor(float val) {
                    vec3 dangerLow = vec3(0.051, 0.278, 0.631); // #0d47a1
                    vec3 warnLow = vec3(0.129, 0.588, 0.953);   // #2196f3
                    vec3 optColor = vec3(0.298, 0.686, 0.314);  // #4caf50
                    vec3 warnHigh = vec3(1.0, 0.596, 0.0);      // #ff9800
                    vec3 dangerHigh = vec3(0.957, 0.263, 0.212); // #f44336
                    
                    if (val <= u_thresholds.x) return dangerLow;
                    if (val >= u_thresholds.w) return dangerHigh;
                    
                    if (val <= u_thresholds.y) {
                        float t = (val - u_thresholds.x) / (u_thresholds.y - u_thresholds.x);
                        return mix(dangerLow, warnLow, t);
                    }
                    
                    if (val >= u_thresholds.z) {
                        float t = (val - u_thresholds.z) / (u_thresholds.w - u_thresholds.z);
                        return mix(warnHigh, dangerHigh, t);
                    }
                    
                    // Internal Optimal range
                    float center = (u_thresholds.y + u_thresholds.z) * 0.5;
                    if (val < center) {
                        float t = (val - u_thresholds.y) / (center - u_thresholds.y);
                        return mix(warnLow, optColor, t);
                    } else {
                        float t = (val - center) / (u_thresholds.z - center);
                        return mix(optColor, warnHigh, t);
                    }
                }

                void main() {
                    vec3 rayOrigin = cameraPosition;
                    vec3 rayDir = normalize(vWorldPos - rayOrigin);
                    
                    float accumVal = 0.0;
                    float accumAlpha = 0.0;
                    float boxLength = length(u_boxSize);
                    float stepSize = boxLength / 16.0;
                    
                    for(int i = 0; i < 16; i++) {
                        vec3 p = vLocalPos - rayDir * (float(i) * stepSize * 0.5);
                        
                        if(abs(p.x) > u_boxSize.x * 0.501 || 
                           abs(p.y) > u_boxSize.y * 0.501 || 
                           abs(p.z) > u_boxSize.z * 0.501) {
                            continue;
                        }

                        float pointVal = 0.0;
                        float totalWeight = 0.0;
                        for(int j = 0; j < 16; j++) {
                            if(j < u_sensorCount) {
                                float d = distance(p, u_sensorPositions[j]);
                                float w = 1.0 / (pow(d / (boxLength * 0.25), 2.0) + 0.001);
                                pointVal += u_sensorValues[j] * w;
                                totalWeight += w;
                            }
                        }
                        
                        float val = pointVal / (totalWeight + 0.0001);
                        
                        float spread = 0.5;
                        float edgeX = 1.0 - smoothstep(u_boxSize.x * (spread - 0.1), u_boxSize.x * spread, abs(p.x));
                        float edgeY = 1.0 - smoothstep(u_boxSize.y * (spread - 0.1), u_boxSize.y * spread, abs(p.y));
                        float edgeZ = 1.0 - smoothstep(u_boxSize.z * (spread - 0.1), u_boxSize.z * spread, abs(p.z));
                        float edgeFactor = edgeX * edgeY * edgeZ;
                        
                        accumVal += val * edgeFactor;
                        accumAlpha += 0.1 * edgeFactor;
                    }

                    if (accumAlpha < 0.01) discard;

                    float finalVal = accumVal / (accumAlpha * 10.0 + 0.001);
                    vec3 color = getHealthColor(finalVal);
                    gl_FragColor = vec4(color, clamp(accumAlpha * u_opacity, 0.0, 1.0));
                }
            `
        });

        const volMesh = new THREE.Mesh(volGeometry, volMaterial);
        volMesh.scale.set(width, height, depth);
        volMesh.position.y = height / 2;
        volMesh.userData.isVpdCloud = true;
        volMesh.userData.dimensions = `${width}_${height}_${depth}`;
        return volMesh;
    }

    public updateUniforms() {
        const { device, volatileGroup, sensorMeshes, selectedMetric } = this.context;
        // Find mesh
        const volMesh = volatileGroup.children.find(c => c.userData?.isVpdCloud);
        if (!volMesh) return;

        const material = (volMesh as THREE.Mesh).material as THREE.ShaderMaterial;
        const ranges = {
            temperature: { min: 18, max: 32 },
            humidity: { min: 30, max: 85 },
            vpd: { min: 0.4, max: 2.0 }
        };
        const range = ranges[selectedMetric as keyof typeof ranges];
        if (!range) return; // Hide?

        const width = device.dimensions?.width ?? 120;
        const height = device.dimensions?.height ?? 200;
        const depth = device.dimensions?.length ?? (device.dimensions as any)?.depth ?? 120;

        // Update box size if changed
        if (material.uniforms.u_boxSize) {
            material.uniforms.u_boxSize.value.set(width, height, depth);
        }

        // Collect sensor data
        // We need 3D positions of active sensors.
        // We can use this.context.sensorMeshes to find positions!
        const heatmapPositions: THREE.Vector3[] = [];
        const heatmapValues: number[] = [];

        // This relies on SensorRenderer having run and populated sensorMeshes
        // Or we re-calculate positions from device.env...
        // Let's iterate `sensorMeshes` if available, or fall back to device config.

        sensorMeshes.forEach((mesh, entityId) => {
            // Strict filtering: Only allow sensors that match the selected metric.
            // We ignore lights, fans, etc. even if they are in sensorMeshes.
            let isRelevant = false;

            // Note: We use the context's 'hass' and 'device' for Utils
            const { hass, device } = this.context;

            if (selectedMetric === 'temperature') isRelevant = SensorTypeUtils.isTemperature(device, hass, entityId);
            else if (selectedMetric === 'humidity') isRelevant = SensorTypeUtils.isHumidity(device, hass, entityId);
            else if (selectedMetric === 'vpd') isRelevant = SensorTypeUtils.isVPD(device, hass, entityId);

            // Double check exclusions
            if (SensorTypeUtils.isLight(device, hass, entityId)) isRelevant = false;
            if (SensorTypeUtils.isFan(device, entityId)) isRelevant = false;

            if (!isRelevant) return;

            if (this.context.getSensorValue) {
                const val = this.context.getSensorValue(entityId, selectedMetric);
                if (val !== null) {
                    // Normalize value based on range
                    // 0..1 for color mixing?
                    // No, shader uses actual values and compares to thresholds.
                    // IMPORTANT: The shader `getHealthColor` compares `val` to `u_thresholds`.
                    // So we should pass RAW values.

                    // Mesh position is World or Local?
                    // They are added to volatileGroup. position is relative to volatileGroup.
                    // Shader calc uses vLocalPos which is vertex pos.
                    // Box is centered? Mesh is at y = height/2.
                    // Box geometry is width, height, depth.
                    // Vertices are -w/2 .. w/2 etc relative to mesh center.

                    // Sensor Mesh position:
                    // x - width/2, z, y - depth/2
                    // (See SensorRenderer)
                    // But `z` is height here.

                    // The Cloud Mesh is at (0, height/2, 0) relative to volatileGroup.
                    // So Cloud Local (0,0,0) is Volatile (0, height/2, 0).
                    // Sensor Local Pos = Sensor Volatile Pos - Cloud Volatile Pos

                    const sensorPos = new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z);
                    sensorPos.sub(volMesh.position);

                    // The shader uses Z for up?
                    // Shader:
                    // if(abs(p.x) > u_boxSize.x ... p.y ... p.z)
                    // BoxGeometry(w, h, d) -> x=w, y=h, z=d
                    // In ThreeJS Y is Up.
                    // In EquipmentRenderer/SensorRenderer:
                    // position.set(x - W/2, z_height, y - D/2) -> Y is Height.

                    // So p.y is height. p.x is width. p.z is depth.
                    // This matches.

                    const normalizedVal = val; // Pass raw value

                    heatmapPositions.push(sensorPos);
                    heatmapValues.push(normalizedVal);
                }
            }
        });

        if (material.uniforms.u_sensorPositions && material.uniforms.u_sensorValues && material.uniforms.u_sensorCount) {
            material.uniforms.u_sensorPositions.value = heatmapPositions.concat(Array.from({ length: 16 - heatmapPositions.length }, () => new THREE.Vector3()));
            material.uniforms.u_sensorValues.value = heatmapValues.concat(Array(16 - heatmapValues.length).fill(0));
            material.uniforms.u_sensorCount.value = heatmapPositions.length;
        }

        // Thresholds
        const vpdMetrics = device.biologicalMetrics || {};
        const thresholds = selectedMetric === 'vpd' ? {
            dLow: vpdMetrics.vpdDangerMin || 0.4,
            wLow: vpdMetrics.vpdTargetMin || 0.8,
            wHigh: vpdMetrics.vpdTargetMax || 1.2,
            dHigh: vpdMetrics.vpdDangerMax || 1.6
        } : (
            selectedMetric === 'temperature' ? {
                dLow: 15, wLow: 18, wHigh: 28, dHigh: 35
            } : {
                // Humidity
                dLow: 30, wLow: 40, wHigh: 70, dHigh: 85
            }
        );

        if (material.uniforms.u_thresholds) {
            material.uniforms.u_thresholds.value.set(
                thresholds.dLow,
                thresholds.wLow,
                thresholds.wHigh,
                thresholds.dHigh
            );
        } else {
            // Fallback or init
        }
    }
}
