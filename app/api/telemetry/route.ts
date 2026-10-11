import { NextRequest, NextResponse } from 'next/server';
import { synthesizeAIS140Frame } from '@/lib/ais140Generator';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const regNo = searchParams.get('regNo') || 'KA 03 JX 6804';
  const vehicleId = searchParams.get('vehicleId') || 'ather-450x';
  const lat = parseFloat(searchParams.get('lat') || '12.9610');
  const lng = parseFloat(searchParams.get('lng') || '77.6385');
  const alt = parseFloat(searchParams.get('alt') || '915');
  const speed = parseFloat(searchParams.get('speed') || '32');
  const heading = parseFloat(searchParams.get('heading') || '135');
  const soc = parseFloat(searchParams.get('soc') || '42.5');
  const temp = parseFloat(searchParams.get('temp') || '44.8');
  const payload = parseFloat(searchParams.get('payload') || '120');
  const ambient = parseFloat(searchParams.get('ambient') || '42');

  const frame = synthesizeAIS140Frame(
    regNo,
    vehicleId,
    lat,
    lng,
    alt,
    speed,
    heading,
    soc,
    temp,
    payload,
    ambient
  );

  return NextResponse.json(frame);
}
