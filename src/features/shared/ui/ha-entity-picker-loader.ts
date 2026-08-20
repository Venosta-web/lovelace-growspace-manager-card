/**
 * `ha-entity-picker` ships with the Home Assistant frontend but lives in a chunk
 * that is only pulled in once something asks for it — typically the Lovelace
 * editor. A card rendered on a freshly loaded dashboard can therefore hit an
 * undefined element. Instantiating a built-in card's config element is the
 * supported way to make the frontend load that chunk for us.
 */

type CardHelpers = {
  createCardElement: (config: { type: string; entities: unknown[] }) => {
    constructor: { getConfigElement?: () => Promise<unknown> };
  };
};

let pending: Promise<void> | undefined;

/** Resolve once `ha-entity-picker` is registered (or the attempt has failed). */
export function ensureEntityPicker(): Promise<void> {
  if (customElements.get('ha-entity-picker')) return Promise.resolve();
  pending ??= loadEntityPicker();
  return pending;
}

async function loadEntityPicker(): Promise<void> {
  const loader = (window as unknown as { loadCardHelpers?: () => Promise<CardHelpers> })
    .loadCardHelpers;
  if (loader) {
    try {
      const helpers = await loader();
      const card = helpers.createCardElement({ type: 'entities', entities: [] });
      await card.constructor.getConfigElement?.();
    } catch {
      // Fall through to the whenDefined wait — another surface may register it.
    }
  }
  if (!customElements.get('ha-entity-picker')) {
    await customElements.whenDefined('ha-entity-picker');
  }
}
