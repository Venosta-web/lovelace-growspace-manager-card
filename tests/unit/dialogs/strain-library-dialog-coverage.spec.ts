import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrainLibraryDialog } from '../../../src/dialogs/strain-library-dialog';
import { SeedsGeneticsTab } from '../../../src/dialogs/seeds-genetics-tab';
import { GrowspaceDevice, StrainEntry } from '../../../src/types';

vi.mock('../../../src/utils/plant-utils', () => ({
  PlantUtils: {
    compressImage: vi.fn().mockResolvedValue('base64string'),
  },
}));

const mockPlants: GrowspaceDevice[] = [
  {
    name: 'Tent 1',
    plants: [
      {
        attributes: {
          plant_id: 'p1',
          strain: 'Blue Dream',
          phenotype: 'Pheno 1',
          stage: 'flower',
          flower_days: 10,
        },
      } as any,
      {
        attributes: {
          plant_id: 'p2',
          strain: 'OG Kush',
          stage: 'veg',
          veg_days: 20,
        },
      } as any,
      {
        attributes: {
          plant_id: 'p3',
          strain: 'Clone 1',
          stage: 'clone',
        },
      } as any,
    ],
  } as any,
];

const mockStrains: StrainEntry[] = [
  {
    key: 's1',
    strain: 'Blue Dream',
    phenotype: 'Pheno 1',
    breeder: 'HSO',
    breeder_logo: 'hso-logo',
    type: 'Hybrid',
  },
  {
    key: 's2',
    strain: 'OG Kush',
    phenotype: 'Pheno 2',
    breeder: 'Dinafem',
    type: 'Hybrid',
  },
];

describe('StrainLibraryDialog - Coverage Tests', () => {
  let element: StrainLibraryDialog;

  beforeEach(async () => {
    element = new StrainLibraryDialog();
    element.hass = {
      language: 'en',
      states: {},
      callService: vi.fn(),
    } as any;
    element.open = true;
    element.strains = [...mockStrains];
    element.plants = [...mockPlants];
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element.isConnected) {
      document.body.removeChild(element);
    }
    vi.restoreAllMocks();
  });

  describe('Getters & Helpers', () => {
    let seedsTab: SeedsGeneticsTab;

    beforeEach(() => {
      seedsTab = new SeedsGeneticsTab();
      seedsTab.plants = mockPlants;
      seedsTab.strains = [];
      seedsTab.seedBatches = [];
      seedsTab.pollinationEvents = [];
    });

    it('correctly filters _flowerVegPlants', () => {
      const filtered = (seedsTab as any)._flowerVegPlants;
      expect(filtered.length).toBe(2);
      expect(filtered[0].plant_id).toBe('p1');
      expect(filtered[0].label).toContain('Blue Dream (Pheno 1)');
      expect(filtered[0].label).toContain('flower · Day 10');
      expect(filtered[0].label).toContain('Tent 1');
      expect(filtered[1].plant_id).toBe('p2');
      expect(filtered[1].label).toContain('OG Kush');
      expect(filtered[1].label).toContain('veg · Day 20');
    });

    it('returns correct label in _getPlantLabel', () => {
      expect((seedsTab as any)._getPlantLabel('p1')).toBe('Blue Dream (Pheno 1)');
      expect((seedsTab as any)._getPlantLabel('p2')).toBe('OG Kush');
      expect((seedsTab as any)._getPlantLabel('non-existent')).toBe('non-existent');
    });
  });

  describe('Lifecycle', () => {
    it('switches to editor view when editingStrain property changes', async () => {
      const strain: StrainEntry = {
        strain: 'New Strain',
        phenotype: 'Pheno 1',
        type: 'Sativa',
        breeder: 'Seedler',
        key: 's1',
      };
      element.editingStrain = strain;
      await element.updateComplete;

      // Dialog-level: _view switches to editor
      expect((element as any)._view).toBe('editor');
      // Editor state is now managed by strain-editor-view (child component) - tested in strain-editor-view.spec.ts
    });
  });

  describe('Saving & Events', () => {
    it('forwards strain-created-at-source event from editor to dialog listeners', async () => {
      element.source = 'add-plant-dialog';
      element.returnPayload = { extra: 'data' };
      (element as any)._view = 'editor';
      await element.updateComplete;

      const sourceHandler = vi.fn();
      element.addEventListener('strain-created-at-source', sourceHandler);

      // Simulate the event from strain-editor-view being forwarded by dialog
      const editorView = element.shadowRoot?.querySelector('strain-editor-view');
      editorView?.dispatchEvent(new CustomEvent('strain-created-at-source', {
        bubbles: true,
        composed: true,
        detail: { strain: { strain: 'Quick Strain', type: 'Indica' }, source: 'add-plant-dialog', returnPayload: { extra: 'data' } }
      }));

      expect(sourceHandler).toHaveBeenCalled();
      const detail = sourceHandler.mock.calls[0][0].detail;
      expect(detail.source).toBe('add-plant-dialog');
      expect(detail.returnPayload.extra).toBe('data');
      expect(detail.strain.strain).toBe('Quick Strain');
    });
  });

  describe('Breeder Logic', () => {
    // auto-fill breeder logo and no-logo tests are now in strain-editor-view.spec.ts

    it('correctly aggregates breeders in _getUniqueBreeders', () => {
      const breeders = (element as any)._getUniqueBreeders();
      // Sorted alphabetically: Dinafem, HSO
      expect(breeders.length).toBe(2);
      expect(breeders[0].name).toBe('Dinafem');
      expect(breeders[1].name).toBe('HSO');
      expect(breeders[1].logo).toBe('hso-logo');
    });
  });

  describe('Breeder Manager', () => {
    beforeEach(async () => {
      (element as any)._breederDialogOpen = true;
      await element.updateComplete;
    });

    it('renders breeder list in manager', () => {
      const cards = element.shadowRoot?.querySelectorAll('.breeder-card');
      expect(cards?.length).toBe(2);
    });

    it('starts breeder edit on card click', async () => {
      const cards = element.shadowRoot?.querySelectorAll('.breeder-card');
      const hsoCard = Array.from(cards || []).find(c => c.textContent?.includes('HSO')) as HTMLElement;
      hsoCard.click();
      await element.updateComplete;

      expect((element as any)._breederEditorState).toBeTruthy();
      expect((element as any)._breederEditorState.name).toBe('HSO');
      expect((element as any)._breederEditorState.originalName).toBe('HSO');
    });

    it('saves new breeder', async () => {
      (element as any)._breederEditorState = { name: 'New Breeder', logo: 'new-logo', originalName: '' };
      await element.updateComplete;

      const saveHandler = vi.fn();
      element.addEventListener('save-breeder', saveHandler);

      (element as any)._handleSaveBreeder();

      expect(saveHandler).toHaveBeenCalled();
      const detail = saveHandler.mock.calls[0][0].detail;
      expect(detail.name).toBe('New Breeder');
      expect(detail.logo).toBe('new-logo');
      expect((element as any)._breederEditorState).toBeNull();
    });

    it('updates existing breeder', async () => {
      (element as any)._breederEditorState = { name: 'HSO Updated', logo: 'new-logo', originalName: 'HSO' };
      await element.updateComplete;

      const updateHandler = vi.fn();
      element.addEventListener('update-breeder', updateHandler);

      (element as any)._handleSaveBreeder();

      expect(updateHandler).toHaveBeenCalled();
      const detail = updateHandler.mock.calls[0][0].detail;
      expect(detail.oldName).toBe('HSO');
      expect(detail.newName).toBe('HSO Updated');
      expect((element as any)._breederEditorState).toBeNull();
    });

    it('deletes a breeder', async () => {
      (element as any)._handleDeleteBreeder('HSO');
      expect((element as any)._pendingDeleteBreeder).toBe('HSO');
      await element.updateComplete;

      const deleteHandler = vi.fn();
      element.addEventListener('delete-breeder', deleteHandler);

      (element as any)._confirmDeleteBreeder();

      expect(deleteHandler).toHaveBeenCalledWith(expect.objectContaining({
        detail: { name: 'HSO' }
      }));
      expect((element as any)._pendingDeleteBreeder).toBeNull();
    });

    it('cancels breeder deletion', async () => {
      (element as any)._handleDeleteBreeder('HSO');
      (element as any)._cancelDeleteBreeder();
      expect((element as any)._pendingDeleteBreeder).toBeNull();
    });

    it('toggles logo in breeder editor', async () => {
      (element as any)._breederEditorState = { name: 'Test', logo: 'some-logo', originalName: '' };
      await element.updateComplete;

      const deleteLogoBtn = element.shadowRoot?.querySelector('button[style*="color:var(--error-color"]') as HTMLElement;
      deleteLogoBtn?.click();
      await element.updateComplete;

      expect((element as any)._breederEditorState.logo).toBe('');
    });

    it('closes breeder editor on clicking cancel button', async () => {
      (element as any)._breederEditorState = { name: 'Test', logo: 'logo', originalName: '' };
      await element.updateComplete;
      
      const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('.md3-button.tonal') || [])
        .find(b => b.textContent?.trim() === 'Cancel') as HTMLElement;
      cancelBtn?.click();
      await element.updateComplete;
      
      expect((element as any)._breederEditorState).toBeNull();
    });
  });

  describe('UI Interactions', () => {
    it('toggles mobile menu', async () => {
      const menuBtn = element.shadowRoot?.querySelector('.header-actions button') as HTMLElement;
      menuBtn?.click();
      expect((element as any)._mobileMenuOpen).toBe(true);

      menuBtn?.click();
      expect((element as any)._mobileMenuOpen).toBe(false);
    });

    it('renders dots menu in browse view', async () => {
      (element as any)._view = 'browse';
      await element.updateComplete;

      const menuBtn = element.shadowRoot?.querySelector('.header-actions button') as HTMLElement;
      expect(menuBtn).toBeTruthy();
      expect(menuBtn.innerHTML).toContain('svg');
    });

    // Image selection and print-label tests are now in strain-editor-view.spec.ts
    it('forwards open-print-label event from editor', async () => {
      (element as any)._view = 'editor';
      await element.updateComplete;

      const printHandler = vi.fn();
      element.addEventListener('open-print-label', printHandler);

      const editorView = element.shadowRoot?.querySelector('strain-editor-view');
      editorView?.dispatchEvent(new CustomEvent('open-print-label', {
        bubbles: true,
        composed: true,
        detail: { strainName: 'Quick Strain', breeder: 'HSO' }
      }));

      expect(printHandler).toHaveBeenCalled();
      const detail = printHandler.mock.calls[0][0].detail;
      expect(detail.strainName).toBe('Quick Strain');
      expect(detail.breeder).toBe('HSO');
    });
  });

  describe('Comprehensive Coverage Gaps', () => {
    it('handles seeds-genetics-tab close event forwarding', async () => {
      (element as any)._activeMainTab = 'seeds';
      await element.updateComplete;

      const seedsTab = element.shadowRoot?.querySelector('seeds-genetics-tab');
      expect(seedsTab).toBeTruthy();

      const closeHandler = vi.fn();
      element.addEventListener('close', closeHandler);

      seedsTab?.dispatchEvent(new CustomEvent('close'));
      expect(closeHandler).toHaveBeenCalled();
    });

    it('forwards various editor view events', async () => {
      (element as any)._view = 'editor';
      await element.updateComplete;

      const editorView = element.shadowRoot?.querySelector('strain-editor-view');
      expect(editorView).toBeTruthy();

      const eventTypes = ['import-library', 'update-breeder', 'save-breeder', 'delete-breeder', 'close'];
      for (const type of eventTypes) {
        const handler = vi.fn();
        element.addEventListener(type, handler);

        editorView?.dispatchEvent(new CustomEvent(type, {
          detail: { test: 'payload' }
        }));

        expect(handler).toHaveBeenCalled();
        if (type !== 'close') {
          expect(handler.mock.calls[0][0].detail).toEqual({ test: 'payload' });
        }
      }
    });

    it('toggles breeder dialog when manage breeders button clicked', async () => {
      (element as any)._view = 'browse';
      (element as any)._activeMainTab = 'strains';
      await element.updateComplete;

      const manageBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
        .find(b => b.textContent?.includes('Manage Breeders')) as HTMLElement | undefined;
      expect(manageBtn).toBeTruthy();

      manageBtn?.click();
      expect((element as any)._breederDialogOpen).toBe(true);
    });

    it('handles Select File button and triggers import-library event on file selection', async () => {
      (element as any)._importDialogOpen = true;
      await element.updateComplete;

      const mockInput = {
        type: '',
        accept: '',
        onchange: null as any,
        click: vi.fn(),
      };

      const createElementSpy = vi.spyOn(document, 'createElement')
        .mockImplementation((tagName: string) => {
          if (tagName === 'input') {
            return mockInput as any;
          }
          return document.createElement(tagName);
        });

      const selectFileBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
        .find(b => b.textContent?.includes('Select File')) as HTMLElement | undefined;
      expect(selectFileBtn).toBeTruthy();

      selectFileBtn?.click();

      expect(createElementSpy).toHaveBeenCalledWith('input');
      expect(mockInput.type).toBe('file');
      expect(mockInput.accept).toBe('.zip');
      expect(mockInput.click).toHaveBeenCalled();

      const importHandler = vi.fn();
      element.addEventListener('import-library', importHandler);

      // Simulate file selection change
      const file = new File(['test'], 'strains.zip', { type: 'application/zip' });
      mockInput.onchange({
        target: {
          files: [file]
        }
      } as any);

      expect(importHandler).toHaveBeenCalled();
      const detail = importHandler.mock.calls[0][0].detail;
      expect(detail.file).toBe(file);
      expect(detail.replace).toBe(false); // default importReplace is false
      expect((element as any)._importDialogOpen).toBe(false);

      createElementSpy.mockRestore();
    });

    it('triggers click on breeder editor logo file input when change/upload button clicked', async () => {
      (element as any)._breederDialogOpen = true;
      (element as any)._breederEditorState = { name: 'Test Breeder', logo: '', originalName: '' };
      await element.updateComplete;

      const fileInput = element.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();

      const clickSpy = vi.spyOn(fileInput, 'click');

      const uploadBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
        .find(b => b.textContent?.includes('Upload Logo')) as HTMLElement | undefined;
      expect(uploadBtn).toBeTruthy();

      uploadBtn?.click();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('switches main tab to tree view on click', async () => {
      const treeTabBtn = Array.from(element.shadowRoot?.querySelectorAll('.tab-btn') || [])
        .find(b => b.textContent?.includes('Tree View')) as HTMLElement | undefined;
      expect(treeTabBtn).toBeTruthy();

      treeTabBtn?.click();
      expect((element as any)._activeMainTab).toBe('tree');
    });

    it('applies library filter correctly for active and all states', () => {
      element.strains = [
        { strain: 'Strain A', phenotype: 'P1', breeder: 'B1', key: 's1' },
        { strain: 'Strain B', phenotype: 'P2', breeder: 'B2', key: 's2', is_stub: true },
      ];
      element.activePlantCounts = {
        'Strain A': 2,
        'Strain B': 0,
      };

      // Filter active
      (element as any)._libraryFilter = 'active';
      const activeFiltered = (element as any)._applyLibraryFilter(element.strains);
      expect(activeFiltered).toHaveLength(1);
      expect(activeFiltered[0].strain).toBe('Strain A');

      // Filter library
      (element as any)._libraryFilter = 'library';
      const libraryFiltered = (element as any)._applyLibraryFilter(element.strains);
      expect(libraryFiltered).toHaveLength(1);
      expect(libraryFiltered[0].strain).toBe('Strain A'); // Since s2 is_stub is true

      // Filter all
      (element as any)._libraryFilter = 'all';
      const allFiltered = (element as any)._applyLibraryFilter(element.strains);
      expect(allFiltered).toHaveLength(2);
    });

    it('builds tree nodes with structured parents, legacy lineage strings, stubs, and seed batches', async () => {
      element.strains = [
        {
          key: 'pm1',
          strain: 'Mother Strain',
          breeder: 'Breeder 1',
          phenotype: 'Pheno A',
          parents: []
        } as any,
        {
          key: 'pf1',
          strain: 'Father Strain',
          breeder: 'Breeder 2',
          phenotype: '',
          lineage: 'Grand Mother X Grand Father'
        } as any,
        {
          key: 'cs1',
          strain: 'Child Strain',
          breeder: 'Breeder 3',
          phenotype: '',
          parents: [{ name: 'Mother Strain' }, { name: 'Father Strain' }]
        } as any,
      ];

      element.seedBatches = [
        {
          batch_id: 'batch_1',
          strain_name: 'Seed Batch 1',
          breeder: 'Breeder 3',
          generation: 'F2',
          parent_1_strain: 'Child Strain',
          parent_2_strain: 'Unknown Strain Parent',
        } as any
      ];

      (element as any)._activeMainTab = 'tree';
      await element.updateComplete;

      const geneticsTree = element.shadowRoot?.querySelector('genetics-tree-view');
      expect(geneticsTree).toBeTruthy();

      const nodes = (geneticsTree as any).nodes;
      expect(nodes).toBeTruthy();
      
      const childNode = nodes.find((n: any) => n.id === 'cs1');
      expect(childNode).toBeTruthy();
      expect(childNode.parents.mother).toBe('pm1');
      expect(childNode.parents.father).toBe('pf1');

      const fatherNode = nodes.find((n: any) => n.id === 'pf1');
      expect(fatherNode).toBeTruthy();
      expect(fatherNode.parents.mother).toBe('Grand Mother');
      expect(fatherNode.parents.father).toBe('Grand Father');

      const batchNode = nodes.find((n: any) => n.id === 'batch_1');
      expect(batchNode).toBeTruthy();
      expect(batchNode.parents.mother).toBe('cs1');
      expect(batchNode.parents.father).toBe('Unknown Strain Parent');

      const stubNode = nodes.find((n: any) => n.id === 'Unknown Strain Parent');
      expect(stubNode).toBeTruthy();
      expect(stubNode.type).toBe('strain');
      expect(stubNode.parents.mother).toBeNull();
    });
  });
});

