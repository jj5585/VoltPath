'use client';

import React, { useState } from 'react';
import {
  Mountain,
  Thermometer,
  Battery,
  Zap,
  Gauge,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';
import { SegmentCalculation } from '@/lib/physicsEngine';

interface ChartProps {
  routeASegments: SegmentCalculation[];
  routeBSegments: SegmentCalculation[];
  routeAName: string;
  routeBName: string;
  currentPlaybackIndex?: number;
  activeRoute?: 'A' | 'B';
  stallDistanceKm?: number;
  throttleDistanceKm?: number;
}

type MetricKey = 'elevation' | 'temperature' | 'soc' | 'power' | 'speed';

export default function ElevationThermalChart({
  routeASegments,
  routeBSegments,
  routeAName,
  routeBName,
  currentPlaybackIndex,
  activeRoute = 'A',
  stallDistanceKm,
  throttleDistanceKm,
}: ChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('elevation');

  if (!routeASegments || routeASegments.length < 2) {
    return (
      <div className="volt-card p-4 text-center text-slate-500 text-xs">
        Awaiting route segments to render profile charts...
      </div>
    );
  }

  // Active dataset
  const activeSegments = activeRoute === 'A' ? routeASegments : routeBSegments;
  const currentStep = currentPlaybackIndex !== undefined ? Math.min(activeSegments.length - 1, currentPlaybackIndex) : undefined;
  const currentDistKm = currentStep !== undefined && activeSegments[currentStep] ? activeSegments[currentStep].cumulativeDistanceKm : undefined;

  // Configuration for each metric
  const metricConfigs = {
    elevation: {
      label: 'Elevation Profile',
      unit: 'm',
      key: 'elevationM' as keyof SegmentCalculation,
      colorA: '#EF4444',
      colorB: '#00F5A0',
      min: Math.min(...routeASegments.map((s) => s.elevationM), ...(routeBSegments.length ? routeBSegments.map((s) => s.elevationM) : [900])) - 5,
      max: Math.max(...routeASegments.map((s) => s.elevationM), ...(routeBSegments.length ? routeBSegments.map((s) => s.elevationM) : [920])) + 5,
      warningVal: undefined as number | undefined,
      warningLabel: undefined as string | undefined,
    },
    temperature: {
      label: 'Pack Temperature',
      unit: '°C',
      key: 'packTempC' as keyof SegmentCalculation,
      colorA: '#EF4444',
      colorB: '#00F5A0',
      min: 30,
      max: 56,
      warningVal: 45,
      warningLabel: 'BMS Derate (45°C)',
    },
    soc: {
      label: 'Battery State of Charge',
      unit: '%',
      key: 'socPct' as keyof SegmentCalculation,
      colorA: '#EF4444',
      colorB: '#00F5A0',
      min: 0,
      max: 100,
      warningVal: 15,
      warningLabel: '15% Safety Reserve',
    },
    power: {
      label: 'Power Demand & Regen',
      unit: 'kW',
      key: 'powerKw' as keyof SegmentCalculation,
      colorA: '#EF4444',
      colorB: '#00D2FF',
      min: -1.5,
      max: 4.5,
      warningVal: 0,
      warningLabel: 'Regen Baseline (0 kW)',
    },
    speed: {
      label: 'Vehicle Speed Profile',
      unit: 'km/h',
      key: 'speedKmh' as keyof SegmentCalculation,
      colorA: '#EF4444',
      colorB: '#00F5A0',
      min: 0,
      max: 60,
      warningVal: undefined as number | undefined,
      warningLabel: undefined as string | undefined,
    },
  };

  const activeConf = metricConfigs[selectedMetric];

  // SVG dimensions
  const w = 320;
  const h = 100;
  const padL = 6;
  const padR = 6;
  const padT = 8;
  const padB = 8;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  const maxDistA = routeASegments[routeASegments.length - 1].cumulativeDistanceKm || 1;
  const maxDistB = routeBSegments.length > 0 ? (routeBSegments[routeBSegments.length - 1].cumulativeDistanceKm || 1) : maxDistA;
  const maxDist = Math.max(maxDistA, maxDistB);

  const toX = (distKm: number) => padL + (distKm / maxDist) * cw;
  const toY = (val: number) => {
    const clamped = Math.max(activeConf.min, Math.min(activeConf.max, val));
    return padT + ch - ((clamped - activeConf.min) / (activeConf.max - activeConf.min)) * ch;
  };

  const buildPath = (segments: SegmentCalculation[]) => {
    if (!segments || segments.length === 0) return '';
    return segments
      .map((seg, i) => {
        const x = toX(seg.cumulativeDistanceKm);
        const y = toY(Number(seg[activeConf.key]));
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const pathA = buildPath(routeASegments);
  const pathB = routeBSegments.length > 0 ? buildPath(routeBSegments) : '';

  const lastValA = Number(routeASegments[routeASegments.length - 1][activeConf.key]);
  const lastValB = routeBSegments.length > 0 ? Number(routeBSegments[routeBSegments.length - 1][activeConf.key]) : null;

  return (
    <div className="volt-card p-3 space-y-3 bg-[#0B0F19] border-volt-border">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white tracking-wide">
          Route Analytics
        </span>
        <div className="flex items-center gap-2 text-[9px] font-mono">
          <span className="text-red-400">Route A</span>
          <span className="text-slate-600">vs</span>
          <span className="text-[#00F5A0]">Route B</span>
        </div>
      </div>

      {/* Metric Selector Tabs */}
      <div className="flex items-center gap-1 bg-[#121826] p-1 rounded-lg border border-volt-border/70 overflow-x-auto">
        <button
          onClick={() => setSelectedMetric('elevation')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
            selectedMetric === 'elevation' ? 'bg-[#00F5A0]/20 text-[#00F5A0]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Mountain className="w-3 h-3" />
          Elev
        </button>
        <button
          onClick={() => setSelectedMetric('temperature')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
            selectedMetric === 'temperature' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Thermometer className="w-3 h-3" />
          Temp
        </button>
        <button
          onClick={() => setSelectedMetric('soc')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
            selectedMetric === 'soc' ? 'bg-[#00F5A0]/20 text-[#00F5A0]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Battery className="w-3 h-3" />
          SoC
        </button>
        <button
          onClick={() => setSelectedMetric('power')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
            selectedMetric === 'power' ? 'bg-[#00D2FF]/20 text-[#00D2FF]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3 h-3" />
          Power
        </button>
        <button
          onClick={() => setSelectedMetric('speed')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
            selectedMetric === 'speed' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gauge className="w-3 h-3" />
          Speed
        </button>
      </div>

      {/* Active Chart Box */}
      <div className="bg-[#060A12] border border-volt-border rounded-lg p-2 relative">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-slate-400 font-mono">
            {activeConf.label} ({activeConf.unit})
          </span>
          <div className="flex items-center gap-3 font-mono">
            <span className="text-red-400">
              A: {lastValA.toFixed(1)}{activeConf.unit}
            </span>
            {lastValB !== null && (
              <span className="text-[#00F5A0]">
                B: {lastValB.toFixed(1)}{activeConf.unit}
              </span>
            )}
          </div>
        </div>

        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 overflow-visible">
          {/* Horizontal Grid */}
          {[0, 0.5, 1].map((frac) => (
            <line
              key={frac}
              x1={padL}
              x2={w - padR}
              y1={padT + ch * frac}
              y2={padT + ch * frac}
              stroke="#1E293B"
              strokeWidth={0.5}
            />
          ))}

          {/* Warning / Throttle / Stall Threshold Line */}
          {activeConf.warningVal !== undefined && (
            <>
              <line
                x1={padL}
                x2={w - padR}
                y1={toY(activeConf.warningVal)}
                y2={toY(activeConf.warningVal)}
                stroke="#F59E0B"
                strokeWidth={0.8}
                strokeDasharray="4,3"
                opacity={0.8}
              />
              {activeConf.warningLabel && (
                <text
                  x={w - padR}
                  y={toY(activeConf.warningVal) - 2}
                  textAnchor="end"
                  fill="#F59E0B"
                  fontSize={7}
                  className="font-mono"
                >
                  {activeConf.warningLabel}
                </text>
              )}
            </>
          )}

          {/* Route A Path (Red) */}
          <path
            d={pathA}
            fill="none"
            stroke={activeConf.colorA}
            strokeWidth={1.8}
            opacity={activeRoute === 'A' ? 1.0 : 0.6}
          />

          {/* Route B Path (Green/Teal) */}
          {pathB && (
            <path
              d={pathB}
              fill="none"
              stroke={activeConf.colorB}
              strokeWidth={1.8}
              opacity={activeRoute === 'B' ? 1.0 : 0.6}
            />
          )}

          {/* Stall Point Marker on Chart */}
          {stallDistanceKm !== undefined && stallDistanceKm <= maxDist && (
            <g transform={`translate(${toX(stallDistanceKm)}, ${toY(activeConf.min + (activeConf.max - activeConf.min) * 0.7)})`}>
              <line y1={-25} y2={25} stroke="#EF4444" strokeWidth={1} strokeDasharray="2,2" />
              <circle r={3} fill="#EF4444" />
            </g>
          )}

          {/* Current Simulation Playhead */}
          {currentDistKm !== undefined && (
            <g transform={`translate(${toX(currentDistKm)}, 0)`}>
              <line y1={padT} y2={h - padB} stroke="#00D2FF" strokeWidth={1.2} />
              <circle
                cx={0}
                cy={toY(Number(activeSegments[currentStep || 0]?.[activeConf.key] || 0))}
                r={3.5}
                fill="#00D2FF"
                stroke="#060A12"
                strokeWidth={1.5}
              />
            </g>
          )}
        </svg>

        {/* X-axis distance labels */}
        <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1">
          <span>0.0 km</span>
          <span>{(maxDist / 2).toFixed(1)} km</span>
          <span>{maxDist.toFixed(1)} km</span>
        </div>
      </div>
    </div>
  );
}
