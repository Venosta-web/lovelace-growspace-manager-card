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
  /** Anchor plant for per-plant E2E tests (row 1, col 1 of veg growspace) */
  vegPlantId: string;
}
