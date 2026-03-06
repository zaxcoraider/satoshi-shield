import React from 'react';
import { PoolStats } from '../hooks/useInsuranceVault';

interface Props {
    poolStats: PoolStats;
}

function satToBtcNum(sat: bigint): string {
    if (sat === 0n) return '0.00000000';
    return (Number(sat) / 1e8).toFixed(8);
}

function ShieldIcon({ size = 24, color = '#F7931A' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
                d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z"
                fill={color}
                fillOpacity="0.2"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path
                d="M9 12l2 2 4-4"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function PoolHealthCard({ poolStats }: Props) {
    const { totalLiquidity, totalCoverage, utilizationPct } = poolStats;

    const coverageRatio = totalLiquidity > 0n
        ? Number((totalCoverage * 10000n) / totalLiquidity) / 100
        : 0;

    const health =
        utilizationPct >= 70 ? 'high'   :
        utilizationPct >= 40 ? 'medium' :
                               'safe';

    const healthLabel  = health === 'high' ? 'High Risk' : health === 'medium' ? 'Moderate' : 'Healthy';
    const healthColor  = health === 'high' ? '#ef4444'   : health === 'medium' ? '#eab308'  : '#22c55e';
    const shieldColor  = health === 'high' ? '#ef4444'   : health === 'medium' ? '#eab308'  : '#22c55e';
    const dotClass     = health === 'high' ? 'health-dot-red' : health === 'medium' ? 'health-dot-yellow' : 'health-dot-green';

    const barSegments = [
        { label: 'Safe',     pct: 40,  color: '#22c55e' },
        { label: 'Moderate', pct: 30,  color: '#eab308' },
        { label: 'High Risk',pct: 30,  color: '#ef4444' },
    ];

    return (
        <div className="card-glow h-full">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <ShieldIcon size={22} color={shieldColor} />
                    <h3 className="font-semibold text-[#c9d1d9] text-sm">Vault Health</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={dotClass} />
                    <span className="text-xs font-semibold" style={{ color: healthColor }}>
                        {healthLabel}
                    </span>
                </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="stat-box">
                    <p className="label">Pool Liquidity</p>
                    <p className="text-base font-bold text-[#F7931A]" style={{ textShadow: '0 0 12px rgba(247,147,26,0.4)' }}>
                        {satToBtcNum(totalLiquidity)}
                    </p>
                    <p className="text-xs text-[#8b949e] mt-0.5">BTC</p>
                </div>
                <div className="stat-box">
                    <p className="label">Active Coverage</p>
                    <p className="text-base font-bold text-[#c9d1d9]">
                        {satToBtcNum(totalCoverage)}
                    </p>
                    <p className="text-xs text-[#8b949e] mt-0.5">BTC</p>
                </div>
                <div className="stat-box">
                    <p className="label">Coverage Ratio</p>
                    <p className="text-base font-bold" style={{ color: healthColor }}>
                        {coverageRatio.toFixed(1)}%
                    </p>
                    <p className="text-xs text-[#8b949e] mt-0.5">of pool</p>
                </div>
                <div className="stat-box">
                    <p className="label">Active Policies</p>
                    <p className="text-base font-bold text-[#c9d1d9]">
                        {poolStats.policyCount.toString()}
                    </p>
                    <p className="text-xs text-[#8b949e] mt-0.5">policies</p>
                </div>
            </div>

            {/* Health meter */}
            <div>
                <div className="flex justify-between text-xs text-[#8b949e] mb-1.5">
                    <span>Vault Health Meter</span>
                    <span style={{ color: healthColor }}>{utilizationPct.toFixed(1)}% utilized</span>
                </div>

                {/* Segmented track */}
                <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
                    {barSegments.map(seg => (
                        <div
                            key={seg.label}
                            className="relative overflow-hidden"
                            style={{ width: `${seg.pct}%`, background: `${seg.color}22`, borderRadius: '999px' }}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                    width: utilizationPct <= (seg.label === 'Safe' ? 40 : seg.label === 'Moderate' ? 70 : 100)
                                        ? '100%' : '0%',
                                    background: seg.color,
                                    opacity: utilizationPct > 0 ? 0.85 : 0.2,
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Needle indicator */}
                <div className="relative mt-1" style={{ height: 12 }}>
                    <div
                        className="absolute top-0 w-0.5 h-3 rounded-full transition-all duration-1000"
                        style={{
                            left: `${Math.min(utilizationPct, 99)}%`,
                            background: healthColor,
                            boxShadow: `0 0 6px ${healthColor}`,
                            transform: 'translateX(-50%)',
                        }}
                    />
                </div>

                <div className="flex justify-between text-xs text-[#8b949e] mt-0.5">
                    <span className="text-green-500">Safe</span>
                    <span className="text-yellow-500">Moderate</span>
                    <span className="text-red-500">High Risk</span>
                </div>
            </div>
        </div>
    );
}
