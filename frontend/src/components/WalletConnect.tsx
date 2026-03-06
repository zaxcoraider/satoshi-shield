import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { networkName, getChainStr } from '../services/ContractService';

export function WalletConnect() {
    const { isConnected, connecting, shortAddress, network, walletBalance, connect, disconnect } = useWallet();

    // Use total (confirmed + unconfirmed) — testnet txs often stay unconfirmed
    const balanceBtc = walletBalance
        ? ((walletBalance.total ?? walletBalance.confirmed) / 1e8).toFixed(6)
        : null;

    const isWrongNetwork = isConnected && getChainStr(network) !== 'testnet';

    // ── Connecting spinner ────────────────────────────────────────────────────
    if (connecting) {
        return (
            <button disabled className="btn-primary text-sm flex items-center gap-2 opacity-70 cursor-wait">
                <div
                    className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'transparent' }}
                />
                Connecting…
            </button>
        );
    }

    // ── Connected state ───────────────────────────────────────────────────────
    if (isConnected && shortAddress) {
        return (
            <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Wrong network — icon only on mobile, full text on desktop */}
                {isWrongNetwork && (
                    <span
                        className="text-xs px-2 sm:px-2.5 py-1 rounded-full font-medium"
                        style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.4)',
                            color: '#f87171',
                        }}
                    >
                        <span className="sm:hidden">⚠</span>
                        <span className="hidden sm:inline">⚠ Wrong Network — switch to OPNet Testnet</span>
                    </span>
                )}

                {/* Network badge — hidden on mobile */}
                <span
                    className="hidden sm:inline text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                        background: isWrongNetwork ? 'rgba(239,68,68,0.08)' : 'rgba(247,147,26,0.08)',
                        border: `1px solid ${isWrongNetwork ? 'rgba(239,68,68,0.25)' : 'rgba(247,147,26,0.25)'}`,
                        color: isWrongNetwork ? '#f87171' : '#F7931A',
                    }}
                >
                    {networkName(network)}
                </span>

                {/* Balance — hidden on mobile */}
                {balanceBtc !== null && (
                    <span
                        className="hidden sm:inline text-xs px-2.5 py-1 rounded-full font-bold tabular-nums"
                        style={{
                            background: 'rgba(247,147,26,0.06)',
                            border: '1px solid rgba(247,147,26,0.2)',
                            color: '#F7931A',
                            textShadow: '0 0 8px rgba(247,147,26,0.4)',
                        }}
                    >
                        ₿ {balanceBtc}
                    </span>
                )}

                {/* Address — shorter on mobile */}
                <span
                    className="font-mono text-xs px-2 sm:px-3 py-1.5 rounded-lg"
                    style={{
                        background: '#161b22',
                        border: '1px solid #30363d',
                        color: '#c9d1d9',
                    }}
                >
                    {shortAddress}
                </span>

                <button
                    onClick={disconnect}
                    className="text-xs px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-all duration-200"
                    style={{
                        background: 'transparent',
                        border: '1px solid #30363d',
                        color: '#8b949e',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444';
                        (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#30363d';
                        (e.currentTarget as HTMLButtonElement).style.color = '#8b949e';
                    }}
                >
                    <span className="hidden sm:inline">Disconnect</span>
                    <svg className="sm:hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
            </div>
        );
    }

    // ── Disconnected state ────────────────────────────────────────────────────
    return (
        <button
            onClick={connect}
            className="btn-primary text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z"
                    fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
        </button>
    );
}
