export type Station = { 
  name: string; 
  hiragana?: string;
  romaji?: string;
  km: number;
  minutes?: number;
};

export type UnifiedStation = {
  name: string;
  hiragana?: string;
  romaji?: string;
  lines: Array<{
    route: string;
    km: number;
    minutes: number;
  }>;
};

export type UnifiedStationData = {
  lastUpdated: string;
  stations: UnifiedStation[];
};

export type OperatingConnection = {
  fromStation: string;
  toStation: string;
  totalKm: number;
  totalMinutes: number;
  routeSegments: Array<{
    route: string;
    from: string;
    to: string;
    km: number;
    minutes: number;
  }>;
};

export type OperatingSystem = {
  id: string;
  titleJa: string;
  description: string;
  physicalRoutes: string[];
  operatingConnections: OperatingConnection[];
};

export type OperatingSystemData = {
  lastUpdated: string;
  operatingSystems: { [key: string]: OperatingSystem };
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

export function findCommonRoutes(unifiedStations: UnifiedStation[], fromName: string, toName: string): string[] {
  const fromStation = unifiedStations.find(s => s.name === fromName);
  const toStation = unifiedStations.find(s => s.name === toName);
  
  if (!fromStation || !toStation) return [];
  
  const fromRoutes = new Set(fromStation.lines.map(line => line.route));
  const toRoutes = new Set(toStation.lines.map(line => line.route));
  
  return Array.from(fromRoutes).filter(route => toRoutes.has(route));
}

export function segmentKmForRoute(unifiedStations: UnifiedStation[], fromName: string, toName: string, route: string): number {
  const fromStation = unifiedStations.find(s => s.name === fromName);
  const toStation = unifiedStations.find(s => s.name === toName);
  
  if (!fromStation || !toStation) throw new Error('Station not found');
  
  const fromLine = fromStation.lines.find(line => line.route === route);
  const toLine = toStation.lines.find(line => line.route === route);
  
  if (!fromLine || !toLine) throw new Error(`Route ${route} not found for one of the stations`);
  
  return Math.abs(toLine.km - fromLine.km);
}

export function segmentMinutesForRoute(unifiedStations: UnifiedStation[], fromName: string, toName: string, route: string): number {
  const fromStation = unifiedStations.find(s => s.name === fromName);
  const toStation = unifiedStations.find(s => s.name === toName);
  
  if (!fromStation || !toStation) throw new Error('Station not found');
  
  const fromLine = fromStation.lines.find(line => line.route === route);
  const toLine = toStation.lines.find(line => line.route === route);
  
  if (!fromLine || !toLine) throw new Error(`Route ${route} not found for one of the stations`);
  
  return Math.abs(toLine.minutes - fromLine.minutes);
}

export function convertToRouteStations(unifiedStations: UnifiedStation[], route: string): Station[] {
  return unifiedStations
    .filter(station => station.lines.some(line => line.route === route))
    .map(station => {
      const line = station.lines.find(line => line.route === route)!;
      return {
        name: station.name,
        hiragana: station.hiragana,
        romaji: station.romaji,
        km: line.km,
        minutes: line.minutes
      };
    })
    .sort((a, b) => a.km - b.km);
}

export function getCompatibleStations(unifiedStations: UnifiedStation[], selectedStationName: string): UnifiedStation[] {
  const selectedStation = unifiedStations.find(s => s.name === selectedStationName);
  if (!selectedStation) return [];
  
  const selectedRoutes = new Set(selectedStation.lines.map(line => line.route));
  
  return unifiedStations.filter(station => 
    station.lines.some(line => selectedRoutes.has(line.route))
  );
}

export function findOperatingSystemRoutes(
  _unifiedStations: UnifiedStation[],
  operatingSystems: OperatingSystemData,
  fromName: string,
  toName: string
): OperatingConnection[] {
  const connections: OperatingConnection[] = [];
  
  for (const system of Object.values(operatingSystems.operatingSystems)) {
    for (const connection of system.operatingConnections) {
      if (connection.fromStation === fromName && connection.toStation === toName) {
        connections.push(connection);
      }
      if (connection.fromStation === toName && connection.toStation === fromName) {
        const reversedConnection: OperatingConnection = {
          fromStation: toName,
          toStation: fromName,
          totalKm: connection.totalKm,
          totalMinutes: connection.totalMinutes,
          routeSegments: [...connection.routeSegments].reverse().map(segment => ({
            route: segment.route,
            from: segment.to,
            to: segment.from,
            km: segment.km,
            minutes: segment.minutes
          }))
        };
        connections.push(reversedConnection);
      }
    }
  }
  
  return connections;
}

export function getCompatibleStationsWithOperatingSystems(
  unifiedStations: UnifiedStation[],
  operatingSystems: OperatingSystemData,
  selectedStationName: string
): UnifiedStation[] {
  const physicalCompatible = getCompatibleStations(unifiedStations, selectedStationName);
  const operatingCompatible = new Set<string>();
  
  for (const system of Object.values(operatingSystems.operatingSystems)) {
    for (const connection of system.operatingConnections) {
      if (connection.fromStation === selectedStationName) {
        operatingCompatible.add(connection.toStation);
      }
      if (connection.toStation === selectedStationName) {
        operatingCompatible.add(connection.fromStation);
      }
    }
  }
  
  const allCompatibleNames = new Set([
    ...physicalCompatible.map(s => s.name),
    ...operatingCompatible
  ]);
  
  return unifiedStations.filter(station => allCompatibleNames.has(station.name));
}