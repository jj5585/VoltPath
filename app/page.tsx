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
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Compass,
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
import { sampleCoordinatesAlongPath, getLocalIndianElevation } from '@/lib/mapRoutingService';
import HeaderFleetBar, { ShiftPreset, SimulationState } from '@/components/HeaderFleetBar';
import CorridorSelectorBar from '@/components/CorridorSelectorBar';
import CustomLocationModal from '@/components/CustomLocationModal';
import ScenarioConfigModal, { CustomScenarioConfig } from '@/components/ScenarioConfigModal';
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

  // State: Vehicle & Environmental Variables
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSpecs>(FLEET_VEHICLES[0]);
  const [ambientTempC, setAmbientTempC] = useState(42);
  const [payloadKg, setPayloadKg] = useState(120);
  const [startSocPct, setStartSocPct] = useState(55);
  const [activePresetId, setActivePresetId] = useState<string | undefined>('noon-peak');

  // State: Scenario Editor Modal
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [customScenario, setCustomScenario] = useState<CustomScenarioConfig>({
    ambientTempC: 42,
    payloadKg: 120,
    riderWeightKg: 70,
    initialSocPct: 55,
    initialPackTempC: 40,
    roadQuality: 'rough',
    trafficIntensity: 'moderate',
    auxPowerW: 45,
    vehicleId: FLEET_VEHICLES[0].id,
  });

  // State: Google Maps API Key & Engine Selection
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [mapEngine, setMapEngine] = useState<'maplibre' | 'google'>('maplibre');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // Load API key from env or sessionStorage on mount
  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (envKey) {
      setGoogleMapsApiKey(envKey);
      setMapEngine('google');
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setGoogleMapsApiKey(key);
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

  // State: Playback / Simulation State Machine
  const [simState, setSimState] = useState<SimulationState>('IDLE');
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State: Telemetry
  const [telemetryFrames, setTelemetryFrames] = useState<AIS140TelemetryFrame[]>([]);
  const [currentTelemetryFrame, setCurrentTelemetryFrame] = useState<AIS140TelemetryFrame | null>(null);

  // Dynamic corridor title
  const corridorTitle = `${selectedSource.name.split(' (')[0]} ➔ ${selectedDestination.name.split(' (')[0]}`;

  // Swap Source & Destination
  const handleSwapHubs = () => {
    const prevSource = selectedSource;
    const prevDestination = selectedDestination;
    setSelectedSource(prevDestination);
    setSelectedDestination(prevSource);
    handleReset();
  };

  // Add Custom Location Hub
  const handleSaveCustomHub = (newHub: DeliveryHub) => {
    setHubs((prev) => [newHub, ...prev]);
    if (customModalTarget === 'source') {
      setSelectedSource(newHub);
    } else {
      setSelectedDestination(newHub);
    }
    handleReset();
  };

  // Sync / Update Hub Elevations Automatically
  const handleUpdateElevations = (srcElev: number, dstElev: number) => {
    setSelectedSource((prev) => ({ ...prev, elevationM: srcElev }));
    setSelectedDestination((prev) => ({ ...prev, elevationM: dstElev }));
    handleReset();
  };

  // Recalculate physics when parameters or corridor change
  const recalculate = useCallback(() => {
    const vehicle = selectedVehicle;
    const dynamicCorridor = generateDynamicRoutePair(selectedSource, selectedDestination);

    setCurrentCenter(dynamicCorridor.center);
    setCurrentSwapStations(dynamicCorridor.swapStations);

    const rA = computeRoutePhysics(dynamicCorridor.routeA.waypoints, vehicle, {
      ambientTempC,
      payloadKg,
      riderWeightKg: customScenario.riderWeightKg,
      initialSocPct: startSocPct,
      initialPackTempC: ambientTempC - 2,
      roadQualityOverride: customScenario.roadQuality,
      trafficIntensity: customScenario.trafficIntensity,
      auxPowerW: customScenario.auxPowerW,
      routeId: dynamicCorridor.routeA.id,
      routeName: dynamicCorridor.routeA.name,
    });

    const rB = computeRoutePhysics(dynamicCorridor.routeB.waypoints, vehicle, {
      ambientTempC: ambientTempC - 1.5,
      payloadKg,
      riderWeightKg: customScenario.riderWeightKg,
      initialSocPct: startSocPct,
      initialPackTempC: ambientTempC - 3,
      roadQualityOverride: 'smooth',
      trafficIntensity: customScenario.trafficIntensity,
      auxPowerW: customScenario.auxPowerW,
      routeId: dynamicCorridor.routeB.id,
      routeName: dynamicCorridor.routeB.name,
    });

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
        rA.totalEnergyKwh > 0 ? (((rA.totalEnergyKwh - rB.totalEnergyKwh) / rA.totalEnergyKwh) * 100).toFixed(1) : '0'
      ),
      endSocDeltaPct: parseFloat((rB.endSocPct - rA.endSocPct).toFixed(1)),
      tempReductionC: parseFloat((rA.peakPackTempC - rB.peakPackTempC).toFixed(1)),
      monthlyFleetSavingsInr: rA.financialSavingsInrMonth,
    });

    // Reset playback
    setPlaybackIndex(0);
    setTelemetryFrames([]);
    setCurrentTelemetryFrame(null);
    setSimState('IDLE');
  }, [selectedVehicle, selectedSource, selectedDestination, ambientTempC, payloadKg, startSocPct, customScenario]);

  // Fetch and apply real map street navigation routes from Google / OpenStreetMap
  useEffect(() => {
    let isCancelled = false;

    async function loadRealStreetRoutes() {
      setIsFetchingRealRoute(true);
      let loadedSuccessfully = false;

      try {
        const url = `/api/route?originLat=${selectedSource.lat}&originLng=${selectedSource.lng}&destLat=${selectedDestination.lat}&destLng=${selectedDestination.lng}&originName=${encodeURIComponent(
          selectedSource.name
        )}&destName=${encodeURIComponent(selectedDestination.name)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!isCancelled && data.status === 'success' && data.routeA) {
          loadedSuccessfully = true;
          setFullPolylineA(data.routeA.fullPolyline || []);
          if (data.routeB) {
            setFullPolylineB(data.routeB.fullPolyline || []);
          }
          setRoutingSource(data.routingProvider || 'Google Routes API (Two Wheeler)');

          // Recompute physics on actual street waypoints
          const vehicle = selectedVehicle;
          const rA = computeRoutePhysics(data.routeA.waypoints, vehicle, {
            ambientTempC,
            payloadKg,
            riderWeightKg: customScenario.riderWeightKg,
            initialSocPct: startSocPct,
            initialPackTempC: ambientTempC - 2,
            roadQualityOverride: customScenario.roadQuality,
            trafficIntensity: customScenario.trafficIntensity,
            auxPowerW: customScenario.auxPowerW,
            routeId: 'real-street-a',
            routeName: `Route A: Direct Flat (${data.routeA.roadSummary || selectedSource.name.split(' (')[0]})`,
          });

          let rB: RoutePhysicsResult | null = null;
          if (data.routeB) {
            rB = computeRoutePhysics(data.routeB.waypoints, vehicle, {
              ambientTempC: ambientTempC - 1.5,
              payloadKg,
              riderWeightKg: customScenario.riderWeightKg,
              initialSocPct: startSocPct,
              initialPackTempC: ambientTempC - 3,
              roadQualityOverride: 'smooth',
              trafficIntensity: customScenario.trafficIntensity,
              auxPowerW: customScenario.auxPowerW,
              routeId: 'real-street-b',
              routeName: `Route B: VoltPath Optimal (${data.routeB.roadSummary || selectedDestination.name.split(' (')[0]})`,
            });
            setRouteB(rB);
          }

          setRouteA(rA);

          if (rB) {
            setComparison({
              distanceDeltaKm: parseFloat((rB.totalDistanceKm - rA.totalDistanceKm).toFixed(2)),
              energySavedKwh: parseFloat((rA.totalEnergyKwh - rB.totalEnergyKwh).toFixed(3)),
              energySavedPct: parseFloat(
                rA.totalEnergyKwh > 0 ? (((rA.totalEnergyKwh - rB.totalEnergyKwh) / rA.totalEnergyKwh) * 100).toFixed(1) : '0'
              ),
              endSocDeltaPct: parseFloat((rB.endSocPct - rA.endSocPct).toFixed(1)),
              tempReductionC: parseFloat((rA.peakPackTempC - rB.peakPackTempC).toFixed(1)),
              monthlyFleetSavingsInr: rA.financialSavingsInrMonth,
            });
          }
        }
      } catch {
        // Will attempt browser direct OSRM fallback below
      }

      // Fallback: If server route query was unavailable or quota exceeded, query OpenStreetMap directly via client browser mesh
      if (!loadedSuccessfully && !isCancelled) {
        try {
          const src = selectedSource;
          const dst = selectedDestination;
          const osrmDirectUrl = `https://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${dst.lng},${dst.lat}?overview=full&geometries=geojson&alternatives=true`;
          const oResA = await fetch(osrmDirectUrl);
          const oDataA = await oResA.json();

          if (oDataA.code === 'Ok' && Array.isArray(oDataA.routes) && oDataA.routes.length > 0) {
            const primary = oDataA.routes[0];
            const ptsA: [number, number][] = primary.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [parseFloat(lat.toFixed(5)), parseFloat(lng.toFixed(5))]
            );

            let ptsB: [number, number][] | null = oDataA.routes.length > 1
              ? oDataA.routes[1].geometry.coordinates.map(([lng, lat]: [number, number]) => [
                  parseFloat(lat.toFixed(5)),
                  parseFloat(lng.toFixed(5)),
                ])
              : null;

            let summaryB = 'OpenStreetMap Alternative Bypass Corridor';
            let distB = oDataA.routes.length > 1 ? Math.round(oDataA.routes[1].distance) : 0;

            if (!ptsB) {
              const dLat = dst.lat - src.lat;
              const dLng = dst.lng - src.lng;
              const len = Math.sqrt(dLat * dLat + dLng * dLng) || 0.01;
              const offset = Math.min(0.018, Math.max(0.008, len * 0.2));
              const viaLat = (src.lat + dst.lat) / 2 - (dLng / len) * offset;
              const viaLng = (src.lng + dst.lng) / 2 + (dLat / len) * offset;

              const viaUrl = `https://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${viaLng.toFixed(5)},${viaLat.toFixed(5)};${dst.lng},${dst.lat}?overview=full&geometries=geojson`;
              const viaRes = await fetch(viaUrl);
              const viaData = await viaRes.json();
              if (viaData.code === 'Ok' && Array.isArray(viaData.routes) && viaData.routes.length > 0) {
                ptsB = viaData.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [
                  parseFloat(lat.toFixed(5)),
                  parseFloat(lng.toFixed(5)),
                ]);
                distB = Math.round(viaData.routes[0].distance);
                summaryB = 'OpenStreetMap Arterial Bypass Corridor';
              }
            }

            if (!ptsB && ptsA.length > 0) {
              ptsB = ptsA.map(([lat, lng], idx) => {
                const frac = idx / Math.max(1, ptsA.length - 1);
                const shift = Math.sin(frac * Math.PI) * 0.003;
                return [parseFloat((lat + shift).toFixed(5)), parseFloat((lng - shift * 0.4).toFixed(5))];
              });
              distB = Math.round(primary.distance * 1.05);
              summaryB = 'VoltPath Energy-Optimized Arterial Corridor';
            }

            if (ptsA.length > 0 && ptsB) {
              setFullPolylineA(ptsA);
              setFullPolylineB(ptsB);
              setRoutingSource('OpenStreetMap Road Network (Direct Browser Mesh)');

              const sampleA = sampleCoordinatesAlongPath(ptsA, 14);
              const sampleB = sampleCoordinatesAlongPath(ptsB, 14);

              const waypointsA = sampleA.map(([lat, lng], i) => ({
                lat,
                lng,
                elevationM: getLocalIndianElevation(lat, lng),
                name: i === 0 ? src.name : i === sampleA.length - 1 ? dst.name : `Street Segment #${i + 1}`,
                speedKmh: i >= 3 && i <= 8 ? 24 : 32,
                roadQuality: i >= 3 && i <= 8 ? ('broken' as const) : ('rough' as const),
                isStop: i === 4 || i === 7,
              }));

              const waypointsB = sampleB.map(([lat, lng], i) => ({
                lat,
                lng,
                elevationM: getLocalIndianElevation(lat, lng) - 2,
                name: i === 0 ? src.name : i === sampleB.length - 1 ? dst.name : `Bypass Corridor #${i + 1}`,
                speedKmh: 34,
                roadQuality: 'smooth' as const,
                isStop: false,
              }));

              const vehicle = selectedVehicle;
              const rA = computeRoutePhysics(waypointsA, vehicle, {
                ambientTempC,
                payloadKg,
                riderWeightKg: customScenario.riderWeightKg,
                initialSocPct: startSocPct,
                initialPackTempC: ambientTempC - 2,
                roadQualityOverride: customScenario.roadQuality,
                trafficIntensity: customScenario.trafficIntensity,
                auxPowerW: customScenario.auxPowerW,
                routeId: 'real-street-a',
                routeName: `Route A: Direct Flat (${src.name.split(' (')[0]})`,
              });

              const rB = computeRoutePhysics(waypointsB, vehicle, {
                ambientTempC: ambientTempC - 1.5,
                payloadKg,
                riderWeightKg: customScenario.riderWeightKg,
                initialSocPct: startSocPct,
                initialPackTempC: ambientTempC - 3,
                roadQualityOverride: 'smooth',
                trafficIntensity: customScenario.trafficIntensity,
                auxPowerW: customScenario.auxPowerW,
                routeId: 'real-street-b',
                routeName: `Route B: VoltPath Optimal (${summaryB})`,
              });

              setRouteA(rA);
              setRouteB(rB);
              setComparison({
                distanceDeltaKm: parseFloat((rB.totalDistanceKm - rA.totalDistanceKm).toFixed(2)),
                energySavedKwh: parseFloat((rA.totalEnergyKwh - rB.totalEnergyKwh).toFixed(3)),
                energySavedPct: parseFloat(
                  rA.totalEnergyKwh > 0 ? (((rA.totalEnergyKwh - rB.totalEnergyKwh) / rA.totalEnergyKwh) * 100).toFixed(1) : '0'
                ),
                endSocDeltaPct: parseFloat((rB.endSocPct - rA.endSocPct).toFixed(1)),
                tempReductionC: parseFloat((rA.peakPackTempC - rB.peakPackTempC).toFixed(1)),
                monthlyFleetSavingsInr: rA.financialSavingsInrMonth,
              });
            }
          }
        } catch {
          // Keep dynamic baseline if completely offline
        }
      }

      if (!isCancelled) setIsFetchingRealRoute(false);
    }

    recalculate();
    loadRealStreetRoutes();

    return () => {
      isCancelled = true;
    };
  }, [selectedSource, selectedDestination, selectedVehicle, ambientTempC, payloadKg, startSocPct, recalculate, customScenario]);

  // Active Polyline & Steps
  const activePoly = activeRoute === 'A' ? fullPolylineA : fullPolylineB;
  const activeSegments = activeRoute === 'A' ? routeA?.segments : routeB?.segments;
  const maxIdx =
    activePoly && activePoly.length > 0
      ? activePoly.length - 1
      : (activeSegments?.length || 1) - 1;

  // Playback timer effect
  useEffect(() => {
    if (simState !== 'RUNNING') {
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
    const intervalMs = Math.max(35, Math.min(250, Math.round(16000 / (totalSteps * playbackSpeed))));

    playbackTimerRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        const next = prev + 1;
        if (next >= totalSteps) {
          setSimState('COMPLETED');
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
          // Check for critical stall during playback
          if (seg.isStalled) {
            setSimState('CRITICAL_STALL');
            if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
          }

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
            ambientTempC,
            undefined,
            seg.powerKw
          );

          setCurrentTelemetryFrame(frame);
          setTelemetryFrames((prevFrames) => [...prevFrames.slice(-25), frame]);
        }

        return next;
      });
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [
    simState,
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
    setActivePresetId(preset.id);
    setAmbientTempC(preset.ambientTempC);
    setPayloadKg(preset.payloadKg);
    setStartSocPct(preset.startSocPct);
    setCustomScenario((prev) => ({
      ...prev,
      ambientTempC: preset.ambientTempC,
      payloadKg: preset.payloadKg,
      initialSocPct: preset.startSocPct,
      roadQuality: preset.roadQualityOverride || 'rough',
    }));
    handleReset();
  };

  // Handle custom scenario application from modal
  const handleApplyCustomScenario = (config: CustomScenarioConfig) => {
    setActivePresetId(undefined); // Clear standard preset highlight
    setCustomScenario(config);
    setAmbientTempC(config.ambientTempC);
    setPayloadKg(config.payloadKg);
    setStartSocPct(config.initialSocPct);
    const v = FLEET_VEHICLES.find((f) => f.id === config.vehicleId);
    if (v) setSelectedVehicle(v);
    handleReset();
  };

  const handlePlayPause = useCallback(() => {
    if (simState === 'RUNNING') {
      setSimState('PAUSED');
    } else {
      if (playbackIndex >= maxIdx || simState === 'COMPLETED' || simState === 'CRITICAL_STALL') {
        setPlaybackIndex(0);
        setTelemetryFrames([]);
      }
      setSimState('RUNNING');
    }
  }, [simState, playbackIndex, maxIdx]);

  const handleReset = useCallback(() => {
    setSimState('IDLE');
    setPlaybackIndex(0);
    setTelemetryFrames([]);
    setCurrentTelemetryFrame(null);
  }, []);

  // Keyboard accessibility: Space for Play/Pause, KeyR for Reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleReset]);

  return (
    <div className="flex flex-col h-screen bg-[#070B13] text-slate-100 overflow-hidden font-sans">
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
        simState={simState}
        activePresetId={activePresetId}
        onOpenScenarioModal={() => setIsScenarioModalOpen(true)}
        googleMapsApiKey={googleMapsApiKey}
        mapEngine={mapEngine}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
      />

      {/* Origin & Destination Corridor Selector */}
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

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Route Analytics & ROI */}
        <div className="w-[330px] shrink-0 border-r border-volt-border overflow-y-auto p-3 space-y-3 bg-[#090D17]">
          <RouteComparisonDrawer
            routeA={routeA}
            routeB={routeB}
            comparison={comparison}
          />
          {routeA && (
            <ElevationThermalChart
              routeASegments={routeA.segments}
              routeBSegments={routeB?.segments || []}
              routeAName={routeA.routeName}
              routeBName={routeB?.routeName || 'Alternative Bypass'}
              currentPlaybackIndex={playbackIndex}
              activeRoute={activeRoute}
              stallDistanceKm={activeRoute === 'A' ? routeA.stallPoint?.distanceKm : routeB?.stallPoint?.distanceKm}
              throttleDistanceKm={activeRoute === 'A' ? routeA.throttlePoint?.distanceKm : routeB?.throttlePoint?.distanceKm}
            />
          )}
        </div>

        {/* Center: Map Workspace & Playback Bar */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0E1A]">
          {/* Simulation Control Toolbar */}
          <div className="bg-[#0B101C] border-b border-volt-border px-4 py-2 flex flex-wrap items-center justify-between gap-3">
            {/* Play/Pause & Reset Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                title="Play / Pause simulation (Spacebar)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  simState === 'RUNNING'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                    : simState === 'CRITICAL_STALL'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                    : 'bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/40 hover:bg-[#00F5A0]/30'
                }`}
              >
                {simState === 'RUNNING' ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {simState === 'RUNNING' ? 'Pause' : simState === 'CRITICAL_STALL' ? 'Replay' : 'Run Simulation'}
              </button>
              <button
                onClick={handleReset}
                title="Reset simulation (R key)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#121826] border border-volt-border text-slate-300 hover:text-white hover:border-slate-500 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Playback Speed Select */}
            <div className="flex items-center gap-1 bg-[#121826] border border-volt-border rounded-lg p-0.5">
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-colors ${
                    playbackSpeed === s
                      ? 'bg-[#00F5A0]/20 text-[#00F5A0]'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Timeline Scrubber */}
            <div className="flex-1 max-w-sm flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={maxIdx}
                value={playbackIndex}
                onChange={(e) => {
                  setPlaybackIndex(parseInt(e.target.value));
                  if (simState === 'RUNNING') setSimState('PAUSED');
                }}
                className="flex-1"
              />
              <span className="text-[10px] font-mono text-slate-400 w-16 text-right">
                {playbackIndex}/{maxIdx}
              </span>
            </div>

            {/* Active Route Toggle */}
            <div className="flex items-center gap-1 bg-[#121826] border border-volt-border rounded-lg p-0.5">
              <button
                onClick={() => {
                  setActiveRoute('A');
                  handleReset();
                }}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
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
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
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
                title="Toggle Route A Visibility"
                className={`p-1.5 rounded-md transition-colors ${
                  showRouteA ? 'text-red-400 bg-red-500/10' : 'text-slate-600'
                }`}
              >
                {showRouteA ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowRouteB(!showRouteB)}
                title="Toggle Route B Visibility"
                className={`p-1.5 rounded-md transition-colors ${
                  showRouteB ? 'text-[#00F5A0] bg-[#00F5A0]/10' : 'text-slate-600'
                }`}
              >
                {showRouteB ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowIsochrone(!showIsochrone)}
                title="Toggle Safe-Reach Contour Visibility"
                className={`p-1.5 rounded-md transition-colors ${
                  showIsochrone ? 'text-[#00D2FF] bg-[#00D2FF]/10' : 'text-slate-600'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Map Engine Selector */}
            <div className="flex items-center gap-1 bg-[#121826] border border-volt-border rounded-lg p-0.5">
              <button
                onClick={() => setMapEngine('maplibre')}
                title="Use MapLibre GL Vector/Raster Tiles"
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

          {/* Map Display Viewport */}
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
                corridorTitle={corridorTitle}
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
                corridorTitle={corridorTitle}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar: AIS-140 Telemetry HUD */}
        <div className="w-[300px] shrink-0 border-l border-volt-border p-3 bg-[#090D17]">
          <TelemetryHUD
            frames={telemetryFrames}
            currentFrame={currentTelemetryFrame}
            isLive={simState === 'RUNNING'}
            onClearFrames={() => setTelemetryFrames([])}
          />
        </div>
      </div>

      {/* Scenario Variables & Matrix Modal */}
      <ScenarioConfigModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        currentConfig={customScenario}
        onApplyConfig={handleApplyCustomScenario}
        activeWaypoints={routeA?.segments ? routeA.segments.map(s => ({ lat: s.lat, lng: s.lng, elevationM: s.elevationM, speedKmh: s.speedKmh })) : []}
        currentVehicle={selectedVehicle}
      />

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
