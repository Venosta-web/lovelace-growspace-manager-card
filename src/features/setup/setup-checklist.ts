import type { GrowspaceDevice } from '../../services/types';
import type { SetupModule } from '../../slices/growspace';

/**
 * The [[Setup Checklist]]: what a growspace still needs before the card has
 * something to show, derived from the device alone.
 *
 * The steps and their roles are fixed (card#973). Lights and air are core,
 * climate, irrigation and substrate optional, and plants always core; the
 * growspace's stamped [[Setup Module]]s (GSM ADR-0064) decide only which module
 * steps are offered. "Dashboard ready" is the conjunction of the offered core
 * steps, which is how an optional module can never block it.
 */

export type SetupStepId = SetupModule | 'plants';
export type SetupExtraId = 'ai' | 'vision' | 'labels' | 'tc';

export interface SetupStep {
  id: SetupStepId;
  role: 'core' | 'optional';
  /** False once the grower (or the preset) said this room does not use it. */
  offered: boolean;
  done: boolean;
}

interface SetupExtra {
  id: SetupExtraId;
  /** Null when the card cannot tell from here whether it is set up. */
  ready: boolean | null;
}

export interface SetupChecklist {
  visible: boolean;
  /** Replace the grid while there are no plants; sit above it once there are. */
  placement: 'replace-grid' | 'panel';
  preset: string | null;
  steps: SetupStep[];
  /** Every offered core step is done. */
  ready: boolean;
  extras: SetupExtra[];
}

export interface SetupExtrasContext {
  aiEnabled: boolean | null;
  tcPresent: boolean;
}

const MODULE_ROLES: ReadonlyArray<[SetupModule, SetupStep['role']]> = [
  ['lights', 'core'],
  ['air', 'core'],
  ['climate', 'optional'],
  ['irrigation', 'optional'],
  ['substrate', 'optional'],
];

const any = (...values: Array<string | readonly unknown[] | null | undefined>): boolean =>
  values.some((v) => (Array.isArray(v) ? v.length > 0 : !!v));

/** Whether the growspace already has what a module's step asks for. */
export function isModuleDone(device: GrowspaceDevice, module: SetupModule): boolean {
  // Loading-state and hand-built devices can arrive without the group at all.
  const env = device.environmentAttributes ?? {};
  switch (module) {
    case 'lights':
      return any(
        env.lightSensor,
        env.lightSensors,
        env.growlightEntities,
        env.growlightAcInfinityDevices
      );
    case 'air':
      // Either half of the airflow counts: a small tent may run an exhaust
      // alone, and holding the whole checklist open over a fan it does not
      // have would teach the grower to skip the step instead.
      return any(
        env.circulationFanEntity,
        env.circulationFanEntities,
        env.circulationFanAcInfinityDevices,
        env.exhaustEntity,
        env.exhaustFanEntities,
        env.exhaustFanAcInfinityDevices
      );
    case 'climate':
      return any(
        env.humidifierEntity,
        env.humidifierEntities,
        env.humidifierAcInfinityDevices,
        env.dehumidifierEntity,
        env.dehumidifierEntities,
        env.dehumidifierAcInfinityDevices
      );
    case 'irrigation':
      return any(device.irrigationConfig?.irrigationPumpEntity);
    case 'substrate':
      return any(
        env.soilMoistureSensor,
        env.soilMoistureSensors,
        env.poreEcSensors,
        env.bulkEcSensors,
        env.substrateTemperatureSensors
      );
  }
}

export function deriveSetupChecklist(
  device: GrowspaceDevice,
  context: SetupExtrasContext
): SetupChecklist {
  const hasPlants = (device.plants?.length ?? 0) > 0;
  const steps: SetupStep[] = [
    ...MODULE_ROLES.map(([id, role]) => ({
      id,
      role,
      offered: device.setupModules?.[id] ?? true,
      done: isModuleDone(device, id),
    })),
    { id: 'plants', role: 'core', offered: true, done: hasPlants },
  ];

  const ready = steps.every((s) => s.role !== 'core' || !s.offered || s.done);
  const preset = device.setupPreset ?? null;

  // A stamped growspace keeps its checklist until the core is done. One that
  // was never stamped — made before presets existed, or a canonical room —
  // only shows it while it is genuinely fresh, so an established tent never
  // grows a checklist over plants it has been running for months.
  const fresh = !hasPlants && steps.every((s) => !s.done);
  const visible = preset !== null ? !ready : fresh;

  const extras: SetupExtra[] = [
    { id: 'ai', ready: context.aiEnabled },
    { id: 'vision', ready: device.environmentAttributes?.visionCheckupConfig?.enabled ?? false },
    { id: 'labels', ready: null },
    ...(context.tcPresent ? [{ id: 'tc' as const, ready: true }] : []),
  ];

  return {
    visible,
    placement: hasPlants ? 'panel' : 'replace-grid',
    preset,
    steps,
    ready,
    extras,
  };
}
