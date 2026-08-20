import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { dialogStyles } from '../../../styles/dialog.styles';
import { fromBackend } from '../../../utils/lifecycle-timestamp';

/**
 * Date (and optionally time) input.
 *
 * In `time` mode this renders a separate `type="date"` and `type="time"` input
 * rather than a single `datetime-local`: Firefox's date picker panel is
 * calendar-only and Safari's time segment behaves inconsistently, so the
 * combined control left users unable to set a time outside Chrome. The pair is
 * assembled back into a `YYYY-MM-DDTHH:MM` value here, so consumers still see
 * the single wire value the Lifecycle Timestamp seam expects (ADR-0018).
 */
@customElement('md3-date-input')
export class Md3DateInput extends LitElement {
  @property() label = '';
  @property() value = '';
  @property({ type: Boolean }) time = false; // if true, also renders a time input

  @state() private _date = '';
  @state() private _time = '';

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      .datetime-row {
        display: flex;
        gap: 8px;
      }

      .datetime-row .md3-input {
        min-width: 0;
      }

      .datetime-row .date-part {
        flex: 3 1 0;
      }

      .datetime-row .time-part {
        flex: 2 1 0;
      }
    `,
  ];

  willUpdate(changed: PropertyValues): void {
    if (changed.has('value') || changed.has('time')) {
      const formatted = this.time
        ? fromBackend(this.value)
        : this.value
          ? this.value.split('T')[0]
          : '';
      const [datePart = '', timePart = ''] = formatted.split('T');
      this._date = datePart;
      this._time = timePart;
    }
  }

  private _emit(value: string) {
    this.value = value;
    this.dispatchEvent(new CustomEvent('change', { detail: value, bubbles: true, composed: true }));
  }

  private _handleDateInput(e: Event) {
    this._date = (e.target as HTMLInputElement).value;
    this._emitCombined();
  }

  private _handleTimeInput(e: Event) {
    this._time = (e.target as HTMLInputElement).value;
    this._emitCombined();
  }

  /**
   * Never emits a partial value: an empty date clears the whole field, and a
   * date without a time defaults to midnight. Save paths therefore still get a
   * complete datetime or nothing at all.
   */
  private _emitCombined() {
    if (!this._date) {
      this._emit('');
      return;
    }
    this._emit(this.time ? `${this._date}T${this._time || '00:00'}` : this._date);
  }

  render() {
    if (!this.time) {
      return html`
        <div class="md3-input-group">
          <label class="md3-label">${this.label}</label>
          <input
            type="date"
            class="md3-input"
            .value=${this._date}
            @change=${this._handleDateInput}
          />
        </div>
      `;
    }

    return html`
      <div class="md3-input-group">
        <label class="md3-label">${this.label}</label>
        <div class="datetime-row">
          <input
            type="date"
            class="md3-input date-part"
            aria-label="${this.label} date"
            .value=${this._date}
            @change=${this._handleDateInput}
          />
          <input
            type="time"
            class="md3-input time-part"
            aria-label="${this.label} time"
            .value=${this._time}
            @change=${this._handleTimeInput}
          />
        </div>
      </div>
    `;
  }
}
