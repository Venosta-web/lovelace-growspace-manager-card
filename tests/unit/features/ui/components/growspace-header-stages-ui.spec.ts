import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeaderStagesUI } from '../../../../../src/features/ui/components/growspace-header-stages-ui';

if (!customElements.get('growspace-header-stages-ui')) {
  customElements.define('growspace-header-stages-ui', GrowspaceHeaderStagesUI);
}

describe('growspace-header-stages-ui', () => {
  it('renders nothing when dominant is undefined', async () => {
    const el = await fixture<GrowspaceHeaderStagesUI>(
      html`<growspace-header-stages-ui></growspace-header-stages-ui>`
    );
    expect(el.shadowRoot!.textContent!.trim()).toBe('');
  });

  it('renders stage pills when dominant info is provided', async () => {
    const dominant = {
      icon: 'M12,2A10,10 0 1,0 22,12A10,10 0 0,0 12,2Z',
      daysLabel: '15 Days',
      weeksLabel: 'Week 2',
      stage: 'Veg'
    } as any;

    const el = await fixture<GrowspaceHeaderStagesUI>(
      html`<growspace-header-stages-ui .dominant=${dominant}></growspace-header-stages-ui>`
    );

    const pills = el.shadowRoot!.querySelectorAll('.gs-stage-pill');
    expect(pills.length).toBe(2);
    expect(pills[0].textContent).toContain('15 Days');
    expect(pills[1].textContent).toContain('Week 2');
    
    const paths = el.shadowRoot!.querySelectorAll('path');
    expect(paths[0].getAttribute('d')).toBe(dominant.icon);
    expect(paths[1].getAttribute('d')).toBe(dominant.icon);
  });
});
