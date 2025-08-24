# 跨線対応システム設計書

## 📋 設計概要

**目標**: 恵比寿→久喜、熱海→宇都宮等の直通運転ルートを実現  
**アプローチ**: 運転系統データを物理路線データに追加する段階的実装

## 🏗️ データ構造設計

### 新規追加: operating-systems.json
```json
{
  "lastUpdated": "2025-08-24T12:00:00Z",
  "operatingSystems": {
    "ueno-tokyo-line": {
      "id": "ueno-tokyo-line",
      "titleJa": "上野東京ライン",
      "description": "宇都宮・高崎・常磐線 ⟷ 東海道線の直通運転",
      "physicalRoutes": ["joban-line", "utsunomiya-line", "takasaki-line", "tokaido-line"],
      "terminalStations": ["水戸", "宇都宮", "高崎", "熱海"],
      "operatingConnections": [
        {
          "fromStation": "水戸",
          "toStation": "熱海", 
          "totalKm": 205.4,
          "totalMinutes": 277,
          "route": ["joban-line:水戸→東京", "tokaido-line:東京→熱海"]
        },
        {
          "fromStation": "宇都宮",
          "toStation": "熱海",
          "totalKm": 214.1, 
          "totalMinutes": 289,
          "route": ["utsunomiya-line:宇都宮→東京", "tokaido-line:東京→熱海"]
        }
        // ... 他の接続パターン
      ]
    },
    "shonan-shinjuku-line": {
      "id": "shonan-shinjuku-line",
      "titleJa": "湘南新宿ライン（直通運転系統）",
      "description": "宇都宮・高崎線 ⟷ 東海道・横須賀線の直通運転", 
      "physicalRoutes": ["utsunomiya-line", "takasaki-line", "tokaido-line", "yokosuka-line"],
      "terminalStations": ["宇都宮", "高崎", "小田原", "逗子", "久里浜"],
      "operatingConnections": [
        {
          "fromStation": "恵比寿",
          "toStation": "久喜",
          "totalKm": 58.9,
          "totalMinutes": 76,
          "route": ["shonan-shinjuku-line:恵比寿→大宮", "utsunomiya-line:大宮→久喜"]
        }
        // ... 他の接続パターン
      ]
    }
  }
}
```

## 🔍 検索ロジック拡張

### 新関数: findOperatingSystemRoutes()
```typescript
export function findOperatingSystemRoutes(
  stations: UnifiedStation[], 
  operatingSystems: OperatingSystemData,
  fromName: string, 
  toName: string
): OperatingConnection[] {
  const connections: OperatingConnection[] = [];
  
  // 1. 既存の物理路線内検索（現在の動作）
  const physicalRoutes = findCommonRoutes(stations, fromName, toName);
  
  // 2. 運転系統での検索（新規追加）
  for (const system of Object.values(operatingSystems.operatingSystems)) {
    const connection = system.operatingConnections.find(
      conn => conn.fromStation === fromName && conn.toStation === toName
    );
    if (connection) {
      connections.push({
        type: 'operating-system',
        systemId: system.id,
        connection
      });
    }
  }
  
  return connections;
}
```

## 🎯 実装フェーズ

### Phase 1: データ作成
1. operating-systems.jsonファイル作成
2. 主要な直通運転パターンのデータ作成
   - 恵比寿→久喜（ユーザー要望）
   - 熱海→宇都宮（最長ルート）

### Phase 2: 検索ロジック拡張  
1. findOperatingSystemRoutes()実装
2. 既存のfindCommonRoutes()との統合
3. UI側での運転系統表示対応

### Phase 3: ユーザー体験向上
1. 複数ルート候補の表示（物理路線 vs 運転系統）
2. 所要時間・料金の比較表示
3. 乗り換えなし/乗り換えありの明示

## 💡 メリット

1. **既存データ保持**: 現在の7路線136駅データはそのまま
2. **段階実装**: 破壊的変更なしで新機能追加
3. **ユーザー選択**: 物理路線と運転系統の両方から選択可能
4. **拡張性**: 新しい運転系統の追加が容易

## ⚠️ 考慮事項

1. **データ整合性**: 物理路線と運転系統の距離・時間の整合
2. **UI複雑化**: 複数ルート候補の分かりやすい表示
3. **パフォーマンス**: 検索時間の増加への対応