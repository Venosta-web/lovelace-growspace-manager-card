
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrainLibraryDialog } from '../../../src/dialogs/strain-library-dialog';
import { StrainEntry } from '../../../src/types';
import { PlantUtils } from '../../../src/utils/plant-utils';

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
        const getBreederManager = () => element.shadowRoot?.querySelector('gs-breeder-manager') as any;
        const getBreederManagerSR = () => getBreederManager()?.shadowRoot;

        it('should open and close breeder manager', async () => {
            // Open via browse view mobile menu → Manage Breeders
            const browseView = element.shadowRoot?.querySelector('strain-browse-view') as any;
            const menuBtn = (Array.from(browseView?.shadowRoot?.querySelectorAll('.header-actions button') || []) as HTMLElement[])
                .find(b => !b.classList.contains('close'));
            (menuBtn as HTMLElement)?.click();
            await browseView?.updateComplete;

            const menuItems = browseView?.shadowRoot?.querySelectorAll('.mobile-menu-item');
            const breederBtn = (Array.from(menuItems || []) as HTMLElement[]).find(i => i.textContent?.includes('Breeders'));
            (breederBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._breederDialogOpen).toBe(true);

            const dialog = getBreederManagerSR()?.querySelector('gs-dialog');
            expect(dialog).toBeTruthy();

            // Close it via the footer Close button
            const closeBtn = getBreederManagerSR()?.querySelector('button.md3-button.tonal');
            (closeBtn as HTMLElement)?.click();
            await element.updateComplete;
            expect((element as any)._breederDialogOpen).toBe(false);
        });

        it('should show empty state in breeder list', async () => {
            element.strains = [];
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;
            await getBreederManager()?.updateComplete;

            const content = getBreederManagerSR()?.querySelector('.sd-content');
            expect(content?.textContent).toContain('No breeders found');
        });

        it('should enter breeder edit mode and go back', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const breederCard = getBreederManagerSR()?.querySelector('.breeder-card');
            (breederCard as HTMLElement)?.click();
            await getBreederManager()?.updateComplete;

            expect(getBreederManager()?._editorState).toBeTruthy();
            expect(getBreederManagerSR()?.querySelector('.sd-content')?.textContent).toContain('Edit Breeder');

            // Click Back
            const backBtn = (Array.from(getBreederManagerSR()?.querySelectorAll('.sd-content button.tonal') || []) as HTMLElement[])?.[0];
            (backBtn as HTMLElement)?.click();
            await getBreederManager()?.updateComplete;

            expect(getBreederManager()?._editorState).toBeNull();
        });

        it('should handle breeder logo upload', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            getBreederManager()._startEdit('HSO', 'logo.jpg');
            await getBreederManager()?.updateComplete;

            const uploadBtn = (Array.from(getBreederManagerSR()?.querySelectorAll('button') || []) as HTMLElement[])
                .find(b => b.textContent?.includes('Change Logo'));

            const fileInput = (uploadBtn as HTMLElement)?.nextElementSibling as HTMLInputElement;
            const file = new File([''], 'logo.png', { type: 'image/png' });

            Object.defineProperty(fileInput, 'files', { get: () => [file] });
            fileInput.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 0));
            expect(PlantUtils.compressImage).toHaveBeenCalledWith(file);
            expect(getBreederManager()?._editorState.logo).toBe('base64string');
        });

        it('should handle breeder logo removal', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            getBreederManager()._startEdit('HSO', 'logo.jpg');
            await getBreederManager()?.updateComplete;

            // Find remove logo button (error-color button in logo section)
            const removeBtn = getBreederManagerSR()?.querySelector('button[style*="color:var(--error-color"]') as HTMLElement;
            (removeBtn as HTMLElement)?.click();
            await getBreederManager()?.updateComplete;

            expect(getBreederManager()?._editorState.logo).toBe('');
        });

        it('should handle breeder name input', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            getBreederManager()._startEdit();
            await getBreederManager()?.updateComplete;

            const input = getBreederManagerSR()?.querySelector('.sd-input') as HTMLInputElement;
            input.value = 'Aha Seeds';
            input.dispatchEvent(new Event('input'));
            await getBreederManager()?.updateComplete;

            expect(getBreederManager()?._editorState.name).toBe('Aha Seeds');
        });

        it('should enter breeder edit mode via pencil icon', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const hsoCard = (Array.from(getBreederManagerSR()?.querySelectorAll('.breeder-card') || []) as HTMLElement[])
                .find(c => c.textContent?.includes('HSO'));
            const editBtn = hsoCard?.querySelector('.breeder-actions button:first-child');
            (editBtn as HTMLElement)?.click();
            await getBreederManager()?.updateComplete;

            expect(getBreederManager()?._editorState).toBeTruthy();
            expect(getBreederManager()?._editorState.originalName).toBe('HSO');
        });

        it('should cancel breeder deletion via list button', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const hsoCard = (Array.from(getBreederManagerSR()?.querySelectorAll('.breeder-card') || []) as HTMLElement[])
                .find(c => c.textContent?.includes('HSO'));
            const deleteBtn = hsoCard?.querySelector('.breeder-actions button:last-child');

            (deleteBtn as HTMLElement)?.click();
            await getBreederManager()?.updateComplete;

            expect(getBreederManager()?._pendingDelete).toBe('HSO');

            // Cancel delete via confirmation dialog
            const cancelBtn = (Array.from(getBreederManagerSR()?.querySelectorAll('ha-dialog button') || []) as HTMLElement[])
                .find(b => b.textContent?.includes('Cancel'));

            (cancelBtn as HTMLElement)?.click();
            await getBreederManager()?.updateComplete;
            expect(getBreederManager()?._pendingDelete).toBeNull();
        });

        it('should save new breeder', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            getBreederManager()._startEdit();
            await getBreederManager()?.updateComplete;

            getBreederManager()._editorState = { ...getBreederManager()._editorState, name: 'New Breeder' };
            getBreederManager().requestUpdate?.();
            await getBreederManager()?.updateComplete;

            const saveSpy = vi.fn();
            element.addEventListener('save-breeder', saveSpy);

            const saveBtn = (Array.from(getBreederManagerSR()?.querySelectorAll('button.primary') || []) as HTMLElement[])
                .find(b => b.textContent?.includes('Create Breeder'));

            expect(saveBtn).toBeTruthy();
            expect((saveBtn as any)?.disabled).toBe(false);

            (saveBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(saveSpy).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
                detail: { name: 'New Breeder', logo: '' }
            }));
            expect(getBreederManager()?._editorState).toBeNull();
        });

        it('should update existing breeder', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            getBreederManager()._startEdit('HSO', 'old_logo.jpg');
            await getBreederManager()?.updateComplete;

            getBreederManager()._editorState = { ...getBreederManager()._editorState, name: 'HSO Pro' };
            getBreederManager().requestUpdate?.();
            await getBreederManager()?.updateComplete;

            const updateSpy = vi.fn();
            element.addEventListener('update-breeder', updateSpy);

            const saveBtn = (Array.from(getBreederManagerSR()?.querySelectorAll('button.primary') || []) as HTMLElement[])
                .find(b => b.textContent?.includes('Save Changes'));

            (saveBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
                detail: { oldName: 'HSO', newName: 'HSO Pro', logo: 'old_logo.jpg' }
            }));
        });

        it('should delete breeder via list button', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const hsoCard = (Array.from(getBreederManagerSR()?.querySelectorAll('.breeder-card') || []) as HTMLElement[])
                .find(c => c.textContent?.includes('HSO'));
            const deleteBtn = hsoCard?.querySelector('.breeder-actions button:last-child');

            (deleteBtn as HTMLElement)?.click();
            await getBreederManager()?.updateComplete;

            expect(getBreederManager()?._pendingDelete).toBe('HSO');

            const confirmSpy = vi.fn();
            element.addEventListener('delete-breeder', confirmSpy);

            const confirmBtn = (Array.from(getBreederManagerSR()?.querySelectorAll('ha-dialog button') || []) as HTMLElement[])
                .find(b => b.textContent?.includes('Remove'));

            (confirmBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
                detail: { name: 'HSO' }
            }));
            expect(getBreederManager()?._pendingDelete).toBeNull();
        });

        it('should cancel breeder deletion', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            getBreederManager()._pendingDelete = 'HSO';
            getBreederManager().requestUpdate?.();
            await getBreederManager()?.updateComplete;

            const cancelBtn = (Array.from(getBreederManagerSR()?.querySelectorAll('ha-dialog button') || []) as HTMLElement[])
                .find(b => b.textContent?.includes('Cancel'));

            (cancelBtn as HTMLElement)?.click();
            await getBreederManager()?.updateComplete;
            expect(getBreederManager()?._pendingDelete).toBeNull();
        });
    });

    describe('Miscellaneous Interactions', () => {
        it('should handle breeder logo compression error', async () => {
            (element as any)._breederDialogOpen = true;
            await element.updateComplete;

            const gsBreederManager = element.shadowRoot?.querySelector('gs-breeder-manager') as any;
            gsBreederManager._startEdit('HSO', '');
            await gsBreederManager?.updateComplete;

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (PlantUtils.compressImage as any).mockRejectedValueOnce('Logo compression failed');

            const uploadBtn = (Array.from(gsBreederManager?.shadowRoot?.querySelectorAll('button') || []) as HTMLElement[])
                .find(b => b.textContent?.includes('Upload Logo'));
            const fileInput = (uploadBtn as HTMLElement)?.nextElementSibling as HTMLInputElement;

            Object.defineProperty(fileInput, 'files', { get: () => [new File([''], 'logo.png')] });
            fileInput.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 0));
            expect(consoleSpy).toHaveBeenCalledWith('Error compressing logo:', 'Logo compression failed');
            consoleSpy.mockRestore();
        });
    });
});
