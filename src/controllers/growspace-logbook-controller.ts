import { HomeAssistant } from "custom-card-helpers";
import { BayesianEvent } from "../types";

export class GrowspaceLogbookController {
    private hass: HomeAssistant;

    constructor(hass: HomeAssistant) {
        this.hass = hass;
    }

    async fetchEventLog(growspaceId: string): Promise<BayesianEvent[]> {
        if (!this.hass) {
            console.warn("Home Assistant instance not available");
            return [];
        }

        try {
            const response = await this.hass.callWS<{ events: BayesianEvent[] }>({
                type: "growspace_manager/get_log",
                growspace_id: growspaceId,
            });
            return response.events || [];
        } catch (e) {
            console.error("Error fetching event log:", e);
            return [];
        }
    }
}
