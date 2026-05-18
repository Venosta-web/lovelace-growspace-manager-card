import { ActionContext } from '../core/action-context';
import { GrowAdviceResponse } from '../../types';

export async function analyzeGrowspace(ctx: ActionContext, query: string, all: boolean): Promise<string | undefined> {
  const currentDialog = ctx.ui.$activeDialog.get();
  if (currentDialog.type === 'GROW_MASTER') {
    ctx.ui.setActiveDialog({
      ...currentDialog,
      payload: { ...currentDialog.payload, isLoading: true },
    });
  }

  try {
    let response: GrowAdviceResponse;
    if (all) {
      response = await ctx.dataService.analyzeAllGrowspaces();
    } else {
      const selectedDevice = ctx.grid.$selectedDevice.get();
      if (!selectedDevice) throw new Error('No device selected');
      response = await ctx.dataService.askGrowAdvice(selectedDevice, query);
    }

    const extractText = (res: GrowAdviceResponse | string): string => {
      if (typeof res === 'string') return res;
      if (!res.response) return JSON.stringify(res);
      if (typeof res.response === 'string') return res.response;
      const nested = res.response as { response?: unknown };
      if ('response' in nested && typeof nested.response === 'string') {
        return nested.response;
      }
      return JSON.stringify(res.response);
    };
    const text = extractText(response as GrowAdviceResponse | string);

    const d = ctx.ui.$activeDialog.get();
    if (d.type === 'GROW_MASTER') {
      ctx.ui.setActiveDialog({
        type: 'GROW_MASTER',
        payload: { ...d.payload, isLoading: false, response: text },
      });
    }
    return text;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    const d = ctx.ui.$activeDialog.get();
    if (d.type === 'GROW_MASTER') {
      ctx.ui.setActiveDialog({
        type: 'GROW_MASTER',
        payload: { ...d.payload, isLoading: false, response: 'Error: ' + error },
      });
    }
  }
}

export async function getStrainRecommendation(ctx: ActionContext, userQuery: string) {
  // Current UI for strain recommendation?
  // Usually likely a dialog or part of library view.
  // Assuming we want to update some state or return value.
  // If usage is within a specific component state, maybe it's better to just return the promise.
  // But to unify, let's look at how strain-actions.ts did it: it took a callback.
  // If we want "Pure Nanostores Actions", we should probably update a specific store atom or return the value.
  // Returning the value is cleaner for logic that drives a local component state.
  // BUT `analyzeGrowspace` updates Global UI Dialog state.

  // Let's return the value here to be flexible, or update if there is a global "Recommendation State".
  // For now, let's stick to returning data and let the caller handle UI if it's local.
  // Wait, strain-actions.old had `setDialogPayload`.
  // If the dialog is global (managed by ui-store), we can update it.
  // If it's local component state, we can't touch it easily from here without passing a setter.
  // Passing a setter is fine, but less "Store Pattern".

  // However, `plant-actions.ts` updates UI store (closeDialog).
  // Let's try to update UI store if possible.
  // Is there a strain recommendation dialog type?
  // Let's use the pattern of returning the promise for now, as it blocks less.
  // Or accepted a callback like before.

  // I'll stick to the previous pattern: return data, or use callback if needed.
  // Actually, `strain-actions.ts` implementation showed it updates a generic "payload" via callback.
  // I will keep it as returning the promise for now, so the component creates the loading state itself?
  // Or I can accept a `setLoading` callback.

  // To make it simple and consistent:
  const response = await ctx.dataService.getStrainRecommendation(userQuery);
  const text =
    typeof response === 'object' && response !== null && 'response' in response
      ? (response as { response: unknown }).response
      : response;
  return typeof text === 'string' ? text : JSON.stringify(text);
}
