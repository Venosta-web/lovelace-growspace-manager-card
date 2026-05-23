import { Page, Locator, expect } from '@playwright/test';
import { PlantData } from './types';

export class AddPlantDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    // Target the ha-dialog inside the custom element to ensure non-zero bounding box for visibility checks
    this.dialog = page.locator('add-plant-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }

  async waitForClosed() {
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
  }

  // ── Wizard navigation ────────────────────────────────────────────────────────

  async isContinueDisabled(): Promise<boolean> {
    return this.dialog.locator('button.md3-button.primary', { hasText: /continue/i }).isDisabled();
  }

  async clickContinue() {
    await this.dialog.locator('button.md3-button.primary', { hasText: /continue/i }).click();
  }

  async clickBack() {
    await this.dialog.locator('button.md3-button.tonal', { hasText: /back/i }).click();
  }

  async clickCancel() {
    await this.dialog.locator('button.md3-button.tonal', { hasText: /cancel/i }).click();
  }

  /** Final submit on wizard step 3 */
  async clickAddPlant() {
    await this.dialog.locator('button.md3-button.primary', { hasText: /add plant/i }).click();
  }

  // ── Step 1: Identity ─────────────────────────────────────────────────────────

  async typeStrain(query: string) {
    const input = this.dialog.locator('md3-text-input[label*="Strain" i]').locator('input');
    await input.fill(query);
  }

  async selectStrainFromDropdown(strain: string) {
    const option = this.dialog.locator('.strain-option', { hasText: strain });
    await expect(option).toBeVisible({ timeout: 3000 });
    await option.click();
  }

  // ── Step 2: Source ───────────────────────────────────────────────────────────

  async selectSeedSource() {
    await this.dialog.locator('.source-btn', { hasText: /seed/i }).click();
  }

  async selectCloneSource() {
    await this.dialog.locator('.source-btn', { hasText: /clone/i }).click();
  }

  /** Select a sibling plant by its strain name in the clone picker */
  async selectSiblingPlant(strain: string) {
    const item = this.dialog.locator('.sibling-item', { hasText: strain });
    await expect(item).toBeVisible({ timeout: 3000 });
    await item.click();
  }

  // ── Step 3: Schedule ─────────────────────────────────────────────────────────

  async fillDate(label: string, date: string) {
    await this.dialog.locator(`md3-date-input[label="${label}"]`).locator('input').fill(date);
  }

  // ── Legacy helpers (kept for existing tests) ─────────────────────────────────

  async fillForm(plantData: Partial<PlantData>) {
    await this.waitForOpen();

    if (plantData.strain) {
      const strainInput = this.dialog.locator('md3-text-input[label*="Strain" i]').locator('input');
      await strainInput.fill(plantData.strain);
    }

    if (plantData.phenotype) {
      const phenotypeInput = this.dialog.locator('md3-text-input[label*="Phenotype" i]').locator('input');
      await phenotypeInput.fill(plantData.phenotype);
    }
  }

  async submit() {
    const saveButton = this.dialog.locator('button.md3-button.primary');
    await saveButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
  }

  async cancel() {
    const cancelButton = this.dialog.locator('button.md3-button.text');
    await cancelButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
  }
}

export class ConfigDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('config-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }

  async save() {
    const saveButton = this.dialog.locator('button.md3-button.primary');
    await saveButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
  }

  async cancel() {
    const cancelButton = this.dialog.locator('button.md3-button.text');
    await cancelButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
  }
}

export class WateringDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('growspace-watering-dialog-ui ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }

  async fillAmount(amount: number) {
    const amountInput = this.dialog.locator('md3-number-input[label*="Amount" i]').locator('input');
    await amountInput.fill(String(amount));
  }

  async submit() {
    const saveButton = this.dialog.locator('button.md3-button.primary');
    await saveButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
  }
}

export class IPMDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('growspace-ipm-dialog-ui ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }
}

export class TrainingDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('training-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }
}

export class IrrigationDialog {
  readonly page: Page;
  readonly dialog: Locator;
  private readonly haDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('irrigation-dialog');
    this.haDialog = page.locator('irrigation-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.haDialog).toHaveAttribute('open', '');
  }

  async close() {
    await this.dialog.locator('button.md3-button.text', { hasText: 'Close' }).click();
    await expect(this.dialog).not.toBeAttached();
  }

  async addIrrigationTime(time: string, duration: number) {
    const irrigationCard = this.dialog
      .locator('.detail-card')
      .filter({ has: this.page.locator('.irrigation-time-bar') });
    await irrigationCard.locator('button.md3-button.primary', { hasText: 'ADD TIME' }).click();

    const overlay = this.dialog.locator('.overlay-backdrop');
    await expect(overlay).toBeVisible();
    await overlay.locator('md3-text-input[label="Time"] input').fill(time);
    await overlay.locator('md3-number-input[label="Duration (seconds)"] input').fill(String(duration));
    await overlay.locator('button.md3-button.primary', { hasText: 'Add Schedule' }).click();
    await expect(overlay).not.toBeVisible();
  }

  async removeIrrigationTime(time: string) {
    const marker = this.dialog
      .locator('.irrigation-time-bar')
      .locator(`.timeline-event[title^="${time}"]`);
    await marker.click();

    const overlay = this.dialog.locator('.overlay-backdrop');
    await expect(overlay).toBeVisible();
    await overlay.locator('button.md3-button.delete-button', { hasText: 'Delete' }).click();
    await expect(overlay).not.toBeVisible();
  }

  hasIrrigationTime(time: string): Locator {
    return this.dialog
      .locator('.irrigation-time-bar')
      .locator(`.timeline-event[title^="${time}"]`);
  }
}

export class NutrientDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('nutrient-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }
}

export class StrainLibraryDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('strain-library-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }
}

export class LogbookDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('logbook-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }
}

export class SnapshotsDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('snapshots-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }
}

export class GrowMasterDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('grow-master-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }
}

export class GrowReportDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('grow-report-dialog ha-dialog');
  }

  async waitForOpen() {
    await expect(this.dialog).toHaveAttribute('open', '');
  }
}
