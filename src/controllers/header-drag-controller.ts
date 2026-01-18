import { ReactiveController, ReactiveControllerHost } from 'lit';

export class HeaderDragController implements ReactiveController {
    private _host: ReactiveControllerHost;
    private _draggedMetric: string | null = null;

    constructor(host: ReactiveControllerHost) {
        this._host = host;
        this._host.addController(this);
    }

    hostConnected() {
        // No specific listeners to attach globally
    }

    hostDisconnected() {
        // Cleanup if needed
    }

    public handleDragStart(e: DragEvent | null, metric: string) {
        this._draggedMetric = metric;
        if (e?.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', metric);
        }
        // Request update if UI depends on dragged state (though usually handled by CSS/classes)
        this._host.requestUpdate();
    }

    public handleDrop(e: DragEvent | null, targetMetric: string, onLink: (source: string, target: string) => void) {
        if (e) e.preventDefault();

        if (!this._draggedMetric || this._draggedMetric === targetMetric) {
            this._draggedMetric = null;
            this._host.requestUpdate();
            return;
        }

        onLink(this._draggedMetric, targetMetric);
        this._draggedMetric = null;
        this._host.requestUpdate();
    }

    public handleDragOver(e: DragEvent) {
        e.preventDefault(); // Allow drop
    }

    public get draggedMetric(): string | null {
        return this._draggedMetric;
    }
}
