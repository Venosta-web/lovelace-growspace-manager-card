/**
 * The one way a Label Template command is sent: under the negotiated contract.
 *
 * Its own module because both the draft calls and the print calls go through
 * it, and neither should have to import the other to reach it.
 *
 * The negotiated identity travels with the request, and a backend whose
 * capability has moved refuses it rather than serving a result this card would
 * misread. The one thing done automatically is the capability refresh a
 * `contract_incompatible` refusal names; the refused call is handed back to
 * its caller unperformed.
 */

import { z } from 'zod';

import { hassCall } from '../../services/hass-call';
import { negotiatedContract, recoverFromContractRefusal } from './index';
import { CONTRACT_INCOMPATIBLE } from './schema';

export async function gated<T>(
  command: string,
  payload: Record<string, unknown>,
  schema: z.ZodType<T>
): Promise<T> {
  const contract = negotiatedContract();
  if (contract === null) {
    throw new Error('The Label Template capability has not been negotiated');
  }
  const answer = await hassCall(command, { contract, ...payload }, schema);
  const refusal = (answer as { outcome?: string; refusal?: { code: string } }).refusal;
  if (refusal?.code === CONTRACT_INCOMPATIBLE) {
    // The recovery the refusal itself names. The refused call is not retried:
    // the user asked for something under one contract and would be shown the
    // result of something else.
    await recoverFromContractRefusal(refusal as never);
  }
  return answer;
}
