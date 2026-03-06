import React from 'react';

interface Props {
    utilization: number; // 0–100
}

export function RiskMeter({ utilization }: Props) {
    const pct = Math.min(Math.max(utilization, 0), 100);

    const level =
        pct >= 70 ? 'high'   :
        pct >= 35 ? 'medium' :
                    'low';

    const levelLabel = level === 'high' ? 'High Risk' : level === 'medium' ? 'Medium Risk' : 'Low Risk';
    const levelColor = level === 'high' ? '#ef4444'  : level === 'medium' ? '#eab308'     : '#22c55e';
    const levelBg    = level === 'high' ? 'rgba(239,68,68,0.12)'  : level === 'medium' ? 'rgba(234,179,8,0.12)' : 'rgba(34,197,94,0.12)';

    // Needle angle: -90deg (left) to +90deg (right) for pct 0–100
    const needleAngle = (pct / 100) * 180 - 90;

    return (
        <div className="stat-box p-5">
            <div className="flex items-center justify-between mb-3">
                <p className="label mb-0">Vault Risk Meter</p>
                <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ color: levelColor, background: levelBg, border: `1px solid ${levelColor}44` }}
                >
                    {levelLabel}
                </span>
            </div>

            {/* Semicircle gauge */}
            <div className="flex flex-col items-center">
                <div className="relative" style={{ width: 180, height: 100 }}>
                    <svg width="180" height="100" viewBox="0 0 180 100">
                        <defs>
                            <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%"   stopColor="#22c55e" />
                                <stop offset="50%"  stopColor="#eab308" />
                                <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                        </defs>

                        {/* Background arc */}
                        <path
                            d="M 15 90 A 75 75 0 0 1 165 90"
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="12"
                            strokeLinecap="round"
                        />

                        {/* Colored arc */}
                        <path
                            d="M 15 90 A 75 75 0 0 1 165 90"
                            fill="none"
                            stroke="url(#riskGrad)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            opacity="0.85"
                        />

                        {/* Zone labels */}
                        <text x="10"  y="100" fill="#4ade80" fontSize="9" fontFamily="monospace">LOW</text>
                        <text x="76"  y="20"  fill="#fbbf24" fontSize="9" fontFamily="monospace" textAnchor="middle">MED</text>
                        <text x="158" y="100" fill="#f87171" fontSize="9" fontFamily="monospace" textAnchor="end">HIGH</text>

                        {/* Needle */}
                        <g transform={`rotate(${needleAngle}, 90, 90)`} style={{ transition: 'transform 1s cubic-bezier(0.4,0,0.2,1)' }}>
                            <line
                                x1="90" y1="90"
                                x2="90" y2="22"
                                stroke={levelColor}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                style={{ filter: `drop-shadow(0 0 4px ${levelColor})` }}
                            />
                            <circle cx="90" cy="90" r="5" fill={levelColor} style={{ filter: `drop-shadow(0 0 6px ${levelColor})` }} />
                        </g>
                    </svg>
                </div>

                <div className="text-center mt-1">
                    <p className="text-2xl font-bold" style={{ color: levelColor, textShadow: `0 0 16px ${levelColor}66` }}>
                        {pct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-[#8b949e] mt-0.5">current pool utilization</p>
                </div>
            </div>

            {/* Risk description */}
            <div className="mt-3 text-xs text-[#8b949e] text-center">
                {level === 'low'    && 'Pool is well-funded. Coverage risk is minimal.'}
                {level === 'medium' && 'Moderate utilization. Pool remains solvent.'}
                {level === 'high'   && 'High utilization. Approaching 70% coverage cap.'}
            </div>
        </div>
    );
}
