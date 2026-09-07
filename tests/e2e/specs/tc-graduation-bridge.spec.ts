import type { Page } from '@playwright/test';
import { callHAService, callHAWebSocket, expect, haTest as test } from '../fixtures/ha-setup';
import { TissueCultureCard } from '../pages/TissueCultureCard';

const PLANT_PREFIX = 'E2E TC graduation';

interface CultureLine {
  id: string;
  cultures: Array<{ id: string }>;
}

interface Plant {
  row: number;
  col: number;
  plant_id: string;
  strain: string;
}

interface GrowspaceData {
  identity: { growspace_id: string; name: string };
  grid: {
    rows: number;
    plants_per_row: number;
    grid: Record<string, Plant | null>;
  };
}

function plantsIn(growspace: GrowspaceData): Plant[] {
  return Object.values(growspace.grid.grid).filter((plant): plant is Plant => plant !== null);
}

async function testPlantIds(growspaceId: string): Promise<string[]> {
  const growspaces = await callHAWebSocket<Record<string, GrowspaceData>>(
    'growspace_manager/get_data'
  );
  return Object.values(growspaces)
    .filter((growspace) => growspace.identity.growspace_id === growspaceId)
    .flatMap((growspace) =>
      plantsIn(growspace)
        .filter((plant) => plant.strain.startsWith(PLANT_PREFIX))
        .map((plant) => plant.plant_id)
    );
}

async function removeTestPlants(page: Page, growspaceId: string): Promise<void> {
  await Promise.all(
    (await testPlantIds(growspaceId)).map((plantId) =>
      callHAService(page, 'growspace_manager', 'remove_plant', { plant_id: plantId })
    )
  );
  await expect.poll(() => testPlantIds(growspaceId)).toEqual([]);
}

async function introduceLine(name: string): Promise<CultureLine> {
  const response = await callHAWebSocket<{ line: CultureLine }>(
    'growspace_manager_tc/culture_lines/introduce',
    {
      phenotype_id: `e2e-${name}`,
      phenotype_name: name,
      replate_interval_days: { multiplication: 28, rooting: 14 },
      stage: 'rooting',
      plantlet_count: 1,
      location: 'E2E bridge shelf',
    }
  );
  return response.line;
}

async function archiveLine(lineId: string): Promise<void> {
  await callHAWebSocket('growspace_manager_tc/culture_lines/set_archived', {
    line_id: lineId,
    archived: true,
  });
}

function firstFreePosition(growspace: GrowspaceData): { row: number; col: number } {
  const occupied = new Set(plantsIn(growspace).map((plant) => `${plant.row}:${plant.col}`));
  for (let row = 1; row <= growspace.grid.rows; row += 1) {
    for (let col = 1; col <= growspace.grid.plants_per_row; col += 1) {
      if (!occupied.has(`${row}:${col}`)) return { row, col };
    }
  }
  throw new Error(`Growspace ${growspace.identity.name} has no free position`);
}

test('standalone TC graduation creates and links a GSM plant, while opt-out stays unlinked', async ({
  page,
  testContext,
}) => {
  test.setTimeout(60_000);
  if (!testContext.tcDashboardPath || !testContext.cloneGrowspaceId) {
    throw new Error(
      'TEST_TC_DASHBOARD_PATH and TEST_CLONE_GROWSPACE_ID are required. Run the managed E2E provisioner.'
    );
  }

  const suffix = Date.now().toString(36);
  const linkedName = `${PLANT_PREFIX} linked ${suffix}`;
  const unlinkedName = `${PLANT_PREFIX} declined ${suffix}`;
  const createdLines: CultureLine[] = [];

  await removeTestPlants(page, testContext.cloneGrowspaceId);
  try {
    createdLines.push(await introduceLine(linkedName));
    createdLines.push(await introduceLine(unlinkedName));

    const collection = await callHAWebSocket<Record<string, GrowspaceData>>(
      'growspace_manager/get_data'
    );
    const destination = Object.values(collection).find(
      (growspace) => growspace.identity.growspace_id === testContext.cloneGrowspaceId
    );
    if (!destination) throw new Error('Clone growspace was absent from growspace_manager/get_data');
    const position = firstFreePosition(destination);

    const tc = new TissueCultureCard(page);
    await tc.navigate(testContext.tcDashboardPath);
    await expect(page.locator('growspace-tc-card')).toHaveCount(1);
    await expect(page.locator('growspace-manager-card')).toHaveCount(0);

    const graduation = await tc.openGraduation(linkedName);
    const bridge = graduation.getByRole('checkbox', { name: /create a plant/i });
    await expect(bridge).toBeEnabled({ timeout: 10_000 });
    await bridge.check();
    await graduation.locator('select[name="growspace"]').selectOption(testContext.cloneGrowspaceId);
    await graduation.locator('input[name="strain"]').fill(linkedName);
    await graduation.locator('input[name="row"]').fill(String(position.row));
    await graduation.locator('input[name="col"]').fill(String(position.col));
    await graduation.getByRole('button', { name: /^record$/i }).click();
    await graduation.waitFor({ state: 'hidden' });

    const linkedHistory = await tc.showHistory(linkedName);
    await expect(linkedHistory.locator('ol.history li')).toContainText('Graduated');
    const plantLink = linkedHistory.getByRole('link', { name: /view linked plant/i });
    await expect(plantLink).toHaveCount(1);
    const href = await plantLink.getAttribute('href');
    const plantId = new URL(href ?? '', page.url()).searchParams.get('plantId');
    expect(plantId).toBeTruthy();
    const linkedActions = await callHAWebSocket<{
      actions: Array<{ action: string; plant_id: string | null }>;
    }>('growspace_manager_tc/maintenance/history', { culture_id: createdLines[0].cultures[0].id });
    expect(linkedActions.actions.filter((action) => action.action === 'graduate')).toEqual([
      expect.objectContaining({ plant_id: plantId }),
    ]);

    await expect
      .poll(async () => {
        const data = await callHAWebSocket<Record<string, GrowspaceData>>(
          'growspace_manager/get_data'
        );
        const growspace = Object.values(data).find(
          (entry) => entry.identity.growspace_id === testContext.cloneGrowspaceId
        );
        return (growspace ? plantsIn(growspace) : []).find((plant) => plant.plant_id === plantId);
      })
      .toEqual(
        expect.objectContaining({
          plant_id: plantId,
          strain: linkedName,
          row: position.row,
          col: position.col,
        })
      );

    await linkedHistory.getByRole('button', { name: /close history/i }).click();
    const declined = await tc.openGraduation(unlinkedName);
    await expect(declined.getByRole('checkbox', { name: /create a plant/i })).not.toBeChecked();
    await declined.getByRole('button', { name: /^record$/i }).click();
    await declined.waitFor({ state: 'hidden' });

    const declinedHistory = await tc.showHistory(unlinkedName);
    await expect(declinedHistory.locator('ol.history li')).toContainText('Graduated');
    await expect(declinedHistory.getByRole('link', { name: /view linked plant/i })).toHaveCount(0);
    const declinedActions = await callHAWebSocket<{
      actions: Array<{ action: string; plant_id: string | null }>;
    }>('growspace_manager_tc/maintenance/history', { culture_id: createdLines[1].cultures[0].id });
    expect(declinedActions.actions.filter((action) => action.action === 'graduate')).toEqual([
      expect.objectContaining({ plant_id: null }),
    ]);
    expect(await testPlantIds(testContext.cloneGrowspaceId)).toEqual([plantId]);
  } finally {
    const cleanup = await Promise.allSettled([
      removeTestPlants(page, testContext.cloneGrowspaceId),
      ...createdLines.map((line) => archiveLine(line.id)),
    ]);
    const failures = cleanup
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason);
    if (failures.length) throw new AggregateError(failures, 'TC graduation E2E cleanup failed');
  }
});
