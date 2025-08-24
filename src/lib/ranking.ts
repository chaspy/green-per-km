import { Station, UnifiedStation, findCommonRoutes, segmentKmForRoute, segmentMinutesForRoute } from './distance';
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

export function generateUnifiedRankings(
  unifiedStations: UnifiedStation[],
  fareTable: { fareBands: Array<{ maxKm: number | null; suica: number; ticket: number }> },
  method: Method = 'suica',
  routes?: string[]
): RankingItem[] {
  const rankings: RankingItem[] = [];
  const bestRoutes = new Map<string, RankingItem>(); // 駅間で最短ルートのみ保持
  
  // 全ての駅間の組み合わせを計算
  for (let i = 0; i < unifiedStations.length; i++) {
    for (let j = i + 1; j < unifiedStations.length; j++) {
      const fromStation = unifiedStations[i];
      const toStation = unifiedStations[j];
      
      const commonRoutes = findCommonRoutes(unifiedStations, fromStation.name, toStation.name);
      const routesToProcess = routes ? commonRoutes.filter(route => routes.includes(route)) : commonRoutes;
      
      const stationPairKey = `${fromStation.name}-${toStation.name}`;
      
      for (const route of routesToProcess) {
        try {
          const distance = segmentKmForRoute(unifiedStations, fromStation.name, toStation.name, route);
          const minutes = segmentMinutesForRoute(unifiedStations, fromStation.name, toStation.name, route);
          
          // 距離が0の場合はスキップ
          if (distance === 0 || minutes === 0) continue;
          
          const fare = calcGreenFare(distance, fareTable, method);
          const unitPrice = fare / distance;
          const minutePrice = fare / minutes;
          
          const currentItem: RankingItem = {
            from: fromStation.name,
            to: toStation.name,
            distance,
            minutes,
            fare,
            unitPrice,
            minutePrice
          };
          
          // 同じ駅間では最短距離のルートのみ採用
          const existing = bestRoutes.get(stationPairKey);
          if (!existing || distance < existing.distance) {
            bestRoutes.set(stationPairKey, currentItem);
          }
          
        } catch (error) {
          // 無効なルート組み合わせはスキップ
          continue;
        }
      }
    }
  }
  
  // 最短ルートのみをランキングに追加
  rankings.push(...bestRoutes.values());
  
  // 単価でソート（高い順）
  return rankings.sort((a, b) => b.unitPrice - a.unitPrice);
}

export function generateUnifiedMinuteRankings(
  unifiedStations: UnifiedStation[],
  fareTable: { fareBands: Array<{ maxKm: number | null; suica: number; ticket: number }> },
  method: Method = 'suica',
  routes?: string[]
): RankingItem[] {
  const rankings = generateUnifiedRankings(unifiedStations, fareTable, method, routes);
  // 分単価でソート（高い順）
  return [...rankings].sort((a, b) => b.minutePrice - a.minutePrice);
}