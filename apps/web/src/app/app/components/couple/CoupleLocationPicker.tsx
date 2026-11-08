'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { LocateFixed, MapPin, Search, X } from 'lucide-react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

export type CoupleLocation = {
  name: string;
  area: string;
  latitude: number;
  longitude: number;
};

function coordinatesLocation(latitude: number, longitude: number): CoupleLocation {
  return {
    name: 'Vị trí đã ghim',
    area: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    latitude,
    longitude,
  };
}

type Props = {
  value: CoupleLocation | null;
  onChange: (location: CoupleLocation | null) => void;
};

async function lookupLocation(params: URLSearchParams) {
  const response = await fetch(`/api/couple/location?${params.toString()}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Không thể tìm vị trí.');
  return result as { locations?: CoupleLocation[]; location?: CoupleLocation };
}

export default function CoupleLocationPicker({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CoupleLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const mapElement = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const selectionRef = useRef(onChange);
  const selectedRef = useRef(value);

  useEffect(() => { selectionRef.current = onChange; }, [onChange]);
  useEffect(() => { selectedRef.current = value; }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mapElement.current || mapRef.current) return;
    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame: number | null = null;
    setTileError(false);
    void import('leaflet').then((L) => {
      if (!active || !mapElement.current) return;
      const current = selectedRef.current;
      const center: [number, number] = current
        ? [current.latitude, current.longitude]
        : [16.0, 108.0];
      const map = L.map(mapElement.current).setView(center, current ? 15 : 5);
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      tiles.on('tileerror', () => setTileError(true));
      tiles.addTo(map);
      mapRef.current = map;
      markerRef.current = current
        ? L.marker(center, {
          icon: L.divIcon({ className: 'couple-map-marker', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] }),
        }).addTo(map)
        : null;
      map.on('click', (event) => {
        const latitude = event.latlng.lat;
        const longitude = event.latlng.lng;
        selectionRef.current(coordinatesLocation(latitude, longitude));
        if (markerRef.current) markerRef.current.setLatLng(event.latlng);
        else {
          markerRef.current = L.marker(event.latlng, {
            icon: L.divIcon({ className: 'couple-map-marker', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] }),
          }).addTo(map);
        }
        setSearching(true);
        setError('');
        void lookupLocation(new URLSearchParams({ lat: String(latitude), lon: String(longitude) }))
          .then((result) => {
            if (!result.location) throw new Error('Không tìm thấy địa chỉ cho vị trí này.');
            selectionRef.current(result.location);
          })
          .catch((lookupError: unknown) => {
            const detail = lookupError instanceof Error ? lookupError.message : 'Không thể xác định địa chỉ.';
            setError(`Đã ghim tọa độ, nhưng chưa lấy được tên địa điểm. ${detail}`);
          })
          .finally(() => setSearching(false));
      });
      setMapReady(true);
      resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
      resizeObserver.observe(mapElement.current);
      resizeFrame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải bản đồ.');
    });

    return () => {
      active = false;
      resizeObserver?.disconnect();
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, [isOpen]);

  async function searchPlaces() {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || searching) return;
    setSearching(true);
    setError('');
    try {
      const result = await lookupLocation(new URLSearchParams({ q: trimmedQuery }));
      setResults(result.locations ?? []);
      if (!result.locations?.length) setError('Không tìm thấy địa điểm phù hợp.');
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Không thể tìm địa điểm.');
    } finally {
      setSearching(false);
    }
  }

  function chooseLocation(location: CoupleLocation) {
    onChange(location);
    setResults([]);
    mapRef.current?.setView([location.latitude, location.longitude], 16);
    if (mapRef.current) {
      if (markerRef.current) markerRef.current.setLatLng([location.latitude, location.longitude]);
      else {
        void import('leaflet').then((L) => {
          if (!mapRef.current) return;
          markerRef.current = L.marker([location.latitude, location.longitude], {
            icon: L.divIcon({ className: 'couple-map-marker', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] }),
          }).addTo(mapRef.current);
        });
      }
    }
  }

  function useCurrentPosition() {
    if (!navigator.geolocation) {
      setError('Trình duyệt này không hỗ trợ xác định vị trí.');
      return;
    }
    setSearching(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        mapRef.current?.setView([latitude, longitude], 16);
        chooseLocation(coordinatesLocation(latitude, longitude));
        void lookupLocation(new URLSearchParams({ lat: String(latitude), lon: String(longitude) }))
          .then((result) => {
            if (!result.location) throw new Error('Không thể xác định địa chỉ vị trí hiện tại.');
            chooseLocation(result.location);
          })
          .catch((lookupError: unknown) => {
            const detail = lookupError instanceof Error ? lookupError.message : 'Không thể xác định địa chỉ.';
            setError(`Đã ghim tọa độ, nhưng chưa lấy được tên địa điểm. ${detail}`);
          })
          .finally(() => setSearching(false));
      },
      () => {
        setSearching(false);
        setError('Không thể lấy vị trí hiện tại. Hãy cho phép truy cập vị trí hoặc chạm lên bản đồ.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="couple-location-picker">
      <div className="couple-location-picker-heading">
        <span><MapPin size={15} /> Check-in địa điểm</span>
        <button type="button" className="couple-location-select-button" onClick={() => setIsOpen((open) => !open)}>
          <MapPin size={14} /> {isOpen ? 'Đóng bản đồ' : value ? 'Đổi vị trí' : 'Chọn trên bản đồ'}
        </button>
      </div>
      {value ? (
        <div className="couple-location-selected">
          <MapPin size={16} />
          <span><strong>{value.name}</strong>{value.area && <small>{value.area}</small>}</span>
          <button type="button" aria-label="Bỏ vị trí đã chọn" onClick={() => onChange(null)}><X size={15} /></button>
        </div>
      ) : <p className="couple-location-hint">Tìm địa điểm hoặc chạm lên bản đồ để ghim vị trí.</p>}

      {isOpen && (
        <div className="couple-location-map-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <section className="couple-location-map-panel" role="dialog" aria-modal="true" aria-labelledby={`${inputId}-title`} onClick={(event) => event.stopPropagation()}>
            <header className="couple-location-map-header">
              <span id={`${inputId}-title`}><MapPin size={17} /> Chọn vị trí check-in</span>
              <button type="button" aria-label="Đóng bản đồ" onClick={() => setIsOpen(false)}><X size={18} /></button>
            </header>
          <div className="couple-location-search">
            <label htmlFor={inputId}>Tìm địa điểm</label>
            <div>
              <input
                id={inputId}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void searchPlaces();
                  }
                }}
                placeholder="Tên quán, địa chỉ..."
                maxLength={200}
              />
              <button type="button" onClick={() => void searchPlaces()} disabled={searching || query.trim().length < 2} aria-label="Tìm địa điểm">
                <Search size={16} />
              </button>
              <button type="button" onClick={useCurrentPosition} disabled={searching} aria-label="Dùng vị trí hiện tại">
                <LocateFixed size={16} />
              </button>
            </div>
          </div>
          {results.length > 0 && (
            <div className="couple-location-results" role="listbox" aria-label="Kết quả địa điểm">
              {results.map((location) => (
                <button key={`${location.latitude}:${location.longitude}`} type="button" onClick={() => chooseLocation(location)}>
                  <MapPin size={15} /><span><strong>{location.name}</strong><small>{location.area || 'OpenStreetMap'}</small></span>
                </button>
              ))}
            </div>
          )}
          {error && <p className="couple-location-error" role="alert">{error}</p>}
          <div className="couple-location-map" ref={mapElement} aria-label="Bản đồ OpenStreetMap để chọn vị trí" />
          {tileError && <p className="couple-location-error" role="status">Không tải được bản đồ nền OpenStreetMap. Hãy kiểm tra kết nối Internet; bạn vẫn có thể ghim tọa độ trên bản đồ.</p>}
          {searching && <small className="couple-location-loading">Đang tìm vị trí…</small>}
          {!mapReady && !error && <small className="couple-location-loading">Đang tải bản đồ…</small>}
            <footer className="couple-location-map-footer">
              {value ? (
                <span><strong>{value.name}</strong><small>{value.area || 'Đã ghim trên bản đồ'}</small></span>
              ) : (
                <span><strong>Chọn vị trí trên bản đồ</strong><small>Chạm vào bản đồ hoặc tìm địa điểm ở trên.</small></span>
              )}
              <button className="button button-primary" type="button" disabled={!value || searching} onClick={() => setIsOpen(false)}>Xong</button>
            </footer>
            <small className="couple-location-attribution">Bản đồ © OpenStreetMap contributors</small>
          </section>
        </div>
      )}
    </div>
  );
}
