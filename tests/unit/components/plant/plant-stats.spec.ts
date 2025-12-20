import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../../../src/components/plant/plant-stats';
import { GrowspacePlantStats } from '../../../../src/components/plant/plant-stats';
import { StageDisplay, PlantStage } from '../../../../src/types';

describe('GrowspacePlantStats', () => {
    let element: GrowspacePlantStats;
    let container: HTMLElement;

    const mockStages: StageDisplay[] = [
        {
            stage: PlantStage.VEG,
            title: "Veg",
            icon: "M12,12",
            color: "green",
            days: 14,
            isCurrent: true
        },
        {
            stage: PlantStage.FLOWER,
            title: "Flower",
            icon: "M12,12",
            color: "red",
            days: 0,
            isCurrent: false
        }
    ];

    beforeEach(async () => {
        container = document.createElement('div');
        document.body.appendChild(container);
        element = document.createElement('growspace-plant-stats') as GrowspacePlantStats;
        container.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
    });

    it('should render correct number of stats items', async () => {
        element.stages = mockStages;
        await element.updateComplete;

        const items = element.shadowRoot?.querySelectorAll('.pc-stat-item');
        expect(items?.length).toBe(2);
    });

    it('should apply current-stage class to active stage', async () => {
        element.stages = mockStages;
        await element.updateComplete;

        const items = element.shadowRoot?.querySelectorAll('.pc-stat-item');
        expect(items?.[0].classList.contains('current-stage')).toBe(true);
        expect(items?.[1].classList.contains('current-stage')).toBe(false);
    });

    it('should render correct days', async () => {
        element.stages = mockStages;
        await element.updateComplete;

        const daysText = element.shadowRoot?.querySelectorAll('.pc-stat-text');
        expect(daysText?.[0].textContent).toBe('14d');
        expect(daysText?.[1].textContent).toBe('0d');
    });

    it('should render icon paths correctly', async () => {
        element.stages = mockStages;
        await element.updateComplete;

        const path = element.shadowRoot?.querySelector('path');
        expect(path?.getAttribute('d')).toBe('M12,12');
    });
});
