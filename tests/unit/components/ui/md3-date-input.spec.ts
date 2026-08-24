import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Md3DateInput } from '../../../../src/features/shared/ui/md3-date-input';

// Ensure custom element is defined
if (!customElements.get('md3-date-input')) {
  customElements.define('md3-date-input', Md3DateInput);
}

const inputs = (el: Md3DateInput) =>
  Array.from(el.shadowRoot?.querySelectorAll('input') ?? []) as HTMLInputElement[];

const dateInput = (el: Md3DateInput) => inputs(el).find((i) => i.type === 'date')!;
const timeInput = (el: Md3DateInput) => inputs(el).find((i) => i.type === 'time')!;

const setValue = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('change'));
};

describe('Md3DateInput', () => {
  let element: Md3DateInput;

  beforeEach(async () => {
    element = document.createElement('md3-date-input') as Md3DateInput;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should render a single date input by default', () => {
    expect(inputs(element).map((i) => i.type)).toEqual(['date']);
  });

  it('should render separate date and time inputs when time prop is true', async () => {
    element.time = true;
    await element.updateComplete;
    expect(inputs(element).map((i) => i.type)).toEqual(['date', 'time']);
  });

  it('should format date value correctly', async () => {
    element.value = '2023-10-05T12:00:00';
    await element.updateComplete;
    expect(dateInput(element).value).toBe('2023-10-05');
  });

  it('should split a datetime value across both inputs', async () => {
    element.time = true;
    element.value = '2023-10-05T12:00:00';
    await element.updateComplete;
    expect(dateInput(element).value).toBe('2023-10-05');
    expect(timeInput(element).value).toBe('12:00');
  });

  it('should dispatch change event on date input', () => {
    const listener = vi.fn();
    element.addEventListener('change', listener);

    setValue(dateInput(element), '2023-12-25');

    expect(element.value).toBe('2023-12-25');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: '2023-12-25' }));
  });

  it('should combine date and time into a single value', async () => {
    element.time = true;
    element.value = '2023-10-05T12:00';
    await element.updateComplete;

    const listener = vi.fn();
    element.addEventListener('change', listener);

    setValue(timeInput(element), '18:45');

    expect(element.value).toBe('2023-10-05T18:45');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: '2023-10-05T18:45' }));
  });

  it('should default a missing time to midnight rather than emitting a partial value', async () => {
    element.time = true;
    await element.updateComplete;

    setValue(dateInput(element), '2023-12-25');

    expect(element.value).toBe('2023-12-25T00:00');
  });

  it('should keep the time when only the date changes', async () => {
    element.time = true;
    element.value = '2023-10-05T18:45';
    await element.updateComplete;

    setValue(dateInput(element), '2023-10-06');

    expect(element.value).toBe('2023-10-06T18:45');
  });

  it('should clear the whole value when the date is emptied', async () => {
    element.time = true;
    element.value = '2023-10-05T18:45';
    await element.updateComplete;

    setValue(dateInput(element), '');

    expect(element.value).toBe('');
  });

  it('should ignore a time set with no date', async () => {
    element.time = true;
    await element.updateComplete;

    setValue(timeInput(element), '18:45');

    expect(element.value).toBe('');
  });
});
