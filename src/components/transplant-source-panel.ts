import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { PlantEntity } from '../types';
import { sharedStyles } from '../styles/shared.styles';
import { variables } from '../styles/variables';
import '../features/plants/containers/plant-card.container';

@customElement('transplant-source-panel')
export class TransplantSourcePanel extends LitElement {
  @property({ type: Array }) clonePlants: PlantEntity[] = [];
  @property({ type: Array }) seedlingPlants: PlantEntity[] = [];

  static styles = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
        margin-bottom: 24px;
      }

      .transplant-panel {
        background: var(--glass-bg);
        border: var(--glass-border);
        border-radius: var(--border-radius-xl, 20px);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 4px;
      }

      .section-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--primary-text-color);
      }

      .count-badge {
        background: rgba(var(--rgb-primary-color), 0.2);
        color: var(--primary-color);
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
      }

      .source-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;
        min-height: 60px;
      }

      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        color: var(--secondary-text-color);
        font-style: italic;
        padding: 20px;
      }

      .source-plant-card {
        cursor: move;
        transition: all 0.2s ease;
      }

      .source-plant-card:hover {
        transform: translateY(-4px);
      }

      .source-plant-card[dragging] {
        opacity: 0.4;
      }

      @media (max-width: 600px) {
        .source-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];

  private _handleDragStart(e: DragEvent, plant: PlantEntity) {
    if (!e.dataTransfer) return;

    // Set dragged plant data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'transplant',
        plant_id: plant.attributes.plant_id,
        source_growspace_id: plant.attributes.growspace_id,
        strain: plant.attributes.strain,
        phenotype: plant.attributes.phenotype,
        stage: plant.attributes.stage,
      })
    );

    // Set visual feedback
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('dragging', '');

    // Remove dragging attribute on drag end
    target.addEventListener(
      'dragend',
      () => {
        target.removeAttribute('dragging');
      },
      { once: true }
    );
  }

  render() {
    return html`
      <div class="transplant-panel">
        <div class="section">
          <div class="section-header">
            <h3>Clone Stage</h3>
            <span class="count-badge">${this.clonePlants.length}</span>
          </div>
          <div class="source-grid">
            ${this.clonePlants.length === 0
              ? html`<div class="empty-state">No clones available</div>`
              : this.clonePlants.map((p) => this._renderDraggablePlant(p, 'clone'))}
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <h3>Seedling Stage</h3>
            <span class="count-badge">${this.seedlingPlants.length}</span>
          </div>
          <div class="source-grid">
            ${this.seedlingPlants.length === 0
              ? html`<div class="empty-state">No seedlings available</div>`
              : this.seedlingPlants.map((p) => this._renderDraggablePlant(p, 'seedling'))}
          </div>
        </div>
      </div>
    `;
  }

  private _renderDraggablePlant(plant: PlantEntity, _stage: 'clone' | 'seedling') {
    return html`
      <plant-card-container
        class="source-plant-card"
        .plant=${plant}
        .row=${plant.attributes.row}
        .col=${plant.attributes.col}
        .forceDraggable=${true}
        draggable="true"
        @dragstart=${(e: DragEvent) => this._handleDragStart(e, plant)}
      ></plant-card-container>
    `;
  }
}
