import {
    mdiSprout,
    mdiFlower,
    mdiHairDryer,
    mdiCannabis,
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import {
    PlantEntity,
    PlantStage,
    CropMeta,
    GrowspaceType,
    GrowspaceDevice,
    StrainEntry,
    PlantDisplayData,
    StageDisplay,
    STAGE_CONFIG
} from '../types';

export const PLANT_STAGES: PlantStage[] = [
    PlantStage.SEEDLING,
    PlantStage.MOTHER,
    PlantStage.CLONE,
    PlantStage.VEG,
    PlantStage.FLOWER,
    PlantStage.DRY,
    PlantStage.CURE,
];

export class PlantUtils {
    private static readonly stageColors: Record<PlantStage, string> = {
        [PlantStage.MOTHER]: '#E91E63',
        [PlantStage.CLONE]: '#FF5722',
        [PlantStage.SEEDLING]: '#4CAF50',
        [PlantStage.VEG]: '#8BC34A',
        [PlantStage.FLOWER]: '#FF9800',
        [PlantStage.DRY]: '#795548',
        [PlantStage.CURE]: '#9C27B0',
    };

    private static readonly stageIcons: Record<PlantStage, string> = {
        [PlantStage.MOTHER]: mdiSprout,
        [PlantStage.CLONE]: mdiSprout,
        [PlantStage.SEEDLING]: mdiSprout,
        [PlantStage.VEG]: mdiSprout,
        [PlantStage.FLOWER]: mdiFlower,
        [PlantStage.DRY]: mdiHairDryer,
        [PlantStage.CURE]: mdiCannabis,
    };

    private static normalizeStage(state: PlantStage | string | undefined | null): PlantStage {
        if (!state) return PlantStage.SEEDLING; // Default fallback
        const lower = state.toLowerCase();
        if (lower === 'veg' || lower === 'vegetative') return PlantStage.VEG;
        if (lower === 'mom') return PlantStage.MOTHER;
        // Add other aliases if necessary
        return lower as PlantStage;
    }

    static getPlantStageColor(state: PlantStage | string | undefined | null): string {
        const key = this.normalizeStage(state);
        return this.stageColors[key] ?? '#757575';
    }

    static getPlantStageIcon(state: PlantStage | string | undefined | null): string {
        const key = this.normalizeStage(state);
        return this.stageIcons[key] ?? mdiSprout;
    }

    // --- helpers at the top ---
    static getPlantStage(plant: PlantEntity): PlantStage {
        const attrs = plant?.attributes ?? {};
        const now = new Date();

        if (attrs.cure_start) return PlantStage.CURE;
        if (attrs.dry_start) return PlantStage.DRY;
        if (attrs.mom_start) return PlantStage.MOTHER;
        if (attrs.clone_start) return PlantStage.CLONE;
        if (attrs.flower_start && new Date(attrs.flower_start) <= now) return PlantStage.FLOWER;
        if (attrs.veg_start && new Date(attrs.veg_start) <= now) return PlantStage.VEG;

        return PlantStage.SEEDLING;
    }

    static calculatePlantAge(plant: PlantEntity): number {
        if (!plant || !plant.attributes) return 0;
        const stage = this.getPlantStage(plant);
        const attrs = plant.attributes;
        let startStr: string | undefined | null;

        switch (stage) {
            case PlantStage.FLOWER:
                startStr = attrs.flower_start;
                break;
            case PlantStage.VEG:
                startStr = attrs.veg_start;
                break;
            case PlantStage.MOTHER:
                startStr = attrs.mom_start;
                break;
            case PlantStage.CLONE:
                startStr = attrs.clone_start;
                break;
            case PlantStage.DRY:
                startStr = attrs.dry_start;
                break;
            case PlantStage.CURE:
                startStr = attrs.cure_start;
                break;
            case PlantStage.SEEDLING:
                startStr = attrs.planted_date;
                break;
        }

        if (!startStr) return 0;
        const start = new Date(startStr);
        const now = new Date();
        if (isNaN(start.getTime())) return 0;

        const diff = now.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    static createGridLayout(
        plants: PlantEntity[],
        rows: number,
        cols: number
    ): { rows: number; cols: number; grid: (PlantEntity | null)[][] } {
        const grid: (PlantEntity | null)[][] = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => null)
        );

        plants.forEach((plant) => {
            const row = (plant.attributes?.row ?? 1) - 1;
            const col = (plant.attributes?.col ?? 1) - 1;
            if (row >= 0 && row < rows && col >= 0 && col < cols) {
                grid[row][col] = plant;
            }
        });

        return { rows, cols, grid };
    }

    static findFirstAvailableSlot(
        plants: PlantEntity[],
        rows: number,
        cols: number
    ): { row: number; col: number } {
        const occupied = new Set<string>();
        plants.forEach((p) => {
            if (p.attributes.row !== undefined && p.attributes.col !== undefined) {
                occupied.add(`${p.attributes.row},${p.attributes.col}`);
            }
        });

        for (let r = 1; r <= rows; r++) {
            for (let c = 1; c <= cols; c++) {
                if (!occupied.has(`${r},${c}`)) {
                    return { row: r, col: c };
                }
            }
        }
        // Default to first slot if full
        return { row: 1, col: 1 };
    }

    /** Growspace types that support dynamic row expansion */
    private static readonly DYNAMIC_ROW_TYPES: GrowspaceType[] = ['dry', 'cure', 'mother', 'clone'];

    static calculateEffectiveRows(device: GrowspaceDevice): number {
        const { type, plants, plants_per_row, rows } = device;

        // Use strict type check instead of magic string comparison
        if (this.DYNAMIC_ROW_TYPES.includes(type)) {
            if (plants.length === 0) return 1;

            const maxRowUsed = Math.max(...plants.map((p) => p.attributes?.row || 1));
            const lastRowCount = plants.filter((p) => (p.attributes?.row || 1) === maxRowUsed).length;

            return lastRowCount >= plants_per_row ? maxRowUsed + 1 : maxRowUsed;
        }

        return rows;
    }

    /**
     * Converts a datetime-local input string (YYYY-MM-DDTHH:mm) to ISO string
     * Returns null if input is empty or invalid
     */
    static parseDateTimeLocal(value?: string | null): string | undefined {
        if (!value) return undefined;
        try {
            // Append ":00" if only HH:MM is provided
            const isoString = value.length === 16 ? value + ':00' : value;
            const dt = new Date(isoString);

            if (isNaN(dt.getTime())) return undefined;

            // Format as YYYY-MM-DDTHH:MM:SS (no Z)
            const yyyy = dt.getFullYear();
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const dd = String(dt.getDate()).padStart(2, '0');
            const hh = String(dt.getHours()).padStart(2, '0');
            const min = String(dt.getMinutes()).padStart(2, '0');
            const sec = String(dt.getSeconds()).padStart(2, '0');

            return `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}`;
        } catch {
            return undefined;
        }
    }

    /**
     * Extracts YYYY-MM-DD from a date string or datetime-local string
     */
    static formatDateForBackend(value?: string | null): string | undefined {
        if (!value) return undefined;
        try {
            // If it's already roughly ISO format, extracting the first part is safest
            // if we assume the user entered local time in the datetime-local input.
            const parts = value.split('T');
            if (parts.length > 0 && parts[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
                return parts[0];
            }
            // Fallback to parsing if format is unexpected
            const dt = new Date(value);
            if (isNaN(dt.getTime())) return undefined;
            const yyyy = dt.getFullYear();
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const dd = String(dt.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        } catch {
            return undefined;
        }
    }

    /** Date fields used for plant lifecycle */
    private static readonly DATE_FIELDS = [
        'seedling_start',
        'mother_start',
        'clone_start',
        'veg_start',
        'flower_start',
        'dry_start',
        'cure_start',
    ] as const;

    /**
     * Maps dialog-edited attributes to API-ready payload.
     * Pure function - no side effects.
     * @param editedAttributes - Attributes from the plant overview dialog
     * @param isBulkEdit - Whether multiple plants are being edited
     * @returns Object ready for API call
     */
    static mapDialogToApiPayload(
        editedAttributes: Record<string, any>,
        isBulkEdit: boolean
    ): Record<string, any> {
        const payload: Record<string, any> = {};

        const fieldsToProcess = isBulkEdit
            ? [...this.DATE_FIELDS]
            : ['strain', 'phenotype', 'row', 'col', ...this.DATE_FIELDS];

        fieldsToProcess.forEach((field) => {
            if (editedAttributes[field] !== undefined) {
                if (this.DATE_FIELDS.includes(field as typeof this.DATE_FIELDS[number])) {
                    const val = String(editedAttributes[field] || '');
                    if (!val || val === 'null' || val === 'undefined') {
                        payload[field] = null;
                    } else {
                        const formattedDate = this.formatDateForBackend(val);
                        if (formattedDate) {
                            payload[field] = formattedDate;
                        }
                    }
                } else {
                    if (editedAttributes[field] !== null) {
                        payload[field] = editedAttributes[field];
                    }
                }
            }
        });

        // Remove position fields for bulk edits
        if (isBulkEdit) {
            delete payload.row;
            delete payload.col;
        }

        return payload;
    }

    static getCurrentDateTime(): string {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
    }

    /**
     * Formats a date string (YYYY-MM-DD or ISO) to YYYY-MM-DDThh:mm for datetime-local inputs
     */
    static toDateTimeLocal(value?: string | null): string {
        if (!value) return '';
        try {
            const dt = new Date(value);
            if (isNaN(dt.getTime())) return '';

            const pad = (n: number) => n.toString().padStart(2, '0');
            const yyyy = dt.getFullYear();
            const mm = pad(dt.getMonth() + 1);
            const dd = pad(dt.getDate());
            const hh = pad(dt.getHours());
            const min = pad(dt.getMinutes());

            return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
        } catch {
            return '';
        }
    }

    static getDominantStage(plants: PlantEntity[]): { stage: PlantStage; days: number } | null {
        if (!plants || plants.length === 0) return null;

        // Defined priority: Cure > Dry > Flower > Vegetative > Clone > Mother > Seedling
        // Lower index = higher priority
        const priority: PlantStage[] = [
            PlantStage.CURE,
            PlantStage.DRY,
            PlantStage.FLOWER,
            PlantStage.VEG,
            PlantStage.CLONE,
            PlantStage.MOTHER,
            PlantStage.SEEDLING,
        ];

        // Find the highest priority stage present in the plants
        let bestStage: PlantStage | null = null;
        let maxDays = 0;

        // Group plants by normalized stage
        const plantsByStage: Record<string, PlantEntity[]> = {};

        for (const plant of plants) {
            // Use plant.state directly if possible, or calculate it
            // plant.state usually contains the stage string
            const stage = this.normalizeStage(plant.state || this.getPlantStage(plant));
            if (!plantsByStage[stage]) plantsByStage[stage] = [];
            plantsByStage[stage].push(plant);
        }

        // Iterate priority list to find the first matching stage
        for (const stage of priority) {
            if (plantsByStage[stage] && plantsByStage[stage].length > 0) {
                bestStage = stage;
                // Find max days for this stage
                // Map stage to attribute key
                const daysKey = `${stage === PlantStage.VEG ? 'veg' : stage}_days`;

                const daysValues = plantsByStage[stage].map((p) => {
                    const val = p.attributes[daysKey];
                    return typeof val === 'number' ? val : 0;
                });

                maxDays = Math.max(...daysValues);
                break;
            }
        }

        if (!bestStage) return null;

        return { stage: bestStage, days: maxDays };
    }

    /**
     * Compresses and resizes an image file.
     * @param file The file object from input.
     * @param maxWidth Maximum width in pixels.
     * @param maxHeight Maximum height in pixels.
     * @param quality Quality between 0 and 1.
     * @returns Promise resolving to base64 string.
     */
    static compressImage(
        file: File,
        maxWidth: number = 800,
        maxHeight: number = 800,
        quality: number = 0.7
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    // Get base64 string
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
                img.src = event.target?.result as string;
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }

    static preloadImage(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve();
            img.onerror = () => reject();
        });
    }

    static getImgStyle(meta?: CropMeta): string {
        if (!meta) return 'width: 100%; height: 100%; object-fit: cover;';
        return `width: 100%; height: 100%; object-fit: cover; object-position: ${meta.x}% ${meta.y}%; transform: scale(${meta.scale}); transform-origin: ${meta.x}% ${meta.y}%;`;
    }

    /**
     * Formats a date using the user's Home Assistant locale.
     * @param date Date object or ISO string
     * @param hass HomeAssistant instance
     * @returns Formatted date string
     */
    static formatDate(date: string | Date, hass: HomeAssistant): string {
        if (!date) return '';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';

        try {
            return new Intl.DateTimeFormat(hass.locale.language, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }).format(d);
        } catch (e) {
            console.warn('[PlantUtils] Date formatting error:', e);
            return d.toLocaleDateString();
        }
    }

    /**
     * Formats a number using the user's Home Assistant locale.
     * @param num Number to format
     * @param hass HomeAssistant instance
     * @param options Intl.NumberFormatOptions
     * @returns Formatted number string
     */
    static formatNumber(num: number, hass: HomeAssistant, options?: Intl.NumberFormatOptions): string {
        try {
            return new Intl.NumberFormat(hass.locale.language, options).format(num);
        } catch (e) {
            console.warn('[PlantUtils] Number formatting error:', e);
            return num.toString();
        }
    }
    static getPlantDisplayData(plant: PlantEntity, strainLibrary: StrainEntry[]): PlantDisplayData {
        const stageColor = this.getPlantStageColor(plant.state);
        const strainName = plant.attributes?.strain || 'Unknown Strain';
        const pheno = plant.attributes?.phenotype || '';

        // Image logic
        let imageUrl: string | undefined;
        let imageCropMeta: any | undefined;
        const library = strainLibrary || [];

        if (strainName !== 'Unknown Strain') {
            const phenoMatch = library.find(
                (s) => s.strain === strainName && s.phenotype === pheno
            );
            if (phenoMatch && phenoMatch.image) {
                imageUrl = phenoMatch.image;
                imageCropMeta = phenoMatch.image_crop_meta;
            } else {
                const strainMatch = library.find(
                    (s) => s.strain === strainName && (!s.phenotype || s.phenotype === 'default')
                );
                if (strainMatch && strainMatch.image) {
                    imageUrl = strainMatch.image;
                    imageCropMeta = strainMatch.image_crop_meta;
                } else if (!imageUrl) {
                    const anyMatch = library.find((s) => s.strain === strainName && s.image);
                    if (anyMatch) {
                        imageUrl = anyMatch.image;
                        imageCropMeta = anyMatch.image_crop_meta;
                    }
                }
            }
        }

        // Stages logic
        const stagesData = Object.entries(STAGE_CONFIG).map(([stage, config]) => {
            const daysAttr = `${stage}_days` as keyof typeof plant.attributes;
            const days = plant.attributes?.[daysAttr] as number | undefined;
            return {
                days,
                stage: stage as PlantStage,
                icon: config.icon,
                title: config.title,
            };
        }).filter(d => d.days !== undefined && d.days !== null);

        const currentStage = (plant.state || '').toLowerCase();
        let visibleDays = stagesData.filter((d) => d.days);

        if (currentStage === PlantStage.DRY) {
            visibleDays = visibleDays.filter((d) => d.stage === PlantStage.DRY);
        } else if (currentStage === PlantStage.CURE) {
            visibleDays = visibleDays.filter((d) => d.stage === PlantStage.CURE);
        }

        const normalizedCurrent =
            currentStage === 'veg' || currentStage === 'vegetative' ? PlantStage.VEG : currentStage;

        const stages: StageDisplay[] = visibleDays.map((d) => ({
            days: d.days as number,
            icon: d.icon,
            title: d.title,
            stage: d.stage,
            isCurrent: d.stage === normalizedCurrent,
            color: this.getPlantStageColor(d.stage),
        }));

        return {
            stageColor,
            strainName,
            pheno,
            imageUrl,
            imageCropMeta,
            stages,
        };
    }
}
