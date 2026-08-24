export interface AuthContext {
  token?: string;
  baseURL: string;
}

export interface TestContext {
  /** Legacy single-growspace fields — kept for backward compat with existing specs */
  growspaceId: string;
  dashboardPath: string;
  /** Stage-specific growspace IDs and dashboard paths */
  vegGrowspaceId: string;
  vegDashboardPath: string;
  cloneGrowspaceId: string;
  cloneDashboardPath: string;
  motherGrowspaceId: string;
  motherDashboardPath: string;
  flowerGrowspaceId: string;
  flowerDashboardPath: string;
  dryGrowspaceId: string;
  dryDashboardPath: string;
  cureGrowspaceId: string;
  cureDashboardPath: string;
  /** VWC crop-steering growspace IDs and dashboard paths */
  vwcVegGrowspaceId: string;
  vwcVegDashboardPath: string;
  vwcFlowerGrowspaceId: string;
  vwcFlowerDashboardPath: string;
  /** Dedicated irrigation hardware capability profiles */
  irrigationMonitoredGrowspaceId: string;
  irrigationTanksGrowspaceId: string;
  /** Multi-sensor environmental telemetry capability profile */
  telemetryMultiGrowspaceId: string;
  telemetryMultiDashboardPath: string;
  /** Dedicated light-cycle and plain grow-light capability profile */
  lightingGrowspaceId: string;
  /** Dedicated plain Home Assistant climate-actuator capability profile */
  climatePlainGrowspaceId: string;
  climatePlainDashboardPath: string;
  /** Dedicated multi-camera and Vision Checkup capability profile */
  visionGrowspaceId: string;
  visionDashboardPath: string;
  /** Anchor plant for per-plant E2E tests (row 1, col 1 of veg growspace) */
  vegPlantId: string;
}
