import { ReactiveController, ReactiveControllerHost } from 'lit';

export class ResizeController implements ReactiveController {
    host: ReactiveControllerHost & Element;

    public isMobile = false;
    public hasTouch = false;

    private _resizeObserver: ResizeObserver | undefined;
    private _elementToObserve: Element | undefined;
    private _callback: (() => void) | undefined;

    constructor(host: ReactiveControllerHost & Element, callback?: () => void) {
        this.host = host;
        this._callback = callback;
        host.addController(this);
    }

    hostConnected() {
        this._checkMobile();
        window.addEventListener('resize', this._checkMobileBound);
        // Observe the host element by default if not specified otherwise
        // Note: The consumer can call startObserving(element) to be more specific
        // or we can rely on window resize for mobile check.
    }

    hostDisconnected() {
        window.removeEventListener('resize', this._checkMobileBound);
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
    }

    public observe(element: Element) {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        this._elementToObserve = element;
        this._resizeObserver = new ResizeObserver(() => {
            this._callback?.();
            this.host.requestUpdate();
        });
        this._resizeObserver.observe(element);
    }

    private _checkMobileBound = () => this._checkMobile();

    private _checkMobile() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const hasTouch = window.matchMedia('(pointer: coarse)').matches;

        let changed = false;

        if (this.isMobile !== isMobile) {
            this.isMobile = isMobile;
            changed = true;
        }

        if (this.hasTouch !== hasTouch) {
            this.hasTouch = hasTouch;
            changed = true;
        }

        if (changed) {
            this.host.requestUpdate();
        }
    }
}
