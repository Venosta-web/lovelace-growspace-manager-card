import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { StageDisplay } from '../../types';
import { plantStatsStyles } from '../../styles/plant-stats.styles';

@customElement('growspace-plant-stats')
export class GrowspacePlantStats extends LitElement {
    @property({ attribute: false }) accessor stages: StageDisplay[] = [];

    static styles = [plantStatsStyles];

    render(): TemplateResult {
        return html`
      ${this.stages.map((d) => {
            return html`
          <div class=${classMap({ 'pc-stat-item': true, 'current-stage': d.isCurrent })}>
            <svg style=${styleMap({ color: d.color })} viewBox="0 0 24 24"><path d="${d.icon}"></path></svg>
            <div class="pc-stat-text">${d.days}d</div>
          </div>
        `;
        })}
    `;
    }
}
