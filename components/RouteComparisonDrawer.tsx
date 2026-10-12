'use client';

import React, { useState } from 'react';
import {
  Route,
  Zap,
  Thermometer,
  BatteryWarning,
  TrendingDown,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Timer,
  Fuel,
  Sliders,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { RoutePhysicsResult } from '@/lib/physicsEngine';

interface RouteComparisonDrawerProps {
  routeA: RoutePhysicsResult | null;
  routeB: RoutePhysicsResult | null;
  comparison: any;
}

export default function RouteComparisonDrawer({
  routeA,
  routeB,
  comparison,
}: RouteComparisonDrawerProps) {
  // Configurable fleet economic assumptions
  const [fleetSize, setFleetSize] = useState(50);
  const [tripsPerDay, setTripsPerDay] = useState(18);
  const [daysPerMonth, setDaysPerMonth] = useState(26);
  const [electricityTariffInr, setElectricityTariffInr] = useState(8.5);
  const [towingCostInr, setTowingCostInr] = useState(750);
  const [slaPenaltyInr, setSlaPenaltyInr] = useState(100);
  const [showConfig, setShowConfig] = useState(false);

  if (!routeA) {
    return (
      <div className="volt-card p-4 flex items-center justify-center bg-[#0B0F19] text-slate-500 text-xs">
        Calculating route physics and financial ROI...
      </div>
    );
  }

  // Monthly trips calculation
  const totalMonthlyTripsPerVehicle = tripsPerDay * daysPerMonth;
  const totalFleetMonthlyTrips = totalMonthlyTripsPerVehicle * fleetSize;

  // Direct energy cost delta per trip
  const energyCostA = routeA.totalEnergyKwh * electricityTariffInr;
  const energyCostB = routeB ? routeB.totalEnergyKwh * electricityTariffInr : energyCostA;
  const energySavedPerTripInr = Math.max(0, energyCostA - energyCostB);

  // Operational incident risk model
  const towingRiskA = routeA.hasStalled ? (towingCostInr * 0.08) : 0; // ~8% trip tow incidence under stall conditions
  const towingRiskB = routeB?.hasStalled ? (towingCostInr * 0.08) : 0;
  const towingSavedPerTripInr = Math.max(0, towingRiskA - towingRiskB);

  // Battery cell degradation risk (thermal stress penalty above 45°C)
  const cellDegradationPerTripA = routeA.peakPackTempC > 45 ? 1.85 : 0.65;
  const cellDegradationPerTripB = routeB && routeB.peakPackTempC > 45 ? 1.85 : 0.65;
  const cellDegradationSavedPerTripInr = Math.max(0, cellDegradationPerTripA - cellDegradationPerTripB);

  // SLA delay / stalling penalty
  const slaRiskA = routeA.hasStalled ? slaPenaltyInr * 0.25 : (routeA.hasThrottled ? slaPenaltyInr * 0.05 : 0);
  const slaRiskB = routeB?.hasStalled ? slaPenaltyInr * 0.25 : (routeB?.hasThrottled ? slaPenaltyInr * 0.05 : 0);
  const slaSavedPerTripInr = Math.max(0, slaRiskA - slaRiskB);

  // Total calculated savings per trip & monthly per vehicle
  const totalSavedPerTripInr = energySavedPerTripInr + towingSavedPerTripInr + cellDegradationSavedPerTripInr + slaSavedPerTripInr;
  const monthlySavingsPerVehicleInr = Math.round(totalSavedPerTripInr * totalMonthlyTripsPerVehicle);
  const monthlyFleetTotalSavingsInr = Math.round(monthlySavingsPerVehicleInr * fleetSize);

  return (
    <div className="space-y-3">
      {/* Route A Card (Direct/Standard) */}
      <div className="volt-card p-3 border-red-500/30 bg-red-500/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold text-red-400 truncate max-w-[170px]">
              Route A (Standard Direct)
            </span>
          </div>
          {routeA.hasStalled ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
              <AlertTriangle className="w-2.5 h-2.5" /> STALL RISK
            </span>
          ) : (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-2.5 h-2.5" /> SAFE
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-2 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">Distance:</span>
            <span className="text-white font-bold">{routeA.totalDistanceKm} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Time:</span>
            <span className="text-white font-bold">{routeA.travelTimeMinutes} min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Energy:</span>
            <span className="text-red-400 font-bold">{routeA.totalEnergyKwh} kWh</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Wh/km:</span>
            <span className="text-red-400 font-bold">{routeA.efficiencyWhPerKm}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">End SoC:</span>
            <span className={routeA.endSocPct < 15 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
              {routeA.endSocPct}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Peak Temp:</span>
            <span className={routeA.peakPackTempC >= 45 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
              {routeA.peakPackTempC}°C
            </span>
          </div>
        </div>

        {routeA.hasStalled && routeA.stallPoint && (
          <div className="px-2 py-1 bg-red-500/15 border border-red-500/30 rounded text-[10px] text-red-400 font-mono leading-tight">
            ⚠ Predicted Stall @ {routeA.stallPoint.distanceKm} km ({routeA.stallPoint.reason.split(':')[0]})
          </div>
        )}
      </div>

      {/* Route B Card (VoltPath Optimal) */}
      {routeB ? (
        <div className="volt-card p-3 border-[#00F5A0]/30 bg-[#00F5A0]/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-[#00F5A0]" />
              <span className="text-xs font-bold text-[#00F5A0] truncate max-w-[170px]">
                Route B (VoltPath Optimal)
              </span>
            </div>
            {routeB.hasStalled ? (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                <AlertTriangle className="w-2.5 h-2.5" /> STALL RISK
              </span>
            ) : (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-2.5 h-2.5" /> SAFE
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Distance:</span>
              <span className="text-white font-bold">{routeB.totalDistanceKm} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time:</span>
              <span className="text-white font-bold">{routeB.travelTimeMinutes} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Energy:</span>
              <span className="text-[#00F5A0] font-bold">{routeB.totalEnergyKwh} kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Wh/km:</span>
              <span className="text-[#00F5A0] font-bold">{routeB.efficiencyWhPerKm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">End SoC:</span>
              <span className="text-emerald-400 font-bold">{routeB.endSocPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Peak Temp:</span>
              <span className="text-emerald-400 font-bold">{routeB.peakPackTempC}°C</span>
            </div>
          </div>

          <div className="px-2 py-1 bg-[#00F5A0]/10 border border-[#00F5A0]/25 rounded text-[10px] text-[#00F5A0] leading-tight">
            ✓ {routeB.routeScore.recommendationReason}
          </div>
        </div>
      ) : (
        <div className="volt-card p-3 border-slate-700 bg-slate-900/40 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400 mb-1" />
          Single navigable road path returned for this corridor. Alternative bypass route not available from navigation provider.
        </div>
      )}

      {/* Defensible Fleet ROI Calculator */}
      <div className="volt-card p-3 border-yellow-500/25 bg-yellow-500/5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <IndianRupee className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">
              Fleet Cost & ROI Model
            </span>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-0.5 text-[10px] text-yellow-400/80 hover:text-yellow-300 transition-colors"
          >
            <Sliders className="w-3 h-3" />
            {showConfig ? 'Hide Inputs' : 'Edit Inputs'}
            {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Projection Numbers */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Per Vehicle</span>
            <span className="text-base font-bold font-mono text-yellow-300">
              ₹{monthlySavingsPerVehicleInr.toLocaleString('en-IN')}
              <span className="text-[10px] font-normal text-yellow-400/70">/mo</span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase">
              {fleetSize} 2W Fleet Total
            </span>
            <span className="text-base font-bold font-mono text-emerald-400">
              ₹{monthlyFleetTotalSavingsInr.toLocaleString('en-IN')}
              <span className="text-[10px] font-normal text-emerald-400/70">/mo</span>
            </span>
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="space-y-1 text-[10px] font-mono border-t border-yellow-500/20 pt-2 text-slate-400">
          <div className="flex justify-between">
            <span>Direct Electricity Saved:</span>
            <span className="text-white">₹{Math.round(energySavedPerTripInr * totalMonthlyTripsPerVehicle).toLocaleString('en-IN')}/mo</span>
          </div>
          <div className="flex justify-between">
            <span>Towing Rescues Avoided:</span>
            <span className="text-white">₹{Math.round(towingSavedPerTripInr * totalMonthlyTripsPerVehicle).toLocaleString('en-IN')}/mo</span>
          </div>
          <div className="flex justify-between">
            <span>Battery Degradation Preserved:</span>
            <span className="text-white">₹{Math.round(cellDegradationSavedPerTripInr * totalMonthlyTripsPerVehicle).toLocaleString('en-IN')}/mo</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery SLA Penalties Avoided:</span>
            <span className="text-white">₹{Math.round(slaSavedPerTripInr * totalMonthlyTripsPerVehicle).toLocaleString('en-IN')}/mo</span>
          </div>
        </div>

        {/* Configurable Assumptions Drawer */}
        {showConfig && (
          <div className="mt-3 pt-2.5 border-t border-volt-border space-y-2 text-[10px] bg-[#0E1422] p-2.5 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">
              Fleet Assumptions (Configurable)
            </span>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fleet Size (scooters):</span>
              <input
                type="number"
                min={1}
                max={500}
                value={fleetSize}
                onChange={(e) => setFleetSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-volt-card border border-volt-border rounded px-1.5 py-0.5 text-right text-white font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Trips / Day / Vehicle:</span>
              <input
                type="number"
                min={1}
                max={40}
                value={tripsPerDay}
                onChange={(e) => setTripsPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-volt-card border border-volt-border rounded px-1.5 py-0.5 text-right text-white font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Electricity (₹/kWh):</span>
              <input
                type="number"
                step={0.5}
                min={3}
                max={20}
                value={electricityTariffInr}
                onChange={(e) => setElectricityTariffInr(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-16 bg-volt-card border border-volt-border rounded px-1.5 py-0.5 text-right text-white font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Towing Cost (₹/incident):</span>
              <input
                type="number"
                min={200}
                max={3000}
                value={towingCostInr}
                onChange={(e) => setTowingCostInr(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 bg-volt-card border border-volt-border rounded px-1.5 py-0.5 text-right text-white font-mono"
              />
            </div>
          </div>
        )}

        <div className="mt-2 text-[9px] text-slate-500 italic">
          * Estimated projection derived from physics model and fleet assumptions.
        </div>
      </div>
    </div>
  );
}
