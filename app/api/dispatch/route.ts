import { NextRequest, NextResponse } from 'next/server';
import {
  FLEET_VEHICLES,
  computeRoutePhysics,
  generateSafeReachPolygon,
} from '@/lib/physicsEngine';
import {
  DELIVERY_HUBS,
  generateDynamicRoutePair,
  DELIVERY_CORRIDORS,
} from '@/lib/geospatialData';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const vehicleId = searchParams.get('vehicleId') || 'ather-450x';
  const ambientTempC = Math.max(10, Math.min(55, parseFloat(searchParams.get('ambientTempC') || '42')));
  const payloadKg = Math.max(0, Math.min(150, parseFloat(searchParams.get('payloadKg') || '120')));
  const startSocPct = Math.max(15, Math.min(100, parseFloat(searchParams.get('startSocPct') || '55')));
  const sourceId = searchParams.get('sourceId');
  const destinationId = searchParams.get('destinationId');

  const vehicle = FLEET_VEHICLES.find((v) => v.id === vehicleId) || FLEET_VEHICLES[0];

  let corridor;
  if (sourceId && destinationId) {
    const src = DELIVERY_HUBS.find((h) => h.id === sourceId) || DELIVERY_HUBS[0];
    const dst = DELIVERY_HUBS.find((h) => h.id === destinationId) || DELIVERY_HUBS[5];
    const dynamicPair = generateDynamicRoutePair(src, dst);
    corridor = {
      id: `${src.id}-to-${dst.id}`,
      regionName: `${src.city === 'bengaluru' ? 'Bengaluru' : src.city === 'delhi_ncr' ? 'Delhi NCR' : 'Mumbai'} Urban Corridor`,
      hubName: src.name,
      destinationName: dst.name,
      defaultAmbientTempC: ambientTempC,
      ...dynamicPair,
    };
  } else {
    corridor = DELIVERY_CORRIDORS.bengaluru;
  }

  // Calculate Route A (Standard Direct Route)
  const routeAResult = computeRoutePhysics(corridor.routeA.waypoints, vehicle, {
    ambientTempC,
    payloadKg,
    riderWeightKg: 70,
    initialSocPct: startSocPct,
    initialPackTempC: ambientTempC - 2,
    routeId: corridor.routeA.id,
    routeName: corridor.routeA.name,
  });

  // Calculate Route B (VoltPath Energy-Aware Route)
  const routeBResult = computeRoutePhysics(corridor.routeB.waypoints, vehicle, {
    ambientTempC: ambientTempC - 1.5,
    payloadKg,
    riderWeightKg: 70,
    initialSocPct: startSocPct,
    initialPackTempC: ambientTempC - 3,
    routeId: corridor.routeB.id,
    routeName: corridor.routeB.name,
  });

  // Calculate Safe-Reach Polygon centered on origin
  const origin = corridor.routeA.waypoints[0];
  const safeReachPolygon = generateSafeReachPolygon(
    origin.lat,
    origin.lng,
    vehicle,
    startSocPct,
    ambientTempC,
    payloadKg
  );

  return NextResponse.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    corridor,
    vehicle,
    ambientTempC,
    payloadKg,
    startSocPct,
    routeA: {
      ...corridor.routeA,
      physics: routeAResult,
    },
    routeB: {
      ...corridor.routeB,
      physics: routeBResult,
    },
    safeReachPolygon,
    swapStations: corridor.swapStations,
    comparison: {
      distanceDeltaKm: parseFloat((routeBResult.totalDistanceKm - routeAResult.totalDistanceKm).toFixed(2)),
      energySavedKwh: parseFloat((routeAResult.totalEnergyKwh - routeBResult.totalEnergyKwh).toFixed(3)),
      energySavedPct: parseFloat(
        routeAResult.totalEnergyKwh > 0
          ? (((routeAResult.totalEnergyKwh - routeBResult.totalEnergyKwh) / routeAResult.totalEnergyKwh) * 100).toFixed(1)
          : '0'
      ),
      endSocDeltaPct: parseFloat((routeBResult.endSocPct - routeAResult.endSocPct).toFixed(1)),
      tempReductionC: parseFloat((routeAResult.peakPackTempC - routeBResult.peakPackTempC).toFixed(1)),
      monthlyFleetSavingsInr: Math.max(0, routeAResult.operatingCostEstimate.monthlyPerVehicleInr - routeBResult.operatingCostEstimate.monthlyPerVehicleInr),
      routeScoreA: routeAResult.routeScore,
      routeScoreB: routeBResult.routeScore,
    },
  });
}
