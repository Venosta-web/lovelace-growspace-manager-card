import type { TestContext } from './types';

type TestEnvironment = Record<string, string | undefined>;

export function createTestContext(env: TestEnvironment): TestContext {
  const growspaceId = env.TEST_GROWSPACE_ID;

  if (!growspaceId) {
    throw new Error('TEST_GROWSPACE_ID environment variable is required');
  }

  return {
    growspaceId,
    dashboardPath: env.TEST_DASHBOARD_PATH || '/e2e-veg/0',
    vegGrowspaceId: env.TEST_VEG_GROWSPACE_ID || '',
    vegDashboardPath: env.TEST_VEG_DASHBOARD_PATH || '',
    cloneGrowspaceId: env.TEST_CLONE_GROWSPACE_ID || '',
    cloneDashboardPath: env.TEST_CLONE_DASHBOARD_PATH || '',
    motherGrowspaceId: env.TEST_MOTHER_GROWSPACE_ID || '',
    motherDashboardPath: env.TEST_MOTHER_DASHBOARD_PATH || '',
    flowerGrowspaceId: env.TEST_FLOWER_GROWSPACE_ID || '',
    flowerDashboardPath: env.TEST_FLOWER_DASHBOARD_PATH || '',
    dryGrowspaceId: env.TEST_DRY_GROWSPACE_ID || '',
    dryDashboardPath: env.TEST_DRY_DASHBOARD_PATH || '',
    cureGrowspaceId: env.TEST_CURE_GROWSPACE_ID || '',
    cureDashboardPath: env.TEST_CURE_DASHBOARD_PATH || '',
    vwcVegGrowspaceId: env.TEST_VWC_VEG_GROWSPACE_ID || '',
    vwcVegDashboardPath: env.TEST_VWC_VEG_DASHBOARD_PATH || '',
    vwcFlowerGrowspaceId: env.TEST_VWC_FLOWER_GROWSPACE_ID || '',
    vwcFlowerDashboardPath: env.TEST_VWC_FLOWER_DASHBOARD_PATH || '',
    irrigationMonitoredGrowspaceId: env.TEST_IRRIGATION_MONITORED_GROWSPACE_ID || '',
    irrigationTanksGrowspaceId: env.TEST_IRRIGATION_TANKS_GROWSPACE_ID || '',
    telemetryMultiGrowspaceId: env.TEST_TELEMETRY_MULTI_GROWSPACE_ID || '',
    telemetryMultiDashboardPath:
      env.TEST_TELEMETRY_MULTI_DASHBOARD_PATH || '/e2e-telemetry-multi/0',
    lightingGrowspaceId: env.TEST_LIGHTING_GROWSPACE_ID || '',
    visionGrowspaceId: env.TEST_VISION_GROWSPACE_ID || '',
    visionDashboardPath: env.TEST_VISION_DASHBOARD_PATH || '',
    vegPlantId: env.TEST_VEG_PLANT_ID || '',
  };
}
