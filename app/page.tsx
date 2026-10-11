'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
  Map as MapIcon,
  Key,
  Globe,
} from 'lucide-react';
import {
  FLEET_VEHICLES,
  VehicleSpecs,
  computeRoutePhysics,
  generateSafeReachPolygon,
  RoutePhysicsResult,
} from '@/lib/physicsEngine';
import {
  DELIVERY_HUBS,
  DeliveryHub,
  generateDynamicRoutePair,
  SwapStation,
} from '@/lib/geospatialData';
import { synthesizeAIS140Frame, AIS140TelemetryFrame } from '@/lib/ais140Generator';
import HeaderFleetBar, { ShiftPreset } from '@/components/HeaderFleetBar';
import CorridorSelectorBar from '@/components/CorridorSelectorBar';
import CustomLocationModal from '@/components/CustomLocationModal';
import MapDeck from '@/components/MapDeck';
import GoogleMapDeck from '@/components/GoogleMapDeck';
import ApiKeyModal from '@/components/ApiKeyModal';
import RouteComparisonDrawer from '@/components/RouteComparisonDrawer';
import TelemetryHUD from '@/components/TelemetryHUD';
import ElevationThermalChart from '@/components/ElevationThermalChart';

export default function VoltPathDashboard() {
  // State: Source & Destination Hubs
  const [hubs, setHubs] = useState<DeliveryHub[]>(DELIVERY_HUBS);
  const [selectedSource, setSelectedSource] = useState<DeliveryHub>(DELIVERY_HUBS[0]);
  const [selectedDestination, setSelectedDestination] = useState<DeliveryHub>(DELIVERY_HUBS[5]);
  const [customModalTarget, setCustomModalTarget] = useState<'source' | 'destination' | null>(null);

  // State: Controls
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSpecs>(FLEET_VEHICLES[0]);
  const [ambientTempC, setAmbientTempC] = useState(42);
  const [payloadKg, setPayloadKg] = useState(120);
  const [startSocPct, setStartSocPct] = useState(55);

  // State: Google Maps API Key & Engine Selection
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [mapEngine, setMapEngine] = useState<'maplibre' | 'google'>('maplibre');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // Load API key from env or localStorage on mount
  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('voltpath_google_maps_key') || '' : '';
    const activeKey = storedKey || envKey;
    if (activeKey) {
      setGoogleMapsApiKey(activeKey);
      setMapEngine('google');
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setGoogleMapsApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('voltpath_google_maps_key', key);
    }
    if (key) {
      setMapEngine('google');
    }
  };

  // State: Corridor Data & Route Physics
  const [currentCenter, setCurrentCenter] = useState({ lat: 12.9485, lng: 77.658, zoom: 13 });
  const [currentSwapStations, setCurrentSwapStations] = useState<SwapStation[]>([]);
  const [routeA, setRouteA] = useState<RoutePhysicsResult | null>(null);
  const [routeB, setRouteB] = useState<RoutePhysicsResult | null>(null);
  const [safeReachPolygon, setSafeReachPolygon] = useState<[number, number][]>([]);
  const [comparison, setComparison] = useState<any>(null);

  // State: Real Map Road Polylines & Provider
  const [fullPolylineA, setFullPolylineA] = useState<[number, number][]>([]);
  const [fullPolylineB, setFullPolylineB] = useState<[number, number][]>([]);
  const [routingSource, setRoutingSource] = useState<string | null>(null);
  const [isFetchingRealRoute, setIsFetchingRealRoute] = useState(false);

  // State: Map Display
  const [showRouteA, setShowRouteA] = useState(true);
  const [showRouteB, setShowRouteB] = useState(true);
  const [showIsochrone, setShowIsochrone] = useState(true);
  const [activeRoute, setActiveRoute] = useState<'A' | 'B'>('A');

  // State: Playback / Simulation
  const [isSimulating, setIsSimulating] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State: Telemetry
  const [telemetryFrames, setTelemetryFrames] = useState<AIS140TelemetryFrame[]>([]);
  const [currentTelemetryFrame, setCurrentTelemetryFrame] = useState<AIS140TelemetryFrame | null>(null);

  // Swap Source & Destination
  const handleSwapHubs = () => {
    const prevSource = selectedSource;
    const prevDestination = selectedDestination;
    setSelectedSource(prevDestination);
    setSelectedDestination(prevSource);
    setIsSimulating(false);
  };

  // Add Custom Location Hub
  const handleSaveCustomHub = (newHub: DeliveryHub) => {
    setHubs((prev) => [newHub, ...prev]);
    if (customModalTarget === 'source') {
      setSelectedSource(newHub);
    } else {
      setSelectedDestination(newHub);
    }
    setIsSimulating(false);
  };

  // Sync / Update Hub Elevations Automatically
  const handleUpdateElevations = (srcElev: number, dstElev: number) => {
    setSelectedSource((prev) => ({ ...prev, elevationM: srcElev }));
    setSelectedDestination((prev) => ({ ...prev, elevationM: dstElev }));
    setIsSimulating(false);
  };

  // Recalculate physics when parameters or corridor change
  const recalculate = useCallback(() => {
    const vehicle = selectedVehicle;
    const dynamicCorridor = generateDynamicRoutePair(selectedSource, selectedDestination);

    setCurrentCenter(dynamicCorridor.center);
    setCurrentSwapStations(dynamicCorridor.swapStations);

    const rA = computeRoutePhysics(
      dynamicCorridor.routeA.waypoints,
      vehicle,
      ambientTempC,
      payloadKg,
      70,
      startSocPct,
      ambientTempC - 2,
      dynamicCorridor.routeA.id,
      dynamicCorridor.routeA.name
    );

    const rB = computeRoutePhysics(
      dynamicCorridor.routeB.waypoints,
      vehicle,
      ambientTempC - 1.5,
      payloadKg,
      70,
      startSocPct,
      ambientTempC - 3,
      dynamicCorridor.routeB.id,
      dynamicCorridor.routeB.name
    );

    setRouteA(rA);
    setRouteB(rB);

    const poly = generateSafeReachPolygon(
      selectedSource.lat,
      selectedSource.lng,
      vehicle,
      startSocPct,
      ambientTempC,
      payloadKg
    );
    setSafeReachPolygon(poly);

    setComparison({
      distanceDeltaKm: parseFloat((rB.totalDistanceKm - rA.totalDistanceKm).toFixed(2)),
      energySavedKwh: parseFloat((rA.totalEnergyKwh - rB.totalEnergyKwh).toFixed(3)),
      energySavedPct: parseFloat(
        (((rA.totalEnergyKwh - rB.totalEnergyKwh) / rA.totalEnergyKwh) * 100).toFixed(1)
      ),
      endSocDeltaPct: parseFloat((rB.endSocPct - rA.endSocPct).toFixed(1)),
      tempReductionC: parseFloat((rA.peakPackTempC - rB.peakPackTempC).toFixed(1)),
      monthlyFleetSavingsInr: rA.financialSavingsInrMonth,
    });

    // Reset playback
    setPlaybackIndex(0);
    setTelemetryFrames([]);
    setCurrentTelemetryFrame(null);
  }, [selectedVehicle, selectedSource, selectedDestination, ambientTempC, payloadKg, startSocPct]);

  // Fetch and apply real map street navigation routes from Google / OpenStreetMap
  useEffect(() => {
    let isCancelled = false;

    async function loadRealStreetRoutes() {
      setIsFetchingRealRoute(true);
      try {
        const url = `/api/route?originLat=${selectedSource.lat}&originLng=${selectedSource.lng}&destLat=${selectedDestination.lat}&destLng=${selectedDestination.lng}&originName=${encodeURIComponent(
          selectedSource.name
        )}&destName=${encodeURIComponent(selectedDestination.name)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!isCancelled && data.status === 'success' && data.routeA && data.routeB) {
          setFullPolylineA(data.routeA.fullPolyline || []);
          setFullPolylineB(data.routeB.fullPolyline || []);
          setRoutingSource(data.routingProvider || 'Google Routes API (Two Wheeler)');

          // Recompute physics on actual street waypoints
          const vehicle = selectedVehicle;
          const rA = computeRoutePhysics(
            data.routeA.waypoints,
            vehicle,
            ambientTempC,
            payloadKg,
            70,
            startSocPct,
            ambientTempC - 2,
            'real-street-a',
            `Route A: Direct Flat (${data.routeA.roadSummary || selectedSource.name.split(' (')[0]})`
          );

          const rB = computeRoutePhysics(
            data.routeB.waypoints,
            vehicle,
            ambientTempC - 1.5,
            payloadKg,
            70,
            startSocPct,
            ambientTempC - 3,
            'real-street-b',
            `Route B: VoltPath Optimal (${data.routeB.roadSummary || selectedDestination.name.split(' (')[0]})`
          );

          setRouteA(rA);
          setRouteB(rB);

          setComparison({
            distanceDeltaKm: parseFloat((rB.totalDistanceKm - rA.totalDistanceKm).toFixed(2)),
            energySavedKwh: parseFloat((rA.totalEnergyKwh - rB.totalEnergyKwh).toFixed(3)),
            energySavedPct: parseFloat(
              (((rA.totalEnergyKwh - rB.totalEnergyKwh) / rA.totalEnergyKwh) * 100).toFixed(1)
            ),
            endSocDeltaPct: parseFloat((rB.endSocPct - rA.endSocPct).toFixed(1)),
            tempReductionC: parseFloat((rA.peakPackTempC - rB.peakPackTempC).toFixed(1)),
            monthlyFleetSavingsInr: rA.financialSavingsInrMonth,
          });
        }
      } catch {
        // Fallback to baseline dynamic corridor
      } finally {
        if (!isCancelled) setIsFetchingRealRoute(false);
      }
    }

    recalculate();
    loadRealStreetRoutes();

    return () => {
      isCancelled = true;
    };
  }, [selectedSource, selectedDestination, selectedVehicle, ambientTempC, payloadKg, startSocPct, recalculate]);

  // Active Polyline & Steps
  const activePoly = activeRoute === 'A' ? fullPolylineA : fullPolylineB;
  const activeSegments = activeRoute === 'A' ? routeA?.segments : routeB?.segments;
  const maxIdx =
    activePoly && activePoly.length > 0
      ? activePoly.length - 1
      : (activeSegments?.length || 1) - 1;

  // Playback timer
  useEffect(() => {
    if (!isSimulating) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const currentPoly = activeRoute === 'A' ? fullPolylineA : fullPolylineB;
    const currentSegments = activeRoute === 'A' ? routeA?.segments : routeB?.segments;
    const totalSteps =
      currentPoly && currentPoly.length > 0
        ? currentPoly.length
        : (currentSegments?.length || 0);

    if (totalSteps === 0 || !currentSegments || currentSegments.length === 0) return;

    // Smooth playback interval based on total steps and multiplier
    const intervalMs = Math.max(35, Math.min(300, Math.round(18000 / (totalSteps * playbackSpeed))));

    playbackTimerRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        const next = prev + 1;
        if (next >= totalSteps) {
          setIsSimulating(false);
          return prev;
        }

        let lat = currentSegments[0].lat;
        let lng = currentSegments[0].lng;
        let heading = 0;

        const progress = next / Math.max(1, totalSteps - 1);
        const segIdx = Math.min(currentSegments.length - 1, Math.round(progress * (currentSegments.length - 1)));
        const seg = currentSegments[segIdx];

        if (currentPoly && currentPoly.length > 0) {
          const polyIdx = Math.min(currentPoly.length - 1, next);
          lat = currentPoly[polyIdx][0];
          lng = currentPoly[polyIdx][1];

          if (polyIdx > 0) {
            const prevPt = currentPoly[polyIdx - 1];
            heading = (Math.atan2(lng - prevPt[1], lat - prevPt[0]) * (180 / Math.PI) + 360) % 360;
          }
        } else if (seg) {
          lat = seg.lat;
          lng = seg.lng;
          const prevSeg = currentSegments[Math.max(0, segIdx - 1)];
          heading = (Math.atan2(seg.lng - prevSeg.lng, seg.lat - prevSeg.lat) * (180 / Math.PI) + 360) % 360;
        }

        if (seg) {
          const frame = synthesizeAIS140Frame(
            selectedVehicle.name.split(' - ')[0] || 'KA 03 JX 6804',
            selectedVehicle.id,
            lat,
            lng,
            seg.elevationM,
            seg.speedKmh,
            heading,
            seg.socPct,
            seg.packTempC,
            payloadKg,
            ambientTempC
          );

          setCurrentTelemetryFrame(frame);
          setTelemetryFrames((prevFrames) => [...prevFrames.slice(-20), frame]);
        }

        return next;
      });
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [
    isSimulating,
    playbackSpeed,
    activeRoute,
    routeA,
    routeB,
    fullPolylineA,
    fullPolylineB,
    selectedVehicle,
    payloadKg,
    ambientTempC,
  ]);

  // Handle preset selection
  const handlePresetSelect = (preset: ShiftPreset) => {
    setAmbientTempC(preset.ambientTempC);
    setPayloadKg(preset.payloadKg);
    setStartSocPct(preset.startSocPct);
    setIsSimulating(false);
  };

  const handlePlayPause = () => {
    if (!isSimulating) {
      if (playbackIndex >= maxIdx) {
        setPlaybackIndex(0);
        setTelemetryFrames([]);
      }
    }
    setIsSimulating(!isSimulating);
  };

  const handleReset = () => {
    setIsSimulating(false);
    setPlaybackIndex(0);
    setTelemetryFrames([]);
    setCurrentTelemetryFrame(null);
  };

  return (
    <div className="flex flex-col h-screen bg-volt-dark overflow-hidden">
      {/* Header Fleet Bar */}
      <HeaderFleetBar
        selectedVehicle={selectedVehicle}
        onVehicleChange={setSelectedVehicle}
        ambientTempC={ambientTempC}
        onAmbientTempChange={setAmbientTempC}
        payloadKg={payloadKg}
        onPayloadChange={setPayloadKg}
        startSocPct={startSocPct}
        onStartSocChange={setStartSocPct}
        onPresetSelect={handlePresetSelect}
        isSimulating={isSimulating}
        googleMapsApiKey={googleMapsApiKey}
        mapEngine={mapEngine}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
      />

      {/* Origin & Destination Corridor Bar */}
      <CorridorSelectorBar
        hubs={hubs}
        selectedSource={selectedSource}
        selectedDestination={selectedDestination}
        onSelectSource={setSelectedSource}
        onSelectDestination={setSelectedDestination}
        onSwapHubs={handleSwapHubs}
        onOpenCustomModal={(t) => setCustomModalTarget(t)}
        onUpdateElevations={handleUpdateElevations}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Route Comparison + Charts */}
        <div className="w-[340px] shrink-0 border-r border-volt-border overflow-y-auto p-3 space-y-3">
          <RouteComparisonDrawer
            routeA={routeA}
            routeB={routeB}
            comparison={comparison}
          />
          {routeA && routeB && (
            <ElevationThermalChart
              routeASegments={routeA.segments}
              routeBSegments={routeB.segments}
              routeAName={routeA.routeName}
              routeBName={routeB.routeName}
            />
          )}
        </div>

        {/* Center: Map + Playback Controls */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Playback Controls Bar */}
          <div className="bg-[#0D1117] border-b border-volt-border px-4 py-2 flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSimulating
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'bg-[#00F5A0]/15 text-[#00F5A0] border border-[#00F5A0]/30 hover:bg-[#00F5A0]/25'
              }`}
            >
              {isSimulating ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {isSimulating ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-volt-card border border-volt-border text-slate-300 hover:border-slate-500 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            {/* Speed Toggle */}
            <div className="flex items-center gap-1 bg-volt-card border border-volt-border rounded-lg overflow-hidden">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-1 text-[10px] font-mono font-bold transition-colors ${
                    playbackSpeed === s
                      ? 'bg-[#00F5A0]/20 text-[#00F5A0]'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Scrub Slider */}
            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={maxIdx}
                value={playbackIndex}
                onChange={(e) => {
                  setPlaybackIndex(parseInt(e.target.value));
                  setIsSimulating(false);
                }}
                className="flex-1"
              />
              <span className="text-[10px] font-mono text-slate-400 w-16 text-right">
                Step {playbackIndex}/{maxIdx}
              </span>
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-volt-border" />

            {/* Active Route Selector */}
            <div className="flex items-center gap-1 bg-volt-card border border-volt-border rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  setActiveRoute('A');
                  handleReset();
                }}
                className={`px-2.5 py-1 text-[10px] font-bold transition-colors ${
                  activeRoute === 'A'
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Route A
              </button>
              <button
                onClick={() => {
                  setActiveRoute('B');
                  handleReset();
                }}
                className={`px-2.5 py-1 text-[10px] font-bold transition-colors ${
                  activeRoute === 'B'
                    ? 'bg-[#00F5A0]/20 text-[#00F5A0]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Route B
              </button>
            </div>

            {/* Layer Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowRouteA(!showRouteA)}
                title="Toggle Route A"
                className={`p-1.5 rounded-md transition-colors ${
                  showRouteA ? 'text-red-400 bg-red-500/10' : 'text-slate-600'
                }`}
              >
                {showRouteA ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowRouteB(!showRouteB)}
                title="Toggle Route B"
                className={`p-1.5 rounded-md transition-colors ${
                  showRouteB ? 'text-[#00F5A0] bg-[#00F5A0]/10' : 'text-slate-600'
                }`}
              >
                {showRouteB ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowIsochrone(!showIsochrone)}
                title="Toggle Safe-Reach Isochrone"
                className={`p-1.5 rounded-md transition-colors ${
                  showIsochrone ? 'text-[#00D2FF] bg-[#00D2FF]/10' : 'text-slate-600'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Real Street Routing Status Badge */}
            {routingSource && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse" />
                <span className="truncate max-w-[200px]">{routingSource}</span>
              </div>
            )}

            {/* Separator */}
            <div className="w-px h-6 bg-volt-border" />

            {/* Map Engine Selector */}
            <div className="flex items-center gap-1 bg-volt-card border border-volt-border rounded-lg p-0.5">
              <button
                onClick={() => setMapEngine('maplibre')}
                title="Use MapLibre GL Open Vector/Raster Tiles"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  mapEngine === 'maplibre'
                    ? 'bg-[#00F5A0]/20 text-[#00F5A0]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3 h-3" />
                MapLibre
              </button>
              <button
                onClick={() => {
                  setMapEngine('google');
                  if (!googleMapsApiKey) {
                    setIsKeyModalOpen(true);
                  }
                }}
                title="Use Google Maps JavaScript Platform"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  mapEngine === 'google'
                    ? 'bg-[#00D2FF]/20 text-[#00D2FF]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-3 h-3" />
                Google Maps
              </button>
            </div>
          </div>

          {/* Map View */}
          <div className="flex-1 relative">
            {mapEngine === 'google' ? (
              <GoogleMapDeck
                apiKey={googleMapsApiKey}
                center={currentCenter}
                routeASegments={routeA?.segments || []}
                routeBSegments={routeB?.segments || []}
                safeReachPolygon={safeReachPolygon}
                swapStations={currentSwapStations}
                stallPoint={routeA?.stallPoint || null}
                throttlePoint={routeA?.throttlePoint || null}
                currentPlaybackIndex={playbackIndex}
                activeRoute={activeRoute}
                showRouteA={showRouteA}
                showRouteB={showRouteB}
                showIsochrone={showIsochrone}
                fullPolylineA={fullPolylineA}
                fullPolylineB={fullPolylineB}
                onOpenKeyModal={() => setIsKeyModalOpen(true)}
              />
            ) : (
              <MapDeck
                center={currentCenter}
                routeASegments={routeA?.segments || []}
                routeBSegments={routeB?.segments || []}
                safeReachPolygon={safeReachPolygon}
                swapStations={currentSwapStations}
                stallPoint={routeA?.stallPoint || null}
                throttlePoint={routeA?.throttlePoint || null}
                currentPlaybackIndex={playbackIndex}
                activeRoute={activeRoute}
                showRouteA={showRouteA}
                showRouteB={showRouteB}
                showIsochrone={showIsochrone}
                fullPolylineA={fullPolylineA}
                fullPolylineB={fullPolylineB}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar: Telemetry HUD */}
        <div className="w-[310px] shrink-0 border-l border-volt-border p-3">
          <TelemetryHUD
            frames={telemetryFrames}
            currentFrame={currentTelemetryFrame}
            isLive={isSimulating}
          />
        </div>
      </div>

      {/* Google Maps API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        currentKey={googleMapsApiKey}
        onSaveKey={handleSaveApiKey}
        mapEngine={mapEngine}
        onToggleEngine={setMapEngine}
      />

      {/* Custom Hub Location Modal */}
      <CustomLocationModal
        isOpen={customModalTarget !== null}
        onClose={() => setCustomModalTarget(null)}
        targetType={customModalTarget || 'source'}
        onSaveCustomHub={handleSaveCustomHub}
      />
    </div>
  );
}
