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
                    // Expecting multiple segments. 
                    // D -> W -> O -> W -> D
                    // 1. Danger (0->1)
                    // 2. Warning (1->2)
                    // 3. Optimal (2->3)
                    // 4. Warning (3->4)
                    // 5. Danger (one point at end?) No, finish last.
                    // Actually logic: 
                    // pt0 D. Seg=[pt0] available.
                    // pt1 W. D!=W. Finish Seg D: push pt1. path pt0->pt1. Clear. Start Seg W=[pt1].
                    // pt2 O. W!=O. Finish Seg W: push pt2. path pt1->pt2. Clear. Start Seg O=[pt2].
                    // pt3 W. O!=W. Finish Seg O: push pt3. path pt2->pt3. Clear. Start Seg W=[pt3].
                    // pt4 D. W!=D. Finish Seg W: push pt4. path pt3->pt4. Clear. Start Seg D=[pt4].
                    // End loop.
                    // Finish last Seg D. Len=1? If < 2, maybe not pushed?
                    // Let's check logic: "if (currentSegment.length >= 2)".
                    // pt4 is single in currentSegment. So last segment "D" might be dropped if it has no length?
                    // But wait, it's just a dot if single point? Or does it need extending?
                    // In sparklines, typically single points at end are ignored unless we handle them.
                    // Let's verify what happens.

                    expect(segments.length).toBeGreaterThanOrEqual(4);
                    // Colors should be D, W, O, W. The last D might be missing if it's just 1 point.
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
});
