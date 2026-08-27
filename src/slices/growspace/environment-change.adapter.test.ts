import { describe, expect, it, vi } from 'vitest';
import { setHass } from '../../services/hass-call';
import { createEnvironmentChangeAdapter } from './environment-change.adapter';

describe('Environment Change Home Assistant adapter', () => {
  it('maps the deep interface to the two canonical Home Assistant actions', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const callService = vi.fn().mockResolvedValue(undefined);
    setHass({ callService } as any);
    const adapter = createEnvironmentChangeAdapter(refresh);
    const environment = { growspace_id: 'gs-1', temperature_sensors: ['sensor.temp'] };
    const exhaust = { growspace_id: 'gs-1', enabled: true };

    await adapter.configureEnvironment(environment);
    await adapter.configureExhaustFan(exhaust);
    await adapter.refresh();

    expect(callService).toHaveBeenNthCalledWith(
      1,
      'growspace_manager',
      'configure_environment',
      environment
    );
    expect(callService).toHaveBeenNthCalledWith(
      2,
      'growspace_manager',
      'configure_exhaust_fan',
      exhaust
    );
    expect(refresh).toHaveBeenCalledOnce();
  });
});
