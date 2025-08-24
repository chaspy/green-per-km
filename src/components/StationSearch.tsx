import { useState, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Station } from '../lib/distance';
import './StationSearch.css';

interface StationSearchProps {
  stations: Station[];
  value: string;
  onChange: (stationName: string) => void;
  placeholder?: string;
}

export function StationSearch({ stations, value, onChange, placeholder = '駅名を検索...' }: StationSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fuse.js の設定
  const fuse = new Fuse(stations, {
    keys: ['name', 'hiragana', 'romaji'],
    threshold: 0.3,
    includeScore: true,
    shouldSort: true,
  });

  // 検索結果
  const results = searchTerm 
    ? fuse.search(searchTerm).map(result => result.item)
    : stations;

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // キーボード操作
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlightedIndex]) {
        selectStation(results[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const selectStation = (station: Station) => {
    onChange(station.name);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="station-search" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="station-search-input"
      />
      
      {value && (
        <div className="selected-station">
          {value}
        </div>
      )}
      
      {isOpen && results.length > 0 && (
        <div className="station-search-dropdown">
          {results.map((station, index) => (
            <div
              key={station.name}
              className={`station-search-item ${index === highlightedIndex ? 'highlighted' : ''}`}
              onClick={() => selectStation(station)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="station-name">{station.name}</div>
              {station.hiragana && (
                <div className="station-reading">
                  {station.hiragana} / {station.romaji}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}