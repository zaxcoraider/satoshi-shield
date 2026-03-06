import React, { useState, useEffect } from 'react';
import { WalletConnectProvider } from '@btc-vision/walletconnect';
import { WalletConnect } from './components/WalletConnect';
import { ProviderPanel } from './components/ProviderPanel';
import { BuyerPanel } from './components/BuyerPanel';
import { AdminPanel } from './components/AdminPanel';
import { PoolHealthCard } from './components/PoolHealthCard';
import { UtilizationGauge } from './components/UtilizationGauge';
import { useWallet } from './hooks/useWallet';
import { useInsuranceVault } from './hooks/useInsuranceVault';
import { Sidebar } from './components/Sidebar';

type Tab = 'provider' | 'buyer' | 'admin';

function ShieldLogo({ className = '' }: { className?: string }) {
    return (
        <img
            src="/logo.png"
            alt="Satoshi Shield"
            className={className}
            style={{ objectFit: 'contain', display: 'block' }}
        />
    );
}

function BtcIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.75 14.5v1h-1.5v-1H9v-1.5h.75V9H9V7.5h2.25v-1h1.5v1H14c1.24 0 2.25 1.01 2.25 2.25 0 .62-.25 1.18-.66 1.59.66.44 1.16 1.14 1.16 1.91 0 1.38-1.12 2.25-2.5 2.25h-.5zm-.5-5.5h1.25c.41 0 .75-.34.75-.75s-.34-.75-.75-.75H12.25v1.5zm1.5 3H12.25V12.5H13.75c.55 0 1 .45 1 1s-.45 1-1 1z" fill="#F7931A"/>
        </svg>
    );
}

function MetricCard({ label, value, sub, glow = false }: { label: string; value: string; sub?: string; glow?: boolean }) {
    return (
        <div className="stat-box-lg">
            <p className="label">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${glow ? 'glow-bitcoin' : 'text-[#c9d1d9]'}`}>
                {glow && <BtcIcon />}
                {value}
            </p>
            {sub && <p className="text-xs text-[#8b949e] mt-1">{sub}</p>}
        </div>
    );
}

function Inner() {
    const { address, addressObj, network, isConnected, provider } = useWallet();
    const vault = useInsuranceVault(address ?? null, addressObj, network, provider);
    const [tab, setTab]           = useState<Tab>('buyer');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => setTab((e as CustomEvent).detail as Tab);
        document.addEventListener('switch-tab', handler);
        return () => document.removeEventListener('switch-tab', handler);
    }, []);

    const TAB_ITEMS: { key: Tab; label: string; icon: string }[] = [
        { key: 'buyer',    label: 'Protection Buyer',   icon: '🛡️' },
        { key: 'provider', label: 'Liquidity Provider', icon: '💧' },
        { key: 'admin',    label: 'Admin',              icon: '⚙️' },
    ];

    const { poolStats, loading, error, refreshPool } = vault;
    const totalLiqBtc  = (Number(poolStats.totalLiquidity) / 1e8).toFixed(4);
    const totalCovBtc  = (Number(poolStats.totalCoverage)  / 1e8).toFixed(4);

    // Estimated premium collected: coverage * 2% (simplified)
    const estPremiumBtc = (Number(poolStats.totalCoverage) * 0.02 / 1e8).toFixed(6);

    return (
        <div className="min-h-screen" style={{ background: '#0a0e17' }}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header
                className="sticky top-0 z-20 border-b border-[#30363d]"
                style={{ background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)' }}
            >
                <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
                    {/* Logo */}
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="flex-shrink-0">
                            <ShieldLogo className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24" />
                        </div>
                        <div className="min-w-0">
                            <p className="hidden sm:block text-[#8b949e] text-xs mt-0.5">
                                Bitcoin-native Protection · OPNet Testnet
                            </p>
                        </div>
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                        <button
                            onClick={refreshPool}
                            disabled={loading}
                            title="Refresh pool data"
                            className="transition-colors p-1.5 rounded-lg flex-shrink-0 disabled:cursor-not-allowed"
                            style={{ color: loading ? '#F7931A' : '#8b949e' }}
                            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.color = '#F7931A'; }}
                            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.color = '#8b949e'; }}
                        >
                            <svg
                                width="16" height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={loading ? 'animate-spin' : ''}
                                style={loading ? {} : { transition: 'transform 0.3s ease' }}
                            >
                                <polyline points="23 4 23 10 17 10"/>
                                <polyline points="1 20 1 14 7 14"/>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                        </button>
                        <WalletConnect />
                        {/* Mobile hamburger — opens tab menu */}
                        <button
                            onClick={() => setMobileMenuOpen(o => !o)}
                            className="sm:hidden flex-shrink-0 p-1.5 rounded-lg text-[#8b949e] hover:text-[#F7931A] hover:bg-[#F7931A]/10 transition-colors"
                            aria-label="Open menu"
                        >
                            {mobileMenuOpen ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile nav menu — slides down when hamburger is open */}
                {mobileMenuOpen && (
                    <div className="sm:hidden border-t border-[#30363d] px-3 py-2 space-y-1" style={{ background: 'rgba(13,17,23,0.98)' }}>
                        {TAB_ITEMS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => { setTab(t.key); setMobileMenuOpen(false); }}
                                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                                style={{
                                    background: tab === t.key ? 'rgba(247,147,26,0.1)' : 'transparent',
                                    color: tab === t.key ? '#F7931A' : '#8b949e',
                                    border: tab === t.key ? '1px solid rgba(247,147,26,0.2)' : '1px solid transparent',
                                }}
                            >
                                <span>{t.icon}</span>
                                <span className="font-medium">{t.label}</span>
                                {tab === t.key && <span className="ml-auto text-[#F7931A]">●</span>}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
                <div className="flex gap-5 xl:gap-6 items-start">
                {/* ── Sidebar ──────────────────────────────────────────────────── */}
                <Sidebar />

                {/* ── Main content ─────────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">


                {/* ── Error banner ─────────────────────────────────────────────── */}
                {error && !error.includes('Awaiting') && (
                    <div className="rounded-xl border border-red-800 bg-red-900/20 px-5 py-3 flex items-center justify-between">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button onClick={vault.clearError} className="text-red-600 hover:text-red-400 ml-4 text-lg leading-none">&times;</button>
                    </div>
                )}
                {error?.includes('Awaiting') && (
                    <div className="rounded-xl border border-yellow-800/50 bg-yellow-900/10 px-5 py-3 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
                        <p className="text-yellow-400 text-sm">{error}</p>
                    </div>
                )}

                {/* ── Top metrics bar ───────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <MetricCard
                        label="Total Liquidity"
                        value={`${totalLiqBtc} BTC`}
                        sub={`${poolStats.totalLiquidity.toLocaleString()} sat`}
                        glow
                    />
                    <MetricCard
                        label="Active Coverage"
                        value={`${totalCovBtc} BTC`}
                        sub={`${poolStats.policyCount.toString()} policies`}
                    />
                    <MetricCard
                        label="Pool Utilization"
                        value={`${poolStats.utilizationPct.toFixed(1)}%`}
                        sub="70% max cap"
                    />
                    <MetricCard
                        label="Est. Premiums Paid"
                        value={`${estPremiumBtc} BTC`}
                        sub="2% of active coverage"
                        glow
                    />
                </div>

                {/* ── Health + Gauge row ────────────────────────────────────────── */}
                <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="md:col-span-2">
                        <PoolHealthCard poolStats={poolStats} />
                    </div>
                    <div>
                        <UtilizationGauge
                            utilization={poolStats.utilizationPct}
                            liquidity={poolStats.totalLiquidity}
                            coverage={poolStats.totalCoverage}
                        />
                    </div>
                </div>

                {/* ── Tabs ─────────────────────────────────────────────────────── */}
                <div className="card p-0 overflow-hidden">
                    {/* Desktop tab nav — hidden on mobile (uses hamburger instead) */}
                    <div className="hidden sm:flex border-b border-[#30363d] px-6 pt-4 gap-1">
                        {TAB_ITEMS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`mr-5 text-sm flex items-center gap-1.5 pb-3 transition-all ${tab === t.key ? 'tab-active' : 'tab-inactive'}`}
                            >
                                <span>{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    {/* Mobile active tab indicator strip */}
                    <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#F7931A]">
                            <span>{TAB_ITEMS.find(t => t.key === tab)?.icon}</span>
                            <span>{TAB_ITEMS.find(t => t.key === tab)?.label}</span>
                        </div>
                        <button
                            onClick={() => setMobileMenuOpen(o => !o)}
                            className="text-xs text-[#8b949e] flex items-center gap-1"
                        >
                            Switch
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                    </div>

                    <div className="p-3 sm:p-6">
                        {tab === 'provider' && (
                            <ProviderPanel address={address ?? null} network={network} vault={vault} />
                        )}
                        {tab === 'buyer' && (
                            <BuyerPanel address={address ?? null} network={network} vault={vault} />
                        )}
                        {tab === 'admin' && (
                            <AdminPanel address={address ?? null} network={network} vault={vault} />
                        )}
                    </div>
                </div>

                {/* ── Connect hint ──────────────────────────────────────────────── */}
                {!isConnected && (
                    <div
                        className="rounded-xl border border-[#30363d] p-4 sm:p-6 text-center"
                        style={{ background: 'rgba(247,147,26,0.03)' }}
                    >
                        <ShieldLogo className="w-20 h-20 mx-auto" />
                        <p className="text-[#8b949e] text-sm mt-3 px-2">
                            Connect <span className="text-[#F7931A] font-semibold">OPWallet</span> to deposit liquidity, buy protection, and manage policies.
                        </p>
                    </div>
                )}
                </div>{/* end main content */}
                </div>{/* end flex row */}
            </main>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer className="border-t border-[#30363d] mt-8 sm:mt-16 py-4 sm:py-6 text-center text-[#8b949e] text-xs px-3 space-y-2">
                <div>
                    <span className="text-[#F7931A] font-semibold">Satoshi Shield</span>
                    {' '}· Built on{' '}
                    <a href="https://opnet.org" target="_blank" rel="noopener noreferrer" className="text-[#F7931A] hover:underline">
                        OPNet
                    </a>
                    {' '}· Bitcoin-native protection · OPNet Testnet
                </div>
                <div className="flex items-center justify-center gap-1.5">
                    <a
                        href="https://x.com/zax_raider"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[#8b949e] hover:text-white transition-colors"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.256 5.626L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
                        </svg>
                        @zax_raider
                    </a>
                </div>
            </footer>
        </div>
    );
}

export default function App() {
    return (
        <WalletConnectProvider theme="dark">
            <Inner />
        </WalletConnectProvider>
    );
}
