import { ActionContext } from '../core/action-context';
import { WSError } from '../../services/errors';
import { callServiceReturning } from '../../services/hass-call';
import { GrowAdviceResponseSchema } from '../../slices/ai-insight/schema';
import { DOMAIN, SERVICES } from '../../lib/constants';

export async function analyzeGrowspace(
  ctx: ActionContext,
  query: string,
  all: boolean
): Promise<string | undefined> {
  const currentDialog = ctx.ui.$activeDialog.get();
  if (currentDialog.type === 'GROW_MASTER') {
    ctx.ui.setActiveDialog({
      ...currentDialog,
      payload: { ...currentDialog.payload, isLoading: true },
    });
  }

  try {
    let response;
    if (all) {
      response = await callServiceReturning(
        DOMAIN,
        SERVICES.ANALYZE_ALL_GROWSPACES,
        {},
        GrowAdviceResponseSchema
      );
    } else {
      const selectedDevice = ctx.grid.$selectedDevice.get();
      if (!selectedDevice) throw new Error('No device selected');
      response = await callServiceReturning(
        DOMAIN,
        SERVICES.ASK_GROW_ADVICE,
        { growspace_id: selectedDevice, user_query: query },
        GrowAdviceResponseSchema
      );
    }

    const extractText = (res: typeof response | string): string => {
      if (typeof res === 'string') return res;
      if (!res || typeof res !== 'object') return JSON.stringify(res);
      if ('response' in res) {
        const inner = (res as { response: unknown }).response;
        if (typeof inner === 'string') return inner;
        if (inner && typeof inner === 'object' && 'response' in inner) {
          const nested = (inner as { response: unknown }).response;
          if (typeof nested === 'string') return nested;
        }
        return JSON.stringify(inner);
      }
      return JSON.stringify(res);
    };
    const text = extractText(response);

    const d = ctx.ui.$activeDialog.get();
    if (d.type === 'GROW_MASTER') {
      ctx.ui.setActiveDialog({
        type: 'GROW_MASTER',
        payload: { ...d.payload, isLoading: false, response: text },
      });
    }
    return text;
  } catch (e: unknown) {
    const d = ctx.ui.$activeDialog.get();
    if (e instanceof WSError && e.code === 'rate_limited') {
      ctx.ui.showToast('AI rate limit reached — please wait a moment before trying again', 'error');
      if (d.type === 'GROW_MASTER') {
        ctx.ui.setActiveDialog({
          type: 'GROW_MASTER',
          payload: { ...d.payload, isLoading: false },
        });
      }
      return;
    }
    const error = e instanceof Error ? e.message : 'Unknown error';
    if (d.type === 'GROW_MASTER') {
      ctx.ui.setActiveDialog({
        type: 'GROW_MASTER',
        payload: { ...d.payload, isLoading: false, response: 'Error: ' + error },
      });
    }
  }
}

export async function getStrainRecommendation(ctx: ActionContext, userQuery: string) {
  const response = await callServiceReturning(
    DOMAIN,
    SERVICES.STRAIN_RECOMMENDATION,
    { user_query: userQuery },
    GrowAdviceResponseSchema
  );
  const text =
    typeof response === 'object' && response !== null && 'response' in response
      ? (response as { response: unknown }).response
      : response;
  return typeof text === 'string' ? text : JSON.stringify(text);
}
