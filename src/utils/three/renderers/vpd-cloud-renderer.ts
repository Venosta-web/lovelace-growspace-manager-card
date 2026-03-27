
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
                u_time: { value: 0 },
                u_localCameraPos: { value: new THREE.Vector3() }
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
                uniform vec4 u_thresholds;
                uniform float u_time;
                uniform vec3 u_localCameraPos;

                // --- 3D Noise (Simplex-ish) ---
                vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
                vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
                vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

                float noise(vec3 P) {
                    vec3 i0 = floor(P);
                    vec3 i1 = i0 + vec3(1.0);
                    vec3 f0 = fract(P);
                    vec3 f1 = f0 - vec3(1.0);
                    vec3 f = fade(f0);
                    vec4 ix = vec4(i0.x, i1.x, i0.x, i1.x);
                    vec4 iy = vec4(i0.y, i0.y, i1.y, i1.y);
                    vec4 iz0 = vec4(i0.z, i0.z, i0.z, i0.z);
                    vec4 iz1 = vec4(i1.z, i1.z, i1.z, i1.z);

                    vec4 ixy = permute(permute(ix) + iy);
                    vec4 ixy0 = permute(ixy + iz0);
                    vec4 ixy1 = permute(ixy + iz1);

                    vec4 gx0 = ixy0 * (1.0 / 7.0);
                    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
                    gx0 = fract(gx0);
                    vec4 gz0 = vec4(0.5, 0.5, 0.5, 0.5) - abs(gx0) - abs(gy0);
                    vec4 sz0 = step(gz0, vec4(0.0, 0.0, 0.0, 0.0));
                    gx0 -= sz0 * (step(vec4(0.0, 0.0, 0.0, 0.0), gx0) - 0.5);
                    gy0 -= sz0 * (step(vec4(0.0, 0.0, 0.0, 0.0), gy0) - 0.5);

                    vec4 gx1 = ixy1 * (1.0 / 7.0);
                    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
                    gx1 = fract(gx1);
                    vec4 gz1 = vec4(0.5, 0.5, 0.5, 0.5) - abs(gx1) - abs(gy1);
                    vec4 sz1 = step(gz1, vec4(0.0, 0.0, 0.0, 0.0));
                    gx1 -= sz1 * (step(vec4(0.0, 0.0, 0.0, 0.0), gx1) - 0.5);
                    gy1 -= sz1 * (step(vec4(0.0, 0.0, 0.0, 0.0), gy1) - 0.5);

                    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
                    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
                    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
                    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
                    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
                    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
                    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
                    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

                    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g100, g100), dot(g010, g010), dot(g110, g110)));
                    g000 *= norm0.x; g100 *= norm0.y; g010 *= norm0.z; g110 *= norm0.w;
                    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g101, g101), dot(g011, g011), dot(g111, g111)));
                    g001 *= norm1.x; g101 *= norm1.y; g011 *= norm1.z; g111 *= norm1.w;

                    float n000 = dot(g000, f0);
                    float n100 = dot(g100, vec3(f1.x, f0.y, f0.z));
                    float n010 = dot(g010, vec3(f0.x, f1.y, f0.z));
                    float n110 = dot(g110, vec3(f1.x, f1.y, f0.z));
                    float n001 = dot(g001, vec3(f0.x, f0.y, f1.z));
                    float n101 = dot(g101, vec3(f1.x, f0.y, f1.z));
                    float n011 = dot(g011, vec3(f0.x, f1.y, f1.z));
                    float n111 = dot(g111, f1);

                    float nx00 = mix(n000, n100, f.x);
                    float nx01 = mix(n001, n101, f.x);
                    float nx10 = mix(n010, n110, f.x);
                    float nx11 = mix(n011, n111, f.x);

                    float nxy0 = mix(nx00, nx10, f.y);
                    float nxy1 = mix(nx01, nx11, f.y);

                    return 0.5 + 0.5 * mix(nxy0, nxy1, f.z);
                }

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
                    
                    float center = (u_thresholds.y + u_thresholds.z) * 0.5;
                    if (val < center) {
                        float t = (val - u_thresholds.y) / (center - u_thresholds.y);
                        return mix(warnLow, optColor, t);
                    } else {
                        float t = (val - center) / (u_thresholds.z - center);
                        return mix(optColor, warnHigh, t);
                    }
                }

                // Ray-AABB intersection for unit box [-0.5, 0.5]
                bool intersectBox(vec3 ro, vec3 rd, out float tnear, out float tfar) {
                    vec3 m = 1.0 / rd;
                    vec3 n = m * ro;
                    vec3 k = abs(m) * 0.5;
                    vec3 t1 = -n - k;
                    vec3 t2 = -n + k;
                    tnear = max(max(t1.x, t1.y), t1.z);
                    tfar = min(min(t2.x, t2.y), t2.z);
                    return tnear < tfar && tfar > 0.0;
                }

                void main() {
                    vec3 rayOrigin = u_localCameraPos;
                    vec3 rayDir = normalize(vLocalPos - rayOrigin);

                    float tnear, tfar;
                    if (!intersectBox(rayOrigin, rayDir, tnear, tfar)) { discard; }

                    tnear = max(tnear, 0.0);
                    
                    float boxMaxSize = max(u_boxSize.x, max(u_boxSize.y, u_boxSize.z));
                    int steps = 64;
                    float stepSize = (tfar - tnear) / float(steps);
                    
                    vec4 accum = vec4(0.0, 0.0, 0.0, 0.0);
                    vec3 p = rayOrigin + rayDir * tnear;

                    for(int i = 0; i < 64; i++) {
                        if (accum.a >= 0.95) break;

                        // IDW Interpolation
                        float pointVal = 0.0;
                        float totalWeight = 0.0;
                        float minDist = 1e10;

                        for(int j = 0; j < 16; j++) {
                            if(j < u_sensorCount) {
                                float d = distance(p * u_boxSize, u_sensorPositions[j]);
                                minDist = min(minDist, d);
                                // Softer falloff for more "blurry" cloud
                                float w = 1.0 / (pow(d / (boxMaxSize * 0.45), 2.2) + 0.0001);
                                pointVal += u_sensorValues[j] * w;
                                totalWeight += w;
                            }
                        }
                        
                        float val = pointVal / (totalWeight + 0.0001);
                        vec3 color = getHealthColor(val);

                        // Density calculation
                        // Drifting noise using u_time
                        float n1 = noise(p * 3.5 + vec3(u_time * 0.1, u_time * 0.05, 0.0));
                        float n2 = noise(p * 7.0 - vec3(0.0, u_time * 0.1, u_time * 0.05));
                        float n = mix(n1, n2, 0.4);
                        
                        // Distance-based fade: cloud is denser near sensors
                        float sensorFade = smoothstep(boxMaxSize * 0.7, boxMaxSize * 0.1, minDist);
                        
                        // Edge fade
                        float edgeX = 1.0 - smoothstep(0.4, 0.5, abs(p.x));
                        float edgeY = 1.0 - smoothstep(0.4, 0.5, abs(p.y));
                        float edgeZ = 1.0 - smoothstep(0.4, 0.5, abs(p.z));
                        float edgeFactor = edgeX * edgeY * edgeZ;

                        // More clumpy density
                        float density = pow(n, 2.0) * 1.5 * sensorFade * edgeFactor * u_opacity;
                        
                        // Alpha blending
                        float alpha = density * stepSize * 4.0; 
                        accum.rgb += (1.0 - accum.a) * color * alpha;
                        accum.a += (1.0 - accum.a) * alpha;

                        p += rayDir * stepSize;
                    }

                    if (accum.a < 0.01) { discard; }
                    gl_FragColor = accum;
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

    public animate(deltaTime: number): void {
        const { volatileGroup } = this.context;
        const volMesh = volatileGroup.children.find(c => c.userData?.isVpdCloud) as THREE.Mesh;
        if (!volMesh) return;

        const material = volMesh.material as THREE.ShaderMaterial;
        if (material.uniforms.u_time) {
            material.uniforms.u_time.value += deltaTime;
        }
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

        if (material.uniforms.u_localCameraPos) {
            const worldInv = new THREE.Matrix4().copy(volMesh.matrixWorld).invert();
            const localCam = this.context.camera.position.clone().applyMatrix4(worldInv);
            material.uniforms.u_localCameraPos.value.copy(localCam);
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
