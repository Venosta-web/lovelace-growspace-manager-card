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
            originalFileReader = global.FileReader;
            originalImage = global.Image;

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
    });
});
