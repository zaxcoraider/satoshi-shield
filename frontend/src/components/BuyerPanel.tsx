import React, { useState, useEffect } from 'react';
import { useInsuranceVault } from '../hooks/useInsuranceVault';
import { Network } from '@btc-vision/bitcoin';
import { satToBtc, btcToSat, POLICY_STATUS, Policy } from '../services/ContractService';
import { RiskMeter } from './RiskMeter';

interface Props {
    address: string | null;
    network: Network;
    vault: ReturnType<typeof useInsuranceVault>;
}

function ShieldIcon({ size = 20, color = '#F7931A' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z"
                fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function CountdownTimer({ expiryBlock, currentBlock }: { expiryBlock: bigint; currentBlock: bigint }) {
    if (currentBlock === 0n) {
        return <span className="text-[#8b949e]">Block #{expiryBlock.toString()}</span>;
    }

    const blocksLeft = Number(expiryBlock) - Number(currentBlock);

    if (blocksLeft <= 0) {
        return <span className="text-red-400">Expired</span>;
    }

    // 1 block ≈ 10 minutes
    const minutesLeft = blocksLeft * 10;
    const days    = Math.floor(minutesLeft / 1440);
    const hours   = Math.floor((minutesLeft % 1440) / 60);
    const minutes = Math.floor(minutesLeft % 60);

    let label: string;
    if (days > 0)       label = `${days}d ${hours}h ${minutes}m`;
    else if (hours > 0) label = `${hours}h ${minutes}m`;
    else                label = `${minutes}m`;

    return (
        <span className="text-green-400">
            {label}
            <span className="text-[#8b949e] font-normal text-xs ml-1">(#{expiryBlock.toString()})</span>
        </span>
    );
}

function statusBadge(status: bigint) {
    if (status === POLICY_STATUS.ACTIVE)  return (
        <span className="badge-active">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Active
        </span>
    );
    if (status === POLICY_STATUS.CLAIMED) return (
        <span className="badge-claimed">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />Claimed
        </span>
    );
    return (
        <span className="badge-expired">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />None
        </span>
    );
}

function PolicyCard({ policy, onClaim, loading, eventTriggered, eventTimestamp, currentBlock }: {
    policy: Policy;
    onClaim: () => void;
    loading: boolean;
    eventTriggered: boolean;
    eventTimestamp: bigint;
    currentBlock: bigint;
}) {
    const premiumPaid = (policy.coverageAmount * 2n) / 100n;
    // Policy was active during the event if eventTimestamp <= expiryBlock.
    // Fallback: if eventTimestamp is 0 (not yet indexed) but event is triggered,
    // treat all currently ACTIVE policies as eligible — contract enforces the real check.
    const activeAtEvent = eventTimestamp > 0n
        ? eventTimestamp <= policy.expiryBlock
        : eventTriggered; // fallback when timestamp not yet fetched
    const canClaim      = eventTriggered && policy.status === POLICY_STATUS.ACTIVE && activeAtEvent;
    const expiredBeforeEvent = eventTriggered && eventTimestamp > 0n && !activeAtEvent && policy.status === POLICY_STATUS.ACTIVE;

    return (
        <div
            className="rounded-xl border p-5 space-y-4 transition-all duration-200"
            style={{
                background: canClaim
                    ? 'rgba(247,147,26,0.04)'
                    : 'rgba(13,17,23,0.8)',
                borderColor: canClaim
                    ? 'rgba(247,147,26,0.4)'
                    : policy.status === POLICY_STATUS.CLAIMED
                    ? 'rgba(96,165,250,0.3)'
                    : '#30363d',
                boxShadow: canClaim ? '0 0 20px rgba(247,147,26,0.12)' : 'none',
            }}
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                    <ShieldIcon
                        size={22}
                        color={canClaim ? '#F7931A' : policy.status === POLICY_STATUS.CLAIMED ? '#60a5fa' : '#8b949e'}
                    />
                    <div>
                        <p className="text-xs text-[#8b949e]">Policy ID</p>
                        <p className="font-mono text-base font-bold text-[#c9d1d9]">
                            #{policy.policyId.toString()}
                        </p>
                    </div>
                </div>
                {statusBadge(policy.status)}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className="text-xs text-[#8b949e] mb-0.5">Coverage Amount</p>
                    <p className="text-sm font-bold text-[#F7931A]" style={{ textShadow: '0 0 8px rgba(247,147,26,0.3)' }}>
                        {satToBtc(policy.coverageAmount)} BTC
                    </p>
                </div>
                <div>
                    <p className="text-xs text-[#8b949e] mb-0.5">Premium Paid</p>
                    <p className="text-sm font-semibold text-[#c9d1d9]">
                        {satToBtc(premiumPaid)} BTC
                    </p>
                </div>
                <div>
                    <p className="text-xs text-[#8b949e] mb-0.5">Start Block</p>
                    <p className="text-sm font-mono text-[#c9d1d9]">#{policy.startBlock.toString()}</p>
                </div>
                <div>
                    <p className="text-xs text-[#8b949e] mb-0.5">Time Remaining</p>
                    <p className="text-sm font-semibold">
                        <CountdownTimer expiryBlock={policy.expiryBlock} currentBlock={currentBlock} />
                    </p>
                </div>
            </div>

            {/* Progress bar for coverage period */}
            {policy.status === POLICY_STATUS.ACTIVE && (
                <div>
                    <div className="flex justify-between text-xs text-[#8b949e] mb-1">
                        <span>Expiry block #{policy.expiryBlock.toString()}</span>
                        <span>30-day coverage</span>
                    </div>
                    <div className="progress-track">
                        <div
                            className="progress-fill"
                            style={{
                                width: '100%',
                                background: 'linear-gradient(90deg, #22c55e, #4ade80)',
                                opacity: 0.6,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Claim button */}
            {canClaim && (
                <button
                    onClick={onClaim}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                                <path d="M12 2a10 10 0 0 1 10 10"/>
                            </svg>
                            Claiming…
                        </>
                    ) : (
                        <>
                            <ShieldIcon size={16} color="#000" />
                            Claim {satToBtc(policy.coverageAmount)} BTC Payout
                        </>
                    )}
                </button>
            )}

            {expiredBeforeEvent && (
                <div className="rounded-lg bg-red-900/20 border border-red-800/40 p-3 text-xs text-red-300 flex items-center gap-2">
                    <span>✗</span>
                    Policy had expired before the insured event — not eligible for payout.
                </div>
            )}

            {policy.status === POLICY_STATUS.CLAIMED && (
                <div className="rounded-lg bg-blue-900/20 border border-blue-800/40 p-3 text-xs text-blue-300 flex items-center gap-2">
                    <span>✓</span>
                    Payout of {satToBtc(policy.coverageAmount)} BTC has been recorded on-chain.
                </div>
            )}
        </div>
    );
}

export function BuyerPanel({ address, vault }: Props) {
    const { poolStats, userPolicy, currentBlock, loading: poolLoading, txLoading, error, buyProtection, claimPayout, clearError, refreshPool, refreshUser } = vault;
    const { eventTriggered, eventTimestamp } = poolStats;

    const [coverageBtc,      setCoverageBtc]      = useState('');
    const [successMsg,       setSuccessMsg]        = useState<string | null>(null);
    const [justPurchased,    setJustPurchased]     = useState(false);
    // Optimistic: track extra coverage bought this session not yet indexed
    const [pendingCoverage,  setPendingCoverage]   = useState(0n);

    // Auto-refresh user data when the event gets triggered so the claim button appears
    useEffect(() => {
        if (eventTriggered && address) {
            refreshUser();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventTriggered, address]);

    const coverageSat  = coverageBtc ? btcToSat(coverageBtc) : 0n;
    const premiumSat   = coverageSat > 0n ? (coverageSat * 2n) / 100n : 0n;
    const cap          = (poolStats.totalLiquidity * 70n) / 100n;
    // Subtract pending coverage so display is accurate before indexer catches up
    const effectiveCoverage = poolStats.totalCoverage + pendingCoverage;
    const maxCoverage  = cap > effectiveCoverage ? cap - effectiveCoverage : 0n;
    const poolEmpty    = poolStats.totalLiquidity === 0n;
    const poolHasRoom  = !poolEmpty && maxCoverage > 0n;

    async function handleBuy(e: React.FormEvent) {
        e.preventDefault();
        if (!coverageBtc) return;
        setSuccessMsg(null);
        const ok = await buyProtection(coverageSat);
        if (ok) {
            const purchased = coverageSat;
            setCoverageBtc('');
            setSuccessMsg('Protection policy created! Your policy is now active on-chain.');
            setJustPurchased(true);
            // Optimistically reduce displayed capacity immediately
            setPendingCoverage(prev => prev + purchased);
            // OPNet indexer needs ~15s to update state — refresh again after delay
            setTimeout(async () => {
                await Promise.all([refreshPool(), refreshUser()]);
                // Once indexer is synced, clear optimistic offset
                setPendingCoverage(0n);
                setJustPurchased(false);
            }, 15_000);
        }
    }

    async function handleClaim() {
        if (!userPolicy) return;
        setSuccessMsg(null);
        const ok = await claimPayout(userPolicy.policyId);
        if (ok) setSuccessMsg('Payout claimed successfully!');
    }

    return (
        <div className="space-y-6">

            {/* ── Stats row ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="stat-box">
                    <p className="label">Available Capacity</p>
                    <p className="text-lg font-bold text-[#c9d1d9]">
                        {satToBtc(maxCoverage > 0n ? maxCoverage : 0n)}
                    </p>
                    <p className="text-xs text-[#8b949e] mt-1">BTC · 70% of pool</p>
                </div>
                <div className="stat-box">
                    <p className="label">Coverage Period</p>
                    <p className="text-lg font-bold text-[#c9d1d9]">30 days</p>
                    <p className="text-xs text-[#8b949e] mt-1">≈ 4 320 blocks</p>
                </div>
                <div className="stat-box">
                    <p className="label">Premium Rate</p>
                    <p className="text-lg font-bold text-[#F7931A]" style={{ textShadow: '0 0 10px rgba(247,147,26,0.3)' }}>2%</p>
                    <p className="text-xs text-[#8b949e] mt-1">flat · of coverage</p>
                </div>
            </div>

            {/* ── Risk meter ────────────────────────────────────────────────── */}
            <RiskMeter utilization={poolStats.utilizationPct} />

            {/* Event alert + claim CTA */}
            {eventTriggered && (
                <div className="rounded-xl border border-orange-700/60 bg-orange-900/20 p-4 space-y-3"
                    style={{ boxShadow: '0 0 24px rgba(247,147,26,0.1)' }}>

                    {/* Banner header */}
                    <div className="flex gap-3 items-start">
                        <span className="text-xl flex-shrink-0">⚡</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-orange-300 font-bold text-sm">Insured Event Triggered</p>
                            <p className="text-orange-400 text-sm mt-0.5">
                                Eligible policy holders can now claim their coverage amount.
                            </p>
                            {eventTimestamp > 0n && (
                                <p className="text-orange-500 text-xs mt-1">
                                    Event at block <span className="font-mono text-orange-400">#{eventTimestamp.toString()}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-orange-700/30 pt-3 space-y-2">
                        {/* Case 1: policy loaded and claimable — big CTA button */}
                        {userPolicy && userPolicy.status === POLICY_STATUS.ACTIVE && (
                            <button
                                onClick={handleClaim}
                                disabled={txLoading}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                                style={{
                                    background: txLoading ? 'rgba(247,147,26,0.2)' : 'linear-gradient(135deg, #F7931A, #e8820a)',
                                    color: txLoading ? '#F7931A' : '#000',
                                    border: '1px solid rgba(247,147,26,0.5)',
                                    boxShadow: txLoading ? 'none' : '0 0 16px rgba(247,147,26,0.3)',
                                }}
                            >
                                {txLoading ? (
                                    <>
                                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" strokeOpacity="0.4"/>
                                            <path d="M12 2a10 10 0 0 1 10 10"/>
                                        </svg>
                                        Claiming…
                                    </>
                                ) : (
                                    <>
                                        <ShieldIcon size={16} color="#000" />
                                        Claim {satToBtc(userPolicy.coverageAmount)} BTC Payout
                                    </>
                                )}
                            </button>
                        )}

                        {/* Case 2: already claimed */}
                        {userPolicy && userPolicy.status === POLICY_STATUS.CLAIMED && (
                            <div className="flex items-center gap-2 text-sm text-blue-300 py-1">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Payout of {satToBtc(userPolicy.coverageAmount)} BTC already claimed.
                            </div>
                        )}

                        {/* Case 3: policy loaded but status is NONE (shouldn't be claimable) */}
                        {userPolicy && userPolicy.status === POLICY_STATUS.NONE && (
                            <p className="text-xs text-orange-400">No active policy found for your wallet.</p>
                        )}

                        {/* Case 4: no policy loaded at all — refresh prompt */}
                        {!userPolicy && address && (
                            <div className="flex items-center gap-3">
                                <p className="text-orange-400 text-xs flex-1">
                                    {poolLoading ? 'Loading your policy…' : 'No policy found. Click refresh to check.'}
                                </p>
                                <button
                                    onClick={async () => { await Promise.all([refreshPool(), refreshUser()]); }}
                                    disabled={poolLoading || txLoading}
                                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                    style={{
                                        background: 'rgba(247,147,26,0.15)',
                                        border: '1px solid rgba(247,147,26,0.4)',
                                        color: '#F7931A',
                                    }}
                                >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={poolLoading ? 'animate-spin' : ''}>
                                        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                    </svg>
                                    {poolLoading ? 'Loading…' : 'Refresh'}
                                </button>
                            </div>
                        )}

                        {/* Case 5: wallet not connected */}
                        {!address && (
                            <p className="text-orange-400 text-xs">Connect wallet to check your claim eligibility.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Alerts */}
            {error && (
                <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 flex justify-between items-start">
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={clearError} className="text-red-600 hover:text-red-400 ml-3 text-lg leading-none">&times;</button>
                </div>
            )}
            {successMsg && !error && (
                <div className="rounded-xl border border-green-700/50 bg-green-900/20 px-4 py-3">
                    <p className="text-green-400 text-sm">{successMsg}</p>
                </div>
            )}

            {/* ── Indexing pending notice ───────────────────────────────────── */}
            {justPurchased && (
                <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/10 px-4 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
                    <p className="text-yellow-400 text-sm">
                        Policy submitted — waiting for OPNet to index the updated pool state…
                    </p>
                </div>
            )}

            {/* ── Buy Protection form ───────────────────────────────────────── */}
            {/* Hide buy form after event — no new coverage should be issued post-event */}
            {(!userPolicy || userPolicy.status !== POLICY_STATUS.ACTIVE) && !justPurchased && !eventTriggered && (
                <div className="card space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldIcon size={18} />
                        <h3 className="font-semibold text-[#c9d1d9] text-sm">Buy Protection</h3>
                    </div>

                    <div>
                        <label className="label">Coverage Amount</label>
                        <div className="relative">
                            <input
                                type="number" step="0.00000001" min="0.00000001"
                                placeholder="0.00000000"
                                value={coverageBtc}
                                onChange={e => setCoverageBtc(e.target.value)}
                                className="input-field pr-16"
                                disabled={!address || txLoading || !poolHasRoom}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#F7931A] text-sm font-semibold">BTC</span>
                        </div>
                        {maxCoverage > 0n && (
                            <button
                                type="button"
                                onClick={() => setCoverageBtc(satToBtc(maxCoverage))}
                                className="text-xs text-[#F7931A] mt-1.5 hover:underline"
                            >
                                Max available: {satToBtc(maxCoverage)} BTC
                            </button>
                        )}
                    </div>

                    {/* Policy summary */}
                    {coverageSat > 0n && (
                        <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2 text-sm">
                            <p className="text-[#8b949e] font-medium text-xs uppercase tracking-wider mb-2">Policy Summary</p>
                            <div className="flex justify-between">
                                <span className="text-[#8b949e]">Coverage Amount</span>
                                <span className="text-[#c9d1d9] font-semibold">{satToBtc(coverageSat)} BTC</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#8b949e]">Premium (2%)</span>
                                <span className="text-[#F7931A] font-semibold">{satToBtc(premiumSat)} BTC</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#8b949e]">Coverage Period</span>
                                <span className="text-[#c9d1d9]">30 days · 4 320 blocks</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#8b949e]">Policy stored</span>
                                <span className="text-green-400">On-chain (OPNet)</span>
                            </div>
                            <div className="divider" />
                            <div className="flex justify-between font-semibold">
                                <span className="text-[#c9d1d9]">Total Cost</span>
                                <span className="text-[#F7931A]" style={{ textShadow: '0 0 8px rgba(247,147,26,0.3)' }}>
                                    {satToBtc(premiumSat)} BTC
                                </span>
                            </div>
                        </div>
                    )}

                    {poolEmpty && (
                        <div className="rounded-lg border border-yellow-700/40 bg-yellow-900/10 p-3 text-sm text-yellow-400">
                            Pool has no liquidity yet. Switch to the{' '}
                            <button
                                type="button"
                                className="text-[#F7931A] underline font-semibold"
                                onClick={() => document.dispatchEvent(new CustomEvent('switch-tab', { detail: 'provider' }))}
                            >
                                Liquidity Provider
                            </button>{' '}
                            tab to deposit first.
                        </div>
                    )}
                    {!poolEmpty && !poolHasRoom && (
                        <div className="rounded-lg border border-red-700/40 bg-red-900/10 p-3 text-sm text-red-400">
                            Pool is at 70% capacity. No new coverage available until more liquidity is added.
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => { const e = { preventDefault: () => {} } as React.FormEvent; handleBuy(e); }}
                        disabled={!address || txLoading || !coverageBtc || !poolHasRoom}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {txLoading ? (
                            <>
                                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                                    <path d="M12 2a10 10 0 0 1 10 10"/>
                                </svg>
                                Processing…
                            </>
                        ) : (
                            <>
                                <ShieldIcon size={16} color="#000" />
                                Buy Protection (30 days)
                            </>
                        )}
                    </button>
                    {!address && (
                        <p className="text-[#8b949e] text-sm text-center">Connect wallet to buy protection</p>
                    )}
                </div>
            )}

            {/* ── Active Policy card ────────────────────────────────────────── */}
            {userPolicy && userPolicy.policyId > 0n && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <ShieldIcon size={16} color="#4ade80" />
                            <h3 className="font-semibold text-[#c9d1d9] text-sm">My Policies</h3>
                        </div>
                        {currentBlock > 0n && (
                            <span className="text-xs text-[#8b949e]">
                                Current block: <span className="font-mono text-[#c9d1d9]">#{currentBlock.toString()}</span>
                            </span>
                        )}
                    </div>
                    <PolicyCard
                        policy={userPolicy}
                        onClaim={handleClaim}
                        loading={txLoading}
                        eventTriggered={eventTriggered}
                        eventTimestamp={eventTimestamp}
                        currentBlock={currentBlock}
                    />
                </div>
            )}
        </div>
    );
}
