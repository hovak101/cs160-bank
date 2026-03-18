import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let lat = searchParams.get("lat");
  let lng = searchParams.get("lng");
  const zip = searchParams.get("zip");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 });
  }

  // If zip/city provided, geocode it to lat/lng
  if (zip && (!lat || !lng)) {
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&key=${apiKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (geoData.status !== "OK" || !geoData.results?.length) {
      return NextResponse.json({ error: "Could not find that location" }, { status: 400 });
    }

    lat = geoData.results[0].geometry.location.lat.toString();
    lng = geoData.results[0].geometry.location.lng.toString();
  }

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat/lng or zip are required" }, { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=8000&keyword=Chase+ATM&type=atm&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json({ error: "Google Places API error" }, { status: 500 });
  }

  const results = (data.results || []).slice(0, 10).map((place: any) => {
    const placeLat = place.geometry.location.lat;
    const placeLng = place.geometry.location.lng;
    const dist = haversine(Number(lat), Number(lng), placeLat, placeLng);

    return {
      name: place.name,
      address: place.vicinity,
      lat: placeLat,
      lng: placeLng,
      distance: dist < 1 ? `${Math.round(dist * 5280)} ft` : `${dist.toFixed(1)} mi`,
    };
  });

  results.sort((a: any, b: any) => parseFloat(a.distance) - parseFloat(b.distance));

  return NextResponse.json({ results, location: { lat: Number(lat), lng: Number(lng) } });
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
