import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { VpdCloudRenderer } from './vpd-cloud-renderer';
import type { RendererContext } from './base-renderer';
import { ENVIRONMENT_RAMP, resolveRamp, type RampPalette } from '../../../styles/environment-ramp';
import type { GrowspaceDevice } from '../../../types';

/**
 * ADR 0040 §10: the shader pair is a descriptor-equality test, not WebGL readback.
 * `ShaderMaterial` is plain data until it reaches a GL context, so the uniform can be
 * read straight off the material with no renderer and no canvas.
 */

/** The five stops, in the ordinal order the shader indexes `u_ramp` by. */
const ROLES = ENVIRONMENT_RAMP.map((stop) => stop.role);

function makeContext(): RendererContext {
  const scene = new THREE.Scene();
  const volatileGroup = new THREE.Group();
  scene.add(volatileGroup);
  return {
    scene,
    volatileGroup,
    device: { dimensions: { width: 120, height: 200, length: 120 } } as GrowspaceDevice,
    hass: undefined,
    selectedMetric: 'vpd',
    timelineIndex: -1,
    historyData: {},
    sensorMeshes: new Map(),
    visibility: { plants: false, lights: false, fans: false, heatmap: true, tooltips: false },
    camera: new THREE.PerspectiveCamera(),
  };
}

function rampUniform(renderer: VpdCloudRenderer, context: RendererContext): THREE.Color[] {
  renderer.render();
  const mesh = context.volatileGroup.children.find((c) => c.userData?.isVpdCloud) as THREE.Mesh;
  const material = mesh.material as THREE.ShaderMaterial;
  return material.uniforms.u_ramp.value as THREE.Color[];
}

/** What a `vec3` of this css colour must hold to reach the framebuffer unchanged. */
function expectedChannels(css: string): [number, number, number] {
  const c = new THREE.Color().setStyle(css, THREE.LinearSRGBColorSpace);
  return [c.r, c.g, c.b];
}

describe('vpd cloud shader ramp', () => {
  it('feeds u_ramp from the resolved palette, in ordinal order', () => {
    const context = makeContext();
    const palette = resolveRamp(null);
    context.rampPalette = palette;

    const colors = rampUniform(new VpdCloudRenderer(context), context);

    expect(colors).toHaveLength(ROLES.length);
    ROLES.forEach((role, i) => {
      const [r, g, b] = expectedChannels(palette[role]);
      expect([colors[i].r, colors[i].g, colors[i].b], role).toEqual([r, g, b]);
    });
  });

  it('tracks the palette when a stop changes', () => {
    const context = makeContext();
    const renderer = new VpdCloudRenderer(context);

    context.rampPalette = resolveRamp(null);
    const before = rampUniform(renderer, context).map((c) => c.getHex());

    const themed: RampPalette = { ...resolveRamp(null), low: 'rgb(255, 0, 255)' };
    context.rampPalette = themed;
    const after = rampUniform(renderer, context).map((c) => c.getHex());

    expect(after[ROLES.indexOf('low')]).not.toBe(before[ROLES.indexOf('low')]);
    expect(after[ROLES.indexOf('optimal')]).toBe(before[ROLES.indexOf('optimal')]);
  });

  it('keeps the ramp sRGB-encoded, because the shader writes gl_FragColor unencoded', () => {
    const context = makeContext();
    context.rampPalette = { ...resolveRamp(null), farLow: 'rgb(13, 71, 161)' };

    const colors = rampUniform(new VpdCloudRenderer(context), context);

    // The constant this replaced was vec3(0.051, 0.278, 0.631) — plain /255, sRGB.
    // Converting into the linear working space would land .r on ~0.004 and paint the
    // cloud near-black, since no <colorspace_fragment> chunk re-encodes the output.
    expect(colors[ROLES.indexOf('farLow')].r).toBeCloseTo(0.051, 3);
    expect(colors[ROLES.indexOf('farLow')].g).toBeCloseTo(0.278, 3);
    expect(colors[ROLES.indexOf('farLow')].b).toBeCloseTo(0.631, 3);
  });

  it('falls back to the descriptor when no host resolved a palette', () => {
    const context = makeContext();
    const colors = rampUniform(new VpdCloudRenderer(context), context);

    const [r, g, b] = expectedChannels(resolveRamp(null).farHigh);
    const farHigh = colors[ROLES.indexOf('farHigh')];
    expect([farHigh.r, farHigh.g, farHigh.b]).toEqual([r, g, b]);
  });

  it('declares u_ramp in the fragment shader and holds no colour literals', () => {
    const context = makeContext();
    const renderer = new VpdCloudRenderer(context);
    renderer.render();
    const mesh = context.volatileGroup.children.find((c) => c.userData?.isVpdCloud) as THREE.Mesh;
    const { fragmentShader } = mesh.material as THREE.ShaderMaterial;

    expect(fragmentShader).toContain('uniform vec3 u_ramp[5]');
    // The hand-maintained `// #hex` comments are gone, not updated.
    expect(fragmentShader).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});
