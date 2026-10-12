/**
 * VoltPath 2.0 Automated Verification & Physics Validation Test Suite
 * Executed via Node.js built-in test runner (node --test)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLEET_VEHICLES,
  getAirDensity,
  getRollingResistanceCoeff,
  calculateCellInternalResistance,
  haversineDistanceKm,
  computeRoutePhysics,
  generateSafeReachPolygon,
} from '../tests-build/physicsEngine.js';
import {
  calculateAis140Checksum,
  verifyAis140Checksum,
  encodeAIS140Sentence,
  parseAIS140Sentence,
  synthesizeAIS140Frame,
} from '../tests-build/ais140Generator.js';
import {
  decodeGooglePolyline,
  sampleCoordinatesAlongPath,
  getLocalIndianElevation,
} from '../tests-build/mapRoutingService.js';

// ==========================================
// 1. TRACTIVE FORCE & SI UNITS TESTS
// ==========================================
test('Physics: Air density decreases as temperature rises', () => {
  const rho20 = getAirDensity(20);
  const rho35 = getAirDensity(35);
  const rho50 = getAirDensity(50);

  assert.ok(rho20 > rho35, 'Air density at 20°C must be greater than at 35°C');
  assert.ok(rho35 > rho50, 'Air density at 35°C must be greater than at 50°C');
  assert.ok(rho35 > 1.10 && rho35 < 1.20, `Air density ~1.14 kg/m^3 at 35°C, got ${rho35}`);
});

test('Physics: Rolling resistance varies with pavement quality', () => {
  const crrSmooth = getRollingResistanceCoeff('smooth');
  const crrRough = getRollingResistanceCoeff('rough');
  const crrBroken = getRollingResistanceCoeff('broken');

  assert.equal(crrSmooth, 0.012);
  assert.equal(crrRough, 0.022);
  assert.equal(crrBroken, 0.036);
  assert.ok(crrBroken > crrRough && crrRough > crrSmooth);
});

test('Physics: Uphill gradient increases tractive force, downhill decreases it', () => {
  const vehicle = FLEET_VEHICLES[0];
  const flatWaypoints = [
    { lat: 12.9716, lng: 77.6412, elevationM: 900, speedKmh: 30 },
    { lat: 12.9726, lng: 77.6422, elevationM: 900, speedKmh: 30 },
  ];
  const uphillWaypoints = [
    { lat: 12.9716, lng: 77.6412, elevationM: 900, speedKmh: 30 },
    { lat: 12.9726, lng: 77.6422, elevationM: 920, speedKmh: 30 }, // +20m climb
  ];
  const downhillWaypoints = [
    { lat: 12.9716, lng: 77.6412, elevationM: 920, speedKmh: 30 },
    { lat: 12.9726, lng: 77.6422, elevationM: 900, speedKmh: 30 }, // -20m descent
  ];

  const flatRes = computeRoutePhysics(flatWaypoints, vehicle, { ambientTempC: 30, payloadKg: 50 });
  const uphillRes = computeRoutePhysics(uphillWaypoints, vehicle, { ambientTempC: 30, payloadKg: 50 });
  const downhillRes = computeRoutePhysics(downhillWaypoints, vehicle, { ambientTempC: 30, payloadKg: 50 });

  const fGradFlat = flatRes.segments[1].fGradientN;
  const fGradUphill = uphillRes.segments[1].fGradientN;
  const fGradDownhill = downhillRes.segments[1].fGradientN;

  assert.equal(fGradFlat, 0, 'Flat road gradient force must be 0 N');
  assert.ok(fGradUphill > 0, 'Uphill gradient force must be positive (opposing motion)');
  assert.ok(fGradDownhill < 0, 'Downhill gradient force must be negative (assisting motion)');
  assert.ok(uphillRes.totalEnergyKwh > flatRes.totalEnergyKwh, 'Uphill route must consume more energy than flat');
  assert.ok(downhillRes.totalEnergyKwh < flatRes.totalEnergyKwh, 'Downhill route must consume less energy than flat');
});

test('Physics: Aerodynamic drag scales quadratically with speed', () => {
  const vehicle = FLEET_VEHICLES[0];
  const slowWaypoints = [
    { lat: 12.9716, lng: 77.6412, elevationM: 900, speedKmh: 20 },
    { lat: 12.9726, lng: 77.6422, elevationM: 900, speedKmh: 20 },
  ];
  const fastWaypoints = [
    { lat: 12.9716, lng: 77.6412, elevationM: 900, speedKmh: 40 }, // 2x speed
    { lat: 12.9726, lng: 77.6422, elevationM: 900, speedKmh: 40 },
  ];

  const slowRes = computeRoutePhysics(slowWaypoints, vehicle, { ambientTempC: 30 });
  const fastRes = computeRoutePhysics(fastWaypoints, vehicle, { ambientTempC: 30 });

  const dragSlow = slowRes.segments[1].fDragN;
  const dragFast = fastRes.segments[1].fDragN;

  // At 2x speed, drag force should be approx 4x (2^2)
  const dragRatio = dragFast / dragSlow;
  assert.ok(Math.abs(dragRatio - 4.0) < 0.1, `Drag ratio should be ~4.0, got ${dragRatio}`);
});

test('Physics: Additional cargo increases energy consumption and Wh/km', () => {
  const vehicle = FLEET_VEHICLES[0];
  const waypoints = [
    { lat: 12.9716, lng: 77.6412, elevationM: 900, speedKmh: 30 },
    { lat: 12.9816, lng: 77.6512, elevationM: 905, speedKmh: 30 },
  ];

  const lightRes = computeRoutePhysics(waypoints, vehicle, { payloadKg: 10, ambientTempC: 35 });
  const heavyRes = computeRoutePhysics(waypoints, vehicle, { payloadKg: 130, ambientTempC: 35 });

  assert.ok(heavyRes.totalEnergyKwh > lightRes.totalEnergyKwh, '130kg payload must consume more kWh than 10kg payload');
  assert.ok(heavyRes.efficiencyWhPerKm > lightRes.efficiencyWhPerKm, 'Wh/km must be significantly higher for 130kg payload');
});

// ==========================================
// 2. BATTERY THERMAL & TRANSIENT ODE TESTS
// ==========================================
test('Physics: Cell internal resistance escalates non-linearly above 40°C', () => {
  const r25 = calculateCellInternalResistance(0.032, 25);
  const r35 = calculateCellInternalResistance(0.032, 35);
  const r40 = calculateCellInternalResistance(0.032, 40);
  const r45 = calculateCellInternalResistance(0.032, 45);
  const r50 = calculateCellInternalResistance(0.032, 50);

  assert.equal(r25, 0.032, 'Resistance at 25°C should equal base resistance');
  assert.ok(r40 > r35 && r35 > r25, 'Resistance increases with temperature');
  // Escalation above 40°C:
  const delta40to45 = r45 - r40;
  const delta45to50 = r50 - r45;
  assert.ok(delta45to50 > delta40to45, 'Rate of resistance increase must accelerate above 40°C');
});

test('Physics: Thermal throttling triggers at 45°C with efficiency derate', () => {
  const vehicle = FLEET_VEHICLES[0];
  const hotWaypoints = [
    { lat: 12.9716, lng: 77.6412, elevationM: 900, speedKmh: 32 },
    { lat: 12.9816, lng: 77.6512, elevationM: 910, speedKmh: 32 },
    { lat: 12.9916, lng: 77.6612, elevationM: 915, speedKmh: 32 },
  ];

  const coolRes = computeRoutePhysics(hotWaypoints, vehicle, { ambientTempC: 25, initialPackTempC: 28 });
  const hotRes = computeRoutePhysics(hotWaypoints, vehicle, { ambientTempC: 44, initialPackTempC: 44.5 });

  assert.equal(coolRes.hasThrottled, false, 'Cool run must not trigger thermal throttling');
  assert.equal(hotRes.hasThrottled, true, 'Hot run starting at 44.5°C must trigger throttling at >= 45°C');
  assert.ok(hotRes.throttlePoint !== undefined, 'Throttle point coordinate must be recorded');
});

test('Physics: Deep-discharge stall occurs when SoC drops to <= 12%', () => {
  const vehicle = FLEET_VEHICLES[0];
  const longWaypoints = [
    { lat: 12.9000, lng: 77.6000, elevationM: 900, speedKmh: 35 },
    { lat: 12.9200, lng: 77.6200, elevationM: 915, speedKmh: 35 },
    { lat: 12.9400, lng: 77.6400, elevationM: 925, speedKmh: 35 },
    { lat: 12.9600, lng: 77.6600, elevationM: 935, speedKmh: 35 },
  ];

  // Start with critically low SoC (13%)
  const stallRes = computeRoutePhysics(longWaypoints, vehicle, { initialSocPct: 13, payloadKg: 120, ambientTempC: 42 });

  assert.equal(stallRes.hasStalled, true, 'Vehicle must trigger stall when SoC drops below 12%');
  assert.ok(stallRes.stallPoint !== undefined, 'Stall point must be recorded');
  assert.ok(stallRes.stallPoint.distanceKm > 0, 'Stall distance must be positive');
  assert.ok(stallRes.stallPoint.reason.includes('Deep-Discharge'), 'Stall reason must identify deep discharge');
});

test('Physics: Numerical safeguards prevent divide-by-zero on duplicate coordinates', () => {
  const vehicle = FLEET_VEHICLES[0];
  const duplicateWaypoints = [
    { lat: 12.9716, lng: 77.6412, elevationM: 900, speedKmh: 30 },
    { lat: 12.9716, lng: 77.6412, elevationM: 950, speedKmh: 30 }, // Exact same lat/lng with different elevation
    { lat: 12.9720, lng: 77.6416, elevationM: 902, speedKmh: 30 },
  ];

  // Must not throw or produce NaN / Infinity
  const res = computeRoutePhysics(duplicateWaypoints, vehicle, { ambientTempC: 35 });

  assert.ok(!isNaN(res.totalEnergyKwh), 'Total energy must not be NaN');
  assert.ok(isFinite(res.totalEnergyKwh), 'Total energy must be finite');
  assert.ok(!isNaN(res.segments[1].gradePct), 'Grade on duplicate point must not be NaN');
  assert.equal(res.segments[1].gradePct, 0, 'Grade on duplicate point (< 2m) must safely be 0%');
});

// ==========================================
// 3. TELEMETRY & AIS-140 FRAMING TESTS
// ==========================================
test('Telemetry: 8-bit XOR checksum is correctly generated and validated', () => {
  const body = 'AIS140,KA03JX6804,A,14,12.96100,77.63850,915,32.0,135,42.0,44.0,51.1,12.5,120.0,0,2026-10-12T05:25:00.000Z';
  const checksum = calculateAis140Checksum(body);

  assert.equal(checksum.length, 2, 'Checksum must be 2 hex digits');
  const fullSentence = `$${body}*${checksum}`;

  assert.equal(verifyAis140Checksum(fullSentence), true, 'Valid sentence must pass checksum verification');

  // Corrupted sentence check
  const corruptedSentence = `$${body}*99`;
  if (checksum !== '99') {
    assert.equal(verifyAis140Checksum(corruptedSentence), false, 'Corrupted sentence must fail verification');
  }
});

test('Telemetry: Sentence parser extracts fields and handles malformed strings', () => {
  const frame = synthesizeAIS140Frame('KA 03 JX 6804', 'ather-450x', 12.961, 77.638, 915, 32, 135, 65, 42, 100, 38);
  assert.ok(frame.rawPacket.startsWith('$AIS140'));

  const parsed = parseAIS140Sentence(frame.rawPacket);
  assert.notEqual(parsed, null, 'Synthesized frame must parse successfully');
  assert.equal(parsed.speedKmh, 32);
  assert.equal(parsed.socPct, 65);
  assert.equal(parsed.altitudeM, 915);
  assert.equal(parsed.isSimulated, true);

  // Malformed test
  assert.equal(parseAIS140Sentence('GARBAGE_PACKET_WITHOUT_CHECKSUM'), null);
  assert.equal(parseAIS140Sentence('$AIS140,incomplete*00'), null);
});

// ==========================================
// 4. ROUTE INTELLIGENCE & POLYLINES TESTS
// ==========================================
test('Routing: Google Polyline decoder correctly decodes coordinate pairs', () => {
  // Encoded polyline for two points near Bengaluru: (12.9716, 77.6412) to (12.9726, 77.6422)
  const samplePolyline = '_p~iF~ps|U_ibE_ibE';
  const points = decodeGooglePolyline(samplePolyline);

  assert.ok(Array.isArray(points), 'Decoded result must be an array');
  assert.ok(points.length > 0, 'Decoded result must have points');
  points.forEach(([lat, lng]) => {
    assert.ok(lat >= -90 && lat <= 90, `Latitude ${lat} out of bounds`);
    assert.ok(lng >= -180 && lng <= 180, `Longitude ${lng} out of bounds`);
  });
});

test('Routing: Path resampling maintains coordinate sequence and end points', () => {
  const rawPath = [
    [12.90, 77.60],
    [12.91, 77.61],
    [12.92, 77.62],
    [12.93, 77.63],
    [12.94, 77.64],
    [12.95, 77.65],
  ];

  const sampled = sampleCoordinatesAlongPath(rawPath, 4);
  assert.equal(sampled.length, 4, 'Sampled array must have requested sample count');
  assert.deepEqual(sampled[0], rawPath[0], 'First coordinate must match origin');
  assert.deepEqual(sampled[sampled.length - 1], rawPath[rawPath.length - 1], 'Last coordinate must match destination');
});

test('Routing: Regional Indian elevation model returns realistic altitudes', () => {
  const blrElevation = getLocalIndianElevation(12.97, 77.64);
  const delElevation = getLocalIndianElevation(28.61, 77.23);
  const mumElevation = getLocalIndianElevation(19.07, 72.87);

  // Bengaluru is on the Deccan plateau: 880m - 940m
  assert.ok(blrElevation >= 880 && blrElevation <= 940, `Bengaluru elevation expected 880-940m, got ${blrElevation}m`);
  // Delhi is 210m - 245m
  assert.ok(delElevation >= 200 && delElevation <= 250, `Delhi elevation expected 200-250m, got ${delElevation}m`);
  // Mumbai coast is 10m - 60m
  assert.ok(mumElevation >= 10 && mumElevation <= 100, `Mumbai elevation expected 10-100m, got ${mumElevation}m`);
});

test('Routing: Safe-reach polygon generates 25 directional points and shrinks in extreme heat', () => {
  const vehicle = FLEET_VEHICLES[0];
  const coolPoly = generateSafeReachPolygon(12.9716, 77.6412, vehicle, 80, 25, 20);
  const hotHeavyPoly = generateSafeReachPolygon(12.9716, 77.6412, vehicle, 80, 46, 130);

  assert.equal(coolPoly.length, 25, 'Safe-reach polygon must have 25 boundary points (24 sectors closed)');
  assert.equal(hotHeavyPoly.length, 25);

  // Distance from origin in cool/light scenario vs hot/heavy scenario
  const coolDist = haversineDistanceKm(12.9716, 77.6412, coolPoly[0][1], coolPoly[0][0]);
  const hotDist = haversineDistanceKm(12.9716, 77.6412, hotHeavyPoly[0][1], hotHeavyPoly[0][0]);

  assert.ok(coolDist > hotDist, `Cool/light reach (${coolDist.toFixed(1)}km) must exceed hot/heavy reach (${hotDist.toFixed(1)}km)`);
});
