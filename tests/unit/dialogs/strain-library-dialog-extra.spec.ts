
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrainLibraryDialog } from '../../../src/dialogs/strain-library-dialog';
import { StrainEntry } from '../../../src/types';
import { PlantUtils } from '../../../src/utils/plant-utils';
import { mdiCheck, mdiClose, mdiDelete } from '@mdi/js';

// Mock PlantUtils
vi.mock('../../../src/utils/plant-utils', () => ({
    PlantUtils: {
        compressImage: vi.fn().mockResolvedValue('base64string'),
        encodeLocalPath: vi.fn().mockImplementation((p: string) => p),
    }
}));

describe('StrainLibraryDialog Extra Coverage', () => {
    let element: StrainLibraryDialog;
    const mockStrains: StrainEntry[] = [
        { key: '1', strain: 'Blue Dream', phenotype: 'Original', type: 'Sativa', breeder: 'HSO', image: 'hso_logo.jpg' },
        { key: '2', strain: 'OG Kush', phenotype: '#18', type: 'Indica', breeder: 'Dinafem', image: 'dinafem_logo.jpg' }
    ];

    beforeEach(async () => {
        element = new StrainLibraryDialog();
        element.strains = [...mockStrains];
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
    });

    describe('Breeder Manager', () => {
        const getBreederOverlay = () => {
            const dialogs = Array.from(element.shadowRoot?.querySelectorAll('ha-dialog') || []);
            return dialogs.find(d => d.querySelector('.dialog-title')?.textContent?.includes('Breeder Manager'));
        };

        const getBreederEditorOverlay = () => {
            const dialogs = Array.from(element.shadowRoot?.querySelectorAll('ha-dialog') || []);
            return dialogs.find(d => d.querySelector('.dialog-title')?.textContent?.includes('Breeder Manager'));
        };

        it('should open and close breeder manager', async () => {
            // Find mobile menu button
            const buttons = Array.from(element.shadowRoot?.querySelectorAll('.header-actions button') || []);
            const menuBtn = buttons.find(b => !b.classList.contains('close'));
            (menuBtn as HTMLElement)?.click();
            await element.updateComplete;

            // Click "Breeders" in mobile menu
            const menuItems = element.shadowRoot?.querySelectorAll('.mobile-menu-item');
            const breederBtn = Array.from(menuItems || []).find(i => i.textContent?.includes('Breeders'));
            (breederBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._breederDialogOpen).toBe(true);
            const overlay = getBreederOverlay();
            expect(overlay).toBeTruthy();
            expect(overlay?.textContent).toContain('Breeder Manager');

            // Close it
            const closeBtn = overlay?.querySelector('.dialog-header button.close');
            (closeBtn as HTMLElement)?.click();
            await element.updateComplete;
            expect((element as any)._breederDialogOpen).toBe(false);
        });

        it('should show empty state in breeder list', async () => {
            element.strains = [];
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const overlay = getBreederOverlay();
            const content = overlay?.querySelector('.sd-content');
            expect(content?.textContent).toContain('No breeders found');
        });

        it('should enter breeder edit mode and go back', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const overlay = getBreederOverlay();
            const breederCard = overlay?.querySelector('.breeder-card');
            (breederCard as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._breederEditorState).toBeTruthy();
            expect(overlay?.querySelector('.sd-content')?.textContent).toContain('Edit Breeder');

            // Click Back
            const backBtn = overlay?.querySelectorAll('.sd-content button.tonal')?.[0];
            (backBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._breederEditorState).toBeNull();
        });

        it('should handle breeder logo upload', async () => {
            (element as any)._breederDialogOpen = true;
            (element as any)._startBreederEdit('HSO', 'logo.jpg');
            await element.updateComplete;

            const overlay = getBreederOverlay();
            const uploadBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Change Logo'));

            const fileInput = (uploadBtn as HTMLElement).nextElementSibling as HTMLInputElement;
            const file = new File([''], 'logo.png', { type: 'image/png' });

            Object.defineProperty(fileInput, 'files', { get: () => [file] });
            fileInput.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 0));
            expect(PlantUtils.compressImage).toHaveBeenCalledWith(file);
            expect((element as any)._breederEditorState.logo).toBe('base64string');
        });

        it('should handle breeder logo removal', async () => {
            (element as any)._breederDialogOpen = true;
            (element as any)._startBreederEdit('HSO', 'logo.jpg');
            await element.updateComplete;

            const overlay = getBreederOverlay();
            // Find delete button inside the logo section
            const logoSection = overlay?.querySelector('.sd-form-group:nth-child(3)');
            const removeBtn = Array.from(logoSection?.querySelectorAll('button') || [])
                .find(b => b.textContent?.trim() === '' || b.querySelector('path')?.getAttribute('d') === mdiDelete);

            (removeBtn as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._breederEditorState.logo).toBe('');
        });

        it('should handle breeder name input', async () => {
            (element as any)._breederDialogOpen = true;
            (element as any)._startBreederEdit();
            await element.updateComplete;

            const overlay = getBreederOverlay();
            const input = overlay?.querySelector('.sd-input') as HTMLInputElement;
            input.value = 'Aha Seeds';
            input.dispatchEvent(new Event('input'));
            await element.updateComplete;

            expect((element as any)._breederEditorState.name).toBe('Aha Seeds');
        });

        it('should enter breeder edit mode via pencil icon', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const overlay = getBreederOverlay();
            const hsoCard = Array.from(overlay?.querySelectorAll('.breeder-card') || [])
                .find(c => c.textContent?.includes('HSO'));
            const editBtn = hsoCard?.querySelector('.breeder-actions button:first-child');
            (editBtn as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._breederEditorState).toBeTruthy();
            expect((element as any)._breederEditorState.originalName).toBe('HSO');
        });

        it('should cancel breeder deletion via list button', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const overlay = getBreederOverlay();
            const hsoCard = Array.from(overlay?.querySelectorAll('.breeder-card') || [])
                .find(c => c.textContent?.includes('HSO'));
            const deleteBtn = hsoCard?.querySelector('.breeder-actions button:last-child');

            (deleteBtn as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._pendingDeleteBreeder).toBe('HSO');

            // Cancel delete
            const confirmOverlay = Array.from(element.shadowRoot?.querySelectorAll('ha-dialog') || [])
                .find(d => d.textContent?.includes('Remove Breeder?'));

            const cancelBtn = Array.from(confirmOverlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Cancel'));

            (cancelBtn as HTMLElement).click();
            await element.updateComplete;
            expect((element as any)._pendingDeleteBreeder).toBeNull();
        });

        it('should save new breeder', async () => {
            (element as any)._breederDialogOpen = true;
            (element as any)._startBreederEdit();
            await element.updateComplete;

            (element as any)._breederEditorState = { ...(element as any)._breederEditorState, name: 'New Breeder' };
            await element.updateComplete;

            const saveSpy = vi.fn();
            element.addEventListener('save-breeder', saveSpy);

            const overlay = getBreederOverlay();
            const footer = overlay?.querySelector('div[style*="justify-content:flex-end"]');
            const saveBtn = Array.from(footer?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Create Breeder'));

            expect(saveBtn).toBeTruthy();
            expect((saveBtn as any).disabled).toBe(false);

            (saveBtn as HTMLElement).click();
            await element.updateComplete;

            expect(saveSpy).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
                detail: { name: 'New Breeder', logo: '' }
            }));
            expect((element as any)._breederEditorState).toBeNull();
        });

        it('should update existing breeder', async () => {
            (element as any)._breederDialogOpen = true;
            (element as any)._startBreederEdit('HSO', 'old_logo.jpg');
            await element.updateComplete;

            (element as any)._breederEditorState = { ...(element as any)._breederEditorState, name: 'HSO Pro' };
            await element.updateComplete;

            const updateSpy = vi.fn();
            element.addEventListener('update-breeder', updateSpy);

            const overlay = getBreederOverlay();
            const saveBtn = Array.from(overlay?.querySelectorAll('button.primary') || [])
                .find(b => b.textContent?.includes('Save Changes'));

            (saveBtn as HTMLElement).click();
            expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
                detail: { oldName: 'HSO', newName: 'HSO Pro', logo: 'old_logo.jpg' }
            }));
        });

        it('should delete breeder via list button', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const overlay = getBreederOverlay();
            // Find breeder card for HSO
            const breederCards = Array.from(overlay?.querySelectorAll('.breeder-card') || []);
            const hsoCard = breederCards.find(c => c.textContent?.includes('HSO'));
            const deleteBtn = hsoCard?.querySelector('.breeder-actions button:last-child');

            (deleteBtn as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._pendingDeleteBreeder).toBe('HSO');

            // Confirm delete
            const confirmSpy = vi.fn();
            element.addEventListener('delete-breeder', confirmSpy);

            const confirmOverlay = Array.from(element.shadowRoot?.querySelectorAll('ha-dialog') || [])
                .find(d => d.textContent?.includes('Remove Breeder?'));

            const confirmBtn = Array.from(confirmOverlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Remove'));

            (confirmBtn as HTMLElement).click();
            expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
                detail: { name: 'HSO' }
            }));
            expect((element as any)._pendingDeleteBreeder).toBeNull();
        });


        it('should cancel breeder deletion', async () => {
            (element as any)._pendingDeleteBreeder = 'HSO';
            await element.updateComplete;

            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('ha-dialog button') || [])
                .find(b => b.textContent?.includes('Cancel'));

            (cancelBtn as HTMLElement).click();
            await element.updateComplete;
            expect((element as any)._pendingDeleteBreeder).toBeNull();
        });
    });

    describe('Miscellaneous Interactions', () => {
it('should handle breeder logo compression error', async () => {
            (element as any)._breederDialogOpen = true;
            (element as any)._startBreederEdit('HSO', '');
            await element.updateComplete;

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (PlantUtils.compressImage as any).mockRejectedValueOnce('Logo compression failed');

            const uploadBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Upload Logo'));
            const fileInput = (uploadBtn as HTMLElement).nextElementSibling as HTMLInputElement;

            Object.defineProperty(fileInput, 'files', { get: () => [new File([''], 'logo.png')] });
            fileInput.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 0));
            expect(consoleSpy).toHaveBeenCalledWith('Error compressing logo:', 'Logo compression failed');
            consoleSpy.mockRestore();
        });
    });
});
