import { describe, it, expect } from 'vitest';
import { localize } from '../../../src/localize/localize';
import en from '../../../src/localize/languages/en.json';

describe('localize', () => {
    it('should translate a known key', () => {
        expect(localize('metrics.mother_start')).toBe('Mother Start');
    });

    it('should fallback to key if translation missing', () => {
        expect(localize('invalid.key')).toBe('invalid.key');
    });

    it('should fallback to key if part of path missing', () => {
        expect(localize('metrics.invalid_key')).toBe('metrics.invalid_key');
    });

    it('should handle search and replace', () => {
        expect(localize('metrics.mother_start', 'Mother', 'Mom')).toBe('Mom Start');
    });

    it('should handle empty search/replace', () => {
        expect(localize('metrics.mother_start', '', '')).toBe('Mother Start');
    });

    it('should handle undefined result from lookup', () => {
        // 'metrics.non_existent' -> undefined
        // Code: if (translated === undefined) translated = string;
        expect(localize('metrics.non_existent')).toBe('metrics.non_existent');
    });

    it('should handle exception during lookup gracefully', () => {
        expect(localize(null as any)).toBe(null);
    });

    it('should export en object', () => {
        expect(en).toBeDefined();
        expect(en.metrics).toBeDefined();
    });
});
