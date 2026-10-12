/**
 * VoltPath Physics Engine 2.0
 * Physics-informed longitudinal tractive force, terrain elevation gradient,
 * empirical cell thermal transient, and battery state-of-charge models
 * for commercial two-wheeler (2W) electric vehicle delivery fleets in India.
 */

export interface VehicleSpecs {
  id: string;
  name: string;
  brand: string;
  curbWeightKg: number;          // e.g. 108 kg (Ather) or 87 kg (Hero NYX)
  batteryCapacityKwh: number;    // e.g. 3.7 kWh
  nominalVoltageV: number;       // e.g. 51.1 V
  frontalAreaM2: number;         // e.g. 0.62 m^2 (scooter + upright delivery rider + cargo box)
  dragCoefficientCd: number;     // e.g. 0.82 (non-aerodynamic delivery box)
  motorEfficiency: number;       // e.g. 0.88 base powertrain efficiency
  regenEfficiency: number;       // e.g. 0.68 mechanical-to-electrical kinetic recovery
  maxRegenPowerW: number;        // e.g. 1500 W maximum regen charging acceptance
  maxPackTempC: number;          // e.g. 55 °C BMS critical safety cutoff
  thermalThrottlingTempC: number;// e.g. 45 °C BMS thermal derate initiation
  auxPowerW: number;             // e.g. 45 W telematics, display, lights, BMS logic
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
    maxRegenPowerW: 1500,
    maxPackTempC: 55,
    thermalThrottlingTempC: 45,
    auxPowerW: 45,
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
    maxRegenPowerW: 1000,
    maxPackTempC: 52,
    thermalThrottlingTempC: 44,
    auxPowerW: 40,
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
    maxRegenPowerW: 1600,
    maxPackTempC: 54,
    thermalThrottlingTempC: 45,
    auxPowerW: 45,
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
    maxRegenPowerW: 1200,
    maxPackTempC: 53,
    thermalThrottlingTempC: 45,
    auxPowerW: 42,
  },
];

export interface RouteWaypoint {
  lat: number;
  lng: number;
  elevationM: number;       // altitude in meters
  name?: string;
  speedKmh?: number;        // target speed for segment
  roadQuality?: 'smooth' | 'rough' | 'broken';
  isStop?: boolean;         // traffic junction / signal stop
}

export interface SegmentCalculation {
  stepIndex: number;
  name?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  cumulativeDistanceKm: number;
  elevationM: number;
  gradePct: number;         // slope in %, clamped to [-25, 25]
  speedKmh: number;
  fRollingN: number;        // Rolling resistance force
  fDragN: number;           // Aerodynamic drag force
  fGradientN: number;       // Gravitational gradient force
  fInertialN: number;       // Acceleration inertial force
  fTotalN: number;          // Total longitudinal tractive force
  wheelPowerKw: number;     // Mechanical power at wheel
  powerKw: number;          // Electrical battery power draw (positive = discharge, negative = regen)
  energyWh: number;         // Step energy delta Wh
  cumulativeEnergyWh: number;
  packTempC: number;        // Cell pack core temperature
  socPct: number;           // Battery state of charge %
  packVoltageV: number;     // Dynamic pack voltage
  packCurrentA: number;     // Battery pack current (A)
  isThrottling: boolean;    // BMS thermal derate active
  isLowSoc: boolean;        // Low SoC warning (< 18%)
  isStalled: boolean;       // Critical stall (< 12% or > 55°C)
  warning?: string;
}

export interface SimulationEvent {
  stepIndex: number;
  distanceKm: number;
  lat: number;
  lng: number;
  type: 'THERMAL_THROTTLING' | 'LOW_SOC_WARNING' | 'CRITICAL_STALL';
  message: string;
  telemetry: {
    socPct: number;
    packTempC: number;
    speedKmh: number;
    powerKw: number;
  };
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
  hasThrottled: boolean;
  events: SimulationEvent[];
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
  routeScore: {
    overallScore: number;       // 0 to 100 composite score
    isSafe: boolean;            // false if stall occurs or arrival reserve < 15%
    recommendationReason: string;
    factors: {
      energyScore: number;
      thermalScore: number;
      arrivalReserveScore: number;
      timeScore: number;
    };
  };
  operatingCostEstimate: {
    energyCostInr: number;
    towingRiskCostInr: number;
    batteryDegradationCostInr: number;
    slaPenaltyRiskInr: number;
    totalPerTripInr: number;
    monthlyPerVehicleInr: number;
  };
  // Backward-compatible properties
  financialSavingsInrMonth: number;
  breakdown: {
    towingPreventedInr: number;
    degradationAvoidedInr: number;
    slaUptimeInr: number;
  };
}

export interface SimulationOptions {
  ambientTempC?: number;
  payloadKg?: number;
  riderWeightKg?: number;
  initialSocPct?: number;
  initialPackTempC?: number;
  roadQualityOverride?: 'smooth' | 'rough' | 'broken';
  trafficIntensity?: 'low' | 'moderate' | 'high';
  auxPowerW?: number;
  routeId?: string;
  routeName?: string;
}

/**
 * Air density as a function of ambient temperature in Kelvin (kg/m^3)
 * Dry air ideal gas law: rho = P / (R_spec * T_kelvin)
 */
export function getAirDensity(ambientTempC: number): number {
  const kelvin = ambientTempC + 273.15;
  const standardPressurePa = 101325; // 1 atm standard atmospheric pressure
  const specificGasConstant = 287.05; // J/(kg*K)
  return standardPressurePa / (specificGasConstant * kelvin);
}

/**
 * Rolling resistance coefficient (C_rr) based on pavement condition
 * Verified against Indian urban roadway empirical ranges
 */
export function getRollingResistanceCoeff(quality: 'smooth' | 'rough' | 'broken' = 'rough'): number {
  switch (quality) {
    case 'smooth': return 0.012; // Well-paved asphalt / arterial highway
    case 'rough':  return 0.022; // Typical urban secondary street with micro-crevices
    case 'broken': return 0.036; // Potholed / unpaved / monsoon-degraded road
    default:       return 0.020;
  }
}

/**
 * Empirical temperature-dependent cell internal resistance model
 * Base resistance: ~0.032 - 0.034 Ohm for commercial 2W pack.
 * Above 40°C, cell overpotential and impedance escalate non-linearly due to SEI layer thermal instability.
 */
export function calculateCellInternalResistance(
  baseResistanceOhm: number = 0.032,
  packTempC: number = 38
): number {
  if (packTempC <= 40) {
    // Linear baseline variation (0.4% per °C above 25°C)
    return Math.max(0.020, baseResistanceOhm * (1 + 0.004 * (packTempC - 25)));
  }
  // Empirical non-linear surge above 40°C
  const deltaT = packTempC - 40;
  const surgeMultiplier = 1 + 0.085 * Math.pow(deltaT, 1.65);
  return baseResistanceOhm * surgeMultiplier;
}

/**
 * Haversine great-circle distance between two GPS coordinates in kilometers
 */
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371.0; // Mean Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return R * c;
}

/**
 * Simulates a complete route with tractive force balance, regenerative braking,
 * thermal transient ODE integration, and battery SoC conservation.
 */
export function computeRoutePhysics(
  waypoints: RouteWaypoint[],
  vehicle: VehicleSpecs,
  optionsOrAmbient?: SimulationOptions | number,
  payloadKgLegacy?: number,
  riderWeightKgLegacy?: number,
  initialSocPctLegacy?: number,
  initialPackTempCLegacy?: number,
  routeIdLegacy?: string,
  routeNameLegacy?: string
): RoutePhysicsResult {
  // Normalize parameters: either options object or positional arguments
  const options: SimulationOptions =
    typeof optionsOrAmbient === 'object' && optionsOrAmbient !== null
      ? optionsOrAmbient
      : {
          ambientTempC: typeof optionsOrAmbient === 'number' ? optionsOrAmbient : 42,
          payloadKg: payloadKgLegacy ?? 120,
          riderWeightKg: riderWeightKgLegacy ?? 70,
          initialSocPct: initialSocPctLegacy ?? 55,
          initialPackTempC: initialPackTempCLegacy,
          routeId: routeIdLegacy ?? 'route',
          routeName: routeNameLegacy ?? 'Route',
        };

  const ambientTempC = options.ambientTempC ?? 42;
  const payloadKg = options.payloadKg ?? 120;
  const riderWeightKg = options.riderWeightKg ?? 70;
  const initialSocPct = options.initialSocPct ?? 55;
  const routeId = options.routeId ?? 'route';
  const routeName = options.routeName ?? 'Route';
  const auxPowerW = options.auxPowerW ?? vehicle.auxPowerW ?? 45;

  const g = 9.80665; // m/s^2 standard gravity
  const totalMassKg = Math.max(50, vehicle.curbWeightKg + riderWeightKg + payloadKg);
  const airDensity = getAirDensity(ambientTempC);
  const batteryTotalWh = vehicle.batteryCapacityKwh * 1000;

  // Thermal model parameters (representative 3.5 kWh NMC/LFP 2W pack)
  // Pack mass ~ 19 kg, specific heat capacity ~ 880 J/(kg*K) => C_thermal ~ 16,720 J/K
  const packMassKg = 19;
  const packSpecificHeatJPerKgK = 880;
  const thermalCapacitance = packMassKg * packSpecificHeatJPerKgK; // J/K
  const baseConvectiveCoolingWPerK = 5.0; // Static natural convection at standstill
  const convectiveSpeedFactor = 0.45;    // Forced convection scaling with speed (W/(K*(m/s)))

  let currentPackTempC =
    options.initialPackTempC !== undefined
      ? options.initialPackTempC
      : Math.max(34, ambientTempC - 2);
  let currentSocPct = Math.min(100, Math.max(0, initialSocPct));
  let cumulativeDistanceKm = 0;
  let cumulativeEnergyWh = 0;
  let peakPackTempC = currentPackTempC;
  let hasStalled = false;
  let hasThrottled = false;

  const events: SimulationEvent[] = [];
  let stallPoint: RoutePhysicsResult['stallPoint'] = undefined;
  let throttlePoint: RoutePhysicsResult['throttlePoint'] = undefined;

  const segments: SegmentCalculation[] = [];
  let totalTimeHours = 0;

  for (let i = 0; i < waypoints.length; i++) {
    const pt = waypoints[i];
    const prevPt = i > 0 ? waypoints[i - 1] : waypoints[0];

    // 1. Horizontal Distance Calculation
    let distKm = 0;
    if (i > 0) {
      distKm = haversineDistanceKm(prevPt.lat, prevPt.lng, pt.lat, pt.lng);
    }
    cumulativeDistanceKm += distKm;
    const distM = distKm * 1000;

    // 2. Road Grade Calculation with Numerical Safeguards
    // Prevent divide-by-zero or noise spikes on duplicate/negligible coordinates (< 2 meters)
    const deltaHM = pt.elevationM - prevPt.elevationM;
    let gradePct = 0;
    let thetaRad = 0;

    if (distM >= 2.0) {
      // Calculate grade and clamp to physically plausible urban 2W slope range [-25%, +25%]
      const rawGradePct = (deltaHM / distM) * 100;
      gradePct = Math.max(-25, Math.min(25, rawGradePct));
      thetaRad = Math.atan2(deltaHM, distM);
    }

    // 3. Speed & Acceleration Profile
    const roadQuality = options.roadQualityOverride || pt.roadQuality || 'rough';
    let targetSpeedKmh = pt.speedKmh ?? (pt.isStop ? 0 : 32);

    // Apply stop-and-go penalty if high traffic intensity
    if (options.trafficIntensity === 'high' && (i % 3 === 0)) {
      targetSpeedKmh = Math.max(12, targetSpeedKmh * 0.6);
    }

    const prevSpeedKmh = segments.length > 0 ? segments[segments.length - 1].speedKmh : targetSpeedKmh;
    const vMps = Math.max(0, (targetSpeedKmh * 1000) / 3600);
    const prevVMps = Math.max(0, (prevSpeedKmh * 1000) / 3600);
    const avgVMps = (vMps + prevVMps) / 2;

    // Segment duration (seconds). Enforce realistic min time for stationary or short steps.
    const segmentTimeS = distKm > 0 ? Math.max(1.0, distM / Math.max(1.2, avgVMps)) : 0.5;
    totalTimeHours += segmentTimeS / 3600;

    const accelMps2 = segmentTimeS > 0 ? (vMps - prevVMps) / segmentTimeS : 0;

    // 4. Longitudinal Tractive Forces (SI Units: Newtons)
    // F_rolling = C_rr * m * g * cos(theta)
    const Crr = getRollingResistanceCoeff(roadQuality);
    const fRollingN = Math.max(0, Crr * totalMassKg * g * Math.cos(thetaRad));

    // F_aero = 0.5 * rho * C_d * A * v^2
    const fDragN = 0.5 * airDensity * vehicle.dragCoefficientCd * vehicle.frontalAreaM2 * Math.pow(vMps, 2);

    // F_grade = m * g * sin(theta) (positive uphill, negative downhill)
    const fGradientN = totalMassKg * g * Math.sin(thetaRad);

    // F_inertial = m * a
    const fInertialN = totalMassKg * accelMps2;

    // Total mechanical force required at wheel
    const fTotalN = fRollingN + fDragN + fGradientN + fInertialN;

    // 5. Wheel Power (Watts)
    const wheelPowerW = fTotalN * vMps;

    // 6. Cell Internal Resistance
    const rInt = calculateCellInternalResistance(0.032, currentPackTempC);

    // 7. Dynamic Pack Voltage (decreases with SoC drain)
    const packVoltageV = vehicle.nominalVoltageV * (0.86 + 0.14 * (currentSocPct / 100));

    // 8. Electrical Power Draw & Realistic Regenerative Braking
    let electricalPowerW = auxPowerW;
    let packCurrentA = 0;
    let jouleHeatLossW = 0;

    if (wheelPowerW > 0) {
      // Traction mode: motor consumes battery energy
      let effectiveEfficiency = vehicle.motorEfficiency;
      // Thermal throttling derate: 12% efficiency loss due to hot motor windings & inverter throttling
      if (currentPackTempC >= vehicle.thermalThrottlingTempC) {
        effectiveEfficiency = Math.max(0.65, effectiveEfficiency - 0.12);
      }
      const tractionElectricalW = wheelPowerW / effectiveEfficiency;
      electricalPowerW += tractionElectricalW;

      // Pack discharge current
      packCurrentA = electricalPowerW / Math.max(30, packVoltageV);
      jouleHeatLossW = Math.pow(packCurrentA, 2) * rInt;
    } else {
      // Deceleration or downhill mode: potential regenerative braking
      const mechanicalRegenAvailableW = Math.abs(wheelPowerW) * vehicle.regenEfficiency;
      // Enforce vehicle regen power limit and battery acceptance conditions
      const maxAllowedRegenW = Math.min(vehicle.maxRegenPowerW, 1600);

      // Disable regen if battery is fully charged (>= 98%) or critically hot (>= 50°C)
      let actualRegenRecoupedW = 0;
      if (currentSocPct < 98.0 && currentPackTempC < 50.0) {
        actualRegenRecoupedW = Math.min(mechanicalRegenAvailableW, maxAllowedRegenW);
      }

      // Charging current flowing into battery
      const regenChargeCurrentA = actualRegenRecoupedW / Math.max(30, packVoltageV);
      jouleHeatLossW = Math.pow(regenChargeCurrentA, 2) * rInt;

      // Net battery power = Aux load - (Regen power entering pack - internal cell heating)
      electricalPowerW = auxPowerW - Math.max(0, actualRegenRecoupedW - jouleHeatLossW);
      packCurrentA = electricalPowerW >= 0 ? electricalPowerW / packVoltageV : -regenChargeCurrentA;
    }

    // Total battery electrical power including internal resistance losses
    const totalBatteryPowerW = wheelPowerW > 0 ? (electricalPowerW + jouleHeatLossW) : electricalPowerW;
    const stepEnergyWh = (totalBatteryPowerW * segmentTimeS) / 3600;
    cumulativeEnergyWh += stepEnergyWh;

    // 9. Battery Thermal Transient ODE
    // C_thermal * dT/dt = Joule_heating - h_conv(v) * (T_pack - T_ambient)
    const effectiveHConv = baseConvectiveCoolingWPerK + convectiveSpeedFactor * vMps;
    const heatDissipatedW = effectiveHConv * (currentPackTempC - ambientTempC);
    const netHeatRateW = jouleHeatLossW - heatDissipatedW;
    const deltaTempC = (netHeatRateW * segmentTimeS) / thermalCapacitance;

    // Stable numerical integration with natural lower bound
    currentPackTempC = Math.max(ambientTempC - 4, currentPackTempC + deltaTempC);
    if (currentPackTempC > peakPackTempC) {
      peakPackTempC = currentPackTempC;
    }

    // 10. Battery SoC Depletion & Conservation
    const socDropPct = (stepEnergyWh / batteryTotalWh) * 100;
    currentSocPct = Math.min(100, Math.max(0, currentSocPct - socDropPct));

    // 11. State Classifications & Event Triggers
    const isThrottling = currentPackTempC >= vehicle.thermalThrottlingTempC;
    const isLowSoc = currentSocPct <= 18.0;
    const isStalled = currentSocPct <= 12.0 || currentPackTempC >= vehicle.maxPackTempC;

    if (isThrottling && !hasThrottled) {
      hasThrottled = true;
      throttlePoint = {
        distanceKm: parseFloat(cumulativeDistanceKm.toFixed(2)),
        lat: pt.lat,
        lng: pt.lng,
      };
      events.push({
        stepIndex: i,
        distanceKm: parseFloat(cumulativeDistanceKm.toFixed(2)),
        lat: pt.lat,
        lng: pt.lng,
        type: 'THERMAL_THROTTLING',
        message: `BMS Thermal Throttling triggered at ${currentPackTempC.toFixed(1)}°C (derating motor torque by 12%)`,
        telemetry: {
          socPct: parseFloat(currentSocPct.toFixed(1)),
          packTempC: parseFloat(currentPackTempC.toFixed(1)),
          speedKmh: Math.round(targetSpeedKmh),
          powerKw: parseFloat((totalBatteryPowerW / 1000).toFixed(2)),
        },
      });
    }

    if (isLowSoc && !events.some((e) => e.type === 'LOW_SOC_WARNING')) {
      events.push({
        stepIndex: i,
        distanceKm: parseFloat(cumulativeDistanceKm.toFixed(2)),
        lat: pt.lat,
        lng: pt.lng,
        type: 'LOW_SOC_WARNING',
        message: `Low SoC reserve warning: ${currentSocPct.toFixed(1)}% remaining`,
        telemetry: {
          socPct: parseFloat(currentSocPct.toFixed(1)),
          packTempC: parseFloat(currentPackTempC.toFixed(1)),
          speedKmh: Math.round(targetSpeedKmh),
          powerKw: parseFloat((totalBatteryPowerW / 1000).toFixed(2)),
        },
      });
    }

    if (isStalled && !hasStalled) {
      hasStalled = true;
      const stallReason =
        currentSocPct <= 12.0
          ? `BMS Deep-Discharge Stall: State of Charge dropped to ${currentSocPct.toFixed(1)}% (< 12% cutoff threshold)`
          : `BMS Critical Thermal Shutdown: Pack core temperature reached ${currentPackTempC.toFixed(1)}°C (>= ${vehicle.maxPackTempC}°C cutoff)`;

      stallPoint = {
        distanceKm: parseFloat(cumulativeDistanceKm.toFixed(2)),
        lat: pt.lat,
        lng: pt.lng,
        reason: stallReason,
      };
      events.push({
        stepIndex: i,
        distanceKm: parseFloat(cumulativeDistanceKm.toFixed(2)),
        lat: pt.lat,
        lng: pt.lng,
        type: 'CRITICAL_STALL',
        message: stallReason,
        telemetry: {
          socPct: parseFloat(currentSocPct.toFixed(1)),
          packTempC: parseFloat(currentPackTempC.toFixed(1)),
          speedKmh: Math.round(targetSpeedKmh),
          powerKw: parseFloat((totalBatteryPowerW / 1000).toFixed(2)),
        },
      });
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
      speedKmh: Math.round(targetSpeedKmh),
      fRollingN: parseFloat(fRollingN.toFixed(1)),
      fDragN: parseFloat(fDragN.toFixed(1)),
      fGradientN: parseFloat(fGradientN.toFixed(1)),
      fInertialN: parseFloat(fInertialN.toFixed(1)),
      fTotalN: parseFloat(fTotalN.toFixed(1)),
      wheelPowerKw: parseFloat((wheelPowerW / 1000).toFixed(2)),
      powerKw: parseFloat((totalBatteryPowerW / 1000).toFixed(2)),
      energyWh: parseFloat(stepEnergyWh.toFixed(2)),
      cumulativeEnergyWh: parseFloat(cumulativeEnergyWh.toFixed(1)),
      packTempC: parseFloat(currentPackTempC.toFixed(1)),
      socPct: parseFloat(currentSocPct.toFixed(1)),
      packVoltageV: parseFloat(packVoltageV.toFixed(1)),
      packCurrentA: parseFloat(packCurrentA.toFixed(1)),
      isThrottling,
      isLowSoc,
      isStalled,
      warning: isStalled
        ? 'CRITICAL DISCHARGE STALL'
        : isThrottling
        ? 'THERMAL THROTTLING DERATE (>45°C)'
        : isLowSoc
        ? 'LOW BATTERY WARNING'
        : undefined,
    });
  }

  const totalDistanceKm = parseFloat(cumulativeDistanceKm.toFixed(2));
  const totalEnergyKwh = parseFloat(Math.max(0, cumulativeEnergyWh / 1000).toFixed(3));
  const efficiencyWhPerKm = totalDistanceKm > 0 ? parseFloat((cumulativeEnergyWh / totalDistanceKm).toFixed(1)) : 0;
  const averageSpeedKmh = totalTimeHours > 0 ? parseFloat((totalDistanceKm / totalTimeHours).toFixed(1)) : 28;
  const travelTimeMinutes = Math.max(1, Math.round(totalTimeHours * 60));

  // 12. Transparent Multi-Factor Route Scoring
  const energyFactor = Math.max(0, Math.min(100, 100 - (efficiencyWhPerKm / 60) * 100));
  const thermalFactor = Math.max(0, Math.min(100, 100 - ((peakPackTempC - 35) / 20) * 100));
  const arrivalReserveFactor = Math.max(0, Math.min(100, (currentSocPct / 50) * 100));
  const timeFactor = Math.max(0, Math.min(100, 100 - (travelTimeMinutes / 45) * 50));

  const compositeScore = Math.round(
    energyFactor * 0.35 +
    thermalFactor * 0.30 +
    arrivalReserveFactor * 0.25 +
    timeFactor * 0.10
  );

  const isSafe = !hasStalled && currentSocPct >= 15.0;
  const recommendationReason = !isSafe
    ? `Route unsafe under current ${ambientTempC}°C ambient heat and ${payloadKg}kg cargo payload (${hasStalled ? 'stall predicted' : 'arrival reserve below 15%'}).`
    : `Route verified safe with ${currentSocPct.toFixed(1)}% arrival reserve and peak cell temperature of ${peakPackTempC.toFixed(1)}°C.`;

  // 13. Transparent Operating Cost Model (INR)
  // Commercial tariff: ₹8.50 per kWh; Towing rescue: ₹750; Degradation: ₹0.35/Wh; SLA downtime penalty: ₹100
  const energyCostInr = parseFloat((totalEnergyKwh * 8.5).toFixed(2));
  const towingRiskCostInr = hasStalled ? 750 : 0;
  const degradationCostInr = parseFloat(((cumulativeEnergyWh * 0.35 * (peakPackTempC > 45 ? 1.8 : 1.0)) / 10).toFixed(2));
  const slaPenaltyRiskInr = hasStalled ? 150 : (hasThrottled ? 40 : 0);
  const totalPerTripInr = parseFloat((energyCostInr + towingRiskCostInr + degradationCostInr + slaPenaltyRiskInr).toFixed(2));
  // 18 trips/day * 26 operating days/month = ~468 trips/month
  const monthlyPerVehicleInr = Math.round(totalPerTripInr * 468);

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
    hasThrottled,
    events,
    stallPoint,
    throttlePoint,
    segments,
    routeScore: {
      overallScore: compositeScore,
      isSafe,
      recommendationReason,
      factors: {
        energyScore: Math.round(energyFactor),
        thermalScore: Math.round(thermalFactor),
        arrivalReserveScore: Math.round(arrivalReserveFactor),
        timeScore: Math.round(timeFactor),
      },
    },
    operatingCostEstimate: {
      energyCostInr,
      towingRiskCostInr,
      batteryDegradationCostInr: degradationCostInr,
      slaPenaltyRiskInr,
      totalPerTripInr,
      monthlyPerVehicleInr,
    },
    // Backward-compatible properties
    financialSavingsInrMonth: Math.max(400, Math.round(monthlyPerVehicleInr * 0.45)),
    breakdown: {
      towingPreventedInr: hasStalled ? 750 : 200,
      degradationAvoidedInr: peakPackTempC > 45 ? 550 : 250,
      slaUptimeInr: hasStalled ? 450 : 150,
    },
  };
}

/**
 * Directional Terrain & Thermal Estimated Reach (Polar Approximation)
 * Accounts for cargo payload, ambient temperature degradation, and directional terrain bias.
 * Note: Clearly labeled as polar directional estimation, not road-network constrained isochrone.
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

  // Base range on flat ideal conditions: approx 1.05 km per 1% SoC for commercial 2W
  const usableSocPct = Math.max(0, currentSocPct - 15); // 15% safety reserve
  const nominalKm = usableSocPct * 1.05;

  // Ambient thermal degradation factor (losses above 38°C)
  const heatPenalty = Math.max(0, (ambientTempC - 38) * 0.022);
  // Cargo payload penalty (losses scaling with mass above 40kg)
  const payloadPenalty = (Math.min(140, payloadKg) / 140) * 0.28;

  for (let i = 0; i <= numSectors; i++) {
    const angleDeg = (i * 360) / numSectors;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Directional terrain bias: represents regional ridge/valley inclination
    // North-North-East has steeper inclines (+grade), South-West has downslope
    const terrainBias = Math.sin(angleRad + 0.8) * 0.25;
    const effectiveReachKm = Math.max(
      1.5,
      nominalKm * (1 - heatPenalty - payloadPenalty + terrainBias * 0.4)
    );

    // Coordinate projection (WGS84 spherical approximation)
    const latOffset = (effectiveReachKm / 110.574) * Math.cos(angleRad);
    const lngOffset = (effectiveReachKm / (111.32 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angleRad);

    points.push([
      parseFloat((centerLng + lngOffset).toFixed(5)),
      parseFloat((centerLat + latOffset).toFixed(5)),
    ]);
  }

  return points;
}
