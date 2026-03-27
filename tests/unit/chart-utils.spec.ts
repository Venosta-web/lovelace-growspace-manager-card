import { describe, it, expect } from 'vitest';
import { ChartUtils } from '../../src/utils/chart-utils';

describe('ChartUtils', () => {
    describe('generateSparklinePath', () => {
        it('should return empty string for insufficient data', () => {
            expect(ChartUtils.generateSparklinePath([], 100, 50)).toBe('');
            expect(ChartUtils.generateSparklinePath([{ state: '1', last_changed: '2023-01-01' }], 100, 50)).toBe('');
        });

        it('should generate a valid path string for valid data', () => {
            const data = [
                { state: '10', last_changed: '2023-01-01T10:00:00Z' },
                { state: '20', last_changed: '2023-01-01T11:00:00Z' },
                { state: '15', last_changed: '2023-01-01T12:00:00Z' }
            ];
            const path = ChartUtils.generateSparklinePath(data, 100, 50);
            expect(path).toMatch(/^M [\d.,]+ L [\d.,]+ L [\d.,]+$/);
            // First point should be x=0
            expect(path).toContain('M 0,');
            // Last point should be x=100
            expect(path).toContain('L 100,');
        });

        it('should ignore non-numeric values', () => {
            const data = [
                { state: '10', last_changed: '2023-01-01T10:00:00Z' },
                { state: 'unknown', last_changed: '2023-01-01T10:30:00Z' },
                { state: '20', last_changed: '2023-01-01T11:00:00Z' }
            ];
            const path = ChartUtils.generateSparklinePath(data, 100, 50);
            // Should be treated as 2 points
            expect(path.split(' L ').length).toBe(2);
        });
        it('should downsample based on timeRange', () => {
            const baseTime = new Date('2023-01-01T10:00:00Z').getTime();
            const data: any[] = [];

            // Add point every minute for 600 minutes (10 hours) to ensure downsampling triggers
            for (let i = 0; i <= 600; i++) {
                data.push({
                    state: String(i),
                    last_changed: new Date(baseTime + i * 60000).toISOString()
                });
            }

            // 7d -> Every 4 hours.
            // 10:00 (H=10, %4 != 0) - Skip
            // 11:00 - Skip
            // 12:00 (H=12, %4 == 0) - Kept
            // 16:00 (H=16, %4 == 0) - Kept
            // 20:00 (H=20, %4 == 0) - Kept (Last point)
            // Total 3-4 points triggers valid path (>=2 points).
            const path7d = ChartUtils.generateSparklinePath(data, 100, 50, '7d');
            expect(path7d).not.toBe('');
            const points7d = path7d.split(' L ').length;
            expect(points7d).toBeGreaterThanOrEqual(3);
            expect(points7d).toBeLessThanOrEqual(5); // Allow for timezone shifts or boundary inclusions

            // 24h -> Every 30 mins.
            // 10 hours = 600 mins. / 30 = 20 intervals.
            // 0, 30, ... 600.
            // 20 segments + 1 start = 21 points.
            const path24h = ChartUtils.generateSparklinePath(data, 100, 50, '24h');
            expect(path24h.split(' L ').length).toBe(21);

            // 6h -> Every 15 mins.
            // 600 / 15 = 40 intervals.
            // 41 points.
            const path6h = ChartUtils.generateSparklinePath(data, 100, 50, '6h');
            expect(path6h.split(' L ').length).toBe(41);
        });
    });

    describe('getSparklineColor', () => {
        it('should return VPD status colors', () => {
            expect(ChartUtils.getSparklineColor('vpd', 'optimal')).toBe('#4caf50');
            expect(ChartUtils.getSparklineColor('vpd', 'warning')).toBe('#ff9800');
            expect(ChartUtils.getSparklineColor('vpd', 'danger')).toBe('#f44336');
        });

        it('should return default colors for other metrics', () => {
            expect(ChartUtils.getSparklineColor('temperature')).toBeTruthy();
        });
    });

    describe('generateVpdSparklineSegments', () => {
        const simpleThresholds = {
            targetMin: 0.8,
            targetMax: 1.2,
            dangerMin: 0.5,
            dangerMax: 1.5
        };
        const thresholds = {
            day: simpleThresholds,
            night: simpleThresholds
        };

        it('should generate segments based on status', () => {
            const data = [
                { state: '1.0', last_changed: '2023-01-01T10:00:00Z' }, // Optimal
                { state: '1.0', last_changed: '2023-01-01T11:00:00Z' }, // Optimal
                { state: '0.4', last_changed: '2023-01-01T12:00:00Z' }  // Danger
            ];

            const segments = ChartUtils.generateVpdSparklineSegments(data, 100, 50, thresholds, []);
            expect(segments.length).toBeGreaterThanOrEqual(1);
        });

        it('should return empty for empty data', () => {
            expect(ChartUtils.generateVpdSparklineSegments([], 100, 50, thresholds, [])).toEqual([]);
        });

        it('should respect day/night thresholds from light history', () => {
            // Day: Optimal 0.8-1.2. Night: Optimal 0.4-0.6.
            const dnThresholds = {
                day: { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.5, dangerMax: 1.5 },
                night: { targetMin: 0.4, targetMax: 0.6, dangerMin: 0.2, dangerMax: 0.8 }
            };

            // Value 0.5. 
            // Day (0.8-1.2) -> Warning (0.5-0.8) or Danger (<0.5). 0.5 is DangerMin, so usually Warning/Danger boundary. 
            // Let's use 0.55 -> Day Warning. Night Optimal (0.4-0.6).

            const data = [
                { state: '0.55', last_changed: '2023-01-01T10:00:00Z' },
                { state: '0.55', last_changed: '2023-01-01T11:00:00Z' }
            ];

            // Case 1: All Day (Light ON) -> Expect Warning (Orange)
            const segmentsDay = ChartUtils.generateVpdSparklineSegments(
                data, 100, 50, dnThresholds,
                [{ state: 'on', last_changed: '2023-01-01T09:00:00Z' }] // Always ON
            );
            expect(segmentsDay[0].color).toBe('#ff9800'); // Warning

            // Case 2: All Night (Light OFF) -> Expect Optimal (Green)
            const segmentsNight = ChartUtils.generateVpdSparklineSegments(
                data, 100, 50, dnThresholds,
                [{ state: 'off', last_changed: '2023-01-01T09:00:00Z' }] // Always OFF
            );
            expect(segmentsNight[0].color).toBe('#4caf50'); // Optimal
        });

        it('should handle raw HA history and internal normalization', () => {
            const rawData = [
                { state: '1.0', last_changed: '2023-01-01T10:00:00Z' },
                { state: '1.2', last_changed: '2023-01-01T11:00:00Z' }
            ];
            const rawLight = [
                { state: 'on', last_changed: '2023-01-01T09:00:00Z' }
            ];
            const segments = ChartUtils.generateVpdSparklineSegments(rawData, 100, 50, thresholds, rawLight);
            expect(segments.length).toBe(1);
            expect(segments[0].color).toBe('#4caf50');
        });

        it('should skip segments with only 1 point during transition', () => {
            const data = [
                { state: '1.0', last_changed: '2023-01-01T10:00:00Z' }, // Optimal
                { state: '0.4', last_changed: '2023-01-01T11:00:00Z' }  // Danger (Transition point)
            ];
            // Only 2 points total. Loop will finish with currentSegment length 1 for 'danger' status.
            const segments = ChartUtils.generateVpdSparklineSegments(data, 100, 50, thresholds, []);
            // first segment: optimal (M p0 L p1), then p1 starts 'danger' segment but loop ends.
            // currentSegmentX will have [p1.x] and be length 1.
            expect(segments.length).toBe(1);
            expect(segments[0].color).toBe('#4caf50');
        });
    });

    describe('generatePathFromValues', () => {
        const data = [
            { time: 0, value: 0 },
            { time: 50, value: 50 },
            { time: 100, value: 0 }
        ];

        it('should generate line path', () => {
            const path = ChartUtils.generatePathFromValues(data, 100, 100, { type: 'line', min: 0, max: 50, startTime: 0, endTime: 100 });
            expect(path).toBe('M 0,100 L 50,0 L 100,100');
        });

        it('should generate step path', () => {
            const path = ChartUtils.generatePathFromValues(data, 100, 100, { type: 'step', min: 0, max: 50, startTime: 0, endTime: 100 });
            expect(path).toBe('M 0,100 L 50,100 L 50,0 L 100,0 L 100,100');
        });

        it('should use all path points (no downsampling) based on timeRange', () => {
            const baseTime = new Date('2023-01-01T10:00:00Z').getTime();
            const data: { time: number; value: number }[] = [];
            for (let i = 0; i <= 60; i++) {
                data.push({
                    time: baseTime + i * 60000,
                    value: i
                });
            }

            // No downsampling: 61 points
            const path24h = ChartUtils.generatePathFromValues(data, 100, 50, {
                min: 0, max: 60, startTime: baseTime, endTime: baseTime + 60 * 60000, timeRange: '24h'
            });
            expect(path24h.split(' L ').length).toBe(61);
        });

        it('should default min/max ranges if single point or zero range', () => {
            const singlePoint = [{ time: 1000, value: 10 }];
            // generatePathFromValues returns '' for <2 points
            expect(ChartUtils.generatePathFromValues(singlePoint, 100, 50)).toBe('');

            const twoSamePoints = [{ time: 1000, value: 10 }, { time: 1001, value: 10 }];
            const path = ChartUtils.generatePathFromValues(twoSamePoints, 100, 50);
            expect(path).toContain('M 0,');
            expect(path).toContain('L 100,');
        });

        it('should cull redundant points based on EPSILON', () => {
            const culledData = [
                { time: 0, value: 0 },
                { time: 0.05, value: 0.05 }, // Culled (< 0.1 diff in scaled pixels if we scale small)
                { time: 100, value: 100 }
            ];
            // Use large width/height so that 0.05 units map to > 0.1 pixels
            // If we use width 100, height 100:
            // p1: (0, 100)
            // p2: (0.05, 99.95). x-diff=0.05, y-diff=0.05. Both < 0.1. Culled.
            const path = ChartUtils.generatePathFromValues(culledData, 100, 100, { min: 0, max: 100, startTime: 0, endTime: 100 });
            // p1 is culled, so we have p0 (M) and p2 (L). Split by " L " results in 2 parts.
            expect(path.split(' L ').length).toBe(2);
        });

        it('should handle step path points culled by EPSILON', () => {
            const culledData = [
                { time: 0, value: 0 },
                { time: 100, value: 0 }, // Horizontal move
                { time: 100, value: 100 } // Vertical move
            ];
            // If we use very small dimensions, horizontal/vertical moves might be culled
            const path = ChartUtils.generatePathFromValues(culledData, 0.05, 0.05, { type: 'step', min: 0, max: 100, startTime: 0, endTime: 100 });
            expect(path).toBe('M 0,0.05'); // Effectively everything culled or redundant
        });

        it('should handle pure horizontal and vertical step segments', () => {
            const data = [
                { time: 0, value: 0 },
                { time: 50, value: 0 },   // Horizontal only
                { time: 50, value: 100 }, // Vertical only
                { time: 100, value: 100 } // Horizontal only
            ];
            const path = ChartUtils.generatePathFromValues(data, 100, 100, { type: 'step', min: 0, max: 100, startTime: 0, endTime: 100 });
            // Should produce: M 0,100 L 50,100 (horizontal) L 50,0 (vertical) L 100,0 (horizontal)
            expect(path).toBe('M 0,100 L 50,100 L 50,0 L 100,0');
        });

        it('should handle partial options overrides for min/max/time', () => {
            const data = [
                { time: 1000, value: 10 },
                { time: 2000, value: 20 }
            ];
            // Override only min/max, let startTime/endTime be computed
            const path1 = ChartUtils.generatePathFromValues(data, 100, 100, { min: 0, max: 100 });
            expect(path1).toContain('M 0,90'); // y = 100 - (10-0)*1 = 90
            expect(path1).toContain('L 100,80'); // y = 100 - (20-0)*1 = 80

            // Override only startTime/endTime, let min/max be computed
            const path2 = ChartUtils.generatePathFromValues(data, 100, 100, { startTime: 0, endTime: 4000 });
            expect(path2).toContain('M 25,100'); // x = (1000-0)*(100/4000) = 25
            expect(path2).toContain('L 50,0'); // x = (2000-0)*0.025 = 50
        });
    });

    describe('generateStepPath', () => {
        it('should generate step path from raw data', () => {
            const data = [
                { state: 'off', last_changed: '2023-01-01T10:00:00Z' },
                { state: 'on', last_changed: '2023-01-01T10:30:00Z' },
                { state: 'off', last_changed: '2023-01-01T11:00:00Z' }
            ];
            const path = ChartUtils.generateStepPath(data, 100, 50);
            expect(path).toContain('M');
            expect(path).not.toBe('');
        });

        it('should handle mixed numeric/binary data gracefully', () => {
            const data = [
                { state: '0', last_changed: '2023-01-01T10:00:00Z' },
                { state: '1', last_changed: '2023-01-01T11:00:00Z' }
            ];
            const path = ChartUtils.generateStepPath(data, 100, 50);
            expect(path).not.toBe('');
        });

        it('should return empty for empty/invalid data', () => {
            expect(ChartUtils.generateStepPath([], 100, 50)).toBe('');
            expect(ChartUtils.generateStepPath([{ state: 'unavailable' }], 100, 50)).toBe('');
            // Trigger line 446 (sortedData.length < 2 AFTER filter)
            expect(ChartUtils.generateStepPath([
                { state: 'on', last_changed: '2023-01-01' },
                { state: 'unavailable' }
            ], 100, 50)).toBe('');
        });
    });

    describe('generateVpdSparklineSegments Edge Cases', () => {
        const simpleThresholds = { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.5, dangerMax: 1.5 };
        const thresholds = { day: simpleThresholds, night: simpleThresholds };

        it('should handle time-based filtering correctly', () => {
            const baseTime = new Date('2023-01-01T10:00:00Z').getTime();
            const data: any[] = [];
            for (let i = 0; i <= 60; i++) {
                data.push({ state: '1.0', last_changed: new Date(baseTime + i * 60000).toISOString() });
            }

            // 24h -> Every 30 mins (was 15).
            // 0, 30, 60. 3 points.
            const segments = ChartUtils.generateVpdSparklineSegments(data, 100, 50, thresholds, [], '24h');
            expect(segments.length).toBe(1);
            // Verify internal path points? We can't easily access them without parsing path.
            // But we can check if it returns valid segment.
            expect(segments[0].path).toBeTruthy();
        });

        it('should handle single segment with multiple points', () => {
            const data = [
                { state: '1.0', last_changed: '2023-01-01T10:00:00Z' },
                { state: '1.0', last_changed: '2023-01-01T11:00:00Z' }
            ];
            const segments = ChartUtils.generateVpdSparklineSegments(data, 100, 50, thresholds, []);
            expect(segments.length).toBe(1);
            expect(segments[0].color).toBe('#4caf50');
        });

        describe('Coverage Gap Fillers', () => {
            const generateData = (count: number, intervalMin: number = 1) => {
                // Start from 00:00 for aligned modulo checks
                const baseTime = new Date('2023-01-01T00:00:00Z').getTime();
                return Array.from({ length: count }, (_, i) => ({
                    state: '10',
                    last_changed: new Date(baseTime + i * intervalMin * 60000).toISOString()
                }));
            };

            const generateValueData = (count: number, intervalMin: number = 1) => {
                const baseTime = new Date('2023-01-01T00:00:00Z').getTime();
                return Array.from({ length: count }, (_, i) => ({
                    value: 10,
                    time: baseTime + i * intervalMin * 60000
                }));
            };

            describe('generateSparklinePath Time Ranges', () => {
                // Data every minute for 6 hours (360 points) -> 0 to 360 inclusive? count=361.
                const data = generateData(361);

                it('should handle "1h" range (keep all)', () => {
                    const subset = data.slice(0, 60); // 0..59 mins.
                    const path = ChartUtils.generateSparklinePath(subset, 100, 50, '1h');
                    // With skipDownsampling, we keep all 60 points since 60 < 150
                    expect(path.split(' L ').length).toBe(60);
                });

                it('should handle "1h" range with large data (every 5 mins)', () => {
                    const largeData = generateData(200); // 199 intervals
                    const path = ChartUtils.generateSparklinePath(largeData, 100, 50, '1h');
                    // 200 mins. 0, 5, 10... 195, 200 (Last point)
                    // 200/5 = 40 intervals. + 1 (last point) = 41 points.
                    expect(path.split(' L ').length).toBe(41);
                });

                it('should handle "24h" range with large data (every 30 mins)', () => {
                    const largeData = generateData(200);
                    const path = ChartUtils.generateSparklinePath(largeData, 100, 50, '24h');
                    // 200 mins. 0, 30, 60, 90, 120, 150, 180, 200 (Last point)
                    // points: 0, 30, 60, 90, 120, 150, 180 = 7 points + last point 200 = 8 points.
                    expect(path.split(' L ').length).toBe(8);
                });

                it('should handle "6h" range (every 5 mins)', () => {
                    const subset = data.slice(0, 361);
                    const path = ChartUtils.generateSparklinePath(subset, 100, 50, '6h');
                    // 6h -> Every 15 mins (was 5).
                    // 360 mins.
                    // 0, 15, ... 360.
                    // 360/15 = 24. + 0 = 25 points.
                    expect(path.split(' L ').length).toBe(25);
                });

                it('should fallback to default (every 15 mins) for unknown range', () => {
                    const subset = data.slice(0, 361);
                    const path = ChartUtils.generateSparklinePath(subset, 100, 50, 'unknown' as any);
                    // Default -> Every 30 mins (was 15).
                    // 360/30 = 12. + 0 = 13 points.
                    expect(path.split(' L ').length).toBe(13);
                });
            });

            describe('generateVpdSparklineSegments Time Ranges', () => {
                const simpleThr = { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.5, dangerMax: 1.5 };
                const thresholds = { day: simpleThr, night: simpleThr };
                const data = generateData(361);

                it('should handle "1h" range for VPD', () => {
                    const subset = data.slice(0, 60);
                    const segments = ChartUtils.generateVpdSparklineSegments(subset, 100, 50, thresholds, [], '1h');
                    // With skipDownsampling, we keep all 60 points
                    expect(segments.length).toBe(1);
                    expect(segments[0].path.split(' L ').length).toBe(60);
                });

                it('should handle "1h" range for VPD with large data (every 5 mins)', () => {
                    const largeData = generateData(200);
                    const segments = ChartUtils.generateVpdSparklineSegments(largeData, 100, 50, thresholds, [], '1h');
                    expect(segments[0].path.split(' L ').length).toBe(41);
                });

                it('should handle "24h" range for VPD with large data (every 30 mins)', () => {
                    const largeData = generateData(200);
                    const segments = ChartUtils.generateVpdSparklineSegments(largeData, 100, 50, thresholds, [], '24h');
                    expect(segments[0].path.split(' L ').length).toBe(8);
                });

                it('should handle "6h" range for VPD (every 5 mins)', () => {
                    const segments = ChartUtils.generateVpdSparklineSegments(data, 100, 50, thresholds, [], '6h');
                    // 6h -> Every 15 mins. 25 points.
                    expect(segments.length).toBe(1);
                    expect(segments[0].path.split(' L ').length).toBe(25);
                });

                it('should handle "7d" range for VPD (every 60 mins)', () => {
                    // Use 24h data to ensure we catch 4-hour points regardless of timezone
                    const dayData = generateData(1441); // 24 hours
                    const segments = ChartUtils.generateVpdSparklineSegments(dayData, 100, 50, thresholds, [], '7d');

                    // 24h / 4h = 6 intervals. + Last point = 7 points.
                    // Depending on timezone, might be 6 or 7.
                    expect(segments.length).toBe(1);
                    expect(segments[0].path.split(' L ').length).toBeGreaterThanOrEqual(6);
                    expect(segments[0].path.split(' L ').length).toBeLessThanOrEqual(8);
                });

                it('should fallback to default for unknown range in VPD', () => {
                    const segments = ChartUtils.generateVpdSparklineSegments(data, 100, 50, thresholds, [], 'INVALID' as any);
                    // Default -> Every 30 mins. 13 points.
                    expect(segments[0].path.split(' L ').length).toBe(13);
                });
            });

            describe('generatePathFromValues Time Ranges', () => {
                const generateValueData = (count: number, intervalMin: number = 1) => {
                    const baseTime = new Date('2023-01-01T00:00:00Z').getTime();
                    return Array.from({ length: count }, (_, i) => ({
                        value: 10,
                        time: baseTime + i * intervalMin * 60000
                    }));
                };
                const data = generateValueData(361);

                it('should handle "1h" range', () => {
                    const subset = data.slice(0, 60);
                    const path = ChartUtils.generatePathFromValues(subset, 100, 50, { timeRange: '1h' });
                    expect(path.split(' L ').length).toBe(60);
                });

                it('should handle "6h" range', () => {
                    const path = ChartUtils.generatePathFromValues(data, 100, 50, { timeRange: '6h' });
                    // No downsampling: 361 points
                    expect(path.split(' L ').length).toBe(361);
                });

                it('should handle "7d" range', () => {
                    const path = ChartUtils.generatePathFromValues(data, 100, 50, { timeRange: '7d' });
                    // No downsampling: 361 points
                    expect(path.split(' L ').length).toBe(361);
                });

                it('should fallback to default for unknown range', () => {
                    const path = ChartUtils.generatePathFromValues(data, 100, 50, { timeRange: 'foo' as any });
                    // No downsampling: 361 points
                    expect(path.split(' L ').length).toBe(361);
                });
            });

            describe('VPD Transitions and Gaps', () => {
                const simpleThr = { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.5, dangerMax: 1.5 };
                const thresholds = { day: simpleThr, night: simpleThr };

                it('should handle rapid status changes correctly', () => {
                    // Danger -> Warning -> Optimal -> Warning -> Danger
                    const data = [
                        { state: '0.4', last_changed: '2023-01-01T10:00:00Z' }, // Danger
                        { state: '0.6', last_changed: '2023-01-01T10:15:00Z' }, // Warning
                        { state: '1.0', last_changed: '2023-01-01T10:30:00Z' }, // Optimal
                        { state: '0.6', last_changed: '2023-01-01T10:45:00Z' }, // Warning
                        { state: '0.4', last_changed: '2023-01-01T11:00:00Z' }  // Danger
                    ];

                    const segments = ChartUtils.generateVpdSparklineSegments(data, 100, 50, thresholds, [], '1h');

                    expect(segments.length).toBeGreaterThanOrEqual(4);
                    expect(segments[0].color).toBe('#f44336'); // Danger
                    expect(segments[1].color).toBe('#ff9800'); // Warning
                    expect(segments[2].color).toBe('#4caf50'); // Optimal
                    expect(segments[3].color).toBe('#ff9800'); // Warning
                });
            });
        });
    });
    describe('normalizeHistory', () => {
        it('should return empty array for empty input', () => {
            expect(ChartUtils.normalizeHistory([], 'light', 0, 100)).toEqual([]);
        });

        it('should normalize binary states (on/off) to 1/0', () => {
            const data = [
                { state: 'on', last_changed: '2023-01-01T10:00:00Z', attributes: {} },
                { state: 'off', last_changed: '2023-01-01T11:00:00Z', attributes: {} }
            ];
            const normalized = ChartUtils.normalizeHistory(data, 'light', 0, 0);
            expect(normalized).toHaveLength(2);
            expect(normalized[0].value).toBe(1);
            expect(normalized[1].value).toBe(0);
        });

        it('should normalize numeric strings', () => {
            const data = [
                { state: '25.5', last_changed: '2023-01-01T10:00:00Z', attributes: {} },
                { state: '26.0', last_changed: '2023-01-01T11:00:00Z', attributes: {} }
            ];
            const normalized = ChartUtils.normalizeHistory(data, 'temperature', 0, 0);
            expect(normalized).toHaveLength(2);
            expect(normalized[0].value).toBe(25.5);
            expect(normalized[1].value).toBe(26.0);
        });

        it('should filter out invalid states', () => {
            const data = [
                { state: 'on', last_changed: '2023-01-01T10:00:00Z' },
                { state: 'unavailable', last_changed: '2023-01-01T10:30:00Z' },
                { state: 'unknown', last_changed: '2023-01-01T11:00:00Z' },
                { state: 'invalid', last_changed: '2023-01-01T11:30:00Z' } // Invalid float
            ];
            const normalized = ChartUtils.normalizeHistory(data, 'light', 0, 0);
            expect(normalized).toHaveLength(1);
            expect(normalized[0].value).toBe(1);
        });

        it('should sort data by time', () => {
            const data = [
                { state: '1', last_changed: '2023-01-01T11:00:00Z' },
                { state: '0', last_changed: '2023-01-01T10:00:00Z' }
            ];
            const normalized = ChartUtils.normalizeHistory(data, 'light', 0, 0);
            expect(normalized[0].time).toBeLessThan(normalized[1].time);
            expect(normalized[0].value).toBe(0);
            expect(normalized[1].value).toBe(1);
        });

        it('should include meta attributes if present', () => {
            const data = [
                { state: 'on', last_changed: '2023-01-01T10:00:00Z', attributes: { brightness: 100 } }
            ];
            const normalized = ChartUtils.normalizeHistory(data, 'light', 0, 0);
            expect(normalized[0].meta).toEqual({ brightness: 100 });
        });
    });

    describe('Coverage Gap Fillers', () => {
        it('should handle 1h time range downsampling for sparklines', () => {
            // Create data with 5 minute intervals for 1h range
            const history = [];
            const now = new Date();
            now.setMinutes(0, 0, 0); // Align to hour
            for (let i = 0; i < 12; i++) {
                const time = new Date(now.getTime() + i * 5 * 60 * 1000);
                history.push({ last_changed: time.toISOString(), state: String(50 + i) });
            }

            const result = ChartUtils.generateSparklinePath(history, 100, 20, '1h');
            expect(result).toBeDefined();
        });

        it('should handle 24h time range downsampling for sparklines', () => {
            // Create data with 30 minute intervals for 24h range
            const history = [];
            const now = new Date();
            now.setMinutes(0, 0, 0);
            for (let i = 0; i < 48; i++) {
                const time = new Date(now.getTime() + i * 30 * 60 * 1000);
                history.push({ last_changed: time.toISOString(), state: String(50 + (i % 10)) });
            }

            const result = ChartUtils.generateSparklinePath(history, 100, 20, '24h');
            expect(result).toBeDefined();
        });

        it('should handle default case for unknown time range in generateSparklinePath', () => {
            const history = [];
            const now = new Date();
            now.setMinutes(0, 0, 0);
            for (let i = 0; i < 6; i++) {
                const time = new Date(now.getTime() + i * 30 * 60 * 1000);
                history.push({ last_changed: time.toISOString(), state: String(50 + i) });
            }

            const result = ChartUtils.generateSparklinePath(history, 100, 20, 'unknown' as any);
            expect(result).toBeDefined();
        });

        it('should return purple (config default) for unknown VPD status', () => {
            // METRIC_CONFIG['vpd'].color is #9c27b0
            expect(ChartUtils.getSparklineColor('vpd', 'unknown')).toBe('#9c27b0');
        });

        it('should handle getIsDay edge cases', () => {
            // Case: time is before history and first point is ON (>0)
            const history = [{ time: 1000, value: 1 }];
            expect(ChartUtils.getIsDay(500, history)).toBe(false); // Assume previous was OFF

            // Case: empty history
            expect(ChartUtils.getIsDay(500, [])).toBe(true);
        });

        it('should normalize on/off for non-binary metric keys', () => {
            const data = [{ state: 'on', last_changed: '2023-01-01T10:00:00Z' }];
            const normalized = ChartUtils.normalizeHistory(data, 'power', 0, 0);
            expect(normalized[0].value).toBe(1);

            // Test non-binary state that is a float string
            const data2 = [{ state: '12.3', last_changed: '2023-02-01T10:00:00Z' }];
            const normalized2 = ChartUtils.normalizeHistory(data2, 'voltage', 0, 0);
            expect(normalized2[0].value).toBe(12.3);
        });
    });
    describe('Edge Case Coverage', () => {
        it('should return empty string if filtering results in < 2 points in generateSparklinePath', () => {
            const data = [
                { state: '10', last_changed: '2023-01-01T10:00:00Z' },
                { state: 'unavailable', last_changed: '2023-01-01T11:00:00Z' },
                { state: 'unknown', last_changed: '2023-01-01T12:00:00Z' }
            ];
            // Only 1 valid point remains
            expect(ChartUtils.generateSparklinePath(data, 100, 50)).toBe('');
        });

        it('should return empty array if filtering results in < 2 points in generateVpdSparklineSegments', () => {
            const thresholds = { day: { targetMin: 0, targetMax: 10, dangerMin: 0, dangerMax: 10 }, night: { targetMin: 0, targetMax: 10, dangerMin: 0, dangerMax: 10 } };
            const data = [
                { state: '1.0', last_changed: '2023-01-01T10:00:00Z' },
                { state: 'unavailable', last_changed: '2023-01-01T11:00:00Z' }
            ];
            expect(ChartUtils.generateVpdSparklineSegments(data, 100, 50, thresholds, [])).toEqual([]);
        });

        it('should handle zero time range (same timestamps) in generatePathFromValues', () => {
            const data = [
                { time: 1000, value: 10 },
                { time: 1000, value: 20 }
            ];
            // minTime == maxTime == 1000. range = 0 || 1.
            // Avoids division by zero.
            const path = ChartUtils.generatePathFromValues(data, 100, 100);
            expect(path).toBeTruthy();
            expect(path).toContain('M');
        });

        it('should handle non-metric parsing failure in normalizeHistory', () => {
            const data = [
                { state: 'invalid_float', last_changed: '2023-01-01T10:00:00Z' }
            ];
            // metricKey 'temp' means it falls to the generic float parser
            const result = ChartUtils.normalizeHistory(data, 'temp', 0, 1000);
            expect(result).toEqual([]);
        });

        it('should handle normalizeHistory with light metric but mixed invalid states', () => {
            // metricKey='light' tries to parse 'foo' as float (fallback), fails -> returns empty
            const data = [{ state: 'foo', last_changed: '2023-01-01T10:00:00Z' }];
            const result = ChartUtils.normalizeHistory(data, 'light', 0, 1000);
            expect(result).toEqual([]);
        });

        it('should handle zero time range (same timestamps) in generateVpdSparklineSegments', () => {
            const thresholds = { day: { targetMin: 0, targetMax: 10, dangerMin: 0, dangerMax: 10 }, night: { targetMin: 0, targetMax: 10, dangerMin: 0, dangerMax: 10 } };
            const data = [
                { state: '1.0', last_changed: '2023-01-01T10:00:00Z' },
                { state: '2.0', last_changed: '2023-01-01T10:00:00Z' }
            ];
            const segments = ChartUtils.generateVpdSparklineSegments(data, 100, 50, thresholds, []);
            expect(segments.length).toBeGreaterThan(0);
        });
        describe('Edge Case Coverage', () => {
            it('should handle zero duration timeRangeVal in generateSparklinePath', () => {
                const now = new Date().toISOString();
                const data = [
                    { state: '10', last_changed: now },
                    { state: '20', last_changed: now }
                ];
                // timeRangeVal will be 0, falling back to 1
                const path = ChartUtils.generateSparklinePath(data, 100, 50);
                expect(path).toBeDefined();
                expect(path).toContain('L');
            });

            it('should fallback to default color for unknown metric keys', () => {
                const color = ChartUtils.getSparklineColor('unknown_metric');
                expect(color).toBe('rgba(255, 255, 255, 0.3)');
            });

            it('should cover line 270 in generateVpdSparklineSegments where points are empty after valid filter', () => {
                const data = [
                    { state: 'unknown', last_changed: new Date().toISOString() },
                    { state: 'unavailable', last_changed: new Date().toISOString() }
                ];
                const segments = ChartUtils.generateVpdSparklineSegments(data, 100, 50, {
                    day: { targetMin: 0, targetMax: 1, dangerMin: 0, dangerMax: 2 },
                    night: { targetMin: 0, targetMax: 1, dangerMin: 0, dangerMax: 2 }
                }, []);
                expect(segments).toEqual([]);
            });

            it('should cover line 144 in getIsDay by finding state in history', () => {
                const history = [
                    { time: 1000, value: 0 },
                    { time: 2000, value: 1 }
                ];
                // time 1500 is between 1000 and 2000. Should find value 0 (Night).
                expect(ChartUtils.getIsDay(1500, history)).toBe(false);
                // time 2500 is after 2000. Should find value 1 (Day).
                expect(ChartUtils.getIsDay(2500, history)).toBe(true);
            });

            it('should include meta in normalized history if attributes exist', () => {
                const data = [{
                    state: '10',
                    last_changed: new Date().toISOString(),
                    attributes: { some: 'attr' }
                }];
                const normalized = ChartUtils.normalizeHistory(data, 'temp', 0, Date.now());
                expect(normalized[0].meta).toEqual({ some: 'attr' });
            });
        });
    });
});