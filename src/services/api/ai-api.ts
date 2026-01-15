import { BaseAPI } from '../base-api';
import { GrowAdviceResponse } from '../../types';
import { DOMAIN, SERVICES } from '../../constants';

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
        console.log('[AIAPI:askGrowAdvice] Asking advice for:', growspaceId, userQuery);
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
            const message = err instanceof Error ? err.message : 'Failed to get advice';
            throw new Error(message);
        }
    }

    /**
     * Request AI analysis of all growspaces.
     * @returns Comprehensive analysis from AI
     */
    async analyzeAllGrowspaces(): Promise<GrowAdviceResponse> {
        console.log('[AIAPI:analyzeAllGrowspaces] Analyzing all growspaces');
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
            throw err;
        }
    }

    /**
     * Get AI-powered strain recommendation based on user preferences.
     * @param userQuery - User's requirements or preferences
     * @returns AI-generated strain recommendation
     */
    async getStrainRecommendation(userQuery: string): Promise<GrowAdviceResponse> {
        console.log('[AIAPI:getStrainRecommendation] Getting strain recommendation for:', userQuery);
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
