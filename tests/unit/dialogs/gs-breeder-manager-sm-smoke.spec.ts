/**
 * Render-once smoke test for gs-breeder-manager wired to its SM.
 * Confirms the component mounts without crash and that SM state
 * drives the render — not scattered @state fields.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GsBreederManager } from '../../../src/dialogs/gs-breeder-manager';
import '../../../src/dialogs/gs-breeder-manager';
import { aStrain } from '../../fixtures';
import { transition } from '../../../src/dialogs/gs-breeder-manager-sm';

const mockTags = ['gs-dialog', 'gs-help-tooltip', 'ha-dialog'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

describe('GsBreederManager — SM wiring smoke test', () => {
  it('renders without crash when open with default SM state', async () => {
    const strains = [aStrain({ breeder: 'DNA Genetics' })];
    const el = await fixture<GsBreederManager>(
      html`<gs-breeder-manager .open=${true} .strains=${strains}></gs-breeder-manager>`
    );
    await el.updateComplete;
    expect(el).toBeInstanceOf(GsBreederManager);
    expect(el.shadowRoot?.querySelector('gs-dialog')).toBeTruthy();
  });

  it('renders list view by default', async () => {
    const strains = [aStrain({ breeder: 'DNA Genetics' })];
    const el = await fixture<GsBreederManager>(
      html`<gs-breeder-manager .open=${true} .strains=${strains}></gs-breeder-manager>`
    );
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.breeder-list')).toBeTruthy();
  });

  it('SM activeView editor drives editor rendering', async () => {
    const el = await fixture<GsBreederManager>(
      html`<gs-breeder-manager .open=${true} .strains=${[]}></gs-breeder-manager>`
    );
    (el as any)._sm = transition((el as any)._sm, {
      type: 'EDIT_REQUESTED',
      name: 'DNA Genetics',
      logo: '',
    });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.breeder-list')).toBeNull();
    expect(el.shadowRoot?.querySelector('.sd-content')).toBeTruthy();
  });

  it('SM confirm-delete sub drives delete confirmation overlay', async () => {
    const strains = [aStrain({ breeder: 'DNA Genetics' })];
    const el = await fixture<GsBreederManager>(
      html`<gs-breeder-manager .open=${true} .strains=${strains}></gs-breeder-manager>`
    );
    (el as any)._sm = transition((el as any)._sm, {
      type: 'DELETE_REQUESTED',
      name: 'DNA Genetics',
    });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('ha-dialog')).toBeTruthy();
  });
});
