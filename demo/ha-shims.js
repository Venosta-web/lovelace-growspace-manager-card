/**
 * Minimal stand-ins for the Home Assistant frontend components the card
 * expects to already exist in the page.
 *
 * The card bundle deliberately does not ship `ha-dialog`, `ha-svg-icon` and
 * friends — inside Home Assistant they are provided by the frontend itself. A
 * standalone demo page has no frontend, so those tags stay undefined, render as
 * inert unknown elements, and every dialog silently opens into nothing.
 *
 * These implementations only need to cover how the card actually uses them:
 * `<ha-dialog open hideActions>` with the card's own chrome inside, and icons
 * driven by a `.path` property. They are not general replacements.
 *
 * Each definition is guarded, so if a real Home Assistant component is ever
 * present it wins.
 */

const define = (tag, ctor) => {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
};

/* -- ha-dialog ------------------------------------------------------------ */
define(
  "ha-dialog",
  class extends HTMLElement {
    static get observedAttributes() {
      return ["open"];
    }

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          :host { position: fixed; inset: 0; z-index: 1000; display: none; }
          :host([open]) { display: block; }
          .scrim {
            position: absolute; inset: 0;
            background: rgba(0, 0, 0, 0.62);
            backdrop-filter: blur(2px);
          }
          /* Mirror mwc-dialog's sizing contract: the card drives dialog width
             through --mdc-dialog-min-width / --mdc-dialog-max-width (see
             src/styles/growspace-card.styles.ts), so honour those rather than
             sizing to content — otherwise responsive grids inside collapse to
             a single column. */
          .surface {
            position: relative;
            margin: 0 auto;
            top: 50%;
            transform: translateY(-50%);
            width: auto;
            min-width: var(--mdc-dialog-min-width, 280px);
            max-width: var(--mdc-dialog-max-width, calc(100vw - 32px));
            max-height: 94vh;
            overflow: auto;
            border-radius: 16px;
            background: var(--ha-card-background, #1c1c1c);
            color: var(--primary-text-color, #e1e1e1);
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
          }
        </style>
        <div class="scrim"></div>
        <div class="surface"><slot></slot></div>
      `;
      root
        .querySelector(".scrim")
        .addEventListener("click", () => this.#requestClose("scrim"));
      this.#onKeydown = (event) => {
        if (event.key === "Escape" && this.open) {
          event.stopPropagation();
          this.#requestClose("escape");
        }
      };
    }

    #onKeydown;

    connectedCallback() {
      document.addEventListener("keydown", this.#onKeydown, true);
    }

    disconnectedCallback() {
      document.removeEventListener("keydown", this.#onKeydown, true);
    }

    // The card sets `.open=${…}` as a property and `open` as an attribute
    // depending on the call site, so support both and keep them in sync.
    get open() {
      return this.hasAttribute("open");
    }

    set open(value) {
      if (value) this.setAttribute("open", "");
      else this.removeAttribute("open");
    }

    #requestClose(reason) {
      // `scrimClickAction=""` is how the card opts out of click-away closing.
      if (reason === "scrim" && this.scrimClickAction === "") return;
      this.open = false;
      this.dispatchEvent(
        new CustomEvent("closed", { detail: { action: reason }, bubbles: true, composed: true })
      );
    }

    close() {
      this.#requestClose("close");
    }

    show() {
      this.open = true;
    }
  }
);

/* -- icons ---------------------------------------------------------------- */
define(
  "ha-svg-icon",
  class extends HTMLElement {
    static get observedAttributes() {
      return ["path"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" }).innerHTML = `
        <style>
          :host { display: inline-flex; align-items: center; justify-content: center;
                  width: var(--mdc-icon-size, 24px); height: var(--mdc-icon-size, 24px); }
          svg { width: 100%; height: 100%; fill: currentColor; display: block; }
        </style>
        <svg viewBox="0 0 24 24"><path></path></svg>
      `;
    }

    connectedCallback() {
      this.#draw();
    }

    attributeChangedCallback() {
      this.#draw();
    }

    get path() {
      return this.#path ?? this.getAttribute("path") ?? "";
    }

    set path(value) {
      this.#path = value;
      this.#draw();
    }

    #path;

    #draw() {
      const el = this.shadowRoot?.querySelector("path");
      if (el) el.setAttribute("d", this.path || "");
    }
  }
);

// Icon *names* (`mdi:water`) need the Material Design Icons set, which the demo
// does not bundle. Render an empty box that still reserves layout space rather
// than showing a broken glyph.
define(
  "ha-icon",
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" }).innerHTML = `
        <style>:host { display: inline-block;
          width: var(--mdc-icon-size, 24px); height: var(--mdc-icon-size, 24px); }</style>
      `;
    }
  }
);

/* -- simple containers and controls --------------------------------------- */
define(
  "ha-card",
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" }).innerHTML = `
        <style>
          :host {
            display: block;
            background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
            border-radius: var(--ha-card-border-radius, 12px);
            border: var(--ha-card-border-width, 1px) solid
                    var(--ha-card-border-color, rgba(225,225,225,0.12));
            color: var(--primary-text-color, #e1e1e1);
          }
        </style>
        <slot></slot>
      `;
    }
  }
);

define(
  "ha-alert",
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" }).innerHTML = `
        <style>
          :host { display: block; padding: 10px 14px; margin: 8px 0; border-radius: 8px;
                  background: rgba(3, 169, 244, 0.12);
                  border-left: 4px solid var(--info-color, #039be5);
                  color: var(--primary-text-color, #e1e1e1); font-size: 0.9rem; }
          :host([alert-type="error"]) { background: rgba(219,68,55,0.12);
                  border-left-color: var(--error-color, #db4437); }
          :host([alert-type="warning"]) { background: rgba(255,166,0,0.12);
                  border-left-color: var(--warning-color, #ffa600); }
        </style>
        <slot></slot>
      `;
    }
  }
);

define(
  "ha-circular-progress",
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" }).innerHTML = `
        <style>
          :host { display: inline-block; width: 28px; height: 28px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .ring { width: 100%; height: 100%; border-radius: 50%;
                  border: 3px solid rgba(225,225,225,0.2);
                  border-top-color: var(--primary-color, #03a9f4);
                  animation: spin 0.9s linear infinite; }
        </style>
        <div class="ring"></div>
      `;
    }
  }
);

define(
  "ha-icon-button",
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" }).innerHTML = `
        <style>
          :host { display: inline-flex; align-items: center; justify-content: center;
                  width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
                  color: var(--primary-text-color, #e1e1e1); }
          :host(:hover) { background: rgba(225,225,225,0.08); }
        </style>
        <slot></slot>
      `;
    }
  }
);

define(
  "ha-checkbox",
  class extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `<input type="checkbox" style="width:18px;height:18px;accent-color:var(--primary-color,#03a9f4)">`;
      const input = root.querySelector("input");
      input.addEventListener("change", () => {
        this.checked = input.checked;
        this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      });
      this.#input = input;
    }

    #input;

    get checked() {
      return this.#input.checked;
    }

    set checked(value) {
      this.#input.checked = Boolean(value);
    }
  }
);

define(
  "ha-textarea",
  class extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          textarea { width: 100%; min-height: 84px; padding: 8px; border-radius: 8px;
            background: var(--secondary-background-color, #202020);
            color: var(--primary-text-color, #e1e1e1);
            border: 1px solid var(--divider-color, rgba(225,225,225,0.12));
            font: inherit; resize: vertical; }
        </style>
        <textarea></textarea>
      `;
      const area = root.querySelector("textarea");
      area.addEventListener("input", () => {
        this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      });
      this.#area = area;
    }

    #area;

    get value() {
      return this.#area.value;
    }

    set value(v) {
      this.#area.value = v ?? "";
    }
  }
);

// Rarely reached in the demo; render children so nothing disappears entirely.
for (const tag of ["ha-chip", "ha-form", "ha-entity-picker"]) {
  define(
    tag,
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" }).innerHTML =
          `<style>:host { display: block; }</style><slot></slot>`;
      }
    }
  );
}
