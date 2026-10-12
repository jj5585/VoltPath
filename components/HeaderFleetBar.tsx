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
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
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

export type SimulationState = 'IDLE' | 'LOADING' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CRITICAL_STALL';

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
  simState: SimulationState;
  activePresetId?: string;
  onOpenScenarioModal: () => void;
  googleMapsApiKey: string;
  mapEngine: 'maplibre' | 'google';
  onOpenKeyModal: () => void;
  // Controls
  onPlayPause?: () => void;
  onReset?: () => void;
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
  simState,
  activePresetId,
  onOpenScenarioModal,
  googleMapsApiKey,
  mapEngine,
  onOpenKeyModal,
  onPlayPause,
  onReset,
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

  // Status badge formatting
  const getStatusBadge = () => {
    switch (simState) {
      case 'RUNNING':
        return {
          label: 'RUNNING',
          color: 'text-[#00F5A0]',
          dot: 'bg-[#00F5A0] animate-pulse',
        };
      case 'PAUSED':
        return {
          label: 'PAUSED',
          color: 'text-amber-400',
          dot: 'bg-amber-400',
        };
      case 'COMPLETED':
        return {
          label: 'COMPLETED',
          color: 'text-emerald-400',
          dot: 'bg-emerald-400',
        };
      case 'CRITICAL_STALL':
        return {
          label: 'CRITICAL STALL',
          color: 'text-red-400 animate-pulse',
          dot: 'bg-red-400 animate-ping',
        };
      case 'LOADING':
        return {
          label: 'FETCHING ROUTE',
          color: 'text-[#00D2FF]',
          dot: 'bg-[#00D2FF] animate-spin',
        };
      default:
        return {
          label: 'IDLE (SIMULATOR)',
          color: 'text-slate-400',
          dot: 'bg-slate-600',
        };
    }
  };

  const status = getStatusBadge();

  return (
    <header className="bg-[#090D16] border-b border-volt-border px-4 py-2.5 shrink-0 select-none">
      {/* Top Row: Brand + Vehicle + Presets + Scenario Config + Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Zap className="w-6 h-6 text-[#00F5A0]" />
            <div className="absolute inset-0 blur-md bg-[#00F5A0]/25 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight">
                <span className="text-[#00F5A0]">Volt</span>
                <span className="text-white">Path</span>
              </h1>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#00F5A0]/15 text-[#00F5A0] border border-[#00F5A0]/30 uppercase">
                2.0
              </span>
            </div>
            <p className="text-[9px] text-slate-400 -mt-0.5 tracking-wider uppercase font-mono">
              EV Fleet Energy Intelligence
            </p>
          </div>
        </div>

        {/* Vehicle Selector */}
        <div className="flex-1 max-w-xs min-w-[200px]">
          <div className="relative">
            <Truck className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              className="w-full bg-[#111726] border border-volt-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-[#00F5A0]/50 transition-colors"
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
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Shift Presets */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {SHIFT_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onPresetSelect(preset)}
                title={preset.description}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-[#00F5A0]/15 border-[#00F5A0]/50 text-[#00F5A0]'
                    : 'bg-[#111726] border-volt-border text-slate-300 hover:border-slate-500'
                }`}
              >
                {preset.icon}
                <span className="hidden xl:inline text-[11px]">{preset.label}</span>
              </button>
            );
          })}

          {/* Custom Scenario Config Button */}
          <button
            onClick={onOpenScenarioModal}
            title="Open Custom Scenario Variables & Matrix Comparison"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#111726] border border-[#00D2FF]/40 text-[#00D2FF] hover:bg-[#00D2FF]/10 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px]">Matrix / Variables</span>
          </button>
        </div>

        {/* Right Section: API Key + Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Key Button */}
          <button
            onClick={onOpenKeyModal}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              googleMapsApiKey
                ? mapEngine === 'google'
                  ? 'bg-[#00D2FF]/15 border-[#00D2FF]/40 text-[#00D2FF]'
                  : 'bg-[#111726] border-volt-border text-slate-300 hover:border-[#00D2FF]/40'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Google Maps Platform Configuration"
          >
            <Key className="w-3 h-3" />
            <span className="hidden sm:inline">
              {googleMapsApiKey ? 'Google Maps' : 'Add API Key'}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                googleMapsApiKey ? 'bg-[#00D2FF]' : 'bg-amber-400'
              }`}
            />
          </button>

          {/* Simulation Status Badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#111726] border border-volt-border">
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <span className={`text-[10px] font-mono font-bold ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Sliders & Quick Stats */}
      <div className="flex flex-wrap items-center gap-5 pt-1.5 border-t border-volt-border/50">
        {/* Ambient Temperature Slider */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[180px]">
          <Thermometer className={`w-3.5 h-3.5 ${tempColor} shrink-0`} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-slate-400">Ambient Heat</span>
              <span className={`text-xs font-mono font-bold ${tempColor}`}>
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
          </div>
        </div>

        {/* Payload Slider */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[180px]">
          <Weight className={`w-3.5 h-3.5 ${payloadColor} shrink-0`} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-slate-400">Cargo Payload</span>
              <span className={`text-xs font-mono font-bold ${payloadColor}`}>
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
          </div>
        </div>

        {/* Start SoC Slider */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[180px]">
          <Battery
            className={`w-3.5 h-3.5 ${
              startSocPct >= 60
                ? 'text-emerald-400'
                : startSocPct >= 35
                ? 'text-yellow-400'
                : 'text-red-400'
            } shrink-0`}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-slate-400">Dispatch SoC</span>
              <span
                className={`text-xs font-mono font-bold ${
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
          </div>
        </div>
      </div>
    </header>
  );
}
