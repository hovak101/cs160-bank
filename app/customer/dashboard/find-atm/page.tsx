"use client";

import { useState, useEffect } from "react";
import { Landmark, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type ATMResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: string;
};

export default function FindATMPage() {
  const [atms, setAtms] = useState<ATMResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [zipCode, setZipCode] = useState("");
  const [geoFailed, setGeoFailed] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoFailed(true);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setGeoFailed(true);
        setLoading(false);
      },
      { timeout: 5000 }
    );
  }, []);

  async function searchByZip() {
    if (!zipCode.trim()) return;
    setError("");
    setLoading(true);
    try {
      const geoRes = await fetch(
        `/api/find-atm?zip=${encodeURIComponent(zipCode.trim())}`
      );
      if (!geoRes.ok) throw new Error("Failed to search");
      const data = await geoRes.json();
      setAtms(data.results || []);
      if (data.location) setUserLocation(data.location);
    } catch {
      setError("Could not search that location. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userLocation) return;

    async function fetchATMs() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/find-atm?lat=${userLocation!.lat}&lng=${userLocation!.lng}`
        );
        if (!res.ok) throw new Error("Failed to fetch ATMs");
        const data = await res.json();
        setAtms(data.results || []);
      } catch {
        setError("Could not find nearby ATMs. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchATMs();
  }, [userLocation]);

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Landmark className="h-5 w-5 text-teal-500" />
            Vitality <span className="text-teal-500">Bank</span>
          </div>
          <Link href="/customer/dashboard" className="text-sm text-teal-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Find Nearest Chase ATM</h1>
          <p className="mt-1 text-sm text-slate-500">
            {geoFailed
              ? "Enter a zip code or city to find nearby Chase ATMs"
              : "Showing Chase ATMs near your current location"}
          </p>
        </div>

        <div className="mb-6 flex gap-2">
          <Input
            placeholder="Enter zip code or city"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchByZip()}
            className="max-w-xs text-slate-800"
          />
          <Button onClick={searchByZip} className="bg-teal-600 hover:bg-teal-700">
            Search
          </Button>
        </div>

        {loading && <p className="text-sm text-slate-400">Searching for nearby ATMs…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && atms.length > 0 && (
          <div className="space-y-3">
            {atms.map((atm, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-[0_0_40px_-8px_hsl(174_72%_42%_/_0.25)] transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-teal-500" />
                      <p className="font-medium text-slate-800">{atm.name}</p>
                    </div>
                    <p className="text-sm text-slate-500">{atm.address}</p>
                    <p className="text-xs text-slate-400 mt-1">{atm.distance} away</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${atm.lat},${atm.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="text-teal-600">
                      <Navigation className="h-4 w-4 mr-1" />
                      Directions
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && atms.length === 0 && userLocation && (
          <p className="text-sm text-slate-400">No Chase ATMs found nearby.</p>
        )}
      </main>
    </>
  );
}
