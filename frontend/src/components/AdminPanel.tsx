import React, { useState } from 'react';
import { useInsuranceVault } from '../hooks/useInsuranceVault';
import { Network } from '@btc-vision/bitcoin';
import { satToBtc } from '../services/ContractService';

interface Props {
    address: string | null;
    network: Network;
    vault: ReturnType<typeof useInsuranceVault>;
}

export function AdminPanel({ address, vault }: Props) {
    const { poolStats, txLoading, error, lastTxId, triggerEvent, clearError } = vault;
    const [confirmed, setConfirmed] = useState(false);

    async function handleTrigger() {
        if (!confirmed) { setConfirmed(true); return; }
        setConfirmed(false);
        await triggerEvent();
    }

    const healthColor =
        poolStats.utilizationPct >= 70 ? '#ef4444' :
        poolStats.utilizationPct >= 40 ? '#eab308' : '#22c55e';

    return (
        <div className="space-y-6">

            {/* Warning banner */}
            <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-4 flex gap-3">
                <span className="text-xl flex-shrink-0">⚠</span>
                <div>
                    <p className="text-yellow-300 font-semibold text-sm">Admin Zone — Demo Only</p>
                    <p className="text-yellow-400/80 text-sm mt-0.5">
                        Triggering an insured event allows all active policy holders to claim their full coverage. This action is irreversible on-chain.
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="stat-box">
                    <p className="label">Event Status</p>
                    {poolStats.eventTriggered ? (
                        <>
                            <span className="inline-flex items-center gap-2 font-semibold mt-1" style={{ color: '#fb923c' }}>
                                <span className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-pulse" style={{ boxShadow: '0 0 8px rgba(251,146,60,0.7)' }} />
                                TRIGGERED
                            </span>
                            {poolStats.eventTimestamp > 0n && (
                                <p className="text-xs text-[#8b949e] mt-1">
                                    at block <span className="font-mono text-orange-300">#{poolStats.eventTimestamp.toString()}</span>
                                </p>
                            )}
                        </>
                    ) : (
                        <span className="inline-flex items-center gap-2 text-green-400 font-semibold mt-1">
                            <span className="w-2.5 h-2.5 bg-green-400 rounded-full" style={{ boxShadow: '0 0 8px rgba(74,222,128,0.6)' }} />
                            Normal
                        </span>
                    )}
                </div>
                <div className="stat-box">
                    <p className="label">Pool Utilization</p>
                    <p className="text-lg font-bold" style={{ color: healthColor }}>
                        {poolStats.utilizationPct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-[#8b949e] mt-0.5">70% max cap</p>
                </div>
                <div className="stat-box">
                    <p className="label">At-Risk Value</p>
                    <p className="text-lg font-bold text-[#F7931A]">
                        {satToBtc(poolStats.totalCoverage)} BTC
                    </p>
                    <p className="text-xs text-[#8b949e] mt-0.5">active coverage</p>
                </div>
                <div className="stat-box">
                    <p className="label">Pool Liquidity</p>
                    <p className="text-lg font-bold text-[#c9d1d9]">
                        {satToBtc(poolStats.totalLiquidity)} BTC
                    </p>
                    <p className="text-xs text-[#8b949e] mt-0.5">{poolStats.policyCount.toString()} policies</p>
                </div>
            </div>

            {/* Pool health bar */}
            <div className="stat-box">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#8b949e]">Coverage / Liquidity ratio</span>
                    <span style={{ color: healthColor }}>{poolStats.utilizationPct.toFixed(1)}%</span>
                </div>
                <div className="progress-track">
                    <div
                        className="progress-fill"
                        style={{
                            width: `${Math.min(poolStats.utilizationPct, 100)}%`,
                            background: poolStats.utilizationPct >= 70
                                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                : poolStats.utilizationPct >= 40
                                ? 'linear-gradient(90deg, #eab308, #fbbf24)'
                                : 'linear-gradient(90deg, #16a34a, #4ade80)',
                            transition: 'width 1s ease',
                        }}
                    />
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 flex justify-between">
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={clearError} className="text-red-600 hover:text-red-400 ml-3 text-lg leading-none">&times;</button>
                </div>
            )}
            {lastTxId && (
                <div className="rounded-xl border border-green-700/50 bg-green-900/20 px-4 py-3">
                    <p className="text-green-400 text-sm font-semibold">Transaction Submitted</p>
                    <p className="font-mono text-xs text-[#8b949e] mt-1 break-all">{lastTxId}</p>
                </div>
            )}

            {/* Trigger action */}
            {!poolStats.eventTriggered ? (
                <div className="card space-y-4">
                    <h3 className="font-semibold text-[#c9d1d9]">Simulate Insured Event</h3>
                    <p className="text-[#8b949e] text-sm leading-relaxed">
                        This will set the global <code className="text-[#F7931A] bg-[#F7931A]/10 px-1 rounded">eventTriggered</code> flag to{' '}
                        <code className="text-red-400 bg-red-400/10 px-1 rounded">true</code> on-chain.
                        After this, all active policy holders may call{' '}
                        <code className="text-[#F7931A] bg-[#F7931A]/10 px-1 rounded">claimPayout()</code> to receive their coverage.
                    </p>

                    {confirmed && (
                        <div className="rounded-lg border border-red-800/60 bg-red-900/20 p-3 text-sm text-red-300 flex items-center gap-2">
                            <span>⚠</span>
                            Are you sure? Click again to confirm. This action cannot be undone.
                        </div>
                    )}

                    <button
                        onClick={handleTrigger}
                        disabled={!address || txLoading}
                        className={`w-full ${confirmed ? 'btn-danger' : 'btn-secondary'}`}
                        style={!confirmed ? { borderColor: '#7f1d1d', color: '#f87171' } : {}}
                    >
                        {txLoading
                            ? 'Sending transaction…'
                            : confirmed
                            ? '⚡ Confirm — Trigger Insured Event'
                            : '⚡ Trigger Insured Event'}
                    </button>

                    {!address && (
                        <p className="text-[#8b949e] text-sm text-center">Connect admin wallet to trigger</p>
                    )}
                </div>
            ) : (
                <div className="card text-center space-y-3 border-orange-700/40" style={{ background: 'rgba(251,146,60,0.04)' }}>
                    <div className="text-4xl">⚡</div>
                    <h3 className="font-bold text-orange-400 text-lg">Insured Event Active</h3>
                    <p className="text-[#8b949e] text-sm">
                        The event has been triggered. Policy holders on the Protection Buyer tab can now claim their payouts.
                    </p>
                    <div className="rounded-lg bg-orange-900/20 border border-orange-800/40 p-3 text-xs text-orange-300">
                        Total exposure: <span className="font-bold text-orange-200">{satToBtc(poolStats.totalCoverage)} BTC</span> eligible for payout
                    </div>
                </div>
            )}
        </div>
    );
}
