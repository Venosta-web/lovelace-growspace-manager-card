import type { GrowspaceDevice } from '../../../types';
import type { RecipeReapplyOffer } from '../../../dialogs/recipe-library-sm';

/** An edit offers explicit stamps across the global library's consumers. */
export function recipeReapplyOffer(
  recipeId: string,
  revision: number,
  devices: GrowspaceDevice[]
): RecipeReapplyOffer {
  return {
    recipeId,
    revision,
    zones: devices.flatMap((device) =>
      (device.irrigationZones ?? []).flatMap((zone) => {
        const applied = zone.applied_recipe;
        if (!applied || applied.id !== recipeId || applied.revision >= revision) return [];
        const drifted = zone.applied_recipe_drifted ?? null;
        return [
          {
            growspaceId: device.deviceId,
            zoneId: zone.id,
            label: zone.name ? `${device.name} · ${zone.name}` : device.name,
            revision: applied.revision,
            drifted,
            selected: drifted === false,
            // An untweaked current slot follows its recipe's new revision on refresh.
            autoAdvance:
              drifted === false &&
              zone.program?.auto_advance === true &&
              zone.program.recipe?.id === recipeId &&
              zone.program.progression.hold === null,
          },
        ];
      })
    ),
  };
}
