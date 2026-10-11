import { RouteWaypoint } from './physicsEngine';

export interface DeliveryHub {
  id: string;
  name: string;
  brand: 'Zepto' | 'Blinkit' | 'Instamart' | 'Zomato' | 'Swiggy' | 'Custom';
  lat: number;
  lng: number;
  elevationM: number;
  address: string;
  city: 'bengaluru' | 'delhi_ncr' | 'mumbai';
  type: 'source' | 'destination' | 'both';
}

export interface SwapStation {
  id: string;
  name: string;
  brand: string;
  lat: number;
  lng: number;
  availableBatteries: number;
  totalBays: number;
  swapTimeMinutes: number;
  distanceFromStartKm: number;
  compatibleVehicles: string[];
  address: string;
  recommendedForRoute: boolean;
}

export const DELIVERY_HUBS: DeliveryHub[] = [
  // --- Bengaluru Sources (Dark Stores / Fulfillment Hubs) ---
  {
    id: 'zepto-indiranagar',
    name: 'Zepto Dark Store #BLR-14 (Indiranagar 100ft Rd)',
    brand: 'Zepto',
    lat: 12.9716,
    lng: 77.6412,
    elevationM: 905,
    address: '100 Feet Rd, Indiranagar, Bengaluru',
    city: 'bengaluru',
    type: 'source',
  },
  {
    id: 'blinkit-koramangala',
    name: 'Blinkit Micro-Hub #BLR-02 (Koramangala 80ft Rd)',
    brand: 'Blinkit',
    lat: 12.9352,
    lng: 77.6245,
    elevationM: 890,
    address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru',
    city: 'bengaluru',
    type: 'source',
  },
  {
    id: 'instamart-hsr',
    name: 'Swiggy Instamart #BLR-21 (HSR Layout Sector 1)',
    brand: 'Instamart',
    lat: 12.9120,
    lng: 77.6440,
    elevationM: 898,
    address: '19th Main Rd, Sector 1, HSR Layout, Bengaluru',
    city: 'bengaluru',
    type: 'source',
  },
  {
    id: 'zomato-domlur',
    name: 'Zomato QuickStore #BLR-33 (Domlur Inner Ring Rd)',
    brand: 'Zomato',
    lat: 12.9610,
    lng: 77.6380,
    elevationM: 915,
    address: 'Inner Ring Road, Domlur, Bengaluru',
    city: 'bengaluru',
    type: 'source',
  },
  {
    id: 'zepto-whitefield',
    name: 'Zepto SuperStore #BLR-08 (Whitefield ITPL)',
    brand: 'Zepto',
    lat: 12.9850,
    lng: 77.7280,
    elevationM: 875,
    address: 'ITPL Main Road, Whitefield, Bengaluru',
    city: 'bengaluru',
    type: 'source',
  },

  // --- Bengaluru Destinations (Delivery Drop-offs / Tech Parks) ---
  {
    id: 'ecospace-bellandur',
    name: 'Prestige Tech Park / EcoSpace Hub (Bellandur)',
    brand: 'Custom',
    lat: 12.9260,
    lng: 77.6830,
    elevationM: 885,
    address: 'Outer Ring Rd, Bellandur, Bengaluru',
    city: 'bengaluru',
    type: 'destination',
  },
  {
    id: 'bagmane-cvraman',
    name: 'Bagmane Tech Park (CV Raman Nagar)',
    brand: 'Custom',
    lat: 12.9805,
    lng: 77.6595,
    elevationM: 912,
    address: 'Byrasandra, CV Raman Nagar, Bengaluru',
    city: 'bengaluru',
    type: 'destination',
  },
  {
    id: 'egl-domlur',
    name: 'Embassy GolfLinks (EGL) Business Corridor',
    brand: 'Custom',
    lat: 12.9520,
    lng: 77.6480,
    elevationM: 892,
    address: 'Intermediate Ring Rd, Domlur, Bengaluru',
    city: 'bengaluru',
    type: 'destination',
  },
  {
    id: 'electronic-city',
    name: 'Electronic City Phase 1 Toll Delivery Hub',
    brand: 'Custom',
    lat: 12.8450,
    lng: 77.6620,
    elevationM: 918,
    address: 'Hosur Rd, Phase 1, Electronic City, Bengaluru',
    city: 'bengaluru',
    type: 'destination',
  },
  {
    id: 'phoenix-mahadevapura',
    name: 'Phoenix Marketcity Corridor (Mahadevapura)',
    brand: 'Custom',
    lat: 12.9960,
    lng: 77.6970,
    elevationM: 865,
    address: 'Whitefield Main Rd, Mahadevapura, Bengaluru',
    city: 'bengaluru',
    type: 'destination',
  },

  // --- Delhi NCR Hubs ---
  {
    id: 'blinkit-hauzkhas',
    name: 'Blinkit Dark Store #DEL-09 (Hauz Khas)',
    brand: 'Blinkit',
    lat: 28.5494,
    lng: 77.2001,
    elevationM: 215,
    address: 'Aurobindo Marg, Hauz Khas, New Delhi',
    city: 'delhi_ncr',
    type: 'source',
  },
  {
    id: 'cybercity-gurgaon',
    name: 'DLF Cyber City Building 10 (Gurgaon)',
    brand: 'Custom',
    lat: 28.4950,
    lng: 77.0890,
    elevationM: 228,
    address: 'DLF Phase 2, Sector 24, Gurugram',
    city: 'delhi_ncr',
    type: 'destination',
  },
];

export const ALL_SWAP_STATIONS: SwapStation[] = [
  {
    id: 'bs-42',
    name: 'Battery Smart Hub #42 - Domlur West',
    brand: 'Battery Smart',
    lat: 12.9610,
    lng: 77.6380,
    availableBatteries: 14,
    totalBays: 16,
    swapTimeMinutes: 1.5,
    distanceFromStartKm: 2.1,
    compatibleVehicles: ['hero-nyx', 'ola-s1-pro', 'tvs-iqube'],
    address: 'Old Airport Rd near Domlur junction, Bengaluru',
    recommendedForRoute: true,
  },
  {
    id: 'sun-mob-08',
    name: 'Sun Mobility QuickSwap - Indiranagar CMH',
    brand: 'Sun Mobility',
    lat: 12.9785,
    lng: 77.6445,
    availableBatteries: 9,
    totalBays: 12,
    swapTimeMinutes: 2.0,
    distanceFromStartKm: 0.9,
    compatibleVehicles: ['ather-450x', 'hero-nyx'],
    address: 'CMH Road Metro Station Gate 1, Indiranagar',
    recommendedForRoute: false,
  },
  {
    id: 'ather-grid-15',
    name: 'Ather Grid Fast Hub - Koramangala 80ft',
    brand: 'Ather Grid',
    lat: 12.9352,
    lng: 77.6245,
    availableBatteries: 6,
    totalBays: 8,
    swapTimeMinutes: 12.0,
    distanceFromStartKm: 5.4,
    compatibleVehicles: ['ather-450x'],
    address: '80 Feet Rd, 4th Block Koramangala',
    recommendedForRoute: false,
  },
  {
    id: 'bs-89',
    name: 'Battery Smart Hub #89 - Bellandur Outer Ring',
    brand: 'Battery Smart',
    lat: 12.9305,
    lng: 77.6780,
    availableBatteries: 12,
    totalBays: 16,
    swapTimeMinutes: 1.5,
    distanceFromStartKm: 7.8,
    compatibleVehicles: ['hero-nyx', 'ola-s1-pro', 'tvs-iqube'],
    address: 'Outer Ring Road, Near Bellandur Central Mall',
    recommendedForRoute: true,
  },
  {
    id: 'bs-hsr-12',
    name: 'Battery Smart Hub #12 - HSR 27th Main',
    brand: 'Battery Smart',
    lat: 12.9100,
    lng: 77.6500,
    availableBatteries: 15,
    totalBays: 18,
    swapTimeMinutes: 1.5,
    distanceFromStartKm: 4.2,
    compatibleVehicles: ['hero-nyx', 'ola-s1-pro', 'tvs-iqube'],
    address: '27th Main Rd, HSR Layout Sector 1',
    recommendedForRoute: true,
  },
  {
    id: 'sun-mob-mahadevapura',
    name: 'Sun Mobility Hub #22 - Mahadevapura Ring Rd',
    brand: 'Sun Mobility',
    lat: 12.9900,
    lng: 77.6900,
    availableBatteries: 11,
    totalBays: 14,
    swapTimeMinutes: 2.0,
    distanceFromStartKm: 6.1,
    compatibleVehicles: ['ather-450x', 'hero-nyx'],
    address: 'Outer Ring Road, Mahadevapura',
    recommendedForRoute: false,
  },
];

/**
 * Dynamically synthesizes Route A and Route B waypoints between any source and destination hub.
 * Incorporates authentic terrain gradients, road quality profiles, and flyover crests.
 */
export function generateDynamicRoutePair(source: DeliveryHub, destination: DeliveryHub) {
  const steps = 12;
  const dLat = (destination.lat - source.lat) / steps;
  const dLng = (destination.lng - source.lng) / steps;

  // Base elevation profile interpolation
  const elevStart = source.elevationM;
  const elevEnd = destination.elevationM;

  const waypointsA: RouteWaypoint[] = [];
  const waypointsB: RouteWaypoint[] = [];

  // Intermediate landmark names based on progression
  const intermediateNames = [
    'Departure Dispatch Gate',
    'Main Arterial Incline Link',
    'Commercial Crossroad',
    'Flyover Approach Ramp (+7.5% Grade)',
    'Overpass Crest (Peak Drag & Solar Heat)',
    'Flyover Descent & Traffic Bottleneck',
    'Secondary Arterial Junction',
    'Signal Stop-and-Go Hot Zone',
    'Corridor Link Crossing',
    'Potholed Service Lane Patch',
    'Final Approach Straight',
    'Customer Delivery Gate',
  ];

  const voltpathNames = [
    'Departure Dispatch Gate',
    'Low-Grade Service Bypass',
    'Shaded Tree-Canopy Avenue',
    'Gentle Arterial Cruising Corridor',
    'Grade-Neutral Underpass Route',
    'Steady Momentum Corridor',
    'Tree-Lined Green Belt Parkway',
    'Regenerative Downslope Segment',
    'Eco-Friendly Tech Boulevard',
    'Smooth Tarmac Connector',
    'Level Final Approach Straight',
    'Customer Delivery Gate',
  ];

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;

    // --- Route A (Standard Flat Route) ---
    // Naive direct line with urban bridge climb and broken surface
    const arcCurvatureA = Math.sin(fraction * Math.PI) * 0.0025; // slight direct zig-zag
    const latA = source.lat + dLat * i + arcCurvatureA;
    const lngA = source.lng + dLng * i - arcCurvatureA * 0.5;

    // Flyover elevation bump in the middle (steps 3 to 6)
    const flyoverRidge = Math.sin(fraction * Math.PI) * 22; // up to +22m steep flyover ramp
    const elevA = Math.round(elevStart + (elevEnd - elevStart) * fraction + flyoverRidge);

    const isMidA = i >= 3 && i <= 7;
    const roadQualityA: 'smooth' | 'rough' | 'broken' = isMidA ? 'broken' : (i % 2 === 0 ? 'rough' : 'smooth');
    const speedA = isMidA ? 18 : (i === 0 || i === steps ? 22 : 28);
    const isStopA = i === 5 || i === 8;

    waypointsA.push({
      lat: parseFloat(latA.toFixed(5)),
      lng: parseFloat(lngA.toFixed(5)),
      elevationM: elevA,
      name: intermediateNames[Math.min(i, intermediateNames.length - 1)],
      speedKmh: speedA,
      roadQuality: roadQualityA,
      isStop: isStopA,
    });

    // --- Route B (VoltPath Energy-Aware Route) ---
    // Curved arterial bypass with lower slope and shaded tarmac
    const arcCurvatureB = -Math.sin(fraction * Math.PI) * 0.0065; // bypass curved arc away from flyover
    const latB = source.lat + dLat * i + arcCurvatureB;
    const lngB = source.lng + dLng * i + arcCurvatureB * 0.8;

    // Gentle linear slope, avoiding the flyover ridge
    const elevB = Math.round(elevStart + (elevEnd - elevStart) * fraction - Math.sin(fraction * Math.PI) * 3);

    const speedB = i === 0 || i === steps ? 24 : 35; // smooth cruising speed
    waypointsB.push({
      lat: parseFloat(latB.toFixed(5)),
      lng: parseFloat(lngB.toFixed(5)),
      elevationM: elevB,
      name: voltpathNames[Math.min(i, voltpathNames.length - 1)],
      speedKmh: speedB,
      roadQuality: 'smooth',
      isStop: false,
    });
  }

  // Filter relevant swap stations near this route bounding box
  const minLat = Math.min(source.lat, destination.lat) - 0.02;
  const maxLat = Math.max(source.lat, destination.lat) + 0.02;
  const minLng = Math.min(source.lng, destination.lng) - 0.02;
  const maxLng = Math.max(source.lng, destination.lng) + 0.02;

  const relevantStations = ALL_SWAP_STATIONS.filter(
    (s) => s.lat >= minLat && s.lat <= maxLat && s.lng >= minLng && s.lng <= maxLng
  );

  return {
    center: {
      lat: parseFloat(((source.lat + destination.lat) / 2).toFixed(5)),
      lng: parseFloat(((source.lng + destination.lng) / 2).toFixed(5)),
      zoom: 13,
    },
    routeA: {
      id: `route-a-${source.id}-to-${destination.id}`,
      name: `Route A: Direct Flat (${source.name.split(' (')[0]} ➔ ${destination.name.split(' (')[0]})`,
      description: 'Naive distance-minimal routing via direct traffic arterial & flyover ramps. High grade drag and thermal bottleneck.',
      waypoints: waypointsA,
    },
    routeB: {
      id: `route-b-${source.id}-to-${destination.id}`,
      name: `Route B: VoltPath Optimal (${source.name.split(' (')[0]} ➔ ${destination.name.split(' (')[0]})`,
      description: 'Physics-informed terrain-optimized dispatch. Avoids flyover ramps, routes through shaded canopies with steady cruising speed.',
      waypoints: waypointsB,
    },
    swapStations: relevantStations.length > 0 ? relevantStations : ALL_SWAP_STATIONS.slice(0, 3),
  };
}

// Default export for backward compatibility with existing corridor consumers
export const DELIVERY_CORRIDORS = {
  bengaluru: {
    id: 'bengaluru',
    regionName: 'Bengaluru Urban Corridor',
    hubName: DELIVERY_HUBS[0].name,
    destinationName: DELIVERY_HUBS[5].name,
    defaultAmbientTempC: 42,
    ...generateDynamicRoutePair(DELIVERY_HUBS[0], DELIVERY_HUBS[5]),
  },
};
