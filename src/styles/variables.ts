/**
 * Design tokens are authored in `tokens.ts` and generated into
 * `variables.generated.ts`. This module only re-exports them, so the ~13 existing
 * `styles/variables` imports keep working.
 *
 * To add or change a token, edit `tokens.ts` and run `npm run tokens:generate`.
 * Adding one here instead puts it outside the generator, which is the drift
 * ADR 0035 exists to prevent.
 */
export {
  variables,
  portalVariables,
  cardOnlyTokens,
  token,
  type TokenName,
} from './variables.generated';
