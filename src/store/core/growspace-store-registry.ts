import { GrowspaceSharedStore } from './growspace-shared-store';

class GrowspaceStoreRegistry {
  private _entry: { store: GrowspaceSharedStore; refs: number } | null = null;

  acquire(): GrowspaceSharedStore {
    if (!this._entry) {
      this._entry = { store: new GrowspaceSharedStore(), refs: 0 };
    }
    this._entry.refs++;
    return this._entry.store;
  }

  release(): void {
    if (!this._entry) return;
    this._entry.refs--;
    if (this._entry.refs <= 0) {
      this._entry.store.destroy();
      this._entry = null;
    }
  }
}

export const growspaceStoreRegistry = new GrowspaceStoreRegistry();
