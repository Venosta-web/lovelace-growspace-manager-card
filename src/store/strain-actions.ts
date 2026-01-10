/**
 * Strain & Growspace Actions - Pure functions for strain library and growspace management.
 */

import { StrainEntry } from '../types';
import { DataService } from '../data-service';

export interface StrainActionContext {
    dataService: DataService;
    showToast: (message: string, type: 'info' | 'error' | 'success') => void;
    closeDialog: () => void;
    refreshData: () => Promise<void>;
    refreshStrainLibrary: (force?: boolean) => Promise<void>;
    setStrainLibrary: (library: StrainEntry[]) => void;
    getStrainLibrary: () => StrainEntry[];
}

/**
 * Add a new strain to the library.
 */
export async function addStrain(
    ctx: StrainActionContext,
    strainData: Partial<StrainEntry>
): Promise<boolean> {
    if (!strainData.strain) return false;

    const payload = {
        strain: strainData.strain,
        phenotype: strainData.phenotype,
        breeder: strainData.breeder,
        type: strainData.type,
        flowering_days_min: strainData.flowering_days_min
            ? Number(strainData.flowering_days_min)
            : undefined,
        flowering_days_max: strainData.flowering_days_max
            ? Number(strainData.flowering_days_max)
            : undefined,
        lineage: strainData.lineage,
        sex: strainData.sex,
        description: strainData.description,
        image: strainData.image,
        image_crop_meta: strainData.image_crop_meta,
        sativa_percentage: strainData.sativa_percentage,
        indica_percentage: strainData.indica_percentage,
    };

    try {
        await ctx.dataService.addStrain(payload);
        ctx.showToast('Strain saved successfully!', 'success');
        await ctx.refreshStrainLibrary(true);
        return true;
    } catch (err) {
        console.error('Error adding strain:', err);
        return false;
    }
}

/**
 * Remove a strain from the library.
 */
export async function removeStrain(
    ctx: StrainActionContext,
    strainKey: string
): Promise<boolean> {
    try {
        const parts = strainKey.split('|');
        const strain = parts[0];
        const phenotype = parts.length > 1 && parts[1] !== 'default' ? parts[1] : undefined;

        await ctx.dataService.removeStrain(strain, phenotype);

        const current = ctx.getStrainLibrary();
        ctx.setStrainLibrary(current.filter((s) => s.key !== strainKey));

        await ctx.refreshStrainLibrary(true);
        return true;
    } catch (err) {
        console.error('Error removing strain:', err);
        return false;
    }
}

export interface GrowspaceActionContext {
    dataService: DataService;
    showToast: (message: string, type: 'info' | 'error' | 'success') => void;
    closeDialog: () => void;
    refreshData: () => Promise<void>;
}

/**
 * Add a new growspace.
 */
export async function addGrowspace(
    ctx: GrowspaceActionContext,
    name: string,
    rows: number = 4,
    plantsPerRow: number = 4,
    notificationService: string = 'mobile_app_notify'
): Promise<boolean> {
    if (!name) {
        ctx.showToast('Name is required', 'error');
        return false;
    }

    try {
        await ctx.dataService.addGrowspace({
            name,
            rows,
            plants_per_row: plantsPerRow,
            notification_service: notificationService,
        });
        ctx.showToast('Growspace added successfully!', 'success');
        await ctx.refreshData();
        ctx.closeDialog();
        return true;
    } catch (e: any) {
        ctx.showToast(`Error: ${e.message}`, 'error');
        return false;
    }
}

/**
 * Update an existing growspace.
 */
export async function updateGrowspace(
    ctx: GrowspaceActionContext,
    growspaceId: string,
    name: string,
    rows: number,
    plantsPerRow: number
): Promise<boolean> {
    try {
        await ctx.dataService.updateGrowspace({
            growspace_id: growspaceId,
            name,
            rows,
            plants_per_row: plantsPerRow,
        });
        ctx.showToast('Growspace updated successfully', 'success');
        await ctx.refreshData();
        ctx.closeDialog();
        return true;
    } catch (e: any) {
        console.error('[StrainActions] Update failed:', e);
        ctx.showToast(`Failed to update growspace: ${e.message}`, 'error');
        return false;
    }
}

/**
 * Remove a growspace.
 */
export async function removeGrowspace(
    ctx: GrowspaceActionContext,
    growspaceId: string
): Promise<boolean> {
    try {
        await ctx.dataService.removeGrowspace(growspaceId);
        ctx.showToast('Growspace removed successfully', 'success');
        await ctx.refreshData();
        ctx.closeDialog();
        return true;
    } catch (e: any) {
        console.error('[StrainActions] Removal failed:', e);
        ctx.showToast(`Failed to remove growspace: ${e.message}`, 'error');
        return false;
    }
}

/**
 * Analyze growspace with AI.
 */
export async function analyzeGrowspace(
    ctx: GrowspaceActionContext,
    query: string,
    all: boolean,
    selectedDeviceId: string | null,
    setDialogPayload: (payload: { isLoading: boolean; response?: string }) => void
): Promise<void> {
    setDialogPayload({ isLoading: true });

    try {
        let response;
        if (all) {
            response = await ctx.dataService.analyzeAllGrowspaces();
        } else {
            if (!selectedDeviceId) throw new Error('No device selected');
            response = await ctx.dataService.askGrowAdvice(selectedDeviceId, query);
        }

        const text = (response as any).response || response;
        setDialogPayload({
            isLoading: false,
            response: typeof text === 'string' ? text : JSON.stringify(text),
        });
    } catch (e: any) {
        setDialogPayload({ isLoading: false, response: 'Error: ' + e.message });
    }
}

/**
 * Get strain recommendation from AI.
 */
export async function getStrainRecommendation(
    ctx: GrowspaceActionContext,
    userQuery: string,
    setDialogPayload: (payload: { isLoading: boolean; response?: string }) => void
): Promise<void> {
    setDialogPayload({ isLoading: true });

    try {
        const response = await ctx.dataService.getStrainRecommendation(userQuery);
        const text = (response as any).response || response;
        setDialogPayload({
            isLoading: false,
            response: typeof text === 'string' ? text : JSON.stringify(text),
        });
    } catch (e: any) {
        setDialogPayload({ isLoading: false, response: 'Error: ' + e.message });
        throw e; // Re-throw for caller handling
    }
}
