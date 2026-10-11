'use client';

import React from 'react';
import {
  Gauge,
  Thermometer,
  BatteryCharging,
  Zap,
  Activity,
  Radio,
  Terminal,
} from 'lucide-react';
import { AIS140TelemetryFrame } from '@/lib/ais140Generator';

interface GaugeRingProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  size?: number;
}

function GaugeRing({
  value,
  max,
  label,
  unit,
  color,
  warningThreshold,
  criticalThreshold,
  size = 90,
}: GaugeRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, value / max));
  const offset = circumference * (1 - progress);

  let activeColor = color;
  if (criticalThreshold !== undefined && value >= criticalThreshold) {
    activeColor = '#FF3B30';
  } else if (warningThreshold !== undefined && value >= warningThreshold) {
    activeColor = '#FF9500';
  }

  const isAlert =
    (criticalThreshold !== undefined && value >= criticalThreshold) ||
    (warningThreshold !== undefined && value >= warningThreshold);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1F293D"
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={5}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="gauge-ring"
          style={{
            filter: isAlert ? `drop-shadow(0 0 6px ${activeColor})` : 'none',
          }}
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span
          className="text-base font-bold font-mono"
          style={{ color: activeColor }}
        >
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-[9px] text-slate-500 uppercase">{unit}</span>
      </div>
      <span className="text-[10px] text-slate-400 mt-1">{label}</span>
    </div>
  );
}

interface TelemetryHUDProps {
  frames: AIS140TelemetryFrame[];
  currentFrame: AIS140TelemetryFrame | null;
  isLive: boolean;
}

export default function TelemetryHUD({
  frames,
  currentFrame,
  isLive,
}: TelemetryHUDProps) {
  const f = currentFrame;

  const bmsStatusColor =
    f?.bmsStatus === 'CRITICAL_STALL'
      ? 'text-red-400 animate-blink'
      : f?.bmsStatus === 'DEEP_DISCHARGE_LIMP'
      ? 'text-red-400'
      : f?.bmsStatus === 'THERMAL_THROTTLING'
      ? 'text-orange-400 animate-pulse-warning'
      : 'text-emerald-400';

  const bmsStatusBg =
    f?.bmsStatus === 'CRITICAL_STALL'
      ? 'bg-red-500/10 border-red-500/30'
      : f?.bmsStatus === 'DEEP_DISCHARGE_LIMP'
      ? 'bg-red-500/10 border-red-500/20'
      : f?.bmsStatus === 'THERMAL_THROTTLING'
      ? 'bg-orange-500/10 border-orange-500/20'
      : 'bg-emerald-500/10 border-emerald-500/20';

  return (
    <div className="volt-card p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#00F5A0]" />
          <span className="text-sm font-semibold text-white">AIS-140 CAN-Bus Telemetry</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#00F5A0] animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-[10px] text-slate-400 uppercase">{isLive ? 'Live Stream' : 'Paused'}</span>
        </div>
      </div>

      {/* BMS Status Banner */}
      {f && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 border ${bmsStatusBg}`}>
          <Activity className={`w-3.5 h-3.5 ${bmsStatusColor}`} />
          <span className={`text-xs font-mono font-semibold ${bmsStatusColor}`}>
            BMS: {f.bmsStatus?.replace(/_/g, ' ') || 'NORMAL'}
          </span>
        </div>
      )}

      {/* Gauge Cluster */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        <div className="relative flex items-center justify-center">
          <GaugeRing
            value={f?.speedKmh || 0}
            max={80}
            label="Speed"
            unit="km/h"
            color="#00D2FF"
            size={80}
          />
        </div>
        <div className="relative flex items-center justify-center">
          <GaugeRing
            value={f?.socPct || 0}
            max={100}
            label="Battery SoC"
            unit="%"
            color="#00F5A0"
            warningThreshold={-1}
            criticalThreshold={-1}
            size={80}
          />
        </div>
        <div className="relative flex items-center justify-center">
          <GaugeRing
            value={f?.packTempC || 0}
            max={60}
            label="Pack Temp"
            unit="°C"
            color="#00F5A0"
            warningThreshold={42}
            criticalThreshold={47}
            size={80}
          />
        </div>
        <div className="relative flex items-center justify-center">
          <GaugeRing
            value={f?.voltageV || 0}
            max={58}
            label="Pack Voltage"
            unit="V"
            color="#A78BFA"
            size={80}
          />
        </div>
        <div className="relative flex items-center justify-center">
          <GaugeRing
            value={f?.currentA || 0}
            max={60}
            label="Motor Current"
            unit="A"
            color="#F59E0B"
            warningThreshold={40}
            criticalThreshold={52}
            size={80}
          />
        </div>
      </div>

      {/* Raw AIS-140 Terminal Feed */}
      <div className="flex items-center gap-2 mb-1.5">
        <Terminal className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Raw AIS-140 Packet Stream</span>
      </div>
      <div className="flex-1 bg-[#080C14] rounded-lg border border-volt-border p-2 overflow-y-auto max-h-[140px]">
        <div className="terminal-feed">
          {frames.slice(-8).map((frame, i) => (
            <div key={i} className="flex gap-1">
              <span className="text-slate-600 select-none">{String(i + 1).padStart(2, '0')}│</span>
              <span
                className={
                  frame.bmsStatus === 'CRITICAL_STALL'
                    ? 'text-red-400'
                    : frame.bmsStatus === 'THERMAL_THROTTLING'
                    ? 'text-orange-400'
                    : 'text-[#00F5A0]/70'
                }
              >
                {frame.rawPacket}
              </span>
            </div>
          ))}
          {frames.length === 0 && (
            <span className="text-slate-600 italic">Awaiting telemetry stream...</span>
          )}
          <span className="animate-blink text-[#00F5A0]">█</span>
        </div>
      </div>
    </div>
  );
}
