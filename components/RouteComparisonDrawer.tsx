'use client';

import React from 'react';
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
} from 'lucide-react';
import { RoutePhysicsResult } from '@/lib/physicsEngine';

interface RouteComparisonDrawerProps {
  routeA: RoutePhysicsResult | null;
  routeB: RoutePhysicsResult | null;
  comparison: {
    distanceDeltaKm: number;
    energySavedKwh: number;
    energySavedPct: number;
    endSocDeltaPct: number;
    tempReductionC: number;
    monthlyFleetSavingsInr: number;
  } | null;
}

function RouteCard({
  route,
  variant,
}: {
  route: RoutePhysicsResult;
  variant: 'danger' | 'success';
}) {
  const borderColor = variant === 'danger' ? 'border-red-500/30' : 'border-[#00F5A0]/30';
  const accentColor = variant === 'danger' ? '#EF4444' : '#00F5A0';
  const labelColor = variant === 'danger' ? 'text-red-400' : 'text-[#00F5A0]';
  const bgHighlight = variant === 'danger' ? 'bg-red-500/5' : 'bg-[#00F5A0]/5';

  return (
    <div className={`volt-card p-3 ${borderColor} ${bgHighlight}`}>
      {/* Route Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Route className={`w-4 h-4 ${labelColor}`} />
          <span className={`text-xs font-semibold ${labelColor} truncate max-w-[200px]`}>
            {variant === 'danger' ? 'Standard Flat Route' : 'VoltPath Optimal'}
          </span>
        </div>
        {route.hasStalled ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse-danger">
            <AlertTriangle className="w-3 h-3" /> STALL RISK
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> SAFE
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">Distance:</span>
          <span className="font-mono font-bold text-white">{route.totalDistanceKm} km</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Timer className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">Time:</span>
          <span className="font-mono font-bold text-white">{route.travelTimeMinutes} min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Fuel className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">Energy:</span>
          <span className="font-mono font-bold" style={{ color: accentColor }}>
            {route.totalEnergyKwh} kWh
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">Wh/km:</span>
          <span className="font-mono font-bold" style={{ color: accentColor }}>
            {route.efficiencyWhPerKm}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <BatteryWarning className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">End SoC:</span>
          <span
            className={`font-mono font-bold ${
              route.endSocPct < 15 ? 'text-red-400' : route.endSocPct < 25 ? 'text-orange-400' : 'text-emerald-400'
            }`}
          >
            {route.endSocPct}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Thermometer className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">Peak Temp:</span>
          <span
            className={`font-mono font-bold ${
              route.peakPackTempC >= 47 ? 'text-red-400' : route.peakPackTempC >= 43 ? 'text-orange-400' : 'text-emerald-400'
            }`}
          >
            {route.peakPackTempC}°C
          </span>
        </div>
      </div>

      {/* Stall Alert */}
      {route.hasStalled && route.stallPoint && (
        <div className="mt-2.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-[10px] text-red-400 font-mono leading-relaxed">
            ⚠ STALL @ {route.stallPoint.distanceKm} km — {route.stallPoint.reason}
          </p>
        </div>
      )}
    </div>
  );
}

export default function RouteComparisonDrawer({
  routeA,
  routeB,
  comparison,
}: RouteComparisonDrawerProps) {
  if (!routeA || !routeB || !comparison) {
    return (
      <div className="volt-card p-4 flex items-center justify-center h-full">
        <span className="text-slate-500 text-sm">Calculating route physics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Route Cards */}
      <RouteCard route={routeA} variant="danger" />
      <RouteCard route={routeB} variant="success" />

      {/* VoltPath Advantage Summary */}
      <div className="volt-card p-3 border-[#00D2FF]/20 bg-[#00D2FF]/5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-[#00D2FF]" />
          <span className="text-xs font-semibold text-[#00D2FF]">VoltPath Advantage</span>
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
          <span className="text-slate-400">Energy saved:</span>
          <span className="font-mono font-bold text-[#00F5A0]">
            {comparison.energySavedKwh} kWh ({comparison.energySavedPct}%)
          </span>
          <span className="text-slate-400">Extra SoC at arrival:</span>
          <span className="font-mono font-bold text-[#00F5A0]">
            +{comparison.endSocDeltaPct}%
          </span>
          <span className="text-slate-400">Temp reduction:</span>
          <span className="font-mono font-bold text-[#00D2FF]">
            -{comparison.tempReductionC}°C cooler
          </span>
        </div>
      </div>

      {/* Financial ROI */}
      <div className="volt-card p-3 border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-center gap-2 mb-1.5">
          <IndianRupee className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-semibold text-yellow-400">Fleet ROI Impact</span>
        </div>
        <p className="text-lg font-bold font-mono text-yellow-300">
          ₹{comparison.monthlyFleetSavingsInr.toLocaleString('en-IN')}<span className="text-xs font-normal text-yellow-400/70">/vehicle/mo</span>
        </p>
        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
          Towing prevented (₹{routeA.breakdown.towingPreventedInr}) + Degradation avoided
          (₹{routeA.breakdown.degradationAvoidedInr}) + SLA uptime
          (₹{routeA.breakdown.slaUptimeInr})
        </p>
      </div>
    </div>
  );
}
