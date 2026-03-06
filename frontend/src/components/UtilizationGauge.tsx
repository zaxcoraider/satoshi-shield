import React from 'react';

interface Props {
    utilization: number; // 0–100
    liquidity:   bigint;
    coverage:    bigint;
}

function satToBtcNum(sat: bigint): string {
    if (sat === 0n) return '0.0000';
    return (Number(sat) / 1e8).toFixed(4);
}

export function UtilizationGauge({ utilization, liquidity, coverage }: Props) {
    const pct      = Math.min(Math.max(utilization, 0), 100);
    const radius   = 58;
    const stroke   = 10;
    const cx = 80, cy = 80;
    const circ     = 2 * Math.PI * radius;
    // Only draw 270° arc (from 135° to 405°)
    const arcFrac  = 0.75;
    const arcLen   = circ * arcFrac;
    const offset   = arcLen - (arcLen * pct) / 100;

    const color =
        pct >= 70 ? '#ef4444' :
        pct >= 40 ? '#eab308' :
                    '#22c55e';

    const glow =
        pct >= 70 ? 'drop-shadow(0 0 8px rgba(239,68,68,0.7))' :
        pct >= 40 ? 'drop-shadow(0 0 8px rgba(234,179,8,0.6))' :
                    'drop-shadow(0 0 8px rgba(34,197,94,0.6))';

    const label =
        pct >= 70 ? 'High Risk' :
        pct >= 40 ? 'Moderate' :
                    'Healthy';

    const labelColor =
        pct >= 70 ? '#f87171' :
        pct >= 40 ? '#fbbf24' :
                    '#4ade80';

    return (
        <div className="stat-box flex flex-col items-center py-5">
            <p className="label text-center mb-3">Pool Utilization</p>

            <div className="relative" style={{ width: 160, height: 160 }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                    <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%"   stopColor={color} stopOpacity="0.8" />
                            <stop offset="100%" stopColor={color} />
                        </linearGradient>
                    </defs>

                    {/* Track */}
                    <circle
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={stroke}
                        strokeDasharray={`${arcLen} ${circ}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        transform={`rotate(135 ${cx} ${cy})`}
                    />

                    {/* Fill */}
                    <circle
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke="url(#gaugeGrad)"
                        strokeWidth={stroke}
                        strokeDasharray={`${arcLen} ${circ}`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform={`rotate(135 ${cx} ${cy})`}
                        style={{
                            filter: glow,
                            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)',
                        }}
                    />

                    {/* Center text */}
                    <text x={cx} y={cy - 8} textAnchor="middle" fill="#c9d1d9" fontSize="22" fontWeight="700" fontFamily="monospace">
                        {pct.toFixed(1)}%
                    </text>
                    <text x={cx} y={cy + 12} textAnchor="middle" fill={labelColor} fontSize="11" fontFamily="monospace">
                        {label}
                    </text>
                </svg>
            </div>

            <div className="w-full mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-[#8b949e]">Liquidity</span>
                    <span className="text-[#F7931A] font-semibold">{satToBtcNum(liquidity)} BTC</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[#8b949e]">Coverage</span>
                    <span className="text-[#c9d1d9] font-semibold">{satToBtcNum(coverage)} BTC</span>
                </div>
                <div className="progress-track mt-1">
                    <div
                        className="progress-fill"
                        style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${color}aa, ${color})`,
                            boxShadow: `0 0 8px ${color}66`,
                            transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                        }}
                    />
                </div>
                <div className="flex justify-between text-xs text-[#8b949e]">
                    <span>0%</span>
                    <span className="text-yellow-500">70% cap</span>
                    <span>100%</span>
                </div>
            </div>
        </div>
    );
}
