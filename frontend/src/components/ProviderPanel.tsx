import React, { useState } from 'react';
import { useInsuranceVault } from '../hooks/useInsuranceVault';
import { useWallet } from '../hooks/useWallet';
import { Network } from '@btc-vision/bitcoin';
import { satToBtc, btcToSat, SAT } from '../services/ContractService';

// Sats kept back for on-chain fees when clicking Max on deposit
const GAS_RESERVE = 10_000n;

interface Props {
    address: string | null;
    network: Network;
    vault: ReturnType<typeof useInsuranceVault>;
}

function DropletIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>
    );
}

function BtcIcon({ size = 12 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline', marginRight: 2, verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="10" fill="#F7931A" fillOpacity="0.15"/>
            <path d="M8 7.5h5c1.1 0 2 .9 2 2s-.9 2-2 2H8V7.5zm0 4h5.5c1.1 0 2 .9 2 2s-.9 2-2 2H8V11.5z" stroke="#F7931A" strokeWidth="1.2" fill="none"/>
            <line x1="10" y1="6" x2="10" y2="18" stroke="#F7931A" strokeWidth="1.2"/>
            <line x1="13" y1="6" x2="13" y2="18" stroke="#F7931A" strokeWidth="1.2"/>
        </svg>
    );
}

export function ProviderPanel({ address, vault }: Props) {
    const { poolStats, lpBalance, txLoading, loading, error, lastTxId, depositLiquidity, withdrawLiquidity, clearError, refreshPool, refreshUser } = vault;
    const { walletBalance } = useWallet();

    async function handleRefresh() {
        await Promise.all([refreshPool(), refreshUser()]);
    }

    const [depositBtc,  setDepositBtc]  = useState('');
    const [withdrawBtc, setWithdrawBtc] = useState('');
    const [activeTab,   setActiveTab]   = useState<'deposit' | 'withdraw'>('deposit');
    const [successMsg,  setSuccessMsg]  = useState<string | null>(null);

    // Display total balance (confirmed + unconfirmed) — testnet txs often unconfirmed
    const totalSat      = walletBalance ? BigInt(Math.floor(walletBalance.total ?? walletBalance.confirmed)) : 0n;
    const confirmedSat  = walletBalance ? BigInt(Math.floor(walletBalance.confirmed)) : 0n;
    // Max deposit uses confirmed only (safer for fee estimation)
    const safeForDeposit = confirmedSat > 0n ? confirmedSat : totalSat;
    const maxDepositSat = safeForDeposit > GAS_RESERVE ? safeForDeposit - GAS_RESERVE : 0n;
    const walletBtc     = walletBalance ? satToBtc(totalSat) : null;

    function handleMaxDeposit() {
        if (maxDepositSat > 0n) setDepositBtc(satToBtc(maxDepositSat));
    }

    // Max withdrawable LP without under-collateralising active coverage:
    // After withdrawal of X BTC worth: newLiq = totalLiq - X
    // Constraint: totalCoverage ≤ newLiq × 70%
    // → newLiq ≥ totalCoverage / 0.7
    // → X ≤ totalLiq - totalCoverage / 0.7
    const minRequiredLiq = poolStats.totalCoverage > 0n
        ? (poolStats.totalCoverage * 100n) / 70n
        : 0n;
    const maxWithdrawableLiq = poolStats.totalLiquidity > minRequiredLiq
        ? poolStats.totalLiquidity - minRequiredLiq
        : 0n;
    // Convert to LP tokens: maxWithdrawLP = maxWithdrawableLiq × totalSupply / totalLiquidity
    // For simplicity (1:1 first deposit) cap at lpBalance
    const maxWithdrawLP = lpBalance < maxWithdrawableLiq ? lpBalance : maxWithdrawableLiq;
    const withdrawBlocked = lpBalance > 0n && maxWithdrawLP === 0n;

    function handleMaxWithdraw() {
        if (maxWithdrawLP > 0n) setWithdrawBtc(satToBtc(maxWithdrawLP));
        else if (lpBalance > 0n) setWithdrawBtc(satToBtc(lpBalance));
    }

    // LP share estimate: (lpBalance / totalLiquidity) * 100
    // Approximate since we'd need totalSupply for exact share, but first deposit is 1:1
    const lpSharePct = poolStats.totalLiquidity > 0n && lpBalance > 0n
        ? Math.min((Number(lpBalance) / Number(poolStats.totalLiquidity)) * 100, 100)
        : 0;

    // Estimated premium earnings: lpShare% of total premiums (2% of coverage)
    const totalPremium       = (poolStats.totalCoverage * 2n) / 100n;
    const estEarnings        = poolStats.totalLiquidity > 0n && lpBalance > 0n
        ? (totalPremium * lpBalance) / poolStats.totalLiquidity
        : 0n;

    const premium2Pct = depositBtc
        ? `≈ ${(parseFloat(depositBtc) * 0.02).toFixed(8)} BTC annual yield`
        : null;

    async function handleDeposit(e: React.FormEvent) {
        e.preventDefault();
        if (!depositBtc) return;
        setSuccessMsg(null);
        const sat = btcToSat(depositBtc);
        const ok  = await depositLiquidity(sat);
        if (ok) {
            setDepositBtc('');
            setSuccessMsg('Liquidity deposited! BTCLP tokens minted to your wallet.');
        }
    }

    async function handleWithdraw(e: React.FormEvent) {
        e.preventDefault();
        if (!withdrawBtc) return;
        setSuccessMsg(null);
        const sat = btcToSat(withdrawBtc);
        const ok  = await withdrawLiquidity(sat);
        if (ok) {
            setWithdrawBtc('');
            setSuccessMsg('Withdrawal successful! BTC returned to your wallet.');
        }
    }

    return (
        <div className="space-y-4 sm:space-y-6">

            {/* ── LP Analytics Dashboard ─────────────────────────────────────── */}
            {address && (
                <div className="card-glow space-y-4">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <DropletIcon />
                            <h3 className="text-sm font-semibold text-[#c9d1d9]">Your LP Dashboard</h3>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={loading || txLoading}
                            title="Refresh balances"
                            className="text-xs text-[#8b949e] hover:text-[#F7931A] transition-colors flex items-center gap-1 disabled:opacity-40"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={loading ? 'animate-spin' : ''}>
                                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                            Refresh
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="stat-box">
                            <p className="label">Your BTCLP</p>
                            <p className="text-lg font-bold text-[#F7931A]" style={{ textShadow: '0 0 10px rgba(247,147,26,0.4)' }}>
                                {satToBtc(lpBalance)}
                            </p>
                            <p className="text-xs text-[#8b949e] mt-0.5">BTCLP tokens</p>
                        </div>
                        <div className="stat-box">
                            <p className="label">Pool Share</p>
                            <p className="text-lg font-bold text-[#60a5fa]">
                                {lpSharePct.toFixed(2)}%
                            </p>
                            <p className="text-xs text-[#8b949e] mt-0.5">of pool</p>
                        </div>
                        <div className="stat-box">
                            <p className="label">Est. Earnings</p>
                            <p className="text-lg font-bold text-green-400">
                                <BtcIcon />
                                {satToBtc(estEarnings)}
                            </p>
                            <p className="text-xs text-[#8b949e] mt-0.5">from premiums</p>
                        </div>
                    </div>

                    {/* Pool share progress bar */}
                    {lpBalance > 0n && (
                        <div>
                            <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-[#8b949e]">Your share of the protection pool</span>
                                <span className="text-[#60a5fa] font-semibold">{lpSharePct.toFixed(2)}%</span>
                            </div>
                            <div className="progress-track">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${lpSharePct}%`,
                                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                        boxShadow: '0 0 8px rgba(96,165,250,0.4)',
                                        transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                                    }}
                                />
                            </div>
                            <p className="text-xs text-[#8b949e] mt-1.5">
                                You own <span className="text-[#60a5fa] font-semibold">{lpSharePct.toFixed(2)}%</span> of the protection pool
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Pool Stats ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="stat-box">
                    <p className="label">Total Pool Liquidity</p>
                    <p className="text-xl font-bold text-[#F7931A]" style={{ textShadow: '0 0 10px rgba(247,147,26,0.3)' }}>
                        <BtcIcon size={14} />
                        {satToBtc(poolStats.totalLiquidity)}
                    </p>
                    <p className="text-xs text-[#8b949e] mt-1">{poolStats.totalLiquidity.toLocaleString()} sat</p>
                </div>
                <div className="stat-box">
                    <p className="label">Active Coverage</p>
                    <p className="text-xl font-bold text-[#c9d1d9]">
                        {satToBtc(poolStats.totalCoverage)}
                    </p>
                    <p className="text-xs text-[#8b949e] mt-1">{poolStats.policyCount.toString()} active policies</p>
                </div>
            </div>

            {/* Pool utilization bar */}
            <div className="stat-box">
                <div className="flex justify-between items-center mb-2">
                    <p className="label mb-0">Pool Utilization</p>
                    <span className="text-sm font-bold" style={{
                        color: poolStats.utilizationPct >= 70 ? '#ef4444' : poolStats.utilizationPct >= 40 ? '#eab308' : '#4ade80'
                    }}>
                        {poolStats.utilizationPct.toFixed(1)}%
                    </span>
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
                <div className="flex justify-between text-xs text-[#8b949e] mt-1">
                    <span>0%</span>
                    <span className="text-yellow-500/70">70% cap</span>
                    <span>100%</span>
                </div>
            </div>

            {/* ── Deposit / Withdraw tabs ────────────────────────────────────── */}
            <div className="flex gap-6 border-b border-[#30363d]">
                <button onClick={() => setActiveTab('deposit')}  className={activeTab === 'deposit'  ? 'tab-active' : 'tab-inactive'}>Deposit</button>
                <button onClick={() => setActiveTab('withdraw')} className={activeTab === 'withdraw' ? 'tab-active' : 'tab-inactive'}>Withdraw</button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 flex justify-between items-start">
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={clearError} className="text-red-600 hover:text-red-400 ml-3 text-lg leading-none">&times;</button>
                </div>
            )}
            {successMsg && !error && (
                <div className="rounded-xl border border-green-700/50 bg-green-900/20 px-4 py-3 flex justify-between items-start">
                    <div>
                        <p className="text-green-400 text-sm">{successMsg}</p>
                        {lastTxId && <p className="text-green-600 text-xs mt-1 font-mono break-all">TX: {lastTxId}</p>}
                    </div>
                    <button onClick={() => setSuccessMsg(null)} className="text-green-600 hover:text-green-400 ml-3 text-lg leading-none">&times;</button>
                </div>
            )}

            {/* ── Deposit form ───────────────────────────────────────────────── */}
            {activeTab === 'deposit' && (
                <form onSubmit={handleDeposit} className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="label mb-0">Deposit Amount</label>
                            {walletBtc !== null && (
                                <span className="text-xs text-[#8b949e]">
                                    Balance:{' '}
                                    <span className="text-[#c9d1d9] font-medium">{walletBtc} BTC</span>
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="number" step="0.00000001" min="0.00000001"
                                placeholder="0.00000000"
                                value={depositBtc}
                                onChange={e => setDepositBtc(e.target.value)}
                                className="input-field pr-24"
                                disabled={!address || txLoading}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                {maxDepositSat > 0n && (
                                    <button
                                        type="button"
                                        onClick={handleMaxDeposit}
                                        disabled={txLoading}
                                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                        style={{
                                            background: 'rgba(247,147,26,0.15)',
                                            color: '#F7931A',
                                            border: '1px solid rgba(247,147,26,0.3)',
                                        }}
                                    >
                                        Max
                                    </button>
                                )}
                                <span className="text-[#F7931A] text-sm font-semibold">BTC</span>
                            </div>
                        </div>
                        {premium2Pct && <p className="text-xs text-green-400 mt-1.5">{premium2Pct}</p>}
                        {maxDepositSat > 0n && (
                            <p className="text-xs text-[#8b949e] mt-1">
                                Max depositabale: <span className="text-[#c9d1d9]">{satToBtc(maxDepositSat)} BTC</span>
                                <span className="text-[#8b949e]/60"> (10,000 sat reserved for fees)</span>
                            </p>
                        )}
                    </div>

                    {/* Summary box */}
                    <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#8b949e]">You receive</span>
                            <span className="text-[#c9d1d9]">
                                {depositBtc
                                    ? `≈ ${btcToSat(depositBtc).toLocaleString()} BTCLP`
                                    : 'BTCLP (proportional)'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8b949e]">Token</span>
                            <span className="text-[#c9d1d9]">BTC Insurance LP (BTCLP)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8b949e]">Yield source</span>
                            <span className="text-green-400">2% of active coverage</span>
                        </div>
                        <div className="divider" />
                        <div className="flex justify-between font-semibold">
                            <span className="text-[#8b949e]">New pool share</span>
                            <span className="text-[#60a5fa]">
                                {depositBtc && poolStats.totalLiquidity > 0n
                                    ? `≈ ${((Number(btcToSat(depositBtc)) / (Number(poolStats.totalLiquidity) + Number(btcToSat(depositBtc)))) * 100).toFixed(2)}%`
                                    : '—'}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!address || txLoading || !depositBtc}
                        className="btn-primary w-full"
                    >
                        {txLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                                Depositing…
                            </span>
                        ) : '💧 Deposit Liquidity'}
                    </button>
                    {!address && <p className="text-[#8b949e] text-sm text-center">Connect wallet to deposit</p>}
                </form>
            )}

            {/* ── Withdraw form ──────────────────────────────────────────────── */}
            {activeTab === 'withdraw' && (
                <form onSubmit={handleWithdraw} className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="label mb-0">BTCLP Amount to Withdraw</label>
                            {lpBalance > 0n && (
                                <span className="text-xs text-[#8b949e]">
                                    Balance:{' '}
                                    <span className="text-[#c9d1d9] font-medium">{satToBtc(lpBalance)} BTCLP</span>
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="number" step="0.00000001" min="0.00000001"
                                placeholder="0.00000000"
                                value={withdrawBtc}
                                onChange={e => setWithdrawBtc(e.target.value)}
                                className="input-field pr-28"
                                disabled={!address || txLoading}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                {lpBalance > 0n && (
                                    <button
                                        type="button"
                                        onClick={handleMaxWithdraw}
                                        disabled={txLoading}
                                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                        style={{
                                            background: 'rgba(96,165,250,0.15)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(96,165,250,0.3)',
                                        }}
                                    >
                                        Max
                                    </button>
                                )}
                                <span className="text-[#60a5fa] text-sm font-semibold">BTCLP</span>
                            </div>
                        </div>
                        {lpBalance > 0n && (
                            <div className="space-y-1 mt-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-[#8b949e]">
                                        Your BTCLP: <span className="text-[#60a5fa] font-medium">{satToBtc(lpBalance)}</span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleMaxWithdraw}
                                        disabled={txLoading || maxWithdrawLP === 0n}
                                        className="text-xs font-semibold px-2 py-0.5 rounded disabled:opacity-40"
                                        style={{
                                            background: 'rgba(96,165,250,0.15)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(96,165,250,0.3)',
                                        }}
                                    >
                                        Max
                                    </button>
                                </div>
                                {withdrawBlocked ? (
                                    <p className="text-xs text-yellow-400">
                                        ⚠ Withdrawal locked — active coverage uses {poolStats.utilizationPct.toFixed(1)}% of pool.
                                        Withdrawal is allowed once coverage drops below 70%.
                                    </p>
                                ) : maxWithdrawLP < lpBalance ? (
                                    <p className="text-xs text-yellow-400">
                                        ⚠ Can only withdraw <span className="font-medium">{satToBtc(maxWithdrawLP)} BTCLP</span> — remaining locked to cover active policies.
                                    </p>
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#8b949e]">You burn</span>
                            <span className="text-[#c9d1d9]">
                                {withdrawBtc ? `${withdrawBtc} BTCLP` : '— BTCLP'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8b949e]">You receive</span>
                            <span className="text-[#c9d1d9]">
                                {withdrawBtc && poolStats.totalLiquidity > 0n && poolStats.totalCoverage < poolStats.totalLiquidity
                                    ? `≈ ${withdrawBtc} BTC`
                                    : 'Proportional BTC from pool'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8b949e]">Blocked if</span>
                            <span className="text-yellow-400">Coverage &gt; 70% of new pool</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!address || txLoading || !withdrawBtc || lpBalance === 0n}
                        className="btn-secondary w-full"
                    >
                        {txLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                                Withdrawing…
                            </span>
                        ) : '↩ Withdraw Liquidity'}
                    </button>
                    {lpBalance === 0n && address && (
                        <p className="text-[#8b949e] text-sm text-center">You have no BTCLP tokens to withdraw</p>
                    )}
                    {!address && <p className="text-[#8b949e] text-sm text-center">Connect wallet to withdraw</p>}
                </form>
            )}
        </div>
    );
}
