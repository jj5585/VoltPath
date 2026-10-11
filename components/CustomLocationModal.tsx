'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, X, Check, Mountain, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { DeliveryHub } from '@/lib/geospatialData';

interface CustomLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'source' | 'destination';
  onSaveCustomHub: (hub: DeliveryHub) => void;
}

const PRESET_COORDINATES = [
  { name: 'Indiranagar 100ft', lat: '12.9716', lng: '77.6412', city: 'bengaluru' },
  { name: 'Bellandur EcoSpace', lat: '12.9260', lng: '77.6830', city: 'bengaluru' },
  { name: 'Koramangala 80ft', lat: '12.9352', lng: '77.6245', city: 'bengaluru' },
  { name: 'Whitefield ITPL', lat: '12.9850', lng: '77.7280', city: 'bengaluru' },
  { name: 'Electronic City Toll', lat: '12.8450', lng: '77.6620', city: 'bengaluru' },
  { name: 'Hauz Khas (Delhi)', lat: '28.5494', lng: '77.2001', city: 'delhi_ncr' },
];

export default function CustomLocationModal({
  isOpen,
  onClose,
  targetType,
  onSaveCustomHub,
}: CustomLocationModalProps) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('12.9716');
  const [lng, setLng] = useState('77.6412');
  const [elevation, setElevation] = useState('905');
  const [isFetchingElevation, setIsFetchingElevation] = useState(false);
  const [elevationSource, setElevationSource] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Auto-fetch elevation function
  const fetchElevationAuto = async (latitudeStr = lat, longitudeStr = lng) => {
    const latNum = parseFloat(latitudeStr);
    const lngNum = parseFloat(longitudeStr);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setFetchError('Enter valid latitude and longitude first');
      return;
    }

    setIsFetchingElevation(true);
    setFetchError(null);
    setElevationSource(null);

    try {
      const res = await fetch(`/api/elevation?lat=${latNum}&lng=${lngNum}`);
      const data = await res.json();

      if (data.status === 'success' && data.elevation !== undefined) {
        setElevation(data.elevation.toString());
        setElevationSource(data.source || 'SRTM Global Model');
      } else {
        setFetchError('Could not fetch elevation; falling back to manual entry');
      }
    } catch {
      setFetchError('Network error while querying elevation');
    } finally {
      setIsFetchingElevation(false);
    }
  };

  // Auto-fetch when modal opens if elevation is not customized
  useEffect(() => {
    if (isOpen) {
      fetchElevationAuto(lat, lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (p: typeof PRESET_COORDINATES[0]) => {
    setName(p.name);
    setLat(p.lat);
    setLng(p.lng);
    fetchElevationAuto(p.lat, p.lng);
  };

  const handleSave = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const elevNum = parseInt(elevation) || 900;

    if (isNaN(latNum) || isNaN(lngNum)) return;

    const newHub: DeliveryHub = {
      id: `custom-${Date.now()}`,
      name:
        name.trim() ||
        `Custom ${targetType === 'source' ? 'Origin' : 'Destination'} (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`,
      brand: 'Custom',
      lat: latNum,
      lng: lngNum,
      elevationM: elevNum,
      address: `Coordinates: ${latNum.toFixed(4)}, ${lngNum.toFixed(4)} • ${elevNum}m ASL`,
      city: latNum > 20 ? 'delhi_ncr' : 'bengaluru',
      type: targetType,
    };

    onSaveCustomHub(newHub);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0E131F] border border-volt-border rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-volt-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg ${
                targetType === 'source'
                  ? 'bg-[#00F5A0]/10 text-[#00F5A0]'
                  : 'bg-[#00D2FF]/10 text-[#00D2FF]'
              }`}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Set Custom {targetType === 'source' ? 'Dispatch Source' : 'Delivery Destination'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Specify Indian geospatial coordinates with automatic terrain elevation detection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400">Quick Landmark Presets:</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COORDINATES.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className="px-2.5 py-1 text-[10px] rounded-lg bg-volt-card border border-volt-border hover:border-[#00F5A0] text-slate-300 hover:text-white transition-all font-mono"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Location Label / Hub Name
            </label>
            <input
              type="text"
              placeholder={targetType === 'source' ? 'e.g., Zepto Hub Koramangala' : 'e.g., Manyata Tech Park'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0A0E17] border border-volt-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#00F5A0]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                onBlur={() => fetchElevationAuto(lat, lng)}
                className="w-full bg-[#0A0E17] border border-volt-border rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00F5A0]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                onBlur={() => fetchElevationAuto(lat, lng)}
                className="w-full bg-[#0A0E17] border border-volt-border rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00F5A0]"
              />
            </div>
          </div>

          {/* Elevation Section with Automatic Detection */}
          <div className="bg-[#0A0E17] border border-volt-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-amber-400" />
                <span>Elevation (Meters ASL)</span>
              </label>

              {/* Automatic Fetch Button */}
              <button
                type="button"
                onClick={() => fetchElevationAuto(lat, lng)}
                disabled={isFetchingElevation}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#00F5A0]/15 text-[#00F5A0] border border-[#00F5A0]/30 hover:bg-[#00F5A0]/25 transition-all disabled:opacity-50"
              >
                {isFetchingElevation ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Detecting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-[#00F5A0]" />
                    <span>Auto-Detect Elevation</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={elevation}
                  onChange={(e) => {
                    setElevation(e.target.value);
                    setElevationSource('Manual Entry');
                  }}
                  className="w-full bg-[#0E1422] border border-volt-border rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#00F5A0]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                  meters
                </span>
              </div>
            </div>

            {/* Source / Status Banner */}
            {elevationSource && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#00F5A0]">
                <Check className="w-3 h-3" />
                <span>Auto-detected: <strong>{elevation}m ASL</strong> via {elevationSource}</span>
              </div>
            )}

            {fetchError && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                <AlertCircle className="w-3 h-3" />
                <span>{fetchError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-volt-border/60">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-[#0A0E17] transition-all shadow-md ${
              targetType === 'source'
                ? 'bg-[#00F5A0] hover:bg-[#00F5A0]/90'
                : 'bg-[#00D2FF] hover:bg-[#00D2FF]/90'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            Apply Location
          </button>
        </div>
      </div>
    </div>
  );
}
