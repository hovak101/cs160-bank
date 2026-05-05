import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let lat = searchParams.get("lat");
  let lng = searchParams.get("lng");
  const query =
    searchParams.get("query")?.trim() || searchParams.get("zip")?.trim() || "";

  if (query.length > 200) {
    return NextResponse.json(
      { error: "Address is too long." },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 });
  }

  // If an address, city, or zip is provided, geocode it to lat/lng first.
  if (query && (!lat || !lng)) {
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (geoData.status !== "OK" || !geoData.results?.length) {
      return NextResponse.json({ error: "Could not find that location" }, { status: 400 });
    }

    lat = geoData.results[0].geometry.location.lat.toString();
    lng = geoData.results[0].geometry.location.lng.toString();
  }

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat/lng or a search query are required" },
      { status: 400 }
    );
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      { error: "Latitude and longitude must be valid coordinates." },
      { status: 400 }
    );
  }

  const keyword = encodeURIComponent("Chase ATM");
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=12000&type=atm&keyword=${keyword}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json({ error: "Google Places API error" }, { status: 500 });
  }

  const results = ((data.results || []) as GooglePlaceResult[])
    .filter(isChaseAtmResult)
    .slice(0, 10)
    .map((place) => {
      const placeLat = Number(place.geometry?.location?.lat ?? 0);
      const placeLng = Number(place.geometry?.location?.lng ?? 0);
      const distanceMiles = haversine(latitude, longitude, placeLat, placeLng);

      return {
        atm_id:
          place.place_id ||
          `${slugify(place.name || "atm")}-${placeLat.toFixed(5)}-${placeLng.toFixed(5)}`,
        name: place.name || "Chase ATM",
        address: place.vicinity || place.formatted_address || "Address unavailable",
        lat: placeLat,
        lng: placeLng,
        distance: formatDistance(distanceMiles),
        distance_miles: distanceMiles,
      };
    })
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .map((place) => ({
      atm_id: place.atm_id,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      distance: place.distance,
    }));
  return NextResponse.json({
    results,
    location: { lat: latitude, lng: longitude },
  });
}

function isChaseAtmResult(place: GooglePlaceResult) {
  const haystack = [place.name, place.vicinity, place.formatted_address]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes("chase");
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

function formatDistance(distanceMiles: number) {
  return distanceMiles < 1
    ? `${Math.round(distanceMiles * 5280)} ft`
    : `${distanceMiles.toFixed(1)} mi`;
}

function slugify(value: string) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type GooglePlaceResult = {
  place_id?: string;
  name?: string;
  vicinity?: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};
