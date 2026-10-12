'use client';

import React, { useState } from 'react';
import {
  Sliders,
  X,
  Thermometer,
  Weight,
  Battery,
  Zap,
  Activity,
  Layers,
  Check,
  RotateCcw,
  Sun,
  Moon,
  CloudRain,
  Mountain,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  FLEET_VEHICLES,
  VehicleSpecs,
  computeRoutePhysics,
  RouteWaypoint,
} from '@/lib/physicsEngine';

export interface CustomScenarioConfig {
  ambientTempC: number;
  payloadKg: number;
  riderWeightKg: number;
  initialSocPct: number;
  initialPackTempC: number;
  roadQuality: 'smooth' | 'rough' | 'broken';
  trafficIntensity: 'low' | 'moderate' | 'high';
  auxPowerW: number;
  vehicleId: string;
}

interface ScenarioConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: CustomScenarioConfig;
  onApplyConfig: (config: CustomScenarioConfig) => void;
  activeWaypoints: RouteWaypoint[];
  currentVehicle: VehicleSpecs;
}

export default function ScenarioConfigModal({
  isOpen,
  onClose,
  currentConfig,
  onApplyConfig,
  activeWaypoints,
  currentVehicle,
}: ScenarioConfigModalProps) {
  const [tempConfig, setTempConfig] = useState<CustomScenarioConfig>(currentConfig);
  const [activeTab, setActiveTab] = useState<'editor' | 'matrix'>('editor');

  if (!isOpen) return null;

  // Selected vehicle for simulation
  const selectedVehicle = FLEET_VEHICLES.find((v) => v.id === tempConfig.vehicleId) || currentVehicle;

  // Compute preset matrix for comparison
  const presetsForMatrix = [
    {
      id: 'noon-peak',
      name: 'Noon Peak Shift',
      icon: <Sun className="w-3.5 h-3.5 text-orange-400" />,
      ambientTempC: 43,
      payloadKg: 120,
      startSocPct: 55,
      roadQuality: 'rough' as const,
    },
    {
      id: 'night-shift',
      name: 'Night Shift',
      icon: <Moon className="w-3.5 h-3.5 text-blue-300" />,
      ambientTempC: 28,
      payloadKg: 20,
      startSocPct: 82,
      roadQuality: 'smooth' as const,
    },
    {
      id: 'monsoon-potholes',
      name: 'Monsoon Potholes',
      icon: <CloudRain className="w-3.5 h-3.5 text-cyan-400" />,
      ambientTempC: 33,
      payloadKg: 90,
      startSocPct: 60,
      roadQuality: 'broken' as const,
    },
    {
      id: 'steep-flyover',
      name: 'Steep Flyover Rush',
      icon: <Mountain className="w-3.5 h-3.5 text-yellow-400" />,
      ambientTempC: 41,
      payloadKg: 135,
      startSocPct: 48,
      roadQuality: 'rough' as const,
    },
  ];

  const matrixResults = presetsForMatrix.map((preset) => {
    const res = computeRoutePhysics(activeWaypoints, selectedVehicle, {
      ambientTempC: preset.ambientTempC,
      payloadKg: preset.payloadKg,
      riderWeightKg: tempConfig.riderWeightKg,
      initialSocPct: preset.startSocPct,
      roadQualityOverride: preset.roadQuality,
      trafficIntensity: tempConfig.trafficIntensity,
      auxPowerW: tempConfig.auxPowerW,
    });
    return {
      preset,
      result: res,
    };
  });

  // Also simulate custom config
  const customResult = computeRoutePhysics(activeWaypoints, selectedVehicle, {
    ambientTempC: tempConfig.ambientTempC,
    payloadKg: tempConfig.payloadKg,
    riderWeightKg: tempConfig.riderWeightKg,
    initialSocPct: tempConfig.initialSocPct,
    initialPackTempC: tempConfig.initialPackTempC,
    roadQualityOverride: tempConfig.roadQuality,
    trafficIntensity: tempConfig.trafficIntensity,
    auxPowerW: tempConfig.auxPowerW,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0D121F] border border-volt-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-volt-border">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#00F5A0]" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Scenario Configuration & Simulation Matrix
              </h2>
              <p className="text-[10px] text-slate-400">
                Adjust physics, thermal, and cargo variables to evaluate fleet performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#121826] border border-volt-border rounded-lg p-0.5 text-xs font-medium">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'editor' ? 'bg-[#00F5A0]/20 text-[#00F5A0]' : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Variables
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'matrix' ? 'bg-[#00D2FF]/20 text-[#00D2FF]' : 'text-slate-400 hover:text-white'
                }`}
              >
                Multi-Scenario Matrix
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'editor' ? (
            <div className="space-y-4">
              {/* Vehicle Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  EV Fleet Vehicle Model
                </label>
                <select
                  value={tempConfig.vehicleId}
                  onChange={(e) => setTempConfig({ ...tempConfig, vehicleId: e.target.value })}
                  className="w-full bg-[#121826] border border-volt-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F5A0]"
                >
                  {FLEET_VEHICLES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.batteryCapacityKwh} kWh, {v.curbWeightKg} kg, {v.nominalVoltageV}V)
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid of Sliders */}
              <div className="grid grid-cols-2 gap-4">
                {/* Ambient Temperature */}
                <div className="bg-[#121826] p-3 rounded-lg border border-volt-border">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-orange-400" /> Ambient Heat
                    </span>
                    <span className="font-mono font-bold text-orange-400">
                      {tempConfig.ambientTempC}°C
                    </span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={50}
                    step={1}
                    value={tempConfig.ambientTempC}
                    onChange={(e) => setTempConfig({ ...tempConfig, ambientTempC: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span>18°C (Night)</span>
                    <span>35°C</span>
                    <span>50°C (Heatwave)</span>
                  </div>
                </div>

                {/* Cargo Payload */}
                <div className="bg-[#121826] p-3 rounded-lg border border-volt-border">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Weight className="w-3.5 h-3.5 text-cyan-400" /> Cargo Payload
                    </span>
                    <span className="font-mono font-bold text-cyan-400">
                      {tempConfig.payloadKg} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={140}
                    step={5}
                    value={tempConfig.payloadKg}
                    onChange={(e) => setTempConfig({ ...tempConfig, payloadKg: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span>0 kg (Unloaded)</span>
                    <span>70 kg</span>
                    <span>140 kg (Max Bag)</span>
                  </div>
                </div>

                {/* Rider Mass */}
                <div className="bg-[#121826] p-3 rounded-lg border border-volt-border">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Weight className="w-3.5 h-3.5 text-purple-400" /> Rider Mass
                    </span>
                    <span className="font-mono font-bold text-purple-400">
                      {tempConfig.riderWeightKg} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={1}
                    value={tempConfig.riderWeightKg}
                    onChange={(e) => setTempConfig({ ...tempConfig, riderWeightKg: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span>50 kg</span>
                    <span>70 kg (Standard)</span>
                    <span>100 kg</span>
                  </div>
                </div>

                {/* Initial SoC */}
                <div className="bg-[#121826] p-3 rounded-lg border border-volt-border">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" /> Initial SoC
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {tempConfig.initialSocPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={1}
                    value={tempConfig.initialSocPct}
                    onChange={(e) => setTempConfig({ ...tempConfig, initialSocPct: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span>20% (Low)</span>
                    <span>60%</span>
                    <span>100% (Full)</span>
                  </div>
                </div>
              </div>

              {/* Road Quality & Traffic Intensity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#121826] p-3 rounded-lg border border-volt-border">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Road Surface Roughness (C_rr)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['smooth', 'rough', 'broken'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => setTempConfig({ ...tempConfig, roadQuality: q })}
                        className={`py-1.5 rounded text-[11px] font-medium capitalize border transition-all ${
                          tempConfig.roadQuality === q
                            ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/50'
                            : 'bg-volt-card text-slate-400 border-volt-border hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-1.5">
                    {tempConfig.roadQuality === 'smooth'
                      ? 'Smooth asphalt: C_rr = 0.012'
                      : tempConfig.roadQuality === 'rough'
                      ? 'Standard Indian urban street: C_rr = 0.022'
                      : 'Severe potholes / monsoon damage: C_rr = 0.036'}
                  </span>
                </div>

                <div className="bg-[#121826] p-3 rounded-lg border border-volt-border">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Traffic & Stop Intensity
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['low', 'moderate', 'high'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTempConfig({ ...tempConfig, trafficIntensity: t })}
                        className={`py-1.5 rounded text-[11px] font-medium capitalize border transition-all ${
                          tempConfig.trafficIntensity === t
                            ? 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/50'
                            : 'bg-volt-card text-slate-400 border-volt-border hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-1.5">
                    {tempConfig.trafficIntensity === 'low'
                      ? 'Steady speed cruising, minimal signals'
                      : tempConfig.trafficIntensity === 'moderate'
                      ? 'Normal commercial urban traffic flow'
                      : 'Heavy stop-and-go acceleration load'}
                  </span>
                </div>
              </div>

              {/* Instant Outcome Preview */}
              <div className="bg-[#080C14] border border-volt-border rounded-lg p-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                  Computed Preview for Custom Configuration
                </span>
                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-[#121826] p-2 rounded">
                    <span className="text-slate-500 text-[9px] block">Energy</span>
                    <span className="font-bold text-white">{customResult.totalEnergyKwh} kWh</span>
                  </div>
                  <div className="bg-[#121826] p-2 rounded">
                    <span className="text-slate-500 text-[9px] block">Efficiency</span>
                    <span className="font-bold text-[#00F5A0]">{customResult.efficiencyWhPerKm} Wh/km</span>
                  </div>
                  <div className="bg-[#121826] p-2 rounded">
                    <span className="text-slate-500 text-[9px] block">Peak Temp</span>
                    <span className={customResult.peakPackTempC >= 45 ? 'font-bold text-red-400' : 'font-bold text-white'}>
                      {customResult.peakPackTempC}°C
                    </span>
                  </div>
                  <div className="bg-[#121826] p-2 rounded">
                    <span className="text-slate-500 text-[9px] block">Arrival SoC</span>
                    <span className={customResult.endSocPct < 15 ? 'font-bold text-red-400' : 'font-bold text-emerald-400'}>
                      {customResult.endSocPct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-Scenario Comparison Matrix */
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Comparison of the selected route corridor evaluated across standardized commercial shift scenarios:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-volt-border text-[10px] uppercase text-slate-400">
                      <th className="py-2">Scenario</th>
                      <th>Temp / Load</th>
                      <th>Energy</th>
                      <th>Wh/km</th>
                      <th>Peak Temp</th>
                      <th>Arrival SoC</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-volt-border/60">
                    {matrixResults.map(({ preset, result }) => (
                      <tr key={preset.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 flex items-center gap-1.5 font-sans font-semibold text-white">
                          {preset.icon}
                          {preset.name}
                        </td>
                        <td className="text-slate-400">
                          {preset.ambientTempC}°C / {preset.payloadKg}kg
                        </td>
                        <td className="text-white font-bold">{result.totalEnergyKwh} kWh</td>
                        <td className="text-[#00F5A0]">{result.efficiencyWhPerKm}</td>
                        <td className={result.peakPackTempC >= 45 ? 'text-red-400 font-bold' : 'text-white'}>
                          {result.peakPackTempC}°C
                        </td>
                        <td className={result.endSocPct < 15 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                          {result.endSocPct}%
                        </td>
                        <td>
                          {result.hasStalled ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/20 text-red-400 border border-red-500/40">
                              STALL
                            </span>
                          ) : result.hasThrottled ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/40">
                              THROTTLE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              SAFE
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-volt-border bg-[#0B0F19]">
          <button
            onClick={() => setTempConfig(currentConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Current
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-volt-border text-xs text-slate-300 hover:border-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApplyConfig(tempConfig);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#00F5A0] text-[#0A0E17] font-semibold text-xs hover:bg-[#00D2FF] transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Apply to Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
