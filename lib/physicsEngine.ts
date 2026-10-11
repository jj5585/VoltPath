/**
 * VoltPath Physics Engine
 * Physics-informed tractive force, terrain gradient, and Arrhenius thermal cell efficiency models
 * for commercial 2W EV delivery fleets in India.
 */

export interface VehicleSpecs {
  id: string;
  name: string;
  brand: string;
  curbWeightKg: number;       // e.g. 90 kg
  batteryCapacityKwh: number; // e.g. 3.4 kWh
  nominalVoltageV: number;    // e.g. 51.1 V
  frontalAreaM2: number;      // e.g. 0.6 m^2 (scooter + rider + rear cargo delivery bag)
  dragCoefficientCd: number;  // e.g. 0.85 (upright rider with large cargo box)
  motorEfficiency: number;    // e.g. 0.86
  regenEfficiency: number;    // e.g. 0.65
  maxPackTempC: number;       // e.g. 55 °C
  thermalThrottlingTempC: number; // e.g. 45 °C
}

export const FLEET_VEHICLES: VehicleSpecs[] = [
  {
    id: 'ather-450x',
    name: 'KA 03 JX 6804 - Ather 450X Commercial',
    brand: 'Ather Energy',
    curbWeightKg: 108,
    batteryCapacityKwh: 3.7,
    nominalVoltageV: 51.1,
    frontalAreaM2: 0.62,
    dragCoefficientCd: 0.82,
    motorEfficiency: 0.88,
    regenEfficiency: 0.68,
    maxPackTempC: 55,
    thermalThrottlingTempC: 45,
  },
  {
    id: 'hero-nyx',
    name: 'DL 01 EV 4912 - Hero Electric NYX Cargo',
    brand: 'Hero Electric',
    curbWeightKg: 87,
    batteryCapacityKwh: 3.0,
    nominalVoltageV: 48.0,
    frontalAreaM2: 0.65,
    dragCoefficientCd: 0.88,
    motorEfficiency: 0.82,
    regenEfficiency: 0.55,
    maxPackTempC: 52,
    thermalThrottlingTempC: 44,
  },
  {
    id: 'ola-s1-pro',
    name: 'MH 12 QX 9931 - Ola S1 Pro Gen2 Delivery',
    brand: 'Ola Electric',
    curbWeightKg: 116,
    batteryCapacityKwh: 4.0,
    nominalVoltageV: 51.8,
    frontalAreaM2: 0.64,
    dragCoefficientCd: 0.80,
    motorEfficiency: 0.89,
    regenEfficiency: 0.70,
    maxPackTempC: 54,
    thermalThrottlingTempC: 45,
  },
  {
    id: 'tvs-iqube',
    name: 'KA 05 MN 3021 - TVS iQube ST Fleet',
    brand: 'TVS Motor',
    curbWeightKg: 118,
    batteryCapacityKwh: 3.4,
    nominalVoltageV: 52.0,
    frontalAreaM2: 0.63,
    dragCoefficientCd: 0.83,
    motorEfficiency: 0.87,
    regenEfficiency: 0.64,
    maxPackTempC: 53,
    thermalThrottlingTempC: 45,
  },
];

export interface RouteWaypoint {
  lat: number;
  lng: number;
  elevationM: number;       // altitude in meters
  name?: string;
  speedKmh?: number;        // typical speed for segment
  roadQuality?: 'smooth' | 'rough' | 'broken'; // road roughness
  isStop?: boolean;         // traffic signal / stop
}

export interface SegmentCalculation {
  stepIndex: number;
  name?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  cumulativeDistanceKm: number;
  elevationM: number;
  gradePct: number;         // slope in %
  speedKmh: number;
  fRollingN: number;
  fDragN: number;
  fGradientN: number;
  fInertialN: number;
  fTotalN: number;
  powerKw: number;          // electrical power draw
  energyWh: number;         // step energy Wh
  cumulativeEnergyWh: number;
  packTempC: number;        // cell pack temp
  socPct: number;           // remaining SoC %
  isThrottling: boolean;
  isStalled: boolean;
  warning?: string;
}

export interface RoutePhysicsResult {
  routeId: string;
  routeName: string;
  totalDistanceKm: number;
  totalEnergyKwh: number;
  efficiencyWhPerKm: number;
  startSocPct: number;
  endSocPct: number;
  peakPackTempC: number;
  averageSpeedKmh: number;
  travelTimeMinutes: number;
  hasStalled: boolean;
  stallPoint?: {
    distanceKm: number;
    lat: number;
    lng: number;
    reason: string;
  };
  throttlePoint?: {
    distanceKm: number;
    lat: number;
    lng: number;
  };
  segments: SegmentCalculation[];
  financialSavingsInrMonth: number;
  breakdown: {
    towingPreventedInr: number;
    degradationAvoidedInr: number;
    slaUptimeInr: number;
  };
}

/**
 * Air density as a function of ambient temperature (kg/m^3)
 * rho = P / (R_spec * T_kelvin)
 */
export function getAirDensity(ambientTempC: number): number {
  const kelvin = ambientTempC + 273.15;
  const standardPressurePa = 101325; // 1 atm
  const specificGasConstant = 287.05; // J/(kg*K)
  return standardPressurePa / (specificGasConstant * kelvin);
}

/**
 * Rolling resistance coefficient based on road quality
 */
export function getRollingResistanceCoeff(quality: 'smooth' | 'rough' | 'broken' = 'rough'): number {
  switch (quality) {
    case 'smooth': return 0.012; // Well-paved asphalt
    case 'rough':  return 0.022; // Typical Indian urban street with micro-bumps
    case 'broken': return 0.036; // Severe potholes / unpaved / monsoon degraded
    default:       return 0.020;
  }
}

/**
 * Arrhenius Overpotential & Cell Internal Resistance Model
 * Battery cell internal resistance spikes non-linearly above 40°C
 */
export function calculateCellInternalResistance(
  baseResistanceOhm: number = 0.032,
  packTempC: number = 38
): number {
  if (packTempC <= 40) {
    // Normal linear thermal baseline
    return baseResistanceOhm * (1 + 0.004 * (packTempC - 25));
  }
  // Arrhenius non-linear surge above 40°C
  const deltaT = packTempC - 40;
  const surgeMultiplier = 1 + 0.085 * Math.pow(deltaT, 1.65);
  return baseResistanceOhm * surgeMultiplier;
}

/**
 * Simulates a full route with tractive force & thermal transient balance
 */
export function computeRoutePhysics(
  waypoints: RouteWaypoint[],
  vehicle: VehicleSpecs,
  ambientTempC: number = 42,
  payloadKg: number = 120,
  riderWeightKg: number = 70,
  initialSocPct: number = 55,
  initialPackTempC?: number,
  routeId: string = 'route',
  routeName: string = 'Route'
): RoutePhysicsResult {
  const g = 9.80665; // m/s^2
  const totalMassKg = vehicle.curbWeightKg + riderWeightKg + payloadKg;
  const airDensity = getAirDensity(ambientTempC);
  const auxPowerW = 45; // Telematics AIS-140, LED lights, display, BMS logic
  const batteryTotalWh = vehicle.batteryCapacityKwh * 1000;

  // Thermal pack parameters (representative 3.5 kWh NMC/LFP pack)
  const packMassKg = 19; // kg
  const packSpecificHeatJPerKgK = 880; // J/(kg*K)
  const thermalCapacitance = packMassKg * packSpecificHeatJPerKgK; // ~16,720 J/K
  const convectiveCoolingCoeff = 9.5; // W/K at ~30 km/h airflow

  let currentPackTempC = initialPackTempC !== undefined ? initialPackTempC : Math.max(36, ambientTempC - 2);
  let currentSocPct = initialSocPct;
  let cumulativeDistanceKm = 0;
  let cumulativeEnergyWh = 0;
  let peakPackTempC = currentPackTempC;
  let hasStalled = false;
  let stallPoint: RoutePhysicsResult['stallPoint'] = undefined;
  let throttlePoint: RoutePhysicsResult['throttlePoint'] = undefined;

  const segments: SegmentCalculation[] = [];
  let totalTimeHours = 0;

  // Process segment by segment
  for (let i = 0; i < waypoints.length; i++) {
    const pt = waypoints[i];
    const prevPt = i > 0 ? waypoints[i - 1] : waypoints[0];

    // Distance calculation (haversine formula)
    let distKm = 0;
    if (i > 0) {
      const R = 6371; // Earth radius in km
      const dLat = ((pt.lat - prevPt.lat) * Math.PI) / 180;
      const dLon = ((pt.lng - prevPt.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((prevPt.lat * Math.PI) / 180) *
          Math.cos((pt.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distKm = R * c;
    }

    cumulativeDistanceKm += distKm;

    // Elevation gradient
    const deltaHM = pt.elevationM - prevPt.elevationM;
    const distM = Math.max(1, distKm * 1000);
    const gradePct = distM > 0 ? (deltaHM / distM) * 100 : 0;
    const thetaRad = Math.atan2(deltaHM, distM);

    // Speed & Acceleration
    const speedKmh = pt.speedKmh || (pt.isStop ? 0 : 32);
    const prevSpeedKmh = prevPt.speedKmh || (prevPt.isStop ? 0 : 32);
    const vMps = (speedKmh * 1000) / 3600;
    const prevVMps = (prevSpeedKmh * 1000) / 3600;
    const segmentTimeS = distKm > 0 ? (distM / Math.max(1.5, (vMps + prevVMps) / 2)) : 0.1;
    totalTimeHours += segmentTimeS / 3600;

    const accelMps2 = segmentTimeS > 0 ? (vMps - prevVMps) / segmentTimeS : 0;

    // Tractive Forces (N)
    const Crr = getRollingResistanceCoeff(pt.roadQuality || 'rough');
    const fRollingN = Crr * totalMassKg * g * Math.cos(thetaRad);
    const fDragN = 0.5 * airDensity * vehicle.dragCoefficientCd * vehicle.frontalAreaM2 * Math.pow(vMps, 2);
    const fGradientN = totalMassKg * g * Math.sin(thetaRad);
    const fInertialN = totalMassKg * accelMps2;

    const fTotalN = fRollingN + fDragN + fGradientN + fInertialN;

    // Wheel Power (W)
    let wheelPowerW = fTotalN * vMps;

    // Thermal Resistance
    const rInt = calculateCellInternalResistance(0.034, currentPackTempC);

    // Electrical Power Draw & Regen
    let electricalPowerW = auxPowerW;
    if (wheelPowerW > 0) {
      // Traction: power supplied through motor & inverter
      let effectiveEfficiency = vehicle.motorEfficiency;
      // Thermal throttling efficiency penalty when pack > 45°C
      if (currentPackTempC > vehicle.thermalThrottlingTempC) {
        effectiveEfficiency -= 0.12; // 12% extra losses due to hot winding & inverter derate
      }
      electricalPowerW += wheelPowerW / effectiveEfficiency;
    } else {
      // Regenerative braking: recoup kinetic energy
      electricalPowerW += wheelPowerW * vehicle.regenEfficiency;
    }

    // Battery pack current (A) & Joule heat losses
    const packVoltageV = vehicle.nominalVoltageV * (0.85 + 0.15 * (currentSocPct / 100));
    const packCurrentA = Math.max(0, electricalPowerW / Math.max(35, packVoltageV));
    const jouleHeatLossW = Math.pow(packCurrentA, 2) * rInt;

    // Total battery electrical power including internal cell resistance
    const totalBatteryPowerW = Math.max(0, electricalPowerW + jouleHeatLossW);
    const stepEnergyWh = (totalBatteryPowerW * segmentTimeS) / 3600;
    cumulativeEnergyWh += stepEnergyWh;

    // Thermal transient update dT/dt = (Q_gen - Q_dissipated) / C
    const heatDissipatedW = convectiveCoolingCoeff * (currentPackTempC - ambientTempC);
    const netHeatRateW = jouleHeatLossW - heatDissipatedW;
    const deltaTempC = (netHeatRateW * segmentTimeS) / thermalCapacitance;
    currentPackTempC = Math.max(ambientTempC - 4, currentPackTempC + deltaTempC);

    if (currentPackTempC > peakPackTempC) {
      peakPackTempC = currentPackTempC;
    }

    // SoC depletion
    const socDropPct = (stepEnergyWh / batteryTotalWh) * 100;
    currentSocPct = Math.max(0, currentSocPct - socDropPct);

    const isThrottling = currentPackTempC >= vehicle.thermalThrottlingTempC;
    if (isThrottling && !throttlePoint) {
      throttlePoint = {
        distanceKm: parseFloat(cumulativeDistanceKm.toFixed(2)),
        lat: pt.lat,
        lng: pt.lng,
      };
    }

    // Deep discharge or Thermal Shutdown condition
    const isStalled = currentSocPct <= 12.0 || currentPackTempC >= vehicle.maxPackTempC;
    if (isStalled && !hasStalled) {
      hasStalled = true;
      stallPoint = {
        distanceKm: parseFloat(cumulativeDistanceKm.toFixed(2)),
        lat: pt.lat,
        lng: pt.lng,
        reason:
          currentSocPct <= 12.0
            ? 'Battery deep-discharge (<12% BMS cutoff) under extreme payload & grade resistance'
            : `Pack thermal runaway safety threshold exceeded (${currentPackTempC.toFixed(1)}°C > ${vehicle.maxPackTempC}°C)`,
      };
    }

    segments.push({
      stepIndex: i,
      name: pt.name,
      lat: pt.lat,
      lng: pt.lng,
      distanceKm: parseFloat(distKm.toFixed(3)),
      cumulativeDistanceKm: parseFloat(cumulativeDistanceKm.toFixed(2)),
      elevationM: Math.round(pt.elevationM),
      gradePct: parseFloat(gradePct.toFixed(1)),
      speedKmh: Math.round(speedKmh),
      fRollingN: parseFloat(fRollingN.toFixed(1)),
      fDragN: parseFloat(fDragN.toFixed(1)),
      fGradientN: parseFloat(fGradientN.toFixed(1)),
      fInertialN: parseFloat(fInertialN.toFixed(1)),
      fTotalN: parseFloat(fTotalN.toFixed(1)),
      powerKw: parseFloat((totalBatteryPowerW / 1000).toFixed(2)),
      energyWh: parseFloat(stepEnergyWh.toFixed(2)),
      cumulativeEnergyWh: parseFloat(cumulativeEnergyWh.toFixed(1)),
      packTempC: parseFloat(currentPackTempC.toFixed(1)),
      socPct: parseFloat(currentSocPct.toFixed(1)),
      isThrottling,
      isStalled,
      warning: isStalled
        ? 'CRITICAL DISCHARGE STALL'
        : isThrottling
        ? 'THERMAL THROTTLING DERATE (>45°C)'
        : undefined,
    });
  }

  const totalDistanceKm = parseFloat(cumulativeDistanceKm.toFixed(2));
  const totalEnergyKwh = parseFloat((cumulativeEnergyWh / 1000).toFixed(3));
  const efficiencyWhPerKm = totalDistanceKm > 0 ? parseFloat((cumulativeEnergyWh / totalDistanceKm).toFixed(1)) : 0;
  const averageSpeedKmh = totalTimeHours > 0 ? parseFloat((totalDistanceKm / totalTimeHours).toFixed(1)) : 28;
  const travelTimeMinutes = Math.round(totalTimeHours * 60);

  // Financial ROI calculation for Indian delivery fleets (Zepto/Blinkit/Zomato)
  // Monthly savings per vehicle from avoiding roadside towings (₹800/towing), battery cell degradation (₹250), and delivery SLA delay penalties (₹150).
  const towingPreventedInr = hasStalled ? 850 : 200;
  const degradationAvoidedInr = peakPackTempC > 45 ? 650 : 250;
  const slaUptimeInr = hasStalled ? 500 : 150;
  const financialSavingsInrMonth = towingPreventedInr + degradationAvoidedInr + slaUptimeInr;

  return {
    routeId,
    routeName,
    totalDistanceKm,
    totalEnergyKwh,
    efficiencyWhPerKm,
    startSocPct: initialSocPct,
    endSocPct: parseFloat(currentSocPct.toFixed(1)),
    peakPackTempC: parseFloat(peakPackTempC.toFixed(1)),
    averageSpeedKmh,
    travelTimeMinutes,
    hasStalled,
    stallPoint,
    throttlePoint,
    segments,
    financialSavingsInrMonth,
    breakdown: {
      towingPreventedInr,
      degradationAvoidedInr,
      slaUptimeInr,
    },
  };
}

/**
 * Generates an irregular Safe-Reach Isochrone Polygon
 * Accounts for terrain gradient, road roughness, cargo payload, and ambient heat
 */
export function generateSafeReachPolygon(
  centerLat: number,
  centerLng: number,
  vehicle: VehicleSpecs,
  currentSocPct: number,
  ambientTempC: number,
  payloadKg: number
): [number, number][] {
  const points: [number, number][] = [];
  const numSectors = 24;

  // Base range on flat ideal conditions: approx 1.1 km per 1% SoC for commercial 2W
  const nominalKm = (currentSocPct - 15) * 1.05; // 15% reserve buffer

  // Ambient heat degradation factor (loss above 38°C)
  const heatPenalty = Math.max(0, (ambientTempC - 38) * 0.025);
  // Payload penalty (loss above 40kg)
  const payloadPenalty = (payloadKg / 140) * 0.32;

  for (let i = 0; i <= numSectors; i++) {
    const angleDeg = (i * 360) / numSectors;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Directional terrain gradient bias (e.g. North/East in Bengaluru has elevated ridges & flyovers)
    // Ridge gradient simulation: North-North-East has steep climbs, South-West has gradual descents
    const terrainBias = Math.sin(angleRad + 0.8) * 0.35; // -0.35 (climb/rough) to +0.35 (downhill/smooth)
    const effectiveReachKm = Math.max(
      2.5,
      nominalKm * (1 - heatPenalty - payloadPenalty + terrainBias * 0.5)
    );

    // Convert km to approx lat/lng offset
    const latOffset = (effectiveReachKm / 110.574) * Math.cos(angleRad);
    const lngOffset = (effectiveReachKm / (111.32 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angleRad);

    points.push([
      parseFloat((centerLng + lngOffset).toFixed(5)),
      parseFloat((centerLat + latOffset).toFixed(5)),
    ]);
  }

  return points;
}
