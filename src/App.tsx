import { useState, useEffect, useMemo } from 'react';
import { calcGreenFare, unitPriceYenPerKm, unitPriceYenPerMinute } from './lib/fare';
import { 
  segmentKmForRoute, 
  segmentMinutesForRoute, 
  UnifiedStation, 
  UnifiedStationData, 
  OperatingSystemData,
  findCommonRoutes,
  findOperatingSystemRoutes,
  getCompatibleStationsWithOperatingSystems
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
  const [operatingSystemsData, setOperatingSystemsData] = useState<OperatingSystemData | null>(null);
  const [fromStation, setFromStation] = useState<string>('');
  const [toStation, setToStation] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/data/stations-unified.json').then(res => res.json()),
      fetch('/data/green-fare.table.json').then(res => res.json()),
      fetch('/data/operating-systems.json').then(res => res.json())
    ]).then(([unified, fare, operatingSystems]) => {
      setUnifiedData(unified);
      setFareTable(fare);
      setOperatingSystemsData(operatingSystems);
      // デフォルトで東京駅から始まる
      setFromStation('東京');
      setLoading(false);
    }).catch(error => {
      console.error('Failed to load data:', error);
      setLoading(false);
    });
  }, []);

  // From駅変更時にTo駅が互換性がない場合はクリア（運転系統含む）
  useEffect(() => {
    if (unifiedData && operatingSystemsData && fromStation && toStation) {
      const compatible = getCompatibleStationsWithOperatingSystems(unifiedData.stations, operatingSystemsData, fromStation);
      const isCompatible = compatible.some(station => station.name === toStation);
      if (!isCompatible) {
        setToStation('');
      }
    }
  }, [fromStation, toStation, unifiedData, operatingSystemsData]);

  if (loading) return <div>Loading...</div>;
  if (!unifiedData || !fareTable || !operatingSystemsData) return <div>Failed to load data</div>;

  // 選択された駅間の利用可能ルートを取得（物理路線 + 運転系統）
  const commonRoutes = fromStation && toStation
    ? findCommonRoutes(unifiedData.stations, fromStation, toStation)
    : [];

  const operatingConnections = fromStation && toStation
    ? findOperatingSystemRoutes(unifiedData.stations, operatingSystemsData, fromStation, toStation)
    : [];

  // 利用可能なルートを優先順で選択：1) 物理路線 2) 運転系統
  const selectedRoute = commonRoutes.length > 0 ? commonRoutes[0] : null;
  const selectedOperatingConnection = operatingConnections.length > 0 ? operatingConnections[0] : null;

  // ランキング表示用：駅選択時は該当路線のみ、デフォルトは全路線
  const rankingRoutes = fromStation && toStation && commonRoutes.length > 0 
    ? commonRoutes 
    : undefined;  // undefinedで全路線を表示

  // To駅の選択肢をFrom駅と互換性のある駅に制限（運転系統含む）
  const compatibleToStations = fromStation 
    ? getCompatibleStationsWithOperatingSystems(unifiedData.stations, operatingSystemsData, fromStation)
    : undefined;

  // 距離・時間計算：物理路線優先、なければ運転系統を使用
  const distance = fromStation && toStation
    ? selectedRoute
      ? segmentKmForRoute(unifiedData.stations, fromStation, toStation, selectedRoute)
      : selectedOperatingConnection?.totalKm || 0
    : 0;
  
  const minutes = fromStation && toStation
    ? selectedRoute
      ? segmentMinutesForRoute(unifiedData.stations, fromStation, toStation, selectedRoute)
      : selectedOperatingConnection?.totalMinutes || 0
    : 0;

  const suicaFare = distance > 0 ? calcGreenFare(distance, fareTable, 'suica') : 0;
  const suicaUnit = distance > 0 ? unitPriceYenPerKm(distance, suicaFare) : 0;
  const minuteUnit = minutes > 0 ? unitPriceYenPerMinute(minutes, suicaFare) : 0;

  // 路線名の表示用マッピング
  const routeTitles: { [key: string]: string } = {
    'chuo-rapid': '中央線快速（東京〜高尾）',
    'utsunomiya-line': '宇都宮線（東京〜宇都宮）',
    'tokaido-line': '東海道線（東京〜熱海）',
    'shonan-shinjuku-line': '湘南新宿ライン（宇都宮・高崎〜小田原・逗子）',
    'takasaki-line': '高崎線（東京〜高崎）',
    'joban-line': '常磐線（東京・上野〜水戸）',
    'yokosuka-line': '横須賀線（東京〜久里浜）',
  };

  // 運転系統の表示用マッピング
  const operatingSystemTitles: { [key: string]: string } = {
    'ueno-tokyo-line': '上野東京ライン（直通運転）',
    'shonan-shinjuku-line-direct': '湘南新宿ライン（直通運転）',
  };

  return (
    <div className="container">
      <h1>グリーン料金計算機</h1>
      <p className="supported-routes">
        対応路線: {Object.values(routeTitles).join('、')}
      </p>
      {(selectedRoute || selectedOperatingConnection) && (
        <p className="subtitle">
          {selectedRoute ? (
            <>
              {routeTitles[selectedRoute] || selectedRoute}
              {commonRoutes.length > 1 && (
                <span className="route-info"> (他{commonRoutes.length - 1}路線対応)</span>
              )}
            </>
          ) : selectedOperatingConnection ? (
            <>
              {selectedOperatingConnection.routeSegments.map((segment, index) => {
                const systemId = Object.values(operatingSystemsData.operatingSystems).find(system =>
                  system.operatingConnections.some(conn => 
                    conn.routeSegments.some(seg => seg.route === segment.route)
                  )
                )?.id;
                const systemTitle = systemId ? operatingSystemTitles[systemId] : '直通運転';
                return index === 0 ? systemTitle : null;
              })[0]}
              <span className="route-info"> (乗り換えなし直通)</span>
              {operatingConnections.length > 1 && (
                <span className="route-info"> (他{operatingConnections.length - 1}系統対応)</span>
              )}
            </>
          ) : null}
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

          {selectedOperatingConnection && (
            <div className="route-details">
              <h3>🚄 ルート詳細（直通運転）</h3>
              <div className="route-segments">
                {selectedOperatingConnection.routeSegments.map((segment, index) => (
                  <div key={index} className="route-segment">
                    <span className="segment-route">{routeTitles[segment.route] || segment.route}</span>
                    <span className="segment-path">{segment.from} → {segment.to}</span>
                    <span className="segment-stats">{segment.km}km・{segment.minutes}分</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        operatingSystemsData={operatingSystemsData}
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

        <div className="footer-section">
          <h4>🔍 生データ（デバッグ用）</h4>
          <div style={{fontSize: '0.85em', lineHeight: '1.6'}}>
            <p><a href="https://github.com/chaspy/green-per-km/blob/main/public/data/green-fare.table.json" target="_blank" rel="noopener noreferrer">グリーン車料金表 (JSON)</a></p>
            <p><a href="https://github.com/chaspy/green-per-km/blob/main/public/data/stations-unified.json" target="_blank" rel="noopener noreferrer">統合駅データ (JSON)</a></p>
            <details style={{marginTop: '8px'}}>
              <summary style={{cursor: 'pointer', color: '#0066cc'}}>路線別データ ▼</summary>
              <div style={{paddingLeft: '16px', marginTop: '4px'}}>
                {Object.entries(routeTitles).map(([routeKey, routeTitle]) => (
                  <p key={routeKey} style={{margin: '2px 0'}}>
                    <a 
                      href={`https://github.com/chaspy/green-per-km/blob/main/public/data/routes/${routeKey}.km.json`}
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {routeTitle}
                    </a>
                  </p>
                ))}
              </div>
            </details>
          </div>
        </div>

        <details className="technical-specs" style={{marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px'}}>
          <summary style={{cursor: 'pointer', fontWeight: 'bold', marginBottom: '1rem'}}>🔧 システム詳細仕様・データ解釈</summary>
          <div style={{fontSize: '0.85em', lineHeight: '1.6', color: '#495057'}}>
            
            <h5>📊 データベース構成（2025年8月現在）</h5>
            <ul>
              <li><strong>対応路線</strong>: 7路線・136駅</li>
              <li><strong>データ形式</strong>: 統合駅データベース + 個別路線ファイル</li>
              <li><strong>料金体系</strong>: JR東日本Suicaグリーン車料金（50km/100km境界）</li>
            </ul>

            <h5>🚃 路線データの解釈方法</h5>
            <ul>
              <li><strong>営業キロ</strong>: 各路線の起点駅（主に東京駅）からの累積距離</li>
              <li><strong>所要時間</strong>: 普通列車基準の概算値（快速・特急除く）</li>
              <li><strong>共有区間</strong>: 
                <ul>
                  <li>宇都宮線・高崎線: 東京〜大宮間は東北本線を共有</li>
                  <li>横須賀線: 東京〜大船間は品鶴線経由（東海道線とは別ルート）</li>
                  <li>湘南新宿ライン: 複数路線の直通運転系統</li>
                </ul>
              </li>
            </ul>

            <h5>⚠️ データ制限・推定値について</h5>
            <ul>
              <li><strong>編集・推定データ</strong>: 公式データが不完全な部分は合理的推定で補完</li>
              <li><strong>グリーン車運行制限</strong>:
                <ul>
                  <li>常磐線: 東京〜土浦間で確実、土浦以北は朝夕限定</li>
                  <li>高崎線: 全区間対応（一部列車除く）</li>
                  <li>横須賀線: 全区間対応</li>
                </ul>
              </li>
              <li><strong>時刻表確認推奨</strong>: 実際の乗車時は最新時刻表で運行確認要</li>
            </ul>

            <h5>🔄 システム設計上の制限</h5>
            <ul>
              <li><strong>跨線ルート未対応</strong>: 現在は路線別独立データのため、実際の直通運転（恵比寿→久喜、熱海→宇都宮等）が選択不可</li>
              <li><strong>将来対応予定</strong>: 上野東京ライン・湘南新宿ライン等の運転系統データ追加</li>
              <li><strong>ランキング算出</strong>: 同一駅間で複数路線がある場合は最短距離ルートを採用</li>
            </ul>

            <h5>📚 データソースの信頼性</h5>
            <ul>
              <li><strong>高信頼</strong>: JR東日本公式料金表、Wikipedia基礎データ</li>
              <li><strong>中信頼</strong>: 複数鉄道情報サイトからの営業キロ</li>
              <li><strong>推定値</strong>: 駅間距離の線形補間、所要時間の速度ベース算出</li>
            </ul>

            <h5>🛠️ 技術仕様</h5>
            <ul>
              <li><strong>フロントエンド</strong>: React 18 + TypeScript + Vite</li>
              <li><strong>検索機能</strong>: Fuse.js（日本語・ひらがな・ローマ字対応）</li>
              <li><strong>デプロイ</strong>: Cloudflare Pages（自動デプロイ）</li>
              <li><strong>データ更新</strong>: GitHub Actions（料金表自動取得）</li>
            </ul>

            <p><small>このシステムは鉄道愛好家の利便性向上を目的とし、JR東日本の公式情報を最大限尊重しつつ、技術的制約内で最適な体験を提供します。</small></p>
          </div>
        </details>

      </footer>
    </div>
  );
}

function RankingSection({ 
  unifiedStations, 
  fareTable, 
  availableRoutes,
  operatingSystemsData
}: { 
  unifiedStations: UnifiedStation[], 
  fareTable: FareTable,
  availableRoutes?: string[],
  operatingSystemsData: OperatingSystemData
}) {
  const [filterStation, setFilterStation] = useState<string>('');
  
  const allRankings = useMemo(
    () => generateUnifiedRankings(unifiedStations, fareTable, 'suica', availableRoutes, operatingSystemsData),
    [unifiedStations, fareTable, availableRoutes, operatingSystemsData]
  );
  
  const minuteRankings = useMemo(
    () => generateUnifiedMinuteRankings(unifiedStations, fareTable, 'suica', availableRoutes, operatingSystemsData),
    [unifiedStations, fareTable, availableRoutes, operatingSystemsData]
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
    () => [...filteredRankings].sort((a, b) => b.unitPrice - a.unitPrice).slice(0, 30),
    [filteredRankings]
  );
  
  const cheapRankings = useMemo(
    () => [...filteredRankings].sort((a, b) => a.unitPrice - b.unitPrice).slice(0, 30),
    [filteredRankings]
  );
  
  const expensiveMinuteRankings = useMemo(
    () => [...filteredMinuteRankings].sort((a, b) => b.minutePrice - a.minutePrice).slice(0, 30),
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
                <li key={`exp-${index}-${route.from}-${route.to}`} className="ranking-item">
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
                <li key={`cheap-${index}-${route.from}-${route.to}`} className="ranking-item">
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
                  <li key={`exp-min-${index}-${route.from}-${route.to}`} className="ranking-item">
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
                  <li key={`cheap-min-${index}-${route.from}-${route.to}`} className="ranking-item">
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