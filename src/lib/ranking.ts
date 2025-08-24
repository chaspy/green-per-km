import { Station } from './distance';
import { calcGreenFare, Method } from './fare';

export interface RankingItem {
  from: string;
  to: string;
  distance: number;
  minutes: number;
  fare: number;
  unitPrice: number;
  minutePrice: number;
}

export function generateRankings(
  stations: Station[],
  fareTable: { fareBands: Array<{ maxKm: number | null; suica: number; ticket: number }> },
  method: Method = 'suica'
): RankingItem[] {
  const rankings: RankingItem[] = [];
  
  // 全ての駅間の組み合わせを計算
  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const fromStation = stations[i];
      const toStation = stations[j];
      
      const distance = Math.abs(toStation.km - fromStation.km);
      const minutes = Math.abs((toStation.minutes ?? 0) - (fromStation.minutes ?? 0));
      
      // 距離が0の場合はスキップ
      if (distance === 0 || minutes === 0) continue;
      
      const fare = calcGreenFare(distance, fareTable, method);
      const unitPrice = fare / distance;
      const minutePrice = fare / minutes;
      
      rankings.push({
        from: fromStation.name,
        to: toStation.name,
        distance,
        minutes,
        fare,
        unitPrice,
        minutePrice
      });
    }
  }
  
  // 単価でソート（高い順）
  return rankings.sort((a, b) => b.unitPrice - a.unitPrice);
}

export function generateMinuteRankings(
  stations: Station[],
  fareTable: { fareBands: Array<{ maxKm: number | null; suica: number; ticket: number }> },
  method: Method = 'suica'
): RankingItem[] {
  const rankings = generateRankings(stations, fareTable, method);
  // 分単価でソート（高い順）
  return [...rankings].sort((a, b) => b.minutePrice - a.minutePrice);
}