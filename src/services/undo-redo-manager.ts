export interface UndoableAction {
  type: 'move' | 'delete' | 'batch-delete' | 'update' | 'swap';
  description: string;
  reverse: () => Promise<void>;
  redo: () => Promise<void>;
}

export class UndoRedoManager {
  private _undoStack: UndoableAction[] = [];
  private _redoStack: UndoableAction[] = [];
  private readonly MAX_UNDO_ACTIONS = 3;

  constructor(
    private showToast: (
      msg: string,
      type: 'info' | 'error' | 'success',
      action?: { label: string; callback: () => void }
    ) => void
  ) {}

  public pushAction(action: UndoableAction): void {
    this._undoStack.push(action);
    if (this._undoStack.length > this.MAX_UNDO_ACTIONS) {
      this._undoStack.shift(); // Remove oldest
    }
    this._redoStack = []; // Clear redo on new action

    // Show toast with Undo button
    this.showToast(action.description, 'success', {
      label: 'Undo',
      callback: () => this.undo(),
    });
  }

  public get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  public async undo(): Promise<void> {
    const action = this._undoStack.pop();
    if (!action) return;
    try {
      await action.reverse();
      this._redoStack.push(action);
      this.showToast(`Undone: ${action.description}`, 'info');
    } catch (err) {
      console.error('[Undo failed]', err);
      this.showToast('Undo failed', 'error');
    }
  }

  public async redo(): Promise<void> {
    const action = this._redoStack.pop();
    if (!action) return;
    try {
      await action.redo();
      this._undoStack.push(action);
      this.showToast(`Redone: ${action.description}`, 'info');
    } catch (err) {
      console.error('[Redo failed]', err);
      this.showToast('Redo failed', 'error');
    }
  }
}
