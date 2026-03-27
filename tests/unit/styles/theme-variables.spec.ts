import { describe, it, expect } from 'vitest';
import { themeVariables } from '../../../src/styles/theme-variables';

describe('theme-variables', () => {
    describe('themeVariables', () => {
        it('should export CSS template literal', () => {
            expect(themeVariables).toBeDefined();
            expect(themeVariables.toString()).toBeTruthy();
        });

        it('should contain primary color variable', () => {
            const cssString = themeVariables.toString();
            expect(cssString).toContain('--gm-primary-color');
        });

        it('should contain stage color variables', () => {
            const cssString = themeVariables.toString();
            expect(cssString).toContain('--stage-seedling-color');
            expect(cssString).toContain('--stage-clone-color');
            expect(cssString).toContain('--stage-mother-color');
            expect(cssString).toContain('--stage-veg-color');
            expect(cssString).toContain('--stage-flower-color');
            expect(cssString).toContain('--stage-dry-color');
            expect(cssString).toContain('--stage-cure-color');
        });

        it('should contain VPD status variables', () => {
            const cssString = themeVariables.toString();
            expect(cssString).toContain('--vpd-optimal');
            expect(cssString).toContain('--vpd-acceptable');
            expect(cssString).toContain('--vpd-warning');
            expect(cssString).toContain('--vpd-danger');
        });

        it('should contain spacing tokens', () => {
            const cssString = themeVariables.toString();
            expect(cssString).toContain('--gm-spacing-xs');
            expect(cssString).toContain('--gm-spacing-sm');
            expect(cssString).toContain('--gm-spacing-md');
            expect(cssString).toContain('--gm-spacing-lg');
            expect(cssString).toContain('--gm-spacing-xl');
        });

        it('should contain typography variables', () => {
            const cssString = themeVariables.toString();
            expect(cssString).toContain('--gm-font-family');
            expect(cssString).toContain('--gm-font-size-xs');
            expect(cssString).toContain('--gm-font-size-sm');
            expect(cssString).toContain('--gm-font-size-md');
            expect(cssString).toContain('--gm-font-size-lg');
            expect(cssString).toContain('--gm-font-size-xl');
        });

        it('should contain z-index variables', () => {
            const cssString = themeVariables.toString();
            expect(cssString).toContain('--gm-z-dropdown');
            expect(cssString).toContain('--gm-z-sticky');
            expect(cssString).toContain('--gm-z-modal');
            expect(cssString).toContain('--gm-z-popover');
            expect(cssString).toContain('--gm-z-tooltip');
        });
    });
});

