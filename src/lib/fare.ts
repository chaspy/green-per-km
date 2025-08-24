export type Method = 'suica' | 'ticket';

type FareBand = { maxKm: number | null; suica: number; ticket: number };
type FareTable = { fareBands: FareBand[] };

export function calcGreenFare(distanceKm: number, table: FareTable, method: Method): number {
  const d = Math.max(0, Number(distanceKm));
  const band = table.fareBands.find(b => b.maxKm === null ? true : d <= b.maxKm);
  if (!band) throw new Error('No fare band matched');
  return band[method];
}

export function unitPriceYenPerKm(distanceKm: number, fareYen: number): number {
  if (distanceKm <= 0) return Infinity;
  return fareYen / distanceKm;
}

export function unitPriceYenPerMinute(minutes: number, fareYen: number): number {
  if (minutes <= 0) return Infinity;
  return fareYen / minutes;
}