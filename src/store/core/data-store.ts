import { atom, WritableAtom } from 'nanostores';
import { GrowspaceManagerCardConfig } from '../../types';

export class GrowspaceDataStore {
  public readonly $config: WritableAtom<GrowspaceManagerCardConfig>;

  constructor() {
    this.$config = atom<GrowspaceManagerCardConfig>({} as GrowspaceManagerCardConfig);
  }

  public setConfig(config: GrowspaceManagerCardConfig) {
    this.$config.set(config);
  }
}
