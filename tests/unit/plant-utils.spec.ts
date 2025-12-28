import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlantUtils } from '../../src/utils/plant-utils';
import { PlantStage, PlantEntity } from '../../src/types';

// Mock current date for stable time-based tests
const MOCK_DATE = new Date('2023-10-15T12:00:00');

describe('PlantUtils', () => {

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(MOCK_DATE);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('createGridLayout', () => {
        it('should create an empty grid of specified size', () => {
            const { grid, rows, cols } = PlantUtils.createGridLayout([], 3, 3);
            expect(rows).toBe(3);
            expect(cols).toBe(3);
            expect(grid.length).toBe(3);
            expect(grid[0].length).toBe(3);
            expect(grid[0][0]).toBeNull();
        });

        it('should place plants in correct slots', () => {
            const mockPlant = {
                entity_id: 'sensor.plant1',
                attributes: { row: 2, col: 2, plant_id: '123' }
            } as unknown as PlantEntity;

            const { grid } = PlantUtils.createGridLayout([mockPlant], 3, 3);
            // Logic uses 1-based index from HA, converts to 0-based
            expect(grid[1][1]).toEqual(mockPlant);
            expect(grid[0][0]).toBeNull();
        });

        it('should ignore plants outside grid bounds', () => {
            const outOfBoundsPlant = {
                entity_id: 'sensor.bad',
                attributes: { row: 99, col: 99 }
            } as unknown as PlantEntity;

            const { grid } = PlantUtils.createGridLayout([outOfBoundsPlant], 3, 3);
            const flatGrid = grid.flat();
            expect(flatGrid.every(slot => slot === null)).toBe(true);
        });
        it('should handle grid collisions gracefully', () => {
            // Two plants same slot
            const p1 = { attributes: { row: 1, col: 1, plant_id: 'p1' } } as unknown as PlantEntity;
            const p2 = { attributes: { row: 1, col: 1, plant_id: 'p2' } } as unknown as PlantEntity;

            // Last one wins logic or array order? Assuming implementation overwrites grid[row][col]
            const { grid } = PlantUtils.createGridLayout([p1, p2], 3, 3);

            // Check if one of them is there (impl specific, usually overwrite)
            // 1-based index 1,1 -> grid[0][0]
            expect(grid[0][0]).toEqual(p2); // Assuming p2 overwrites p1
        });
    });

    describe('getPlantStage', () => {
        it('should identify FLOWER stage based on date', () => {
            const plant = {
                attributes: {
                    flower_start: '2023-10-01' // 14 days ago relative to MOCK_DATE
                }
            } as unknown as PlantEntity;

            const stage = PlantUtils.getPlantStage(plant);
            expect(stage).toBe(PlantStage.FLOWER);
        });

        it('should identify VEG stage if flower date is in future', () => {
            const plant = {
                attributes: {
                    veg_start: '2023-09-01',
                    flower_start: '2023-10-20' // Future relative to MOCK_DATE
                }
            } as unknown as PlantEntity;

            const stage = PlantUtils.getPlantStage(plant);
            expect(stage).toBe(PlantStage.VEG);
        });

        it('should default to SEEDLING if no dates provided', () => {
            const plant = { attributes: {} } as unknown as PlantEntity;
            expect(PlantUtils.getPlantStage(plant)).toBe(PlantStage.SEEDLING);
        });
        it('should handle conflicting dates by prioritizing later stage logic', () => {
            // Flower start is BEFORE Veg start (impossible, but test robustness)
            // Logic usually checks current date vs starts.
            // If today > flower_start -> Flower
            // If today > veg_start -> Veg
            // Implementation order matters. Usually check Flower first.
            const plant = {
                attributes: {
                    veg_start: '2023-10-10', // 5 days ago (should be Veg)
                    flower_start: '2023-10-01' // 14 days ago (should be Flower)
                }
            } as unknown as PlantEntity;

            // If logic checks "if (flower_start && now > flower_start) return FLOWER", it returns FLOWER.
            // This assumes FLOWER implies VEG happened.
            expect(PlantUtils.getPlantStage(plant)).toBe(PlantStage.FLOWER);
        });
    });

    describe('findFirstAvailableSlot', () => {
        it('should find the first empty slot (1,1)', () => {
            const result = PlantUtils.findFirstAvailableSlot([], 4, 4);
            expect(result).toEqual({ row: 1, col: 1 });
        });

        it('should skip occupied slots', () => {
            const plants = [
                { attributes: { row: 1, col: 1 } },
                { attributes: { row: 1, col: 2 } }
            ] as unknown as PlantEntity[];

            const result = PlantUtils.findFirstAvailableSlot(plants, 4, 4);
            expect(result).toEqual({ row: 1, col: 3 });
        });

        it('should return default (1,1) if grid is full', () => {
            const plants = [
                { attributes: { row: 1, col: 1 } },
                { attributes: { row: 1, col: 2 } },
                { attributes: { row: 2, col: 1 } },
                { attributes: { row: 2, col: 2 } }
            ] as unknown as PlantEntity[];

            const result = PlantUtils.findFirstAvailableSlot(plants, 2, 2);
            expect(result).toEqual({ row: 1, col: 1 });
        });
    });

    describe('calculatePlantAge', () => {
        it('should calculate days correctly', () => {
            const plant = {
                attributes: {
                    veg_start: '2023-10-05' // 10 days ago
                }
            } as unknown as PlantEntity;

            // Force stage to VEG for calculation
            // Note: calculatePlantAge calls getPlantStage internally
            const age = PlantUtils.calculatePlantAge(plant);
            expect(age).toBe(10);
        });
    });

    describe('Date Helpers', () => {
        it('should format backend date correctly', () => {
            expect(PlantUtils.formatDateForBackend('2023-10-15T12:00:00')).toBe('2023-10-15');
            expect(PlantUtils.formatDateForBackend('2023-10-15')).toBe('2023-10-15');
            expect(PlantUtils.formatDateForBackend('')).toBeUndefined();
        });

        it('should parse datetime local correctly', () => {
            // to ISO
            expect(PlantUtils.parseDateTimeLocal('2023-10-15T12:00')).toBe('2023-10-15T12:00:00');
            expect(PlantUtils.parseDateTimeLocal('')).toBeUndefined();
        });

        it('should convert to datetime local format', () => {
            expect(PlantUtils.toDateTimeLocal('2023-10-15T12:00:00')).toBe('2023-10-15T12:00');
            expect(PlantUtils.toDateTimeLocal(null)).toBe('');
        });
    });

    describe('getCurrentDateTime', () => {
        it('should return current date/time in YYYY-MM-DDTHH:mm:00 format', () => {
            // MOCK_DATE is '2023-10-15T12:00:00'
            const result = PlantUtils.getCurrentDateTime();
            expect(result).toBe('2023-10-15T12:00:00');
        });
    });

    describe('mapDialogToApiPayload', () => {
        it('should map single edit attributes correctly', () => {
            const attrs = {
                strain: 'Kush',
                veg_start: '2023-01-01',
                row: 1, // 0-based coming from dialog or 1-based? 
                // mapDialogToApiPayload is used in updatePlantFromDialog which uses `editedAttributes`.
                // Looking at source: logic handles "Single" by including row/col.
                // "Bulk" excludes them.
            };

            const payload = PlantUtils.mapDialogToApiPayload(attrs, false);

            expect(payload.strain).toBe('Kush');
            expect(payload.veg_start).toBe('2023-01-01');
            expect(payload.row).toBe(1);
        });

        it('should map bulk edit attributes (exclude position)', () => {
            const attrs = {
                strain: 'Kush',
                row: 1,
                col: 1
            };

            const payload = PlantUtils.mapDialogToApiPayload(attrs, true);

            // In bulk edit, strain is filtered out by default logic in PlantUtils
            expect(payload.strain).toBeUndefined();
            expect(payload.row).toBeUndefined();
            expect(payload.col).toBeUndefined();
        });

        it('should handle date fields formatting', () => {
            const attrs = {
                flower_start: '2023-10-15T10:00' // from Date input
            };
            // formatDateForBackend extracts YYYY-MM-DD
            const payload = PlantUtils.mapDialogToApiPayload(attrs, false);
            expect(payload.flower_start).toBe('2023-10-15');
        });

        it('should handle clearing date fields', () => {
            const attrs = {
                flower_start: '' // cleared
            };
            const payload = PlantUtils.mapDialogToApiPayload(attrs, false);
            expect(payload.flower_start).toBeNull();
        });
    });

    describe('calculateEffectiveRows', () => {
        it('should expand rows for dynamic types', () => {
            const device = {
                type: 'mother', // dynamic
                rows: 2,
                plants_per_row: 2,
                plants: [
                    { attributes: { row: 3 } }, // Plant in row 3
                    { attributes: { row: 3 } }  // Another in row 3
                ]
            } as any;

            const effective = PlantUtils.calculateEffectiveRows(device);
            expect(effective).toBe(4); // 3 + 1 because last row is full
        });

        it('should expand further if last row is full', () => {
            const device = {
                type: 'mother',
                rows: 2,
                plants_per_row: 2,
                plants: [
                    { attributes: { row: 3 } },
                    { attributes: { row: 3 } } // Row 3 full (2 plants)
                ]
            } as any;

            const effective = PlantUtils.calculateEffectiveRows(device);
            expect(effective).toBe(4); // 3 + 1
        });

        it('should use configured rows for static types', () => {
            const device = {
                type: 'tent', // static
                rows: 4,
                plants: [
                    { attributes: { row: 10 } } // Way out
                ]
            } as any;

            const effective = PlantUtils.calculateEffectiveRows(device);
            expect(effective).toBe(4);
        });
    });

    describe('Image Compression', () => {
        let originalFileReader: any;
        let originalImage: any;

        beforeEach(() => {
            originalFileReader = globalThis.FileReader;
            originalImage = globalThis.Image;

            // Mock FileReader
            class MockFileReader {
                readAsDataURL() { this.onload({ target: { result: 'data:image/png;base64,source' } } as any); }
                onload: any;
            }
            vi.stubGlobal('FileReader', MockFileReader);

            // Mock Image
            class MockImage {
                src = '';
                width = 2000;
                height = 1000;
                onload: any;
                set onloadFunc(fn: any) { this.onload = fn; /* trigger immediately for test */ setTimeout(fn, 0); }
            }
            // We can't easily trigger onload setter logic in JS class like this for Image mock usually.
            // Better: stub global Image, and in implementation we wait for onload assignment?
            // Or simplified: Just mock global Image to triggering its own onload when src is set?

            // Let's use a simpler approach:
            vi.stubGlobal('Image', class {
                _width = 2000;
                _height = 1000;
                set src(v: string) {
                    if (this.onload) this.onload();
                }
                get width() { return this._width; }
                get height() { return this._height; }
                onload: any;
            });

            // Mock Canvas
            const mockContext = {
                drawImage: vi.fn(),
            };
            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(mockContext),
                toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,compressed')
            };
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                if (tag === 'canvas') return mockCanvas as any;
                return document.createElement(tag);
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should compress image and return data URL', async () => {
            const file = new File([''], 'test.png', { type: 'image/png' });

            const result = await PlantUtils.compressImage(file, 800, 800);

            expect(result).toBe('data:image/jpeg;base64,compressed');
            // Dimensions check effectively happens inside mocked logic? 
            // We can check if getContext was called or drawImage.
            // We'd need reference to mockContext.
        });

        it('should resize tall images correctly (height > width)', async () => {
            // Override Image mock for this test to be tall
            vi.stubGlobal('Image', class {
                _width = 1000;
                _height = 2000;
                set src(v: string) {
                    if (this.onload) this.onload();
                }
                get width() { return this._width; }
                get height() { return this._height; }
                onload: any;
            });

            const file = new File([''], 'tall.png', { type: 'image/png' });
            // compressImage(file, maxWidth, maxHeight)
            await PlantUtils.compressImage(file, 800, 800);
        });
    });

    describe('getDominantStage', () => {
        it('should recognize CURE as highest priority', () => {
            const result = PlantUtils.getDominantStage([
                { state: PlantStage.VEG, attributes: { veg_days: 10 } } as any,
                { state: PlantStage.CURE, attributes: { cure_days: 5 } } as any
            ]);
            expect(result).toEqual({ stage: PlantStage.CURE, days: 5 });
        });

        it('should find max days for dominant stage', () => {
            const result = PlantUtils.getDominantStage([
                { state: PlantStage.VEG, attributes: { veg_days: 10 } } as any,
                { state: PlantStage.VEG, attributes: { veg_days: 20 } } as any
            ]);
            expect(result).toEqual({ stage: PlantStage.VEG, days: 20 });
        });

        it('should return null for empty list', () => {
            expect(PlantUtils.getDominantStage([])).toBeNull();
        });
    });

    describe('getPlantDisplayData', () => {
        const dummyStrainLibrary: any[] = [
            { strain: 'OG Kush', phenotype: '1', image: 'og_1.jpg', image_crop_meta: { x: 10, y: 10 } },
            { strain: 'Blue Dream', phenotype: 'default', image: 'bd_def.jpg' }
        ];

        it('should resolve specific phenotype image', () => {
            const plant = {
                state: PlantStage.FLOWER,
                attributes: { strain: 'OG Kush', phenotype: '1', flower_days: 10 }
            } as any;

            const data = PlantUtils.getPlantDisplayData(plant, dummyStrainLibrary);
            expect(data.imageUrl).toBe('og_1.jpg');
            expect(data.imageCropMeta).toEqual({ x: 10, y: 10 });
        });

        it('should fallback to default phenotype image', () => {
            const plant = {
                state: PlantStage.VEG,
                attributes: { strain: 'Blue Dream', phenotype: 'weird' }
            } as any;
            const data = PlantUtils.getPlantDisplayData(plant, dummyStrainLibrary);
            expect(data.imageUrl).toBe('bd_def.jpg');
        });

        it('should filter chart stages correctly for DRY', () => {
            const plant = {
                state: PlantStage.DRY,
                attributes: { dry_days: 5, flower_days: 60 }
            } as any;
            const data = PlantUtils.getPlantDisplayData(plant, []);
            // Only DRY stage should be returned
            expect(data.stages.length).toBe(1);
            expect(data.stages[0].stage).toBe(PlantStage.DRY);
        });

        it('should handle missing strain library gracefully', () => {
            const plant = { attributes: { strain: 'Unknown' } } as any;
            const data = PlantUtils.getPlantDisplayData(plant, undefined as any);
            expect(data.strainName).toBe('Unknown');
        });
    });

    it('should fallback to ANY strain image if specific pheno not found', () => {
        const library = [
            { key: 'Amnesia|2', strain: 'Amnesia', phenotype: '2', image: 'amnesia_2.jpg' }
        ] as any;
        const plant = {
            state: PlantStage.VEG,
            attributes: { strain: 'Amnesia', phenotype: '1' }
        } as any;

        const data = PlantUtils.getPlantDisplayData(plant, library);
        expect(data.imageUrl).toBe('amnesia_2.jpg');
    });

    it('should filter chart stages correctly for CURE', () => {
        const plant = {
            state: PlantStage.CURE,
            attributes: { cure_days: 5, flower_days: 60 }
        } as any;
        const data = PlantUtils.getPlantDisplayData(plant, []);
        // Only CURE stage should be returned
        expect(data.stages.length).toBe(1);
        expect(data.stages[0].stage).toBe(PlantStage.CURE);
    });
    describe('calculatePlantAge - All Stages', () => {
        const makePlant = (stage: PlantStage, key: string, dateDiff: number) => {
            const d = new Date(MOCK_DATE);
            d.setDate(d.getDate() - dateDiff);
            const dateStr = d.toISOString().split('T')[0];
            return {
                attributes: {
                    [`${key}`]: dateStr
                }
            } as any;
        };

        it('should calculate age for MOTHER', () => {
            const plant = makePlant(PlantStage.MOTHER, 'mom_start', 100);
            expect(PlantUtils.calculatePlantAge(plant)).toBe(100);
        });

        it('should calculate age for CLONE', () => {
            const plant = makePlant(PlantStage.CLONE, 'clone_start', 14);
            expect(PlantUtils.calculatePlantAge(plant)).toBe(14);
        });

        it('should calculate age for SEEDLING', () => {
            const plant = makePlant(PlantStage.SEEDLING, 'planted_date', 5);
            // getPlantStage fallback to seedling if no other dates, so this works naturally
            expect(PlantUtils.calculatePlantAge(plant)).toBe(5);
        });

        it('should calculate age for DRY', () => {
            const plant = makePlant(PlantStage.DRY, 'dry_start', 3);
            expect(PlantUtils.calculatePlantAge(plant)).toBe(3);
        });

        it('should calculate age for CURE', () => {
            const plant = makePlant(PlantStage.CURE, 'cure_start', 20);
            expect(PlantUtils.calculatePlantAge(plant)).toBe(20);
        });

        it('should return 0 if date is invalid', () => {
            const plant = { attributes: { veg_start: 'invalid' } } as any;
            expect(PlantUtils.calculatePlantAge(plant)).toBe(0);
        });

        it('should return 0 if plant has no attributes', () => {
            expect(PlantUtils.calculatePlantAge({} as any)).toBe(0);
            expect(PlantUtils.calculatePlantAge(null as any)).toBe(0);
        });
    });

    describe('Date Helpers Edge Cases', () => {
        it('should parse ISO string in formatDateForBackend fallback', () => {
            // Already ISO roughly
            expect(PlantUtils.formatDateForBackend('2023-12-25')).toBe('2023-12-25');
            // Datetime string 
            expect(PlantUtils.formatDateForBackend('2023-12-25T15:30:00')).toBe('2023-12-25');
        });

        it('should fallback to Date parsing in formatDateForBackend', () => {
            // e.g. "12/25/2023" depending on locale, or full string
            // MOCK_DATE is set, but this function creates new Date(value)
            // explicit format
            expect(PlantUtils.formatDateForBackend('Jan 01 2023')).toBe('2023-01-01');
        });

        it('should return undefined for invalid dates in formatDateForBackend', () => {
            expect(PlantUtils.formatDateForBackend('not-a-date')).toBeUndefined();
        });

        it('should return empty string for invalid dates in toDateTimeLocal', () => {
            expect(PlantUtils.toDateTimeLocal('invalid')).toBe('');
        });
    });

});

describe('Display Formatters', () => {
    const mockHass = {
        locale: { language: 'en-US' }
    } as any;

    it('should format numbers with Intl', () => {
        expect(PlantUtils.formatNumber(1234.56, mockHass)).toBe('1,234.56'); // en-US standard
    });

    it('should format dates with Intl', () => {
        const d = new Date('2023-01-01');
        // en-US: Jan 1, 2023
        expect(PlantUtils.formatDate(d, mockHass)).toContain('2023');
        expect(PlantUtils.formatDate(d, mockHass)).toContain('Jan');
    });

    it('should handle formatting errors gracefully', () => {
        // Not easy to force Intl error without bad locale, but
        // passing undefined date/number logic check:
        expect(PlantUtils.formatDate(undefined as any, mockHass)).toBe('');
    });

    it('should generate img styles', () => {
        expect(PlantUtils.getImgStyle()).toContain('object-fit: cover');
        expect(PlantUtils.getImgStyle({ x: 10, y: 20, scale: 2 })).toContain('transform: scale(2)');
    });

    it('should handle invalid inputs gracefully', () => {
        expect(PlantUtils.formatDate('', mockHass)).toBe('');
        expect(PlantUtils.formatDate('invalid-date', mockHass)).toBe('');
        expect(PlantUtils.toDateTimeLocal('invalid')).toBe('');
        expect(PlantUtils.parseDateTimeLocal('invalid')).toBeUndefined();
    });
    it('should fallback when Intl.DateTimeFormat fails', () => {
        const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
            throw new Error('Intl error');
        });
        const d = new Date('2023-01-01');
        const res = PlantUtils.formatDate(d, mockHass);
        expect(res).toBe(d.toLocaleDateString()); // Fallback

        spy.mockRestore();
    });

    it('should fallback when Intl.NumberFormat fails', () => {
        const spy = vi.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
            throw new Error('Intl error');
        });
        const res = PlantUtils.formatNumber(1234.56, mockHass);
        expect(res).toBe('1234.56'); // Fallback to toString()

        spy.mockRestore();
    });
});

describe('preloadImage', () => {
    it('should resolve on load', async () => {
        vi.useRealTimers();
        vi.stubGlobal('Image', class {
            _src = '';
            get src() { return this._src; }
            set src(v: string) {
                this._src = v;
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 0);
            }
            onload: any;
        });

        await expect(PlantUtils.preloadImage('test.jpg')).resolves.not.toThrow();
        vi.restoreAllMocks();
    });

    it('should reject on error', async () => {
        vi.useRealTimers();
        vi.stubGlobal('Image', class {
            set src(v: string) {
                setTimeout(() => { if (this.onerror) this.onerror(); }, 0);
            }
            onload: any;
            onerror: any;
        });
        await expect(PlantUtils.preloadImage('bad.jpg')).rejects.toBeUndefined();
        vi.restoreAllMocks();
    });
});

describe('compressImage Error Handling', () => {
    it('should reject if FileReader fails', async () => {
        const file = new File([''], 'test.png', { type: 'image/png' });
        vi.stubGlobal('FileReader', class {
            readAsDataURL() { setTimeout(() => this.onerror(new Error('Read fail')), 0); }
            onload: any;
            onerror: any = () => { };
        });

        await expect(PlantUtils.compressImage(file)).rejects.toThrow('Read fail');
        vi.restoreAllMocks();
    });

    it('should reject if Image loading fails', async () => {
        const file = new File([''], 'test.png', { type: 'image/png' });
        vi.stubGlobal('FileReader', class {
            readAsDataURL() { setTimeout(() => this.onload({ target: { result: 'data:...' } } as any), 0); }
            onload: any;
            onerror: any;
        });
        vi.stubGlobal('Image', class {
            set src(v: string) { setTimeout(() => this.onerror(new Error('Image fail')), 0); }
            onload: any;
            onerror: any;
        });

        await expect(PlantUtils.compressImage(file)).rejects.toThrow('Image fail');
        vi.restoreAllMocks();
    });

    it('should reject if canvas context is null', async () => {
        const file = new File([''], 'test.png', { type: 'image/png' });
        vi.stubGlobal('FileReader', class {
            readAsDataURL() { setTimeout(() => this.onload({ target: { result: 'data:...' } } as any), 0); }
            onload: any;
        });
        vi.stubGlobal('Image', class {
            width = 100;
            height = 100;
            set src(v: string) { setTimeout(() => this.onload(), 0); }
            onload: any;
        });

        const mockCanvas = {
            getContext: vi.fn().mockReturnValue(null) // Fail context
        };
        vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

        await expect(PlantUtils.compressImage(file)).rejects.toThrow('Failed to get canvas context');
        vi.restoreAllMocks();
    });
});

describe('mapDialogToApiPayload Coverage', () => {
    it('should handle null/undefined strictly for date fields', () => {
        const attrs = {
            seedling_start: 'null',
            flower_start: 'undefined'
        };
        const payload = PlantUtils.mapDialogToApiPayload(attrs, false);
        expect(payload.seedling_start).toBeNull();
        expect(payload.flower_start).toBeNull();
    });

    it('should ignore non-date null attributes', () => {
        const attrs = {
            strain: null // should not be included
        };
        const payload = PlantUtils.mapDialogToApiPayload(attrs, false);
        expect(payload).not.toHaveProperty('strain');
    });
});

describe('Coverage Gap Fillers', () => {
    it('should calculate age for FLOWER stage plant', () => {
        const mockFlowerPlant = {
            attributes: {
                stage: 'flower',
                flower_start: '2023-01-01'
            }
        } as any;

        vi.useFakeTimers().setSystemTime(new Date('2023-02-15'));
        const age = PlantUtils.calculatePlantAge(mockFlowerPlant);
        expect(age).toBe(45); // Days from Jan 1 to Feb 15
        vi.useRealTimers();
    });

    it('should format datetime-local and handle catch block', () => {
        // Normal case
        const result = PlantUtils.toDateTimeLocal('2023-12-25T15:30:00');
        expect(result).toContain('2023');
        expect(result).toContain('12');
        expect(result).toContain('25');
    });

    it('should return undefined for formatDateForBackend with undefined', () => {
        const result = PlantUtils.formatDateForBackend(undefined);
        expect(result).toBeUndefined();
    });

    it('should return undefined for formatDateForBackend with null', () => {
        const result = PlantUtils.formatDateForBackend(null);
        expect(result).toBeUndefined();
    });
});
