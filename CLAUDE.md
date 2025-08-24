# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a React/TypeScript web application that calculates JR East green car fares per kilometer for Japanese train routes. The app helps users find the most cost-efficient segments for green car travel and provides comprehensive fare analysis including distance-based pricing and time-based cost efficiency.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Update fare and route data
npm run data:refresh
```

## Architecture

### Core Application Structure
- **Frontend**: React 18 + TypeScript + Vite with CSS modules
- **Search**: Fuse.js for fuzzy station name matching (Japanese/hiragana/romaji)
- **State Management**: React hooks with local state
- **Data**: Static JSON files served from `/public/data/`
- **Deployment**: Cloudflare Pages with automatic builds

### Data Architecture
The application uses a sophisticated multi-layer data system:

1. **Unified Station Database** (`stations-unified.json`): Central station registry where each station can exist on multiple routes with different kilometer markers and travel times
2. **Individual Route Files** (`routes/*.km.json`): Historical single-route data files maintained for compatibility
3. **Operating Systems Data** (`operating-systems.json`): Handles direct train services that cross multiple physical routes (e.g., 上野東京ライン, 湘南新宿ライン)
4. **Fare Table** (`green-fare.table.json`): Distance-based pricing tiers automatically updated from JR East website

### Key Library Files

- **`lib/distance.ts`**: Core distance calculations, route finding, and cross-line system support
- **`lib/fare.ts`**: Fare calculation logic with distance-based tiers (50km/100km boundaries)
- **`lib/ranking.ts`**: Cost efficiency analysis and ranking generation
- **`components/StationSearch.tsx`**: Fuzzy search component with Japanese language support

### Data Flow
1. Station selection triggers compatibility filtering based on shared routes or operating system connections
2. Distance calculation prioritizes physical routes over operating system data
3. Fare calculation uses JR East's three-tier system (≤50km, ≤100km, >100km)
4. Results include both km単価 (cost per kilometer) and 分単価 (cost per minute)

## Supported Routes
Currently supports 7 JR East lines with green car service:
- 中央線快速 (Chuo Line Rapid)
- 宇都宮線 (Utsunomiya Line) 
- 東海道線 (Tokaido Line)
- 高崎線 (Takasaki Line)
- 常磐線 (Joban Line)
- 横須賀線 (Yokosuka Line)
- 湘南新宿ライン (Shonan-Shinjuku Line)

Plus cross-line direct services:
- 上野東京ライン (Ueno-Tokyo Line)
- 湘南新宿ライン直通運転 (Shonan-Shinjuku Line direct operations)

## Data Maintenance

### Automated Updates
- **GitHub Actions**: Runs daily at JST 9:00 to update fare data from JR East website
- **Verification Scripts**: `scripts/verify-*.mjs` files validate route data integrity
- **Scraping**: `scripts/scrape-green-fare.mjs` extracts current fare tables

### Manual Data Updates
Route and station data updates require manual editing of JSON files in `public/data/`. The unified station system allows adding new routes by extending existing station entries with additional line data.

## Development Patterns

### Station Data Structure
```typescript
type UnifiedStation = {
  name: string;
  hiragana?: string;
  romaji?: string;
  lines: Array<{
    route: string;
    km: number;      // Distance from route origin
    minutes: number; // Travel time from route origin
  }>;
};
```

### Route Compatibility
The system automatically determines valid station pairs based on:
1. **Physical routes**: Stations that share the same route identifier
2. **Operating systems**: Stations connected by direct train services across multiple physical routes

### Adding New Routes
1. Create route data file in `public/data/routes/`
2. Add stations to unified database with route-specific km/minute data
3. Update route title mappings in `App.tsx`
4. Add verification script if needed

## Important Notes

- **No testing framework**: Project currently lacks automated tests
- **No linting setup**: No ESLint or other code quality tools configured  
- **Manual deployment**: Relies on Cloudflare Pages automatic deployment from git pushes
- **Data validation**: Relies on verification scripts rather than runtime validation
- **Japanese language focus**: UI and data are primarily in Japanese with multi-language search support