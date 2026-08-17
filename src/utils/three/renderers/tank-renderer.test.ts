import { describe, it, expect, afterEach } from 'vitest';
import * as THREE from 'three';
import { TankRenderer } from './tank-renderer';
import type { RendererContext } from './base-renderer';
import { resolveRamp } from '../../../styles/environment-ramp';
import type { GrowspaceDevice } from '../../../types';

/**
 * ADR 0040 §7: the tank's mesh and its CSS2D label are two representations of one
 * role that were never the same colour — the mesh carried 0xff4422 / 0x00aaff while
 * the label carried #f44336 / #2196f3. The label was the correct half.
 */

const hosts: HTMLElement[] = [];

function makeContext(tanks: { isWarning: boolean }[]): RendererContext {
  const scene = new THREE.Scene();
  const volatileGroup = new THREE.Group();
  scene.add(volatileGroup);
  return {
    scene,
    volatileGroup,
    device: {
      dimensions: { width: 120, height: 200, length: 120 },
      environmentAttributes: {
        irrigationTanks: tanks.map((t, i) => ({
          sensorEntity: `sensor.tank_${i}`,
          isWarning: t.isWarning,
          fillLevel: 50,
        })),
        sensorCoordinates: {},
      },
    } as unknown as GrowspaceDevice,
    hass: undefined,
    selectedMetric: 'vpd',
    timelineIndex: -1,
    historyData: {},
    sensorMeshes: new Map(),
    visibility: { plants: false, lights: false, fans: false, heatmap: true, tooltips: true },
    camera: new THREE.PerspectiveCamera(),
  };
}

function renderTank(isWarning: boolean): { meshHex: string; labelHTML: string } {
  const context = makeContext([{ isWarning }]);
  new TankRenderer(context).render();

  const group = context.volatileGroup.children[0] as THREE.Group;
  const cap = group.getObjectByName('cap') as THREE.Mesh;
  const label = group.getObjectByName('label') as unknown as { element: HTMLElement };

  return {
    meshHex: `#${(cap.material as THREE.MeshStandardMaterial).color.getHexString()}`,
    labelHTML: label.element.innerHTML,
  };
}

/** What the browser computes for a CSS colour, mounted in a scope with no tokens set. */
function computed(css: string, prop: 'color' | 'background-color' = 'color'): string {
  const probe = document.createElement('div');
  probe.style.setProperty(prop === 'color' ? 'color' : 'background-color', css);
  document.body.appendChild(probe);
  hosts.push(probe);
  return getComputedStyle(probe)[prop === 'color' ? 'color' : 'backgroundColor'];
}

/** Composites a possibly-translucent colour over white, so alpha and channels both count. */
function paintOverWhite(css: string): number[] {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data];
}

const toHex = (rgb: string): string => {
  const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};

afterEach(() => hosts.splice(0).forEach((el) => el.remove()));

describe('tank liquid and label resolve to one colour', () => {
  it.each([
    { state: 'warning', isWarning: true, role: 'farHigh' as const },
    { state: 'normal', isWarning: false, role: 'low' as const },
  ])('agree in the $state state', ({ isWarning, role }) => {
    const { meshHex, labelHTML } = renderTank(isWarning);

    // The label carries the token; resolve it the way the browser will.
    const borderMatch = labelHTML.match(/border-color: (var\([^)]*\))/)!;
    const labelHex = toHex(computed(borderMatch[1]));

    expect(meshHex).toBe(labelHex);
    expect(meshHex).toBe(toHex(computed(resolveRamp(null)[role])));
  });

  it('no longer holds the mesh values that disagreed with the label', () => {
    expect(renderTank(true).meshHex).not.toBe('#ff4422');
    expect(renderTank(false).meshHex).not.toBe('#00aaff');
    // The label's documented values are what both halves now land on.
    expect(renderTank(true).meshHex).toBe('#f44336');
    expect(renderTank(false).meshHex).toBe('#2196f3');
  });

  it('replaces the alpha suffix with color-mix at the same translucency', () => {
    const { labelHTML } = renderTank(true);
    expect(labelHTML).toContain('color-mix(in srgb,');
    expect(labelHTML).not.toMatch(/#[0-9a-fA-F]{6}33\b/);

    // 0x33/0xff is 0.2 exactly, but the claim is measured rather than assumed —
    // and compared by painting, since color-mix computes to `color(srgb … / 0.2)`
    // while the old suffix computes to `rgba(…)`. Same colour, different syntax.
    const mix = labelHTML.match(/background: (color-mix\([^;]*\))/)![1];
    expect(paintOverWhite(computed(mix, 'background-color'))).toEqual(
      paintOverWhite(computed('#f4433633', 'background-color'))
    );
  });

  it('keeps each token in fallback form, so a scope-less mount still paints', () => {
    // The label mounts inside heatmap-3d's shadow root; a bare var() there drops the
    // whole declaration if that root has not composed the block declaring the token.
    const { labelHTML } = renderTank(false);
    const vars = labelHTML.match(/var\(--gm-[a-z-]+,\s*#[0-9a-fA-F]{6}\)/g) ?? [];
    expect(vars.length).toBeGreaterThanOrEqual(3);
  });
});
