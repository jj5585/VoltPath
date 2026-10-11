'use client';

import React from 'react';
import { SegmentCalculation } from '@/lib/physicsEngine';

interface ChartProps {
  routeASegments: SegmentCalculation[];
  routeBSegments: SegmentCalculation[];
  routeAName: string;
  routeBName: string;
}

function MiniChart({
  data,
  dataKey,
  color,
  label,
  unit,
  yMin,
  yMax,
  warningLine,
  warningLabel,
  height = 80,
  showSecondary,
  secondaryData,
  secondaryColor,
  secondaryLabel,
}: {
  data: SegmentCalculation[];
  dataKey: keyof SegmentCalculation;
  color: string;
  label: string;
  unit: string;
  yMin: number;
  yMax: number;
  warningLine?: number;
  warningLabel?: string;
  height?: number;
  showSecondary?: boolean;
  secondaryData?: SegmentCalculation[];
  secondaryColor?: string;
  secondaryLabel?: string;
}) {
  if (!data || data.length < 2) return null;

  const w = 300;
  const h = height;
  const padL = 0;
  const padR = 0;
  const padT = 4;
  const padB = 4;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  const toX = (i: number) => padL + (i / (data.length - 1)) * cw;
  const toY = (val: number) => padT + ch - ((val - yMin) / (yMax - yMin)) * ch;

  const buildPath = (d: SegmentCalculation[]) => {
    return d
      .map((seg, i) => {
        const x = padL + (i / (d.length - 1)) * cw;
        const y = toY(Number(seg[dataKey]));
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const buildArea = (d: SegmentCalculation[]) => {
    const path = buildPath(d);
    const lastX = padL + ((d.length - 1) / (d.length - 1)) * cw;
    return `${path} L${lastX.toFixed(1)},${(padT + ch).toFixed(1)} L${padL},${(padT + ch).toFixed(1)} Z`;
  };

  const primary = data;
  const secondary = secondaryData || [];

  const lastVal = Number(primary[primary.length - 1]?.[dataKey] ?? 0);
  const secLastVal = secondary.length > 0 ? Number(secondary[secondary.length - 1]?.[dataKey] ?? 0) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-0.5 rounded" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-mono" style={{ color }}>
              {lastVal.toFixed(1)}{unit}
            </span>
          </div>
          {showSecondary && secLastVal !== null && (
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-0.5 rounded" style={{ backgroundColor: secondaryColor }} />
              <span className="text-[10px] font-mono" style={{ color: secondaryColor }}>
                {secLastVal.toFixed(1)}{unit}
              </span>
            </div>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: `${height}px` }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={padL}
            x2={w - padR}
            y1={padT + ch * (1 - frac)}
            y2={padT + ch * (1 - frac)}
            stroke="#1F293D"
            strokeWidth={0.5}
          />
        ))}

        {/* Warning threshold line */}
        {warningLine !== undefined && warningLine >= yMin && warningLine <= yMax && (
          <>
            <line
              x1={padL}
              x2={w - padR}
              y1={toY(warningLine)}
              y2={toY(warningLine)}
              stroke="#FF9500"
              strokeWidth={0.8}
              strokeDasharray="4,3"
              opacity={0.7}
            />
            {warningLabel && (
              <text x={w - padR - 2} y={toY(warningLine) - 3} textAnchor="end" fill="#FF9500" fontSize={7}>
                {warningLabel}
              </text>
            )}
          </>
        )}

        {/* Secondary area fill + line */}
        {showSecondary && secondary.length > 1 && (
          <>
            <path d={buildArea(secondary)} fill={secondaryColor} fillOpacity={0.06} />
            <path d={buildPath(secondary)} fill="none" stroke={secondaryColor} strokeWidth={1.5} opacity={0.7} />
          </>
        )}

        {/* Primary area fill + line */}
        <path d={buildArea(primary)} fill={color} fillOpacity={0.1} />
        <path d={buildPath(primary)} fill="none" stroke={color} strokeWidth={2} />

        {/* End dots */}
        <circle cx={toX(primary.length - 1)} cy={toY(lastVal)} r={3} fill={color} />
        {showSecondary && secondary.length > 1 && secLastVal !== null && (
          <circle cx={padL + ((secondary.length - 1) / (secondary.length - 1)) * cw} cy={toY(secLastVal)} r={3} fill={secondaryColor!} />
        )}
      </svg>
    </div>
  );
}

export default function ElevationThermalChart({
  routeASegments,
  routeBSegments,
  routeAName,
  routeBName,
}: ChartProps) {
  // Determine ranges for chart axes
  const allElevations = [...routeASegments, ...routeBSegments].map((s) => s.elevationM);
  const elevMin = Math.min(...allElevations) - 5;
  const elevMax = Math.max(...allElevations) + 5;

  const allTemps = [...routeASegments, ...routeBSegments].map((s) => s.packTempC);
  const tempMin = Math.min(...allTemps, 30) - 2;
  const tempMax = Math.max(...allTemps, 50) + 2;

  return (
    <div className="volt-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Route Profile Analytics</span>
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-red-400 rounded" />
            <span className="text-slate-400">Route A (Standard)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#00F5A0] rounded" />
            <span className="text-slate-400">Route B (VoltPath)</span>
          </div>
        </div>
      </div>

      {/* Elevation Profile */}
      <MiniChart
        data={routeASegments}
        dataKey="elevationM"
        color="#EF4444"
        label="Elevation Profile (m)"
        unit="m"
        yMin={elevMin}
        yMax={elevMax}
        height={70}
        showSecondary
        secondaryData={routeBSegments}
        secondaryColor="#00F5A0"
        secondaryLabel="VoltPath"
      />

      {/* Pack Temperature */}
      <MiniChart
        data={routeASegments}
        dataKey="packTempC"
        color="#EF4444"
        label="Battery Pack Temperature (°C)"
        unit="°C"
        yMin={tempMin}
        yMax={tempMax}
        warningLine={45}
        warningLabel="BMS Throttle 45°C"
        height={70}
        showSecondary
        secondaryData={routeBSegments}
        secondaryColor="#00F5A0"
        secondaryLabel="VoltPath"
      />

      {/* SoC Drain Curve */}
      <MiniChart
        data={routeASegments}
        dataKey="socPct"
        color="#EF4444"
        label="State of Charge (%)"
        unit="%"
        yMin={0}
        yMax={100}
        warningLine={15}
        warningLabel="Deep Discharge 15%"
        height={70}
        showSecondary
        secondaryData={routeBSegments}
        secondaryColor="#00F5A0"
        secondaryLabel="VoltPath"
      />
    </div>
  );
}
