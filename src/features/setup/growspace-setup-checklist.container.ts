import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';

import { storeContext } from '../../context';
import type { GrowspaceStore } from '../../store/core/growspace-store';
import type { GrowspaceDevice } from '../../services/types';
import { ConfigTab } from '../environment/constants';
import * as uiSlice from '../../slices/ui';
import { aiEnabled$, aiMode$ } from '../../slices/ai-insight';
import { tcPresence$ } from '../../slices/tc/presence';
import { setSetupModule, stampSetupPreset } from '../../slices/growspace';
import { localizeWithParams } from '../../localize/localize';
import { deriveSetupChecklist } from './setup-checklist';
import type { SetupIntent } from './growspace-setup-checklist';
import './growspace-setup-checklist';

/** Where each module step is configured today. */
const STEP_TABS: Record<'lights' | 'air' | 'climate' | 'irrigation' | 'substrate', ConfigTab> = {
  lights: ConfigTab.GROWLIGHT,
  air: ConfigTab.CLIMATE,
  climate: ConfigTab.HUMIDITY,
  irrigation: ConfigTab.IRRIGATION,
  substrate: ConfigTab.SENSORS,
};

/**
 * `<growspace-setup-checklist-container>` — derives the [[Setup Checklist]]
 * for one growspace and turns its intents into dialog opens and slice writes.
 * Each step opens the dialog that already configures it; nothing here edits a
 * configuration value itself.
 */
@customElement('growspace-setup-checklist-container')
export class GrowspaceSetupChecklistContainer extends LitElement {
  @consume({ context: storeContext, subscribe: true })
  store!: GrowspaceStore;

  @property({ attribute: false }) device: GrowspaceDevice | undefined;

  @state() private _busy = false;
  @state() private _error = '';

  private _ai = new StoreController(this, aiEnabled$);
  private _tc = new StoreController(this, tcPresence$);
  private _language?: StoreController<string>;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.store && !this._language) {
      this._language = new StoreController(this, this.store.ui.$language);
    }
  }

  private get _lang(): string {
    return this._language?.value ?? 'en';
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.device) return nothing;
    const checklist = deriveSetupChecklist(this.device, {
      aiEnabled: this._ai.value,
      tcPresent: this._tc.value.status === 'present',
    });
    if (!checklist.visible) return nothing;
    return html`
      <growspace-setup-checklist
        .checklist=${checklist}
        .growspaceName=${this.device.name}
        .language=${this._lang}
        .busy=${this._busy}
        .error=${this._error}
        @setup-intent=${this._onIntent}
      ></growspace-setup-checklist>
    `;
  }

  private _onIntent = (e: CustomEvent<SetupIntent>): void => {
    e.stopPropagation();
    const device = this.device;
    if (!device) return;
    const intent = e.detail;
    const portalId = this.store?.instanceId;
    switch (intent.kind) {
      case 'open-step':
        if (intent.step === 'plants') {
          this.store?.ui.setActiveDialog({
            type: 'ADD_PLANTS',
            payload: { growspaceId: device.deviceId },
          });
        } else {
          uiSlice.openConfigDialog(device, STEP_TABS[intent.step]);
        }
        return;
      case 'open-strain-library':
        uiSlice.openStrainLibraryDialog();
        return;
      case 'open-extra':
        this._openExtra(intent.extra, device, portalId);
        return;
      case 'set-module':
        void this._save(
          () => setSetupModule(device.deviceId, intent.module, intent.offered),
          'toggle_failed'
        );
        return;
      case 'choose-preset':
        void this._save(async () => {
          await stampSetupPreset(device.deviceId, intent.preset);
          // The backend stamps the modules from its own table; fetch them.
          await this.store?.refreshData(true);
        }, 'preset_failed');
        return;
    }
  };

  private _openExtra(
    extra: 'ai' | 'vision' | 'labels' | 'tc',
    device: GrowspaceDevice,
    portalId: string | undefined
  ): void {
    switch (extra) {
      case 'ai':
        aiMode$.set('settings');
        uiSlice.openGrowMasterDialog(device.deviceId);
        return;
      case 'vision':
        uiSlice.openConfigDialog(device, ConfigTab.VISION);
        return;
      case 'labels':
        uiSlice.openLabelTemplatesDialog({ portalId });
        return;
      case 'tc':
        uiSlice.openTcDialog({ growspaceId: device.deviceId, portalId });
        return;
    }
  }

  private async _save(run: () => Promise<void>, failureKey: string): Promise<void> {
    if (this._busy) return;
    this._busy = true;
    this._error = '';
    try {
      await run();
    } catch (err) {
      console.error('[SetupChecklist] save failed', err);
      this._error = localizeWithParams(`setup.${failureKey}`, {}, this._lang);
    } finally {
      this._busy = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-setup-checklist-container': GrowspaceSetupChecklistContainer;
  }
}
