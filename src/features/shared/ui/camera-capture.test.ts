import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import './camera-capture';
import type { CameraCapture } from './camera-capture';

function makeFile(name = 'photo.jpg'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });
}

function setFiles(input: HTMLInputElement, files: File[]): void {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  input.files = dt.files;
  input.dispatchEvent(new Event('change'));
}

describe('camera-capture', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('open() shows the bottom-sheet menu with both choices', async () => {
    const el = await fixture<CameraCapture>(html`<camera-capture></camera-capture>`);
    expect(el.shadowRoot?.querySelector('.sheet')).toBeNull();

    el.open();
    await el.updateComplete;

    const actions = el.shadowRoot?.querySelectorAll('.sheet-action');
    expect(actions).toHaveLength(2);
    expect(actions?.[0].textContent).toContain('Take Photo');
    expect(actions?.[1].textContent).toContain('Choose from Library');
  });

  it('reflects the multiple flag onto the library input only', async () => {
    const el = await fixture<CameraCapture>(
      html`<camera-capture .multiple=${true}></camera-capture>`
    );
    const library = el.shadowRoot?.getElementById('gallery-library-input') as HTMLInputElement;
    const camera = el.shadowRoot?.getElementById('gallery-camera-input') as HTMLInputElement;
    expect(library.multiple).toBe(true);
    expect(camera.multiple).toBe(false);
  });

  it('emits capture with the selected files and closes the menu', async () => {
    const el = await fixture<CameraCapture>(
      html`<camera-capture .multiple=${true}></camera-capture>`
    );
    el.open();
    await el.updateComplete;

    const captured: File[][] = [];
    el.addEventListener('capture', (e) => {
      captured.push((e as CustomEvent<{ files: File[] }>).detail.files);
    });

    const library = el.shadowRoot?.getElementById('gallery-library-input') as HTMLInputElement;
    setFiles(library, [makeFile('a.jpg'), makeFile('b.jpg')]);
    await el.updateComplete;

    expect(captured).toHaveLength(1);
    expect(captured[0].map((f) => f.name)).toEqual(['a.jpg', 'b.jpg']);
    expect(el.shadowRoot?.querySelector('.sheet')).toBeNull();
  });

  it('does not emit capture when no file is selected', async () => {
    const el = await fixture<CameraCapture>(html`<camera-capture></camera-capture>`);
    let fired = false;
    el.addEventListener('capture', () => {
      fired = true;
    });
    const library = el.shadowRoot?.getElementById('gallery-library-input') as HTMLInputElement;
    setFiles(library, []);
    await el.updateComplete;
    expect(fired).toBe(false);
  });

  it('falls back to the hidden camera input when getUserMedia is unavailable', async () => {
    const el = await fixture<CameraCapture>(html`<camera-capture></camera-capture>`);
    // Simulate a context without MediaDevices (e.g. insecure origin).
    vi.spyOn(navigator, 'mediaDevices', 'get').mockReturnValue(undefined as never);

    const camera = el.shadowRoot?.getElementById('gallery-camera-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(camera, 'click').mockImplementation(() => {});

    el.open();
    await el.updateComplete;
    (el.shadowRoot?.querySelectorAll('.sheet-action')[0] as HTMLButtonElement).click();
    await el.updateComplete;

    expect(clickSpy).toHaveBeenCalledOnce();
  });
});
