/**
 * AIS-140 CAN-bus Telemetry Protocol Synthesizer & Decoder
 * Standardized MoRTH (Ministry of Road Transport and Highways, India) telematics specification
 * for commercial 2W EV delivery fleet monitoring.
 */

export interface AIS140TelemetryFrame {
  rawPacket: string;
  vehicleId: string;
  registrationNumber: string;
  timestamp: string;
  gpsFix: 'A' | 'V'; // A = Active 3D Fix, V = Void
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
  sohPct: number;
  payloadKg: number;
  odometerKm: number;
  bmsStatus: 'NORMAL' | 'THERMAL_THROTTLING' | 'DEEP_DISCHARGE_LIMP' | 'CRITICAL_STALL';
  ambientTempC: number;
  checksumHex: string;
}

/**
 * Calculates standard NMEA/AIS-140 XOR 8-bit checksum
 */
export function calculateAis140Checksum(sentence: string): string {
  let checksum = 0;
  for (let i = 0; i < sentence.length; i++) {
    checksum ^= sentence.charCodeAt(i);
  }
  return checksum.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Encodes telemetry parameters into an AIS-140 formatted string
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
  const body = [
    'AIS140',
    data.registrationNumber.replace(/\s+/g, ''),
    'A', // GPS fix
    '14', // Satellites
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
 * Synthesizes a mock AIS-140 frame based on the current vehicle physics state
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
  timestampMs?: number
): AIS140TelemetryFrame {
  const dateObj = timestampMs ? new Date(timestampMs) : new Date();
  const timestamp = dateObj.toISOString();

  // Realistic pack voltage curve for 51.1V NMC/LFP pack
  const nominalVoltage = 51.1;
  const voltageV = parseFloat((nominalVoltage * (0.86 + 0.14 * (socPct / 100))).toFixed(1));

  // Current draw (higher during acceleration/speed or hill climbing)
  const currentA = parseFloat((Math.max(4.2, speedKmh * 1.1 + (packTempC > 45 ? 6 : 0))).toFixed(1));

  let bmsStatus: AIS140TelemetryFrame['bmsStatus'] = 'NORMAL';
  let bmsStatusCode = 0;

  if (socPct <= 12.0) {
    bmsStatus = 'CRITICAL_STALL';
    bmsStatusCode = 3;
  } else if (socPct <= 18.0) {
    bmsStatus = 'DEEP_DISCHARGE_LIMP';
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
    socPct,
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
    lat,
    lng,
    altitudeM: Math.round(altitudeM),
    speedKmh: parseFloat(speedKmh.toFixed(1)),
    headingDeg: Math.round(headingDeg),
    socPct: parseFloat(socPct.toFixed(1)),
    packTempC: parseFloat(packTempC.toFixed(1)),
    voltageV,
    currentA,
    sohPct: 94.6,
    payloadKg,
    odometerKm: 14892.4,
    bmsStatus,
    ambientTempC,
    checksumHex,
  };
}
