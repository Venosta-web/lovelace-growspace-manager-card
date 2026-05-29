import { BaseAPI, WSError } from '../base-api';
import { GrowAdviceResponse } from '../../types';
import { DOMAIN, SERVICES } from '../../constants';

function toWSError(err: unknown): WSError {
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as Record<string, unknown>).code === 'string'
  ) {
    const { code, message } = err as { code: string; message: string };
    const knownCodes = ['coordinator_not_ready', 'entity_not_found', 'validation_failed', 'internal_error', 'rate_limited'];
    return new WSError(
      (knownCodes.includes(code) ? code : 'internal_error') as WSError['code'],
      message
    );
  }
  return new WSError('internal_error', err instanceof Error ? err.message : String(err));
}

/**
 * API service for AI assistant operations.
 * Handles grow advice, analysis, and strain recommendations via AI.
 */
export class AIAPI extends BaseAPI {
  /**
   * Ask the AI assistant for growing advice for a specific growspace.
   * @param growspaceId - Growspace ID to get advice for
   * @param userQuery - User's question or concern
   * @returns AI-generated advice response
   */
  async askGrowAdvice(growspaceId: string, userQuery: string): Promise<GrowAdviceResponse> {
    try {
      // Use sendMessagePromise with return_response=true
      return await this.hass.connection.sendMessagePromise({
        type: 'call_service',
        domain: DOMAIN,
        service: SERVICES.ASK_GROW_ADVICE,
        service_data: {
          growspace_id: growspaceId,
          user_query: userQuery,
        },
        return_response: true,
      });
    } catch (err: unknown) {
      console.error('[AIAPI:askGrowAdvice] Error:', err);
      throw toWSError(err);
    }
  }

  /**
   * Request AI analysis of all growspaces.
   * @returns Comprehensive analysis from AI
   */
  async analyzeAllGrowspaces(): Promise<GrowAdviceResponse> {
    try {
      return await this.hass.connection.sendMessagePromise({
        type: 'call_service',
        domain: DOMAIN,
        service: SERVICES.ANALYZE_ALL_GROWSPACES,
        service_data: {},
        return_response: true,
      });
    } catch (err) {
      console.error('[AIAPI:analyzeAllGrowspaces] Error:', err);
      throw toWSError(err);
    }
  }

  /**
   * Get AI-powered strain recommendation based on user preferences.
   * @param userQuery - User's requirements or preferences
   * @returns AI-generated strain recommendation
   */
  async getStrainRecommendation(userQuery: string): Promise<GrowAdviceResponse> {
    try {
      return await this.hass.connection.sendMessagePromise({
        type: 'call_service',
        domain: DOMAIN,
        service: SERVICES.STRAIN_RECOMMENDATION,
        service_data: {
          user_query: userQuery,
        },
        return_response: true,
      });
    } catch (err) {
      console.error('[AIAPI:getStrainRecommendation] Error:', err);
      throw err;
    }
  }
}
