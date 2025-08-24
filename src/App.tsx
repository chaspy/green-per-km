import { useState, useEffect, useMemo } from 'react';
import { calcGreenFare, unitPriceYenPerKm, unitPriceYenPerMinute } from './lib/fare';
import { 
  segmentKmForRoute, 
  segmentMinutesForRoute, 
  UnifiedStation, 
  UnifiedStationData, 
  findCommonRoutes,
  getCompatibleStations
} from './lib/distance';
import { StationSearch } from './components/StationSearch';
import { generateUnifiedRankings, generateUnifiedMinuteRankings } from './lib/ranking';
import './App.css';

type FareTable = {
  source: string;
  updatedAt: string;
  fareBands: Array<{ maxKm: number | null; suica: number; ticket: number }>;
};

function App() {
  const [unifiedData, setUnifiedData] = useState<UnifiedStationData | null>(null);
  const [fareTable, setFareTable] = useState<FareTable | null>(null);
  const [fromStation, setFromStation] = useState<string>('');
  const [toStation, setToStation] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/data/stations-unified.json').then(res => res.json()),
      fetch('/data/green-fare.table.json').then(res => res.json())
    ]).then(([unified, fare]) => {
      setUnifiedData(unified);
      setFareTable(fare);
      // デフォルトで東京駅から始まる
      setFromStation('東京');
      setLoading(false);
    }).catch(error => {
      console.error('Failed to load data:', error);
      setLoading(false);
    });
  }, []);

  // From駅変更時にTo駅が互換性がない場合はクリア（常に実行）
  useEffect(() => {
    if (unifiedData && fromStation && toStation) {
      const compatible = getCompatibleStations(unifiedData.stations, fromStation);
      const isCompatible = compatible.some(station => station.name === toStation);
      if (!isCompatible) {
        setToStation('');
      }
    }
  }, [fromStation, toStation, unifiedData]);

  if (loading) return <div>Loading...</div>;
  if (!unifiedData || !fareTable) return <div>Failed to load data</div>;

  // 選択された駅間の共通路線を取得
  const commonRoutes = fromStation && toStation
    ? findCommonRoutes(unifiedData.stations, fromStation, toStation)
    : [];

  // デフォルトで最初の共通路線を使用
  const selectedRoute = commonRoutes.length > 0 ? commonRoutes[0] : null;

  // ランキング表示用：駅選択時は該当路線のみ、デフォルトは全路線
  const rankingRoutes = fromStation && toStation && commonRoutes.length > 0 
    ? commonRoutes 
    : undefined;  // undefinedで全路線を表示

  // To駅の選択肢をFrom駅と互換性のある駅に制限
  const compatibleToStations = fromStation 
    ? getCompatibleStations(unifiedData.stations, fromStation)
    : undefined;

  const distance = fromStation && toStation && selectedRoute
    ? segmentKmForRoute(unifiedData.stations, fromStation, toStation, selectedRoute)
    : 0;
  
  const minutes = fromStation && toStation && selectedRoute
    ? segmentMinutesForRoute(unifiedData.stations, fromStation, toStation, selectedRoute)
    : 0;

  const suicaFare = distance > 0 ? calcGreenFare(distance, fareTable, 'suica') : 0;
  const suicaUnit = distance > 0 ? unitPriceYenPerKm(distance, suicaFare) : 0;
  const minuteUnit = minutes > 0 ? unitPriceYenPerMinute(minutes, suicaFare) : 0;

  // 路線名の表示用マッピング
  const routeTitles: { [key: string]: string } = {
    'chuo-rapid': '中央線快速（東京〜高尾）',
    'utsunomiya-line': '宇都宮線（東京〜宇都宮）',
    'tokaido-line': '東海道線（東京〜熱海）',
  };

  return (
    <div className="container">
      <h1>グリーン料金計算機</h1>
      <p className="supported-routes">
        対応路線: {Object.values(routeTitles).join('、')}
      </p>
      {selectedRoute && (
        <p className="subtitle">
          {routeTitles[selectedRoute] || selectedRoute}
          {commonRoutes.length > 1 && (
            <span className="route-info"> (他{commonRoutes.length - 1}路線対応)</span>
          )}
        </p>
      )}

      <div className="form">
        <div className="form-group">
          <label>
            From:
            <StationSearch
              stations={unifiedData.stations}
              value={fromStation}
              onChange={setFromStation}
              placeholder="出発駅を検索（漢字/ひらがな/ローマ字）"
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            To:
            <StationSearch
              stations={unifiedData.stations}
              value={toStation}
              onChange={setToStation}
              placeholder="到着駅を検索（漢字/ひらがな/ローマ字）"
              filteredStations={compatibleToStations}
            />
          </label>
        </div>
      </div>

      {distance > 0 && (
        <div className="results">
          <div className="stats-grid">
            <div className="stat-card">
              <h2>距離</h2>
              <p className="value">{distance.toFixed(1)} km</p>
            </div>
            <div className="stat-card">
              <h2>乗車時間</h2>
              <p className="value">{minutes} 分</p>
            </div>
          </div>

          <div className="fare-display">
            <div className="fare-card-single">
              <h3>Suicaグリーン券</h3>
              <p className="fare-amount">¥{suicaFare.toLocaleString()}</p>
              
              <div className="price-grid">
                <div className="price-item">
                  <div className="unit-price-label">km単価</div>
                  <p className="unit-price">{suicaUnit.toFixed(1)} 円/km</p>
                </div>
                <div className="price-item">
                  <div className="unit-price-label">分単価</div>
                  <p className="unit-price minute">{minuteUnit.toFixed(1)} 円/分</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <RankingSection 
        unifiedStations={unifiedData.stations}
        fareTable={fareTable}
        availableRoutes={rankingRoutes}
      />

      <footer className="footer">
        <div className="footer-section">
          <h4>料金表の根拠</h4>
          <a href={fareTable.source} target="_blank" rel="noopener noreferrer">
            JR東日本 - 普通列車グリーン車｜料金
          </a>
          <p className="update-info">更新日時: {new Date(fareTable.updatedAt).toLocaleDateString('ja-JP')}</p>
        </div>

        <div className="footer-section">
          <h4>路線データの出典</h4>
          <p>JR東日本 グリーン車対応路線</p>
          <p className="license-note">※ 公式時刻表および各種資料に基づく</p>
        </div>

        <div className="footer-section">
          <h4>データベース</h4>
          <p>最終更新: {new Date(unifiedData.lastUpdated).toLocaleDateString('ja-JP')}</p>
          <p>対応路線: {Object.values(routeTitles).join('、')}</p>
        </div>
      </footer>
    </div>
  );
}

function RankingSection({ 
  unifiedStations, 
  fareTable, 
  availableRoutes 
}: { 
  unifiedStations: UnifiedStation[], 
  fareTable: FareTable,
  availableRoutes?: string[]
}) {
  const [filterStation, setFilterStation] = useState<string>('');
  
  const allRankings = useMemo(
    () => generateUnifiedRankings(unifiedStations, fareTable, 'suica', availableRoutes),
    [unifiedStations, fareTable, availableRoutes]
  );
  
  const minuteRankings = useMemo(
    () => generateUnifiedMinuteRankings(unifiedStations, fareTable, 'suica', availableRoutes),
    [unifiedStations, fareTable, availableRoutes]
  );
  
  // フィルタリング
  const filteredRankings = useMemo(
    () => filterStation 
      ? allRankings.filter(item => item.from === filterStation || item.to === filterStation)
      : allRankings,
    [allRankings, filterStation]
  );
  
  const filteredMinuteRankings = useMemo(
    () => filterStation
      ? minuteRankings.filter(item => item.from === filterStation || item.to === filterStation)
      : minuteRankings,
    [minuteRankings, filterStation]
  );
  
  const expensiveRankings = useMemo(
    () => filteredRankings.slice(0, 30),
    [filteredRankings]
  );
  
  const cheapRankings = useMemo(
    () => [...filteredRankings].sort((a, b) => a.unitPrice - b.unitPrice).slice(0, 30),
    [filteredRankings]
  );
  
  const expensiveMinuteRankings = useMemo(
    () => filteredMinuteRankings.slice(0, 30),
    [filteredMinuteRankings]
  );
  
  const cheapMinuteRankings = useMemo(
    () => [...filteredMinuteRankings].sort((a, b) => a.minutePrice - b.minutePrice).slice(0, 30),
    [filteredMinuteRankings]
  );

  const getPositionClass = (index: number) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return 'other';
  };
  
  // フィルタ駅を左側に配置
  const formatRoute = (from: string, to: string) => {
    if (!filterStation) {
      return { from, to };
    }
    // フィルタ駅が右側(to)にある場合は入れ替え
    if (to === filterStation) {
      return { from: to, to: from };
    }
    return { from, to };
  };

  return (
    <>
      <div className="ranking-filter-section">
        <div className="filter-container">
          <label className="filter-label">
            🔍 起点駅でフィルタ:
            <StationSearch
              stations={unifiedStations}
              value={filterStation}
              onChange={setFilterStation}
              placeholder="フィルタする駅を選択（空白で全表示）"
            />
          </label>
          {filterStation && (
            <button 
              className="clear-filter-btn"
              onClick={() => setFilterStation('')}
            >
              フィルタをクリア
            </button>
          )}
        </div>
      </div>
      
      <div className="ranking-section">
        <h2>🏆 km単価ランキング {filterStation ? `(「${filterStation}」を含む区間)` : 'TOP30'}</h2>
        
        <div className="ranking-grid">
          <div className="ranking-card">
            <h3>💸 高い順（非効率）</h3>
          <ul className="ranking-list">
            {expensiveRankings.map((item, index) => {
              const route = formatRoute(item.from, item.to);
              return (
                <li key={`exp-${item.from}-${item.to}`} className="ranking-item">
                  <div className={`ranking-position ${getPositionClass(index)}`}>
                    {index + 1}
                  </div>
                  <div className="ranking-info">
                    <div className="ranking-route">
                      {route.from} → {route.to}
                    </div>
                  <div className="ranking-details">
                    <span className="ranking-distance">{item.distance.toFixed(1)}km</span>
                    <span className="ranking-fare">¥{item.fare.toLocaleString()}</span>
                    <span className="ranking-unit-price">{item.unitPrice.toFixed(1)} 円/km</span>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        </div>
        
        <div className="ranking-card">
          <h3>💰 安い順（効率的）</h3>
          <ul className="ranking-list">
            {cheapRankings.map((item, index) => {
              const route = formatRoute(item.from, item.to);
              return (
                <li key={`cheap-${item.from}-${item.to}`} className="ranking-item">
                  <div className={`ranking-position ${getPositionClass(index)}`}>
                    {index + 1}
                  </div>
                  <div className="ranking-info">
                    <div className="ranking-route">
                      {route.from} → {route.to}
                    </div>
                  <div className="ranking-details">
                    <span className="ranking-distance">{item.distance.toFixed(1)}km</span>
                    <span className="ranking-fare">¥{item.fare.toLocaleString()}</span>
                    <span className="ranking-unit-price">{item.unitPrice.toFixed(1)} 円/km</span>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
          </div>
        </div>
      </div>
      
      <div className="ranking-section">
        <h2>⏰ 分単価ランキング {filterStation ? `(「${filterStation}」を含む区間)` : 'TOP30'}</h2>
        
        <div className="ranking-grid">
          <div className="ranking-card">
            <h3>💸 高い順（短時間乗車）</h3>
            <ul className="ranking-list">
              {expensiveMinuteRankings.map((item, index) => {
                const route = formatRoute(item.from, item.to);
                return (
                  <li key={`exp-min-${item.from}-${item.to}`} className="ranking-item">
                    <div className={`ranking-position ${getPositionClass(index)}`}>
                      {index + 1}
                    </div>
                    <div className="ranking-info">
                      <div className="ranking-route">
                        {route.from} → {route.to}
                      </div>
                    <div className="ranking-details">
                      <span className="ranking-distance">{item.minutes}分</span>
                      <span className="ranking-fare">¥{item.fare.toLocaleString()}</span>
                      <span className="ranking-unit-price">{item.minutePrice.toFixed(1)} 円/分</span>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>
          
          <div className="ranking-card">
            <h3>💰 安い順（長時間作業可能）</h3>
            <ul className="ranking-list">
              {cheapMinuteRankings.map((item, index) => {
                const route = formatRoute(item.from, item.to);
                return (
                  <li key={`cheap-min-${item.from}-${item.to}`} className="ranking-item">
                    <div className={`ranking-position ${getPositionClass(index)}`}>
                      {index + 1}
                    </div>
                    <div className="ranking-info">
                      <div className="ranking-route">
                        {route.from} → {route.to}
                      </div>
                    <div className="ranking-details">
                      <span className="ranking-distance">{item.minutes}分</span>
                      <span className="ranking-fare">¥{item.fare.toLocaleString()}</span>
                      <span className="ranking-unit-price">{item.minutePrice.toFixed(1)} 円/分</span>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;