function calculateSvp(temperatureC: number): number {
  return 0.61094 * Math.exp((17.625 * temperatureC) / (243.04 + temperatureC));
}

export function calculateVpdWithLstOffset(
  airTempC: number,
  humidityRh: number,
  lstOffset: number,
): number | null {
  if (!Number.isFinite(airTempC) || !Number.isFinite(humidityRh) || !Number.isFinite(lstOffset)) {
    return null;
  }

  const leafTempC = airTempC + lstOffset;
  const leafSvp = calculateSvp(leafTempC);
  const airSvp = calculateSvp(airTempC);
  const airAvp = airSvp * (humidityRh / 100);

  return Math.round((leafSvp - airAvp) * 100) / 100;
}
