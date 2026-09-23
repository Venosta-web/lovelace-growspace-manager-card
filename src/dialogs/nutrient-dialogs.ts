/**
 * The feed, water and nutrient dialogs, loaded as one chunk.
 *
 * Feed & Water already renders the inventory and preset editors inside itself,
 * so the four dialog types that reach them share almost all of their code. This
 * file exists to give the chunk its name; the dialog host reaches it through
 * `LAZY_CHUNKS.nutrientDialogs`.
 */
import './feed-and-water-dialog';
import '../features/ui/components/growspace-nutrient-inventory-dialog-ui';
import '../features/ui/containers/growspace-nutrient-presets-editor.container';
