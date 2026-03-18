"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/customer/dashboard"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">Find Nearest Chase ATM</h1>
          <p className="mt-1 text-sm text-slate-400">
            {geoFailed
              ? "Enter a zip code or city to find nearby Chase ATMs"
              : "Showing Chase ATMs near your current location"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Enter zip code or city"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchByZip()}
          className="max-w-xs bg-[#0f172a] border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/50"
        />
        <Button onClick={searchByZip} className="bg-teal-600 hover:bg-teal-700 text-white">
          Search
        </Button>
      </div>

      {/* Loading / Error */}
      {loading && <p className="text-sm text-slate-400">Searching for nearby ATMs…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Results */}
      {!loading && atms.length > 0 && (
        <div className="space-y-3">
          {atms.map((atm, i) => (
            <Card
              key={i}
              className="bg-[#0f172a] border-white/10 hover:border-cyan-400/50 transition-all p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-400">
                      <MapPin size={16} />
                    </div>
                    <p className="font-semibold text-white">{atm.name}</p>
                  </div>
                  <p className="text-sm text-slate-400 ml-10">{atm.address}</p>
                  <p className="text-xs text-slate-500 mt-1 ml-10">{atm.distance} away</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${atm.lat},${atm.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10">
                    <Navigation size={16} className="mr-1" />
                    Directions
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && atms.length === 0 && userLocation && (
        <p className="text-sm text-slate-400">No Chase ATMs found nearby.</p>
      )}
    </div>
  );
}
