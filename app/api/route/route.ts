import { NextRequest, NextResponse } from 'next/server';
import { fetchRealRoadRoutes } from '@/lib/mapRoutingService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const originLat = parseFloat(searchParams.get('originLat') || '12.9716');
  const originLng = parseFloat(searchParams.get('originLng') || '77.6412');
  const destLat = parseFloat(searchParams.get('destLat') || '12.9260');
  const destLng = parseFloat(searchParams.get('destLng') || '77.6830');
  const originName = (searchParams.get('originName') || 'Origin Hub').slice(0, 100);
  const destName = (searchParams.get('destName') || 'Destination Hub').slice(0, 100);

  // Validate coordinates
  if (
    isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng) ||
    originLat < -90 || originLat > 90 || destLat < -90 || destLat > 90 ||
    originLng < -180 || originLng > 180 || destLng < -180 || destLng > 180
  ) {
    return NextResponse.json(
      { status: 'error', error: 'Coordinates must be valid numbers within WGS84 ranges (lat: [-90, 90], lng: [-180, 180]).' },
      { status: 400 }
    );
  }

  try {
    const result = await fetchRealRoadRoutes(
      { lat: originLat, lng: originLng, name: originName },
      { lat: destLat, lng: destLng, name: destName }
    );

    if (!result) {
      return NextResponse.json(
        {
          status: 'unavailable',
          error: 'External routing providers (Google Routes API / OSRM) were unreachable or could not calculate a street route for this coordinate pair.',
          advice: 'Use the offline regional corridor model.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: error?.message || 'Unexpected routing service error' },
      { status: 500 }
    );
  }
}
