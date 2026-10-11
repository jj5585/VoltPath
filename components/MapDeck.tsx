'use client';

import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SegmentCalculation } from '@/lib/physicsEngine';
import { SwapStation } from '@/lib/geospatialData';

interface MapDeckProps {
  center: { lat: number; lng: number; zoom: number };
  routeASegments: SegmentCalculation[];
  routeBSegments: SegmentCalculation[];
  safeReachPolygon: [number, number][];
  swapStations: SwapStation[];
  stallPoint?: { lat: number; lng: number; distanceKm: number; reason: string } | null;
  throttlePoint?: { lat: number; lng: number; distanceKm: number } | null;
  currentPlaybackIndex: number;
  activeRoute: 'A' | 'B';
  showRouteA: boolean;
  showRouteB: boolean;
  showIsochrone: boolean;
  fullPolylineA?: [number, number][];
  fullPolylineB?: [number, number][];
}

export default function MapDeck({
  center,
  routeASegments,
  routeBSegments,
  safeReachPolygon,
  swapStations,
  stallPoint,
  throttlePoint,
  currentPlaybackIndex,
  activeRoute,
  showRouteA,
  showRouteB,
  showIsochrone,
  fullPolylineA,
  fullPolylineB,
}: MapDeckProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const stallMarkerRef = useRef<maplibregl.Marker | null>(null);
  const startMarkerRef = useRef<maplibregl.Marker | null>(null);
  const endMarkerRef = useRef<maplibregl.Marker | null>(null);
  const swapMarkerRefs = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; CARTO, &copy; OSM contributors',
          },
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [center.lng, center.lat],
      zoom: center.zoom,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update layers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // --- Safe Reach Isochrone Polygon ---
    const isoSource = map.getSource('isochrone') as maplibregl.GeoJSONSource | undefined;
    const isoData: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: safeReachPolygon.length > 2 ? [safeReachPolygon] : [[[0,0],[0,0],[0,0],[0,0]]],
      },
    };
    if (isoSource) {
      isoSource.setData(isoData);
    } else {
      map.addSource('isochrone', { type: 'geojson', data: isoData });
      map.addLayer({
        id: 'isochrone-fill',
        type: 'fill',
        source: 'isochrone',
        paint: {
          'fill-color': '#00F5A0',
          'fill-opacity': 0.08,
        },
      });
      map.addLayer({
        id: 'isochrone-border',
        type: 'line',
        source: 'isochrone',
        paint: {
          'line-color': '#00F5A0',
          'line-width': 2,
          'line-opacity': 0.6,
          'line-dasharray': [3, 2],
        },
      });
    }
    map.setLayoutProperty('isochrone-fill', 'visibility', showIsochrone ? 'visible' : 'none');
    map.setLayoutProperty('isochrone-border', 'visibility', showIsochrone ? 'visible' : 'none');

    // --- Route A ---
    const routeACoordsLine: [number, number][] =
      fullPolylineA && fullPolylineA.length > 0
        ? fullPolylineA.map(([lat, lng]) => [lng, lat])
        : routeASegments.map((s) => [s.lng, s.lat]);
    const routeALineData: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: routeACoordsLine },
    };
    const srcA = map.getSource('route-a') as maplibregl.GeoJSONSource | undefined;
    if (srcA) {
      srcA.setData(routeALineData);
    } else {
      map.addSource('route-a', { type: 'geojson', data: routeALineData });
      map.addLayer({
        id: 'route-a-line',
        type: 'line',
        source: 'route-a',
        paint: {
          'line-color': '#EF4444',
          'line-width': 4.5,
          'line-opacity': 0.85,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
    }
    map.setLayoutProperty('route-a-line', 'visibility', showRouteA ? 'visible' : 'none');

    // --- Route B ---
    const routeBCoordsLine: [number, number][] =
      fullPolylineB && fullPolylineB.length > 0
        ? fullPolylineB.map(([lat, lng]) => [lng, lat])
        : routeBSegments.map((s) => [s.lng, s.lat]);
    const routeBLineData: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: routeBCoordsLine },
    };
    const srcB = map.getSource('route-b') as maplibregl.GeoJSONSource | undefined;
    if (srcB) {
      srcB.setData(routeBLineData);
    } else {
      map.addSource('route-b', { type: 'geojson', data: routeBLineData });
      map.addLayer({
        id: 'route-b-line',
        type: 'line',
        source: 'route-b',
        paint: {
          'line-color': '#00F5A0',
          'line-width': 4.5,
          'line-opacity': 0.9,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
    }
    map.setLayoutProperty('route-b-line', 'visibility', showRouteB ? 'visible' : 'none');

    // --- Start Marker (Origin Dark Store) ---
    if (routeASegments.length > 0) {
      const firstSeg = routeASegments[0];
      const popupHtml = `
        <div style="font-size:11px;font-family:sans-serif;line-height:1.4">
          <div style="font-weight:bold;color:#00F5A0;margin-bottom:2px">Origin: ${firstSeg.name || 'Dispatch Origin'}</div>
          <div style="color:#94A3B8">Elev: ${firstSeg.elevationM}m ASL</div>
          <div style="color:#CBD5E1;margin-top:2px">Departure Dispatch Point</div>
        </div>
      `;

      if (!startMarkerRef.current) {
        const startEl = document.createElement('div');
        startEl.className = 'flex items-center justify-center';
        startEl.style.width = '30px';
        startEl.style.height = '30px';
        startEl.style.borderRadius = '50%';
        startEl.style.background = '#10B981';
        startEl.style.border = '2px solid #FFFFFF';
        startEl.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.7)';
        startEl.style.cursor = 'pointer';
        startEl.innerHTML = '<span style="font-size:14px">🏬</span>';

        const popup = new maplibregl.Popup({ offset: 15 }).setHTML(popupHtml);
        startMarkerRef.current = new maplibregl.Marker({ element: startEl })
          .setLngLat([firstSeg.lng, firstSeg.lat])
          .setPopup(popup)
          .addTo(map);
      } else {
        startMarkerRef.current.setLngLat([firstSeg.lng, firstSeg.lat]);
        startMarkerRef.current.getPopup()?.setHTML(popupHtml);
      }
    }

    // --- End Marker (Destination Drop-off) ---
    if (routeASegments.length > 0) {
      const lastSeg = routeASegments[routeASegments.length - 1];
      const endPopupHtml = `
        <div style="font-size:11px;font-family:sans-serif;line-height:1.4">
          <div style="font-weight:bold;color:#00D2FF;margin-bottom:2px">Destination: ${lastSeg.name || 'Customer Delivery Drop-off'}</div>
          <div style="color:#94A3B8">Elev: ${lastSeg.elevationM}m ASL</div>
          <div style="color:#CBD5E1;margin-top:2px">Customer Delivery Drop-off</div>
        </div>
      `;

      if (!endMarkerRef.current) {
        const endEl = document.createElement('div');
        endEl.className = 'flex items-center justify-center';
        endEl.style.width = '30px';
        endEl.style.height = '30px';
        endEl.style.borderRadius = '50%';
        endEl.style.background = '#00D2FF';
        endEl.style.border = '2px solid #FFFFFF';
        endEl.style.boxShadow = '0 0 10px rgba(0, 210, 255, 0.7)';
        endEl.style.cursor = 'pointer';
        endEl.innerHTML = '<span style="font-size:14px">🏁</span>';

        const popup = new maplibregl.Popup({ offset: 15 }).setHTML(endPopupHtml);
        endMarkerRef.current = new maplibregl.Marker({ element: endEl })
          .setLngLat([lastSeg.lng, lastSeg.lat])
          .setPopup(popup)
          .addTo(map);
      } else {
        endMarkerRef.current.setLngLat([lastSeg.lng, lastSeg.lat]);
        endMarkerRef.current.getPopup()?.setHTML(endPopupHtml);
      }
    }

  }, [mapLoaded, routeASegments, routeBSegments, safeReachPolygon, showRouteA, showRouteB, showIsochrone, fullPolylineA, fullPolylineB]);

  // Recenter map when center changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: center.zoom,
        duration: 800,
      });
    }
  }, [center, mapLoaded]);

  // Update vehicle marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const activePoly = activeRoute === 'A' ? fullPolylineA : fullPolylineB;
    const activeSegments = activeRoute === 'A' ? routeASegments : routeBSegments;
    if (!activeSegments || activeSegments.length === 0) return;

    let vLat = activeSegments[0].lat;
    let vLng = activeSegments[0].lng;

    if (activePoly && activePoly.length > 0) {
      const polyIdx = Math.min(activePoly.length - 1, Math.max(0, currentPlaybackIndex));
      vLat = activePoly[polyIdx][0];
      vLng = activePoly[polyIdx][1];
    } else {
      const idx = Math.min(activeSegments.length - 1, Math.max(0, currentPlaybackIndex));
      vLat = activeSegments[idx].lat;
      vLng = activeSegments[idx].lng;
    }

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.background = activeRoute === 'A' ? '#EF4444' : '#00F5A0';
      el.style.border = '3px solid #0A0E17';
      el.style.boxShadow =
        activeRoute === 'A' ? '0 0 16px rgba(239,68,68,0.8)' : '0 0 16px rgba(0,245,160,0.8)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.transition = 'transform 0.1s linear';
      el.innerHTML = '<span style="font-size:16px">🛵</span>';

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([vLng, vLat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([vLng, vLat]);
      const el = markerRef.current.getElement();
      el.style.background = activeRoute === 'A' ? '#EF4444' : '#00F5A0';
      el.style.boxShadow =
        activeRoute === 'A' ? '0 0 16px rgba(239,68,68,0.8)' : '0 0 16px rgba(0,245,160,0.8)';
    }
  }, [mapLoaded, currentPlaybackIndex, activeRoute, routeASegments, routeBSegments, fullPolylineA, fullPolylineB]);

  // Stall marker with interactive popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (stallMarkerRef.current) {
      stallMarkerRef.current.remove();
      stallMarkerRef.current = null;
    }

    if (stallPoint && showRouteA) {
      const el = document.createElement('div');
      el.style.width = '34px';
      el.style.height = '34px';
      el.style.borderRadius = '50%';
      el.style.background = 'rgba(255,59,48,0.3)';
      el.style.border = '2px solid #FF3B30';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.animation = 'pulse-danger 1.2s ease-in-out infinite';
      el.innerHTML = '<span style="color:#FF3B30;font-size:18px;font-weight:bold">⚠</span>';

      const stallPopup = new maplibregl.Popup({ offset: 15 }).setHTML(`
        <div style="font-size:11px;font-family:sans-serif;line-height:1.4">
          <div style="font-weight:bold;color:#FF3B30;margin-bottom:2px">🚨 Deep Discharge Stall Alert</div>
          <div style="color:#CBD5E1">At km ${stallPoint.distanceKm} (Ejipura / Domlur link)</div>
          <div style="color:#94A3B8;margin-top:2px">${stallPoint.reason}</div>
          <div style="color:#F59E0B;font-weight:600;margin-top:4px">Action: Battery swap recommended 1.2km prior at Hub #42</div>
        </div>
      `);

      stallMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([stallPoint.lng, stallPoint.lat])
        .setPopup(stallPopup)
        .addTo(map);
    }
  }, [mapLoaded, stallPoint, showRouteA]);

  // Swap station markers with interactive popups
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    swapMarkerRefs.current.forEach((m) => m.remove());
    swapMarkerRefs.current = [];

    swapStations.forEach((station) => {
      const el = document.createElement('div');
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.borderRadius = '6px';
      el.style.background = station.recommendedForRoute ? '#00D2FF' : '#6366F1';
      el.style.border = '2px solid #0A0E17';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.fontSize = '14px';
      el.style.boxShadow = station.recommendedForRoute
        ? '0 0 12px rgba(0,210,255,0.6)'
        : '0 0 8px rgba(99,102,241,0.4)';
      el.innerHTML = '⚡';

      const popup = new maplibregl.Popup({ offset: 15 }).setHTML(`
        <div style="font-size:11px;font-family:sans-serif;line-height:1.4">
          <div style="font-weight:bold;color:#00D2FF;margin-bottom:2px">${station.name}</div>
          <div style="color:#94A3B8">${station.address}</div>
          <div style="margin-top:4px;display:flex;gap:8px;font-family:monospace">
            <span style="color:#00F5A0;font-weight:bold">${station.availableBatteries}/${station.totalBays} Ready</span>
            <span style="color:#E2E8F0">⏱ ${station.swapTimeMinutes}m Swap</span>
          </div>
          ${station.recommendedForRoute ? '<div style="color:#F59E0B;font-weight:bold;margin-top:4px">★ Recommended Pitstop before Flyover Gradient</div>' : ''}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([station.lng, station.lat])
        .setPopup(popup)
        .addTo(map);
      swapMarkerRefs.current.push(marker);
    });
  }, [mapLoaded, swapStations]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-volt-border">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 bg-[#0A0E17]/95 border border-volt-border rounded-lg p-2.5 text-[10px] space-y-1.5 backdrop-blur-sm z-10 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-500 rounded" />
          <span className="text-slate-300 font-medium">Route A — Standard Flat (Time-Optimal)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#00F5A0] rounded" />
          <span className="text-slate-300 font-medium">Route B — VoltPath (Energy & Grade Aware)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-[6px] rounded bg-[#00F5A0]/20 border border-[#00F5A0]/50" style={{borderStyle:'dashed'}} />
          <span className="text-slate-300 font-medium">Safe-Reach Contour (Dynamic Isochrone)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px]">⚡</span>
          <span className="text-slate-300 font-medium">Battery Swap Stations (Battery Smart / Sun Mobility)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-[12px]">⚠</span>
          <span className="text-slate-300 font-medium">Simulated Stall Point (&lt;12% SoC / Thermal runaway)</span>
        </div>
      </div>
      {/* Corner Badge */}
      <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
        <div className="bg-[#0A0E17]/90 border border-volt-border rounded-lg px-2.5 py-1 text-[10px] text-slate-300 backdrop-blur-sm flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse"></span>
          BENGALURU CORRIDOR • INDIRANAGAR ➔ BELLANDUR
        </div>
      </div>
    </div>
  );
}
