'use client';

import React, { useState } from 'react';
import { ArrowLeftRight, MapPin, Building2, ChevronDown, Navigation, Sparkles, Loader2, Check } from 'lucide-react';
import { DeliveryHub } from '@/lib/geospatialData';

interface CorridorSelectorBarProps {
  hubs: DeliveryHub[];
  selectedSource: DeliveryHub;
  selectedDestination: DeliveryHub;
  onSelectSource: (hub: DeliveryHub) => void;
  onSelectDestination: (hub: DeliveryHub) => void;
  onSwapHubs: () => void;
  onOpenCustomModal: (type: 'source' | 'destination') => void;
  onUpdateElevations?: (srcElev: number, dstElev: number) => void;
}

export default function CorridorSelectorBar({
  hubs,
  selectedSource,
  selectedDestination,
  onSelectSource,
  onSelectDestination,
  onSwapHubs,
  onOpenCustomModal,
  onUpdateElevations,
}: CorridorSelectorBarProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const sources = hubs.filter((h) => h.type === 'source' || h.type === 'both');
  const destinations = hubs.filter((h) => h.type === 'destination' || h.type === 'both');

  // Calculate approximate aerial distance
  const dLat = ((selectedDestination.lat - selectedSource.lat) * Math.PI) / 180;
  const dLon = ((selectedDestination.lng - selectedSource.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((selectedSource.lat * Math.PI) / 180) *
      Math.cos((selectedDestination.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const aerialDistanceKm = (6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  const elevDeltaM = selectedDestination.elevationM - selectedSource.elevationM;

  const handleAutoDetectElevations = async () => {
    setIsSyncing(true);
    setSyncSuccess(null);
    try {
      const locStr = `${selectedSource.lat},${selectedSource.lng}|${selectedDestination.lat},${selectedDestination.lng}`;
      const res = await fetch(`/api/elevation?locations=${encodeURIComponent(locStr)}`);
      const data = await res.json();

      if (data.status === 'success' && Array.isArray(data.elevations) && data.elevations.length === 2) {
        const [srcElev, dstElev] = data.elevations;
        if (onUpdateElevations) {
          onUpdateElevations(srcElev, dstElev);
        }
        setSyncSuccess(`Elevations Synced: ${srcElev}m ➔ ${dstElev}m (${data.source?.split(' (')[0] || 'Auto-Detected'})`);
        setTimeout(() => setSyncSuccess(null), 3000);
      }
    } catch {
      // Fallback
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-[#0B0F19] border-b border-volt-border px-4 py-2 flex flex-wrap items-center justify-between gap-3">
      {/* Route Selector Group */}
      <div className="flex flex-1 items-center gap-2 max-w-4xl">
        {/* Source Hub Picker */}
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#00F5A0]"></span>
            <span>Dispatch Origin (Source Dark Store)</span>
            <span className="text-[10px] font-mono text-[#00F5A0]/90 ml-auto font-bold">
              {selectedSource.elevationM}m ASL
            </span>
          </div>
          <div className="relative">
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#00F5A0]" />
            <select
              value={selectedSource.id}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  onOpenCustomModal('source');
                } else {
                  const hub = hubs.find((h) => h.id === e.target.value);
                  if (hub) onSelectSource(hub);
                }
              }}
              className="w-full bg-[#0E1422] border border-volt-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-[#00F5A0] transition-colors"
            >
              <optgroup label="Bengaluru Fulfillment Hubs">
                {sources
                  .filter((h) => h.city === 'bengaluru')
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Delhi NCR Hubs">
                {sources
                  .filter((h) => h.city === 'delhi_ncr')
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
              </optgroup>
              {sources
                .filter((h) => h.brand === 'Custom')
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    📍 {h.name}
                  </option>
                ))}
              <option value="custom">+ Specify Custom Coordinates...</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={onSwapHubs}
          title="Swap Source and Destination"
          className="mt-4 p-2 rounded-lg bg-volt-card border border-volt-border hover:border-[#00F5A0] hover:text-[#00F5A0] text-slate-400 transition-all shrink-0 hover:scale-105"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>

        {/* Destination Hub Picker */}
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#00D2FF]"></span>
            <span>Delivery Destination (Drop-off Cluster)</span>
            <span className="text-[10px] font-mono text-[#00D2FF]/90 ml-auto font-bold">
              {selectedDestination.elevationM}m ASL
            </span>
          </div>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#00D2FF]" />
            <select
              value={selectedDestination.id}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  onOpenCustomModal('destination');
                } else {
                  const hub = hubs.find((h) => h.id === e.target.value);
                  if (hub) onSelectDestination(hub);
                }
              }}
              className="w-full bg-[#0E1422] border border-volt-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-[#00D2FF] transition-colors"
            >
              <optgroup label="Bengaluru Tech Parks & Delivery Zones">
                {destinations
                  .filter((h) => h.city === 'bengaluru')
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Delhi NCR Commercial Hubs">
                {destinations
                  .filter((h) => h.city === 'delhi_ncr')
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
              </optgroup>
              {destinations
                .filter((h) => h.brand === 'Custom')
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    📍 {h.name}
                  </option>
                ))}
              <option value="custom">+ Specify Custom Coordinates...</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Right Controls: Auto-Detect Elevation & Corridor Metrics */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Auto Elevation Button */}
        <button
          onClick={handleAutoDetectElevations}
          disabled={isSyncing}
          title="Auto-Detect real terrain elevation for Source and Destination"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#00F5A0]/10 border border-[#00F5A0]/30 hover:bg-[#00F5A0]/20 text-[#00F5A0] transition-all disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Detecting...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto Elevation</span>
            </>
          )}
        </button>

        {/* Corridor Quick Metrics Badge */}
        <div className="flex items-center gap-2.5 bg-[#0E1422] border border-volt-border/70 rounded-lg px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-[#00F5A0]" />
            <span className="text-slate-400">Vector:</span>
            <span className="font-mono font-bold text-white">{aerialDistanceKm} km</span>
          </div>
          <div className="w-px h-3.5 bg-volt-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Slope:</span>
            <span
              className={`font-mono font-bold ${
                elevDeltaM > 0
                  ? 'text-amber-400'
                  : elevDeltaM < 0
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              {elevDeltaM > 0 ? `+${elevDeltaM}m (Climb)` : elevDeltaM < 0 ? `${elevDeltaM}m (Descent)` : '0m (Flat)'}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification when Elevations Synced */}
      {syncSuccess && (
        <div className="w-full bg-[#00F5A0]/10 border border-[#00F5A0]/30 rounded-lg px-3 py-1 text-[11px] text-[#00F5A0] flex items-center gap-2 animate-pulse">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{syncSuccess}</span>
        </div>
      )}
    </div>
  );
}
