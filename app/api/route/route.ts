import { NextRequest, NextResponse } from 'next/server';
import { fetchRealRoadRoutes } from '@/lib/mapRoutingService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const originLat = parseFloat(searchParams.get('originLat') || '12.9716');
  const originLng = parseFloat(searchParams.get('originLng') || '77.6412');
  const destLat = parseFloat(searchParams.get('destLat') || '12.9260');
  const destLng = parseFloat(searchParams.get('destLng') || '77.6830');
  const originName = searchParams.get('originName') || 'Origin Hub';
  const destName = searchParams.get('destName') || 'Destination Hub';
  const apiKey = searchParams.get('apiKey') || undefined;

  if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const result = await fetchRealRoadRoutes(
    { lat: originLat, lng: originLng, name: originName },
    { lat: destLat, lng: destLng, name: destName },
    apiKey
  );

  if (!result) {
    return NextResponse.json({ error: 'Could not fetch road route' }, { status: 502 });
  }

  return NextResponse.json({
    status: 'success',
    ...result,
  });
}
