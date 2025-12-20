import { ReactiveController, ReactiveControllerHost } from 'lit';
import { PlantEntity } from '../types';

export interface DragDropHost extends ReactiveControllerHost, HTMLElement {
    plant: PlantEntity;
    row: number;
    col: number;
    isEditMode: boolean;
    selected: boolean;
    shadowRoot: ShadowRoot | null;
}

export class DragDropController implements ReactiveController {
    private host: DragDropHost;

    // State for mobile gestures
    private _longPressTimer: number | undefined;
    private _isDraggingMobile = false;
    private _startX = 0;
    private _startY = 0;

    // Constants
    private readonly LONG_PRESS_DELAY = 500;
    private readonly DRAG_THRESHOLD = 10;

    constructor(host: DragDropHost) {
        this.host = host;
        host.addController(this);
    }

    hostConnected() {
        this._isDraggingMobile = false;
        clearTimeout(this._longPressTimer);

        // Bind listeners to host
        // Note: dragstart bubbles, so we can listen on host even if inner element is draggable
        this.host.addEventListener('touchstart', this._handleTouchStartBound);
        this.host.addEventListener('touchmove', this._handleTouchMoveBound);
        this.host.addEventListener('touchend', this._handleTouchEndBound);
        this.host.addEventListener('dragstart', this.handleDragStartBound);
        this.host.addEventListener('dragend', this.handleDragEndBound);
        this.host.addEventListener('dragover', this.handleDragOverBound);
        this.host.addEventListener('drop', this.handleDropBound);
    }

    hostDisconnected() {
        clearTimeout(this._longPressTimer);

        this.host.removeEventListener('touchstart', this._handleTouchStartBound);
        this.host.removeEventListener('touchmove', this._handleTouchMoveBound);
        this.host.removeEventListener('touchend', this._handleTouchEndBound);
        this.host.removeEventListener('dragstart', this.handleDragStartBound);
        this.host.removeEventListener('dragend', this.handleDragEndBound);
        this.host.removeEventListener('dragover', this.handleDragOverBound);
        this.host.removeEventListener('drop', this.handleDropBound);
    }

    // Bind methods to preserve 'this'
    private _handleTouchStartBound = (e: TouchEvent) => this.handleTouchStart(e);
    private _handleTouchMoveBound = (e: TouchEvent) => this.handleTouchMove(e);
    private _handleTouchEndBound = (e: TouchEvent) => this.handleTouchEnd(e);
    private handleDragStartBound = (e: DragEvent) => this.handleDragStart(e);
    private handleDragEndBound = (e: DragEvent) => this.handleDragEnd(e);
    private handleDropBound = (e: DragEvent) => this.handleDrop(e);
    private handleDragOverBound = (e: DragEvent) => this.handleDragOver(e);

    // --- Touch / Mobile Handlers ---

    handleTouchStart(e: TouchEvent) {
        if (this.host.isEditMode) return;
        if (e.touches.length !== 1) return;

        this._startX = e.touches[0].clientX;
        this._startY = e.touches[0].clientY;

        // Start timer for long press
        this._longPressTimer = window.setTimeout(() => {
            this._startMobileDrag(e);
        }, this.LONG_PRESS_DELAY);
    }

    handleTouchMove(e: TouchEvent) {
        if (this._isDraggingMobile) {
            // Logic for active mobile dragging
            e.preventDefault();
            const touch = e.touches[0];
            const card = this._getCardElement();

            const deltaX = touch.clientX - this._startX;
            const deltaY = touch.clientY - this._startY;

            if (card) {
                card.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;
            }
        } else {
            // Check if moved too much to cancel long press
            const touch = e.touches[0];
            if (
                Math.abs(touch.clientX - this._startX) > this.DRAG_THRESHOLD ||
                Math.abs(touch.clientY - this._startY) > this.DRAG_THRESHOLD
            ) {
                clearTimeout(this._longPressTimer);
            }
        }
    }

    handleTouchEnd(e: TouchEvent) {
        clearTimeout(this._longPressTimer);
        if (this._isDraggingMobile) {
            this._endMobileDrag(e);
        }
    }

    // --- Desktop Drag handlers ---

    handleDragStart(e: DragEvent) {
        if (this.host.isEditMode) {
            e.preventDefault();
            return;
        }

        const target = e.target as HTMLElement;
        // Add dragging class to the card element
        const card = this._getCardElement();
        if (card) wrapperAddClass(card, 'dragging');
        else if (target) wrapperAddClass(target, 'dragging');

        if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', JSON.stringify({ id: this.host.plant.entity_id }));
            e.dataTransfer.effectAllowed = 'move';
        }

        this.host.dispatchEvent(
            new CustomEvent('plant-drag-start', {
                detail: { plant: this.host.plant },
                bubbles: true,
                composed: true,
            })
        );
    }

    handleDragEnd(e: DragEvent) {
        const card = this._getCardElement();
        if (card) wrapperRemoveClass(card, 'dragging');

        // Also try target just in case
        const target = e.target as HTMLElement;
        if (target) wrapperRemoveClass(target, 'dragging');
    }

    handleDrop(e: DragEvent) {
        e.preventDefault();
        if (this.host.isEditMode) return;

        this.host.dispatchEvent(
            new CustomEvent('plant-drop', {
                detail: {
                    originalEvent: e,
                    row: this.host.row,
                    col: this.host.col,
                    plant: this.host.plant,
                },
                bubbles: true,
                composed: true,
            })
        );
    }

    handleDragOver(e: DragEvent) {
        e.preventDefault();
    }

    // --- Internal Helpers ---

    private _getCardElement(): HTMLElement | null {
        return this.host.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
    }

    private _startMobileDrag(e: TouchEvent) {
        this._isDraggingMobile = true;
        const card = this._getCardElement();
        if (card) {
            card.classList.add('dragging-mobile');
        }

        this.host.dispatchEvent(
            new CustomEvent('mobile-drag-start', {
                detail: { plant: this.host.plant },
                bubbles: true,
                composed: true,
            })
        );
    }

    private _endMobileDrag(e: TouchEvent) {
        this._isDraggingMobile = false;
        const card = this._getCardElement();
        if (card) {
            card.classList.remove('dragging-mobile');
            card.style.transform = '';
        }

        const touch = e.changedTouches[0];

        this.host.dispatchEvent(
            new CustomEvent('mobile-drop', {
                detail: {
                    x: touch.clientX,
                    y: touch.clientY,
                    plant: this.host.plant,
                },
                bubbles: true,
                composed: true,
            })
        );
    }
}

// Helpers to avoid strict null checks on classList
function wrapperAddClass(el: HTMLElement, cls: string) {
    if (el && el.classList) el.classList.add(cls);
}

function wrapperRemoveClass(el: HTMLElement, cls: string) {
    if (el && el.classList) el.classList.remove(cls);
}
