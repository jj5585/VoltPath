'use client';

import React, { useRef, useEffect, useState } from 'react';
import { SegmentCalculation } from '@/lib/physicsEngine';
import { SwapStation } from '@/lib/geospatialData';
import { Key, AlertCircle, RefreshCw } from 'lucide-react';

interface GoogleMapDeckProps {
  apiKey: string;
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
  onOpenKeyModal: () => void;
  corridorTitle?: string;
}

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0b101b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b101b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8c95a6' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a0aec0' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#718096' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#111d28' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1a2336' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#121826' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#24324a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a2336' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#060a12' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4b5563' }],
  },
];

export default function GoogleMapDeck({
  apiKey,
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
  onOpenKeyModal,
  corridorTitle,
}: GoogleMapDeckProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineARef = useRef<google.maps.Polyline | null>(null);
  const polylineBRef = useRef<google.maps.Polyline | null>(null);
  const isochronePolygonRef = useRef<google.maps.Polygon | null>(null);
  const vehicleMarkerRef = useRef<google.maps.Marker | null>(null);
  const stallMarkerRef = useRef<google.maps.Marker | null>(null);
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const endMarkerRef = useRef<google.maps.Marker | null>(null);
  const swapMarkersRef = useRef<google.maps.Marker[]>([]);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dynamic Google Maps Script Loader
  useEffect(() => {
    if (!apiKey) {
      setLoadError('No Google Maps API Key provided');
      return;
    }

    setLoadError(null);

    // Check if google maps script is already on page
    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement;
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setScriptLoaded(true);
      setLoadError(null);
    };
    script.onerror = () => {
      setLoadError('Failed to load Google Maps JavaScript API. Please verify your API key and network.');
    };

    document.head.appendChild(script);

    return () => {
      // Keep script cached if initialized
    };
  }, [apiKey]);

  // Initialize Map
  useEffect(() => {
    if (!scriptLoaded || !mapContainer.current || typeof google === 'undefined' || !google.maps) return;

    if (!mapRef.current) {
      const map = new google.maps.Map(mapContainer.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: center.zoom,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        mapTypeControlOptions: {
          mapTypeIds: ['roadmap', 'hybrid'],
          position: google.maps.ControlPosition.TOP_RIGHT,
        },
        backgroundColor: '#0A0E17',
      });

      mapRef.current = map;
    }
  }, [scriptLoaded, center]);

  // Recenter map when center changes
  useEffect(() => {
    if (mapRef.current && scriptLoaded && typeof google !== 'undefined' && google.maps) {
      mapRef.current.panTo({ lat: center.lat, lng: center.lng });
      mapRef.current.setZoom(center.zoom);
    }
  }, [center, scriptLoaded]);

  // Update Layers & Overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined' || !google.maps) return;

    // --- Safe Reach Isochrone Polygon ---
    if (isochronePolygonRef.current) {
      isochronePolygonRef.current.setMap(null);
      isochronePolygonRef.current = null;
    }

    if (showIsochrone && safeReachPolygon.length > 2) {
      const paths = safeReachPolygon.map(([lng, lat]) => ({ lat, lng }));
      const polygon = new google.maps.Polygon({
        paths,
        strokeColor: '#00F5A0',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: '#00F5A0',
        fillOpacity: 0.08,
        map,
      });
      isochronePolygonRef.current = polygon;
    }

    // --- Route A Polyline ---
    if (polylineARef.current) {
      polylineARef.current.setMap(null);
      polylineARef.current = null;
    }
    if (showRouteA && (fullPolylineA?.length || routeASegments.length > 0)) {
      const pathA =
        fullPolylineA && fullPolylineA.length > 0
          ? fullPolylineA.map(([lat, lng]) => ({ lat, lng }))
          : routeASegments.map((s) => ({ lat: s.lat, lng: s.lng }));
      const polyA = new google.maps.Polyline({
        path: pathA,
        geodesic: true,
        strokeColor: '#EF4444',
        strokeOpacity: 0.85,
        strokeWeight: 4.5,
        map,
      });
      polylineARef.current = polyA;
    }

    // --- Route B Polyline ---
    if (polylineBRef.current) {
      polylineBRef.current.setMap(null);
      polylineBRef.current = null;
    }
    if (showRouteB && (fullPolylineB?.length || routeBSegments.length > 0)) {
      const pathB =
        fullPolylineB && fullPolylineB.length > 0
          ? fullPolylineB.map(([lat, lng]) => ({ lat, lng }))
          : routeBSegments.map((s) => ({ lat: s.lat, lng: s.lng }));
      const polyB = new google.maps.Polyline({
        path: pathB,
        geodesic: true,
        strokeColor: '#00F5A0',
        strokeOpacity: 0.9,
        strokeWeight: 4.5,
        map,
      });
      polylineBRef.current = polyB;
    }

    // --- Start Marker (Origin Dark Store) ---
    if (routeASegments.length > 0) {
      const origin = routeASegments[0];
      if (!startMarkerRef.current) {
        const startMarker = new google.maps.Marker({
          position: { lat: origin.lat, lng: origin.lng },
          map,
          title: `Origin: ${origin.name || 'Dispatch Point'}`,
          label: {
            text: '🏬',
            fontSize: '16px',
          },
        });

        const startInfo = new google.maps.InfoWindow({
          content: `
            <div style="font-size:11px;font-family:sans-serif;color:#1e293b;line-height:1.4">
              <div style="font-weight:bold;color:#059669">Origin: ${origin.name || 'Dispatch Point'}</div>
              <div>Elev: ${origin.elevationM}m ASL</div>
              <div style="color:#64748b">Departure Dispatch Point</div>
            </div>
          `,
        });
        startMarker.addListener('click', () => startInfo.open(map, startMarker));
        startMarkerRef.current = startMarker;
      } else {
        startMarkerRef.current.setPosition({ lat: origin.lat, lng: origin.lng });
      }
    }

    // --- End Marker (Destination Drop-off) ---
    if (routeASegments.length > 0) {
      const dest = routeASegments[routeASegments.length - 1];
      if (!endMarkerRef.current) {
        const endMarker = new google.maps.Marker({
          position: { lat: dest.lat, lng: dest.lng },
          map,
          title: `Destination: ${dest.name || 'Customer Delivery Drop-off'}`,
          label: {
            text: '🏁',
            fontSize: '16px',
          },
        });

        const endInfo = new google.maps.InfoWindow({
          content: `
            <div style="font-size:11px;font-family:sans-serif;color:#1e293b;line-height:1.4">
              <div style="font-weight:bold;color:#0284c7">Destination: ${dest.name || 'Customer Drop-off'}</div>
              <div>Elev: ${dest.elevationM}m ASL</div>
              <div style="color:#64748b">Customer Delivery Drop-off</div>
            </div>
          `,
        });
        endMarker.addListener('click', () => endInfo.open(map, endMarker));
        endMarkerRef.current = endMarker;
      } else {
        endMarkerRef.current.setPosition({ lat: dest.lat, lng: dest.lng });
      }
    }

    // --- Stall Marker ---
    if (stallMarkerRef.current) {
      stallMarkerRef.current.setMap(null);
      stallMarkerRef.current = null;
    }
    if (stallPoint && showRouteA) {
      const stallMarker = new google.maps.Marker({
        position: { lat: stallPoint.lat, lng: stallPoint.lng },
        map,
        title: 'Deep Discharge Stall Point',
        label: {
          text: '⚠️',
          fontSize: '18px',
        },
      });

      const stallInfo = new google.maps.InfoWindow({
        content: `
          <div style="font-size:11px;font-family:sans-serif;color:#1e293b;line-height:1.4">
            <div style="font-weight:bold;color:#dc2626">🚨 Deep Discharge Stall Alert</div>
            <div>At km ${stallPoint.distanceKm} (Ejipura / Domlur link)</div>
            <div style="color:#475569;margin-top:2px">${stallPoint.reason}</div>
            <div style="color:#d97706;font-weight:600;margin-top:4px">Action: Battery swap recommended at Hub #42</div>
          </div>
        `,
      });
      stallMarker.addListener('click', () => stallInfo.open(map, stallMarker));
      stallMarkerRef.current = stallMarker;
    }

    // --- Swap Station Markers ---
    swapMarkersRef.current.forEach((m) => m.setMap(null));
    swapMarkersRef.current = [];

    swapStations.forEach((station) => {
      const swapMarker = new google.maps.Marker({
        position: { lat: station.lat, lng: station.lng },
        map,
        title: station.name,
        label: {
          text: '⚡',
          fontSize: '14px',
        },
      });

      const info = new google.maps.InfoWindow({
        content: `
          <div style="font-size:11px;font-family:sans-serif;color:#1e293b;line-height:1.4">
            <div style="font-weight:bold;color:#0284c7">${station.name}</div>
            <div style="color:#64748b">${station.address}</div>
            <div style="margin-top:4px;font-weight:bold;color:#059669">
              ${station.availableBatteries}/${station.totalBays} Ready • ⏱ ${station.swapTimeMinutes}m Swap
            </div>
          </div>
        `,
      });
      swapMarker.addListener('click', () => info.open(map, swapMarker));
      swapMarkersRef.current.push(swapMarker);
    });

  }, [
    scriptLoaded,
    routeASegments,
    routeBSegments,
    safeReachPolygon,
    swapStations,
    stallPoint,
    showRouteA,
    showRouteB,
    showIsochrone,
    fullPolylineA,
    fullPolylineB,
  ]);

  // Update Vehicle Marker Position during simulation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined' || !google.maps) return;

    const activePoly = activeRoute === 'A' ? fullPolylineA : fullPolylineB;
    const activeSegments = activeRoute === 'A' ? routeASegments : routeBSegments;
    if (!activeSegments || activeSegments.length === 0) return;

    let vLat = activeSegments[0].lat;
    let vLng = activeSegments[0].lng;
    let heading = 0;

    if (activePoly && activePoly.length > 0) {
      const polyIdx = Math.min(activePoly.length - 1, Math.max(0, currentPlaybackIndex));
      vLat = activePoly[polyIdx][0];
      vLng = activePoly[polyIdx][1];

      if (polyIdx > 0) {
        const prev = activePoly[polyIdx - 1];
        heading = (Math.atan2(vLng - prev[1], vLat - prev[0]) * (180 / Math.PI) + 360) % 360;
      } else if (activePoly.length > 1) {
        const next = activePoly[1];
        heading = (Math.atan2(next[1] - vLng, next[0] - vLat) * (180 / Math.PI) + 360) % 360;
      }
    } else {
      const idx = Math.min(activeSegments.length - 1, Math.max(0, currentPlaybackIndex));
      vLat = activeSegments[idx].lat;
      vLng = activeSegments[idx].lng;
      if (idx > 0) {
        const prev = activeSegments[idx - 1];
        heading = (Math.atan2(vLng - prev.lng, vLat - prev.lat) * (180 / Math.PI) + 360) % 360;
      }
    }

    const themeColor = activeRoute === 'A' ? '#EF4444' : '#00F5A0';
    const markerIcon = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 5,
      fillColor: themeColor,
      fillOpacity: 1,
      strokeColor: '#0A0E17',
      strokeWeight: 2,
      rotation: Math.round(heading),
    };

    if (!vehicleMarkerRef.current) {
      const vMarker = new google.maps.Marker({
        position: { lat: vLat, lng: vLng },
        map,
        title: 'VoltPath Dispatch Vehicle',
        icon: markerIcon,
      });
      vehicleMarkerRef.current = vMarker;
    } else {
      vehicleMarkerRef.current.setPosition({ lat: vLat, lng: vLng });
      vehicleMarkerRef.current.setIcon(markerIcon);
    }
  }, [scriptLoaded, currentPlaybackIndex, activeRoute, routeASegments, routeBSegments, fullPolylineA, fullPolylineB]);

  // If No Key or Error
  if (!apiKey || loadError) {
    return (
      <div className="relative w-full h-full rounded-xl overflow-hidden border border-volt-border bg-[#0A0E17] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-full bg-[#00D2FF]/10 border border-[#00D2FF]/30">
          <Key className="w-8 h-8 text-[#00D2FF]" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-base font-bold text-white">Google Maps API Key Required</h3>
          <p className="text-xs text-slate-400">
            {loadError || 'Configure your Google Maps Platform API key to render interactive Google Maps with custom dark styles, route polylines, and terrain contours.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenKeyModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#00D2FF] text-[#0A0E17] hover:bg-[#00D2FF]/90 transition-all shadow-md"
          >
            <Key className="w-3.5 h-3.5" />
            Enter Google Maps API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-volt-border">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-[#0A0E17]/95 border border-volt-border rounded-lg p-2.5 text-[10px] space-y-1.5 backdrop-blur-sm z-10 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-500 rounded" />
          <span className="text-slate-300 font-medium">Route A — Standard Flat (Google Roadmap)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#00F5A0] rounded" />
          <span className="text-slate-300 font-medium">Route B — VoltPath Energy-Aware</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-[6px] rounded bg-[#00F5A0]/20 border border-[#00F5A0]/50" style={{ borderStyle: 'dashed' }} />
          <span className="text-slate-300 font-medium">Safe-Reach Contour (Dynamic Isochrone)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px]">⚡</span>
          <span className="text-slate-300 font-medium">Battery Swap Stations (Battery Smart / Sun Mobility)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-[12px]">⚠️</span>
          <span className="text-slate-300 font-medium">Simulated Stall Point (&lt;12% SoC / Overheating)</span>
        </div>
      </div>

      {/* Top Banner */}
      <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
        <div className="bg-[#0A0E17]/90 border border-volt-border rounded-lg px-2.5 py-1 text-[10px] text-slate-300 backdrop-blur-sm flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-pulse"></span>
          {corridorTitle ? `GOOGLE MAPS • ${corridorTitle.toUpperCase()}` : 'GOOGLE MAPS PLATFORM • LOGISTICS CORRIDOR'}
        </div>
      </div>
    </div>
  );
}
