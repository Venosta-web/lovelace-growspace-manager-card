/**
 * Hand-built ViewModel fixtures for the Overview Tab Component test (ADR-0019, AC4).
 *
 * Lets the mount-and-assert test build an `OverviewTabViewModel` directly — no
 * state machine, no slices, no factory — proving the component is a pure
 * function of its `vm` property.
 */
import type {
  OverviewTabViewModel,
} from '../../../../../src/features/irrigation/viewmodels/overview-tab.viewmodel';
import type { DialogCapabilities } from '../../../../../src/features/irrigation/viewmodels/dialog-capabilities';

export type { OverviewTabViewModel };
export type DialogCapabilitiesLike = DialogCapabilities;

const defaultCaps: DialogCapabilities = {
  hasPump: true,
  hasSoilMoisture: true,
  hasStrategy: true,
  cropSteeringGroupVisible: true,
  volumeModeCapable: false,
  sizingModeLabel: 'Seconds',
};

/** A fully-populated, available Overview VM; override any field per test. */
export function makeOverviewVm(overrides: Partial<OverviewTabViewModel> = {}): OverviewTabViewModel {
  return {
    unavailable: false,
    scoreText: '0.00',
    declared: 'balanced',
    measured: 'balanced',
    intentBanner: null,
    overnightDryback: { value: '—', sub: null },
    inCycleDryback: { value: '—', sub: '0 shots today' },
    ecTrend: { locked: true, value: 'Locked', icon: 'M', color: 'grey' },
    shotComposition: null,
    caps: defaultCaps,
    ...overrides,
  };
}
