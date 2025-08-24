export type Station = { 
  name: string; 
  hiragana?: string;
  romaji?: string;
  km: number;
  minutes?: number;
};

export function segmentKm(stations: Station[], from: string, to: string): number {
  const i = stations.findIndex(s => s.name === from);
  const j = stations.findIndex(s => s.name === to);
  if (i < 0 || j < 0) throw new Error('Station not found');
  return Math.abs(stations[j].km - stations[i].km);
}

export function segmentMinutes(stations: Station[], from: string, to: string): number {
  const i = stations.findIndex(s => s.name === from);
  const j = stations.findIndex(s => s.name === to);
  if (i < 0 || j < 0) throw new Error('Station not found');
  const fromMinutes = stations[i].minutes ?? 0;
  const toMinutes = stations[j].minutes ?? 0;
  return Math.abs(toMinutes - fromMinutes);
}