/**
 * Render-once smoke test for add-plant-dialog wired to its SM.
 * Confirms the component mounts without crash and that SM state
 * drives the render — not scattered @state fields.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { AddPlantDialog } from '../../../src/dialogs/add-plant-dialog';
import '../../../src/dialogs/add-plant-dialog';
import { aPlant, aGrowspace } from '../../fixtures';
import { createInitialSM } from '../../../src/dialogs/add-plant-dialog-sm';

if (!customElements.get('ha-dialog')) {
  class MockHaDialog extends HTMLElement {
    open = false;
  }
  customElements.define('ha-dialog', MockHaDialog);
}

describe('AddPlantDialog — SM wiring smoke test', () => {
  it('renders without crash when open with default SM state', async () => {
    const element = await fixture<AddPlantDialog>(
      html`<add-plant-dialog></add-plant-dialog>`
    );
    element.hass = {} as any;
    element.strainLibrary = [];
    element.open = true;
    element.setInitialState(1, 2);
    await element.updateComplete;

    expect(element).toBeInstanceOf(AddPlantDialog);
    const dialog = element.shadowRoot?.querySelector('ha-dialog');
    expect(dialog).toBeTruthy();
  });

  it('SM activeTab drives rendered tab bar active state', async () => {
    const element = await fixture<AddPlantDialog>(
      html`<add-plant-dialog></add-plant-dialog>`
    );
    element.hass = {} as any;
    element.strainLibrary = [];
    element.open = true;
    element.setInitialState(0, 0);
    await element.updateComplete;

    const tabs = element.shadowRoot?.querySelectorAll('.tab');
    expect(tabs?.[0].classList.contains('active')).toBe(true);
    expect(tabs?.[1].classList.contains('active')).toBe(false);
  });

  it('SM step-identity sub drives wizard step indicator to step 1', async () => {
    const element = await fixture<AddPlantDialog>(
      html`<add-plant-dialog></add-plant-dialog>`
    );
    element.hass = {} as any;
    element.strainLibrary = [];
    element.open = true;
    element.setInitialState(0, 0);
    await element.updateComplete;

    const activeStep = element.shadowRoot?.querySelector('.wizard-step.active');
    expect(activeStep?.textContent?.trim()).toMatch(/Identity/);
  });

  it('renders plant fixtures without crash', async () => {
    const growspace = aGrowspace();
    const plant = aPlant();
    const element = await fixture<AddPlantDialog>(
      html`<add-plant-dialog></add-plant-dialog>`
    );
    element.hass = {} as any;
    element.strainLibrary = [];
    element.siblingPlants = [plant as any];
    element.growspaceName = growspace.name;
    element.open = true;
    element.setInitialState(0, 0);
    await element.updateComplete;

    expect(element).toBeInstanceOf(AddPlantDialog);
  });
});
