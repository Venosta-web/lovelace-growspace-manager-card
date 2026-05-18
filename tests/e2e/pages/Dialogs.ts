import { Page, Locator } from '@playwright/test';
import { PlantData } from './types';

export class AddPlantDialog {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use actual custom element name from exploration
    this.dialog = page.locator('add-plant-dialog');
  }

  async waitForOpen() {
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillForm(plantData: Partial<PlantData>) {
    // Wait for dialog to be fully rendered
    await this.waitForOpen();

    // Use MD3 custom inputs based on exploration
    if (plantData.strain) {
      const strainInput = this.dialog.locator('md3-text-input[label*="Strain" i]');
      await strainInput.fill(plantData.strain);
    }

    if (plantData.phenotype) {
      const phenotypeInput = this.dialog.locator('md3-text-input[label*="Phenotype" i]');
      await phenotypeInput.fill(plantData.phenotype);
    }

    // Note: Row/col might be selected via grid, not input fields
    // This needs to be discovered during actual testing
  }

  async submit() {
    // Primary button with .md3-button.primary class
    const saveButton = this.dialog.locator('button.md3-button.primary');
    await saveButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
  }

  async cancel() {
    // Text button with .md3-button.text class
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
    this.dialog = page.locator('config-dialog');
  }

  async waitForOpen() {
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 });
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
    this.dialog = page.locator('watering-dialog');
  }

  async waitForOpen() {
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillAmount(amount: number) {
    const amountInput = this.dialog.locator('md3-number-input[label*="Amount" i]');
    await amountInput.fill(String(amount));
  }

  async submit() {
    const saveButton = this.dialog.locator('button.md3-button.primary');
    await saveButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
  }
}
