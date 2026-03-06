import { networks, Network } from '@btc-vision/bitcoin';

// WalletConnectNetwork extends Network and adds a .network string field
// ('mainnet' | 'testnet' | 'regtest'). Use it for comparisons instead of
// reference equality — the wallet returns a new object, never the same ref.
function chainStr(network: Network): string {
    return ((network as unknown as Record<string, unknown>).network as string | undefined)
        ?? (network === networks.bitcoin ? 'mainnet' : 'testnet');
}

// ─── Contract addresses ───────────────────────────────────────────────────────
export const CONTRACT_ADDRESSES: Record<string, string> = {
    mainnet: '',                                              // not deployed
    testnet: 'opt1sqr7x0jwdldyerhz5w7rapxldtz3tqy5w557g5ad3',
    regtest: '',                                              // local dev
};

export function getContractAddress(network: Network): string {
    const c = chainStr(network);
    if (c === 'mainnet') return CONTRACT_ADDRESSES.mainnet;
    if (c === 'testnet') return CONTRACT_ADDRESSES.testnet;
    return CONTRACT_ADDRESSES.regtest;
}

// ─── RPC endpoints ────────────────────────────────────────────────────────────
export const RPC_URLS: Record<string, string> = {
    mainnet: 'https://api.opnet.org',
    testnet: 'https://testnet.opnet.org',
    regtest: 'http://localhost:9001',
};

export function getRpcUrl(network: Network): string {
    const c = chainStr(network);
    if (c === 'mainnet') return RPC_URLS.mainnet;
    if (c === 'testnet') return RPC_URLS.testnet;
    return RPC_URLS.regtest;
}

// ─── Explorer links ───────────────────────────────────────────────────────────
export function getTxExplorerUrl(txid: string, network: Network): string {
    if (chainStr(network) === 'testnet') {
        return `https://testnet-explorer.opnet.org/tx/${txid}`;
    }
    return `#`;
}
