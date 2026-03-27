
export class DataService {
    constructor(private hass: any) { }

    public async fetchHistory(entityIds: string[], startTime: string | Date, intervalMinutes: number = 15): Promise<Record<string, any[]>> {
        if (!this.hass || entityIds.length === 0) return {};

        let startStr: string;
        if (startTime instanceof Date) {
            startStr = startTime.toISOString();
        } else {
            startStr = startTime;
        }

        try {
            return await this.hass.callWS({
                type: 'growspace_manager/get_history_stats',
                entity_ids: entityIds,
                start_time: startStr,
                interval_minutes: intervalMinutes
            });
        } catch (err) {
            console.error('DataService: Failed to fetch history', err);
            return {};
        }
    }

    public async callService(domain: string, service: string, serviceData: any = {}) {
        if (!this.hass) return;
        return this.hass.callService(domain, service, serviceData);
    }

    public async updateSensorCoordinates(deviceId: string, entityId: string, x: number, y: number, z: number, rotation?: number) {
        if (!this.hass) return;
        try {
            await this.hass.callWS({
                type: 'growspace_manager/update_sensor_coordinates',
                growspace_id: deviceId,
                entity_id: entityId,
                x: Math.round(x),
                y: Math.round(y),
                z: Math.round(z),
                rotation: rotation !== undefined ? Math.round(rotation) : undefined,
            });
        } catch (err) {
            console.error('DataService: Failed to update sensor coordinates', err);
            throw err;
        }
    }
}
