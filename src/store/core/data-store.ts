import { atom, WritableAtom } from 'nanostores';
import { GrowspaceManagerCardConfig } from '../../types';

export class GrowspaceDataStore {
  public readonly $config: WritableAtom<GrowspaceManagerCardConfig>;

  /** Incremented by GrowspaceSharedStore when a push event requires a full data refresh. */
  public readonly $staleCounter: WritableAtom<number>;

  constructor() {
    this.$staleCounter = atom<number>(0);
    this.$config = atom<GrowspaceManagerCardConfig>({} as GrowspaceManagerCardConfig);
  }

  public setConfig(config: GrowspaceManagerCardConfig) {
    this.$config.set(config);
  }
}
