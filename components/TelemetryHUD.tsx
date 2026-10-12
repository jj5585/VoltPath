'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Gauge,
  Thermometer,
  Zap,
  Activity,
  Radio,
  Terminal,
  PauseCircle,
  PlayCircle,
  Trash2,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  Maximize2,
  X,
  Battery,
  Navigation,
} from 'lucide-react';
import { AIS140TelemetryFrame, parseAIS140Sentence } from '@/lib/ais140Generator';

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
  size = 80,
}: GaugeRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, value / max));
  const offset = circumference * (1 - progress);

  let activeColor = color;
  if (criticalThreshold !== undefined && value >= criticalThreshold) {
    activeColor = '#EF4444';
  } else if (warningThreshold !== undefined && value >= warningThreshold) {
    activeColor = '#F59E0B';
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
          stroke="#1E293B"
          strokeWidth={4.5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={4.5}
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
        className="absolute flex flex-col items-center justify-center pointer-events-none"
        style={{ width: size, height: size }}
      >
        <span
          className="text-sm font-bold font-mono"
          style={{ color: activeColor }}
        >
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-[8px] text-slate-400 uppercase tracking-wider">{unit}</span>
      </div>
      <span className="text-[10px] text-slate-400 mt-1">{label}</span>
    </div>
  );
}

interface TelemetryHUDProps {
  frames: AIS140TelemetryFrame[];
  currentFrame: AIS140TelemetryFrame | null;
  isLive: boolean;
  onClearFrames?: () => void;
}

export default function TelemetryHUD({
  frames,
  currentFrame,
  isLive,
  onClearFrames,
}: TelemetryHUDProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [inspectedFrame, setInspectedFrame] = useState<AIS140TelemetryFrame | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const f = currentFrame;

  // Auto-scroll terminal feed
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
    }
  }, [frames, autoScroll]);

  // Estimated remaining range (approx 1.1 km per % above 12% cutoff)
  const remainingRangeKm = f ? Math.max(0, parseFloat(((f.socPct - 12) * 1.05).toFixed(1))) : 0;
  const powerKw = f ? f.powerKw || parseFloat(((f.voltageV * f.currentA) / 1000).toFixed(2)) : 0;

  // BMS status formatting
  const getBmsBadge = () => {
    if (!f) {
      return {
        label: 'DATA_UNAVAILABLE',
        color: 'text-slate-400',
        bg: 'bg-slate-800/60 border-slate-700',
        icon: <Info className="w-3.5 h-3.5 text-slate-400" />,
      };
    }
    switch (f.bmsStatus) {
      case 'CRITICAL_STALL':
        return {
          label: 'CRITICAL_STALL',
          color: 'text-red-400',
          bg: 'bg-red-500/15 border-red-500/40',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-red-400 animate-pulse" />,
        };
      case 'DEEP_DISCHARGE_LIMP':
        return {
          label: 'DEEP_DISCHARGE_LIMP',
          color: 'text-orange-400',
          bg: 'bg-orange-500/15 border-orange-500/40',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
        };
      case 'LOW_SOC_WARNING':
        return {
          label: 'LOW_SOC_WARNING',
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/15 border-yellow-500/35',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />,
        };
      case 'THERMAL_THROTTLING':
        return {
          label: 'THERMAL_THROTTLING (>45°C)',
          color: 'text-orange-400',
          bg: 'bg-orange-500/15 border-orange-500/40',
          icon: <Thermometer className="w-3.5 h-3.5 text-orange-400 animate-pulse" />,
        };
      default:
        return {
          label: 'NORMAL_OPERATING',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/15 border-emerald-500/30',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
        };
    }
  };

  const bmsInfo = getBmsBadge();

  return (
    <div className="volt-card p-3.5 flex flex-col h-full bg-[#0B0F19] border-volt-border select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#00F5A0]" />
          <div>
            <span className="text-xs font-bold text-white tracking-wide">
              Telemetry Stream
            </span>
            <span className="block text-[9px] text-slate-500 font-mono">
              AIS-140 Framing (Simulated)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? 'bg-[#00F5A0] animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="text-[9px] font-mono uppercase text-slate-400">
            {isLive ? 'Transmitting' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Simulated Protocol Disclaimer Pill */}
      <div className="mb-2.5 px-2 py-1 rounded bg-[#101726] border border-volt-border text-[9px] text-slate-400 flex items-center justify-between">
        <span className="text-slate-400">
          Source: <strong className="text-slate-200">Physics Engine State</strong>
        </span>
        <span className="text-emerald-400/90 font-mono">8-bit XOR Checksum</span>
      </div>

      {/* BMS Status Banner */}
      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-3 border ${bmsInfo.bg}`}>
        {bmsInfo.icon}
        <span className={`text-[11px] font-mono font-bold ${bmsInfo.color}`}>
          BMS: {bmsInfo.label}
        </span>
      </div>

      {/* Power & Range Summary Chips */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[#121826] border border-volt-border/80 rounded-lg p-2 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#00D2FF]" />
          <div>
            <span className="text-[9px] text-slate-400 block uppercase">Power Demand</span>
            <span className="text-xs font-mono font-bold text-white">
              {powerKw > 0 ? `${powerKw} kW` : `${Math.abs(powerKw)} kW (Regen)`}
            </span>
          </div>
        </div>
        <div className="bg-[#121826] border border-volt-border/80 rounded-lg p-2 flex items-center gap-2">
          <Battery className="w-3.5 h-3.5 text-[#00F5A0]" />
          <div>
            <span className="text-[9px] text-slate-400 block uppercase">Est. Range</span>
            <span className="text-xs font-mono font-bold text-[#00F5A0]">
              ~{remainingRangeKm} km
            </span>
          </div>
        </div>
      </div>

      {/* Primary Circular Gauge Cluster */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <div className="relative flex items-center justify-center">
          <GaugeRing
            value={f?.speedKmh || 0}
            max={70}
            label="Speed"
            unit="km/h"
            color="#00D2FF"
            size={74}
          />
        </div>
        <div className="relative flex items-center justify-center">
          <GaugeRing
            value={f?.socPct || 0}
            max={100}
            label="SoC"
            unit="%"
            color={f && f.socPct < 18 ? '#EF4444' : '#00F5A0'}
            warningThreshold={-1}
            criticalThreshold={-1}
            size={74}
          />
        </div>
        <div className="relative flex items-center justify-center">
          <GaugeRing
            value={f?.packTempC || 0}
            max={60}
            label="Pack Temp"
            unit="°C"
            color="#00F5A0"
            warningThreshold={45}
            criticalThreshold={52}
            size={74}
          />
        </div>
      </div>

      {/* Secondary Linear Readouts */}
      <div className="grid grid-cols-2 gap-2 bg-[#0E1422] p-2 rounded-lg border border-volt-border/60 mb-3 text-xs font-mono">
        <div>
          <span className="text-[9px] text-slate-500 block uppercase">Voltage</span>
          <span className="font-bold text-purple-300">{f ? `${f.voltageV} V` : '--'}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 block uppercase">Current</span>
          <span className="font-bold text-amber-300">{f ? `${f.currentA} A` : '--'}</span>
        </div>
      </div>

      {/* Terminal Title & Controls */}
      <div className="flex items-center justify-between mb-1.5 pt-1 border-t border-volt-border/60">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Raw Packet Log
          </span>
          <span className="text-[9px] text-slate-600 font-mono">({frames.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {autoScroll ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
          </button>
          {onClearFrames && (
            <button
              onClick={onClearFrames}
              title="Clear log"
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Feed Scroll Container */}
      <div
        ref={terminalEndRef}
        className="flex-1 bg-[#060A12] rounded-lg border border-volt-border p-2 overflow-y-auto max-h-[160px] terminal-feed"
      >
        {frames.slice(-25).map((frame, i) => (
          <div
            key={i}
            onClick={() => setInspectedFrame(frame)}
            title="Click to inspect decoded packet fields"
            className="flex gap-1 py-0.5 hover:bg-white/5 cursor-pointer rounded px-0.5 transition-colors group"
          >
            <span className="text-slate-600 select-none w-5 text-right font-mono text-[9px]">
              {i + 1}
            </span>
            <span
              className={`truncate font-mono text-[10px] ${
                frame.bmsStatus === 'CRITICAL_STALL'
                  ? 'text-red-400'
                  : frame.bmsStatus === 'THERMAL_THROTTLING'
                  ? 'text-orange-400'
                  : frame.bmsStatus === 'LOW_SOC_WARNING'
                  ? 'text-yellow-400'
                  : 'text-[#00F5A0]/80 group-hover:text-[#00F5A0]'
              }`}
            >
              {frame.rawPacket}
            </span>
          </div>
        ))}
        {frames.length === 0 && (
          <span className="text-slate-600 italic text-[11px] block p-2">
            Awaiting simulation start...
          </span>
        )}
      </div>

      {/* Packet Inspection Modal */}
      {inspectedFrame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0E1422] border border-volt-border rounded-xl p-4 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-volt-border pb-2">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-[#00F5A0]" />
                <span className="text-sm font-bold text-white">AIS-140 Packet Inspector</span>
              </div>
              <button
                onClick={() => setInspectedFrame(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-3 p-2 bg-[#060911] rounded border border-volt-border font-mono text-xs text-[#00F5A0] break-all">
              {inspectedFrame.rawPacket}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#141C2E] p-2 rounded">
                <span className="text-slate-400 block text-[10px]">Registration No</span>
                <span className="font-mono font-bold text-white">{inspectedFrame.registrationNumber}</span>
              </div>
              <div className="bg-[#141C2E] p-2 rounded">
                <span className="text-slate-400 block text-[10px]">Checksum (8-bit XOR)</span>
                <span className="font-mono font-bold text-emerald-400">*{inspectedFrame.checksumHex} (VALID)</span>
              </div>
              <div className="bg-[#141C2E] p-2 rounded">
                <span className="text-slate-400 block text-[10px]">Coordinates</span>
                <span className="font-mono text-white">
                  {inspectedFrame.lat.toFixed(5)}, {inspectedFrame.lng.toFixed(5)}
                </span>
              </div>
              <div className="bg-[#141C2E] p-2 rounded">
                <span className="text-slate-400 block text-[10px]">Altitude</span>
                <span className="font-mono text-white">{inspectedFrame.altitudeM} m</span>
              </div>
              <div className="bg-[#141C2E] p-2 rounded">
                <span className="text-slate-400 block text-[10px]">Speed / Heading</span>
                <span className="font-mono text-white">
                  {inspectedFrame.speedKmh} km/h @ {inspectedFrame.headingDeg}°
                </span>
              </div>
              <div className="bg-[#141C2E] p-2 rounded">
                <span className="text-slate-400 block text-[10px]">State of Charge</span>
                <span className="font-mono text-white">{inspectedFrame.socPct}%</span>
              </div>
              <div className="bg-[#141C2E] p-2 rounded">
                <span className="text-slate-400 block text-[10px]">Pack Core Temp</span>
                <span className="font-mono text-white">{inspectedFrame.packTempC}°C</span>
              </div>
              <div className="bg-[#141C2E] p-2 rounded">
                <span className="text-slate-400 block text-[10px]">Voltage / Current</span>
                <span className="font-mono text-white">
                  {inspectedFrame.voltageV} V / {inspectedFrame.currentA} A
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-volt-border flex justify-end">
              <button
                onClick={() => setInspectedFrame(null)}
                className="px-3 py-1.5 rounded-lg bg-volt-card border border-volt-border text-xs text-white hover:border-slate-500"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
