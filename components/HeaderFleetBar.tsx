'use client';

import React from 'react';
import {
  Truck,
  Thermometer,
  Weight,
  Sun,
  Moon,
  CloudRain,
  Mountain,
  Zap,
  Battery,
  ChevronDown,
  Key,
  MapPin,
} from 'lucide-react';
import { FLEET_VEHICLES, VehicleSpecs } from '@/lib/physicsEngine';

export interface ShiftPreset {
  id: string;
  label: string;
  icon: React.ReactNode;
  ambientTempC: number;
  payloadKg: number;
  startSocPct: number;
  description: string;
  roadQualityOverride?: 'smooth' | 'rough' | 'broken';
}

export const SHIFT_PRESETS: ShiftPreset[] = [
  {
    id: 'noon-peak',
    label: 'Noon Peak Shift',
    icon: <Sun className="w-4 h-4 text-orange-400" />,
    ambientTempC: 43,
    payloadKg: 120,
    startSocPct: 55,
    description: '43°C blazing heat, 120kg grocery cargo — extreme thermal load',
  },
  {
    id: 'night-shift',
    label: 'Night Shift',
    icon: <Moon className="w-4 h-4 text-blue-300" />,
    ambientTempC: 28,
    payloadKg: 20,
    startSocPct: 82,
    description: '28°C cool night, 20kg light delivery — optimal range',
  },
  {
    id: 'monsoon-potholes',
    label: 'Monsoon Potholes',
    icon: <CloudRain className="w-4 h-4 text-cyan-400" />,
    ambientTempC: 33,
    payloadKg: 90,
    startSocPct: 60,
    description: '33°C humid, 90kg load, broken road surface C_rr=0.035',
    roadQualityOverride: 'broken',
  },
  {
    id: 'steep-flyover',
    label: 'Steep Flyover Rush',
    icon: <Mountain className="w-4 h-4 text-yellow-400" />,
    ambientTempC: 41,
    payloadKg: 135,
    startSocPct: 48,
    description: '41°C heat, 135kg payload, steep flyover gradient resistance',
  },
];

interface HeaderFleetBarProps {
  selectedVehicle: VehicleSpecs;
  onVehicleChange: (vehicle: VehicleSpecs) => void;
  ambientTempC: number;
  onAmbientTempChange: (temp: number) => void;
  payloadKg: number;
  onPayloadChange: (kg: number) => void;
  startSocPct: number;
  onStartSocChange: (soc: number) => void;
  onPresetSelect: (preset: ShiftPreset) => void;
  isSimulating: boolean;
  googleMapsApiKey: string;
  mapEngine: 'maplibre' | 'google';
  onOpenKeyModal: () => void;
}

export default function HeaderFleetBar({
  selectedVehicle,
  onVehicleChange,
  ambientTempC,
  onAmbientTempChange,
  payloadKg,
  onPayloadChange,
  startSocPct,
  onStartSocChange,
  onPresetSelect,
  isSimulating,
  googleMapsApiKey,
  mapEngine,
  onOpenKeyModal,
}: HeaderFleetBarProps) {
  const tempColor =
    ambientTempC >= 44
      ? 'text-red-400'
      : ambientTempC >= 40
      ? 'text-orange-400'
      : ambientTempC >= 35
      ? 'text-yellow-400'
      : 'text-emerald-400';

  const payloadColor =
    payloadKg >= 120
      ? 'text-red-400'
      : payloadKg >= 80
      ? 'text-orange-400'
      : payloadKg >= 40
      ? 'text-yellow-400'
      : 'text-emerald-400';

  return (
    <header className="bg-[#0D1117] border-b border-volt-border px-4 py-3">
      {/* Top Row: Logo + Vehicle Selector + Presets + API Key Button + Live Status */}
      <div className="flex items-center justify-between gap-4 mb-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <Zap className="w-7 h-7 text-[#00F5A0]" />
            <div className="absolute inset-0 blur-md bg-[#00F5A0]/30 rounded-full" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-[#00F5A0]">Volt</span>
              <span className="text-white">Path</span>
            </h1>
            <p className="text-[10px] text-slate-500 -mt-0.5 tracking-wider uppercase font-mono">
              Fleet Energy Intelligence
            </p>
          </div>
        </div>

        {/* Vehicle Selector */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              className="w-full bg-volt-card border border-volt-border rounded-lg pl-9 pr-8 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-[#00F5A0]/50 transition-colors"
              value={selectedVehicle.id}
              onChange={(e) => {
                const v = FLEET_VEHICLES.find((f) => f.id === e.target.value);
                if (v) onVehicleChange(v);
              }}
            >
              {FLEET_VEHICLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Shift Presets */}
        <div className="flex items-center gap-1.5">
          {SHIFT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onPresetSelect(preset)}
              title={preset.description}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-volt-card border border-volt-border hover:border-[#00F5A0]/40 hover:bg-[#00F5A0]/5 transition-all"
            >
              {preset.icon}
              <span className="hidden xl:inline text-slate-300">{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Google Maps API Key Button */}
        <button
          onClick={onOpenKeyModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            googleMapsApiKey
              ? mapEngine === 'google'
                ? 'bg-[#00D2FF]/15 border-[#00D2FF]/50 text-[#00D2FF]'
                : 'bg-volt-card border-volt-border text-slate-300 hover:border-[#00D2FF]/40'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
          }`}
          title="Configure Google Maps Platform API Key"
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">
            {googleMapsApiKey ? 'Google Maps Key' : 'Add Google Maps Key'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              googleMapsApiKey ? 'bg-[#00D2FF]' : 'bg-amber-400'
            }`}
          />
        </button>

        {/* Live Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`w-2 h-2 rounded-full ${
              isSimulating ? 'bg-[#00F5A0] animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="text-xs text-slate-400 font-mono">
            {isSimulating ? 'LIVE DISPATCH' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Bottom Row: Sliders */}
      <div className="flex items-center gap-6">
        {/* Ambient Temperature Slider */}
        <div className="flex items-center gap-3 flex-1">
          <Thermometer className={`w-4 h-4 ${tempColor} shrink-0`} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Ambient Temperature</span>
              <span className={`text-sm font-mono font-bold ${tempColor}`}>
                {ambientTempC}°C
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={50}
              step={0.5}
              value={ambientTempC}
              onChange={(e) => onAmbientTempChange(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
              <span>20°C</span>
              <span>35°C</span>
              <span>50°C</span>
            </div>
          </div>
        </div>

        {/* Payload Slider */}
        <div className="flex items-center gap-3 flex-1">
          <Weight className={`w-4 h-4 ${payloadColor} shrink-0`} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Cargo Payload</span>
              <span className={`text-sm font-mono font-bold ${payloadColor}`}>
                {payloadKg} kg
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={140}
              step={5}
              value={payloadKg}
              onChange={(e) => onPayloadChange(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
              <span>0 kg</span>
              <span>70 kg</span>
              <span>140 kg</span>
            </div>
          </div>
        </div>

        {/* Start SoC Slider */}
        <div className="flex items-center gap-3 flex-1">
          <Battery
            className={`w-4 h-4 ${
              startSocPct >= 60
                ? 'text-emerald-400'
                : startSocPct >= 35
                ? 'text-yellow-400'
                : 'text-red-400'
            } shrink-0`}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Start SoC</span>
              <span
                className={`text-sm font-mono font-bold ${
                  startSocPct >= 60
                    ? 'text-emerald-400'
                    : startSocPct >= 35
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {startSocPct}%
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              step={1}
              value={startSocPct}
              onChange={(e) => onStartSocChange(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
              <span>20%</span>
              <span>60%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
