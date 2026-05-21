import { describe, it, expect, afterEach } from 'vitest';
import { GsDialog } from './gs-dialog';
import './gs-dialog';

const mockTags = ['ha-dialog', 'ha-svg-icon'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function createElement(props: Partial<{
  open: boolean;
  heading: string;
  subtitle: string;
  iconPath: string;
  stageColor: string;
  submitting: boolean;
}> = {}): GsDialog {
  const el = document.createElement('gs-dialog') as GsDialog;
  Object.assign(el, { heading: '', ...props });
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GsDialog – open state', () => {
  it('renders nothing when open is false', async () => {
    const el = createElement({ open: false, heading: 'Test' });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('ha-dialog')).toBeNull();
  });

  it('renders ha-dialog when open is true', async () => {
    const el = createElement({ open: true, heading: 'Test' });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('ha-dialog')).not.toBeNull();
  });
});

describe('GsDialog – heading and subtitle', () => {
  it('displays the heading', async () => {
    const el = createElement({ open: true, heading: 'Phenotype Scoring' });
    await el.updateComplete;
    const title = el.shadowRoot?.querySelector('.dialog-title');
    expect(title?.textContent?.trim()).toBe('Phenotype Scoring');
  });

  it('shows subtitle when provided', async () => {
    const el = createElement({ open: true, heading: 'Test', subtitle: 'Maui Wowie — Pheno A' });
    await el.updateComplete;
    const sub = el.shadowRoot?.querySelector('.dialog-subtitle');
    expect(sub?.textContent?.trim()).toBe('Maui Wowie — Pheno A');
  });

  it('omits subtitle element when subtitle is empty', async () => {
    const el = createElement({ open: true, heading: 'Test', subtitle: '' });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.dialog-subtitle')).toBeNull();
  });
});

describe('GsDialog – icon', () => {
  it('renders dialog-icon when iconPath is provided', async () => {
    const el = createElement({ open: true, heading: 'Test', iconPath: 'M1 1 L2 2' });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.dialog-icon')).not.toBeNull();
  });

  it('omits dialog-icon when iconPath is empty', async () => {
    const el = createElement({ open: true, heading: 'Test', iconPath: '' });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.dialog-icon')).toBeNull();
  });
});

describe('GsDialog – close behaviour', () => {
  it('dispatches a composed "close" event when close button is clicked', async () => {
    const el = createElement({ open: true, heading: 'Test' });
    await el.updateComplete;

    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));

    const btn = el.shadowRoot?.querySelector('button.dialog-close-btn') as HTMLButtonElement;
    btn?.click();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('close');
    expect((events[0] as CustomEvent).bubbles).toBe(true);
    expect((events[0] as CustomEvent).composed).toBe(true);
  });

  it('disables close button when submitting is true', async () => {
    const el = createElement({ open: true, heading: 'Test', submitting: true });
    await el.updateComplete;
    const btn = el.shadowRoot?.querySelector('button.dialog-close-btn') as HTMLButtonElement;
    expect(btn?.disabled).toBe(true);
  });

  it('enables close button when submitting is false', async () => {
    const el = createElement({ open: true, heading: 'Test', submitting: false });
    await el.updateComplete;
    const btn = el.shadowRoot?.querySelector('button.dialog-close-btn') as HTMLButtonElement;
    expect(btn?.disabled).toBe(false);
  });
});

describe('GsDialog – stageColor', () => {
  it('sets --stage-color CSS var on the container when stageColor is provided', async () => {
    const el = createElement({ open: true, heading: 'Test', stageColor: '#8bc34a' });
    await el.updateComplete;
    const container = el.shadowRoot?.querySelector('.glass-dialog-container') as HTMLElement;
    expect(container?.getAttribute('style')).toContain('--stage-color: #8bc34a');
  });

  it('sets no style attribute on the container when stageColor is empty', async () => {
    const el = createElement({ open: true, heading: 'Test', stageColor: '' });
    await el.updateComplete;
    const container = el.shadowRoot?.querySelector('.glass-dialog-container') as HTMLElement;
    expect(container?.getAttribute('style') ?? '').toBe('');
  });
});
