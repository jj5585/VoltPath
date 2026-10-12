/**
 * AIS-140-Inspired Telematics Protocol Synthesizer & Parser (Simulated)
 * 
 * Note on Compliance & Standard Implementation:
 * This module synthesizes simulated telematics packets following the MoRTH
 * (Ministry of Road Transport and Highways, India) AIS-140 general framing structure
 * (NMEA-style comma-delimited sentence with 8-bit XOR checksum suffix).
 * 
 * All data emitted by this synthesizer is mathematically derived from the VoltPath
 * vehicle physics and thermal simulation engine, and is explicitly labeled as SIMULATED.
 */

export interface AIS140TelemetryFrame {
  rawPacket: string;
  vehicleId: string;
  registrationNumber: string;
  timestamp: string;
  gpsFix: 'A' | 'V'; // A = Valid 3D Nav Fix, V = Void/Invalid
  satellites: number;
  lat: number;
  lng: number;
  altitudeM: number;
  speedKmh: number;
  headingDeg: number;
  socPct: number;
  packTempC: number;
  voltageV: number;
  currentA: number;
  powerKw: number;
  sohPct: number;
  payloadKg: number;
  odometerKm: number;
  bmsStatus: 'NORMAL' | 'THERMAL_THROTTLING' | 'LOW_SOC_WARNING' | 'DEEP_DISCHARGE_LIMP' | 'CRITICAL_STALL';
  ambientTempC: number;
  checksumHex: string;
  isSimulated: true;
}

/**
 * Calculates standard 8-bit XOR checksum between '$' and '*'
 */
export function calculateAis140Checksum(sentenceBody: string): string {
  let checksum = 0;
  for (let i = 0; i < sentenceBody.length; i++) {
    checksum ^= sentenceBody.charCodeAt(i);
  }
  return checksum.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Verifies if an AIS-140 formatted sentence has a valid 8-bit XOR checksum
 */
export function verifyAis140Checksum(fullSentence: string): boolean {
  if (!fullSentence || !fullSentence.startsWith('$') || !fullSentence.includes('*')) {
    return false;
  }
  const parts = fullSentence.slice(1).split('*');
  if (parts.length !== 2) return false;
  const body = parts[0];
  const expectedChecksum = parts[1].trim().toUpperCase();
  const calculated = calculateAis140Checksum(body);
  return calculated === expectedChecksum;
}

/**
 * Encodes telemetry parameters into an AIS-140-inspired sentence
 * Framing: $AIS140,<RegNo>,<Fix>,<Sats>,<Lat>,<Lng>,<Alt>,<Speed>,<Heading>,<SoC>,<PackTemp>,<Volt>,<Curr>,<Payload>,<BmsCode>,<Timestamp>*<Checksum>
 */
export function encodeAIS140Sentence(data: {
  registrationNumber: string;
  timestamp: string;
  lat: number;
  lng: number;
  altitudeM: number;
  speedKmh: number;
  headingDeg: number;
  socPct: number;
  packTempC: number;
  voltageV: number;
  currentA: number;
  payloadKg: number;
  bmsStatusCode: number;
}): string {
  const cleanReg = data.registrationNumber.replace(/\s+/g, '').toUpperCase();
  const body = [
    'AIS140',
    cleanReg,
    'A', // 3D Fix Active
    '14', // Satellites in view
    data.lat.toFixed(5),
    data.lng.toFixed(5),
    Math.round(data.altitudeM),
    data.speedKmh.toFixed(1),
    Math.round(data.headingDeg),
    data.socPct.toFixed(1),
    data.packTempC.toFixed(1),
    data.voltageV.toFixed(1),
    data.currentA.toFixed(1),
    data.payloadKg.toFixed(1),
    data.bmsStatusCode,
    data.timestamp,
  ].join(',');

  const checksum = calculateAis140Checksum(body);
  return `$${body}*${checksum}`;
}

/**
 * Parses and validates an AIS-140 telemetry string
 */
export function parseAIS140Sentence(rawSentence: string): AIS140TelemetryFrame | null {
  if (!verifyAis140Checksum(rawSentence)) {
    return null;
  }

  try {
    const starIdx = rawSentence.indexOf('*');
    const checksumHex = rawSentence.slice(starIdx + 1).trim();
    const body = rawSentence.slice(1, starIdx);
    const parts = body.split(',');

    if (parts.length < 16 || parts[0] !== 'AIS140') {
      return null;
    }

    const registrationNumber = parts[1];
    const gpsFix = parts[2] === 'A' ? 'A' : 'V';
    const satellites = parseInt(parts[3]) || 0;
    const lat = parseFloat(parts[4]);
    const lng = parseFloat(parts[5]);
    const altitudeM = parseFloat(parts[6]);
    const speedKmh = parseFloat(parts[7]);
    const headingDeg = parseFloat(parts[8]);
    const socPct = parseFloat(parts[9]);
    const packTempC = parseFloat(parts[10]);
    const voltageV = parseFloat(parts[11]);
    const currentA = parseFloat(parts[12]);
    const payloadKg = parseFloat(parts[13]);
    const bmsCode = parseInt(parts[14]);
    const timestamp = parts[15];

    let bmsStatus: AIS140TelemetryFrame['bmsStatus'] = 'NORMAL';
    if (bmsCode === 4) bmsStatus = 'CRITICAL_STALL';
    else if (bmsCode === 3) bmsStatus = 'DEEP_DISCHARGE_LIMP';
    else if (bmsCode === 2) bmsStatus = 'LOW_SOC_WARNING';
    else if (bmsCode === 1) bmsStatus = 'THERMAL_THROTTLING';

    const powerKw = parseFloat(((voltageV * currentA) / 1000).toFixed(2));

    return {
      rawPacket: rawSentence,
      vehicleId: registrationNumber,
      registrationNumber,
      timestamp,
      gpsFix,
      satellites,
      lat,
      lng,
      altitudeM,
      speedKmh,
      headingDeg,
      socPct,
      packTempC,
      voltageV,
      currentA,
      powerKw,
      sohPct: 94.6,
      payloadKg,
      odometerKm: 14892.4,
      bmsStatus,
      ambientTempC: 38,
      checksumHex,
      isSimulated: true,
    };
  } catch {
    return null;
  }
}

/**
 * Deterministically synthesizes an AIS-140 telemetry frame directly from physics simulation state
 */
export function synthesizeAIS140Frame(
  registrationNumber: string,
  vehicleId: string,
  lat: number,
  lng: number,
  altitudeM: number,
  speedKmh: number,
  headingDeg: number,
  socPct: number,
  packTempC: number,
  payloadKg: number,
  ambientTempC: number,
  timestampMs?: number,
  electricalPowerKw?: number
): AIS140TelemetryFrame {
  const dateObj = timestampMs ? new Date(timestampMs) : new Date();
  const timestamp = dateObj.toISOString();

  // Dynamic voltage: decreases monotonically with SoC drain
  const nominalVoltage = 51.1;
  const clampedSoc = Math.min(100, Math.max(0, socPct));
  const voltageV = parseFloat((nominalVoltage * (0.86 + 0.14 * (clampedSoc / 100))).toFixed(1));

  // Current calculation: directly reflects power demand divided by pack voltage
  let powerKw = electricalPowerKw;
  if (powerKw === undefined) {
    // Derive from speed and payload if not explicitly passed
    powerKw = Math.max(0.045, (speedKmh * 0.04 * (1 + payloadKg / 200)));
  }
  const currentA = parseFloat((Math.max(0.8, (powerKw * 1000) / Math.max(30, voltageV))).toFixed(1));

  let bmsStatus: AIS140TelemetryFrame['bmsStatus'] = 'NORMAL';
  let bmsStatusCode = 0;

  if (clampedSoc <= 12.0 || packTempC >= 55.0) {
    bmsStatus = 'CRITICAL_STALL';
    bmsStatusCode = 4;
  } else if (clampedSoc <= 15.0) {
    bmsStatus = 'DEEP_DISCHARGE_LIMP';
    bmsStatusCode = 3;
  } else if (clampedSoc <= 18.0) {
    bmsStatus = 'LOW_SOC_WARNING';
    bmsStatusCode = 2;
  } else if (packTempC >= 45.0) {
    bmsStatus = 'THERMAL_THROTTLING';
    bmsStatusCode = 1;
  }

  const rawPacket = encodeAIS140Sentence({
    registrationNumber,
    timestamp,
    lat,
    lng,
    altitudeM,
    speedKmh,
    headingDeg,
    socPct: clampedSoc,
    packTempC,
    voltageV,
    currentA,
    payloadKg,
    bmsStatusCode,
  });

  const checksumHex = rawPacket.split('*')[1] || '00';

  return {
    rawPacket,
    vehicleId,
    registrationNumber,
    timestamp,
    gpsFix: 'A',
    satellites: 14,
    lat: parseFloat(lat.toFixed(5)),
    lng: parseFloat(lng.toFixed(5)),
    altitudeM: Math.round(altitudeM),
    speedKmh: parseFloat(speedKmh.toFixed(1)),
    headingDeg: Math.round(((headingDeg % 360) + 360) % 360),
    socPct: parseFloat(clampedSoc.toFixed(1)),
    packTempC: parseFloat(packTempC.toFixed(1)),
    voltageV,
    currentA,
    powerKw: parseFloat(powerKw.toFixed(2)),
    sohPct: 94.6,
    payloadKg,
    odometerKm: 14892.4,
    bmsStatus,
    ambientTempC,
    checksumHex,
    isSimulated: true,
  };
}
