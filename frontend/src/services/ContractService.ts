import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';
import { Network, networks } from '@btc-vision/bitcoin';
import { getRpcUrl } from '../config/contracts';

// ─── Lazy provider — only used for read-only pool stats when wallet isn't
//     connected. For writes the wallet's own provider is used instead.
// ─────────────────────────────────────────────────────────────────────────────
import { JSONRpcProvider } from 'opnet';

let providerInstance: JSONRpcProvider | null = null;
let providerUrl: string | null = null;

export function getProvider(network: Network): JSONRpcProvider {
    const url = getRpcUrl(network);
    if (providerInstance && providerUrl === url) {
        return providerInstance;
    }
    providerInstance = new JSONRpcProvider({ url, network });
    providerUrl = url;
    return providerInstance;
}

export function clearProviderCache(): void {
    providerInstance = null;
    providerUrl = null;
}

// ─── ABI — matches the opnet-transform generated InsuranceVault.abi.ts ───────
// type must be BitcoinAbiTypes.Function (= "function") not the raw string.
// OP_NET_ABI adds standard OP20 methods (balanceOf, totalSupply, transfer…).
export const INSURANCE_VAULT_ABI = [
    {
        name: 'depositLiquidity',
        inputs:  [{ name: 'amount',         type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'lpTokensMinted', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'withdrawLiquidity',
        inputs:  [{ name: 'lpTokenAmount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'btcReturned',   type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'buyProtection',
        inputs:  [{ name: 'coverageAmount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'policyId',       type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claimPayout',
        inputs:  [{ name: 'policyId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'payout',   type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'triggerEvent',
        inputs:  [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPolicy',
        inputs:  [{ name: 'policyId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'coverageAmount', type: ABIDataTypes.UINT256 },
            { name: 'startBlock',     type: ABIDataTypes.UINT256 },
            { name: 'expiryBlock',    type: ABIDataTypes.UINT256 },
            { name: 'status',         type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUserPolicy',
        inputs:  [{ name: 'owner',    type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'policyId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getTotalLiquidity',
        inputs:  [],
        outputs: [{ name: 'liquidity', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getTotalActiveCoverage',
        inputs:  [],
        outputs: [{ name: 'coverage', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPolicyCount',
        inputs:  [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'isEventTriggered',
        inputs:  [],
        outputs: [{ name: 'triggered', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getEventTimestamp',
        inputs:  [],
        outputs: [{ name: 'blockNumber', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    // Standard OP20 methods (balanceOf, totalSupply, transfer, approve, etc.)
    ...OP_NET_ABI,
];

// ─── Satoshi helpers ──────────────────────────────────────────────────────────
export const SAT = 100_000_000n;

export function btcToSat(btc: string): bigint {
    const [whole, frac = ''] = btc.split('.');
    const padded = frac.padEnd(8, '0').slice(0, 8);
    return BigInt(whole) * SAT + BigInt(padded);
}

export function satToBtc(sat: bigint): string {
    if (sat === 0n) return '0.00000000';
    const whole     = sat / SAT;
    const remainder = sat % SAT;
    return `${whole}.${remainder.toString().padStart(8, '0')}`;
}

export function formatSat(sat: bigint): string {
    return sat.toLocaleString() + ' sat';
}

export const POLICY_STATUS = {
    NONE:    0n,
    ACTIVE:  1n,
    CLAIMED: 2n,
} as const;

export type PolicyStatus = 0n | 1n | 2n;

export interface Policy {
    policyId:       bigint;
    coverageAmount: bigint;
    startBlock:     bigint;
    expiryBlock:    bigint;
    status:         bigint;
}

// WalletConnectNetwork extends Network and adds a .network string discriminator
// ('mainnet' | 'testnet' | 'regtest'). Use that first to avoid reference
// equality failures when the wallet returns a new object with the same values.
export function networkName(network: Network): string {
    const chainStr = (network as unknown as Record<string, unknown>).network as string | undefined;
    if (chainStr === 'mainnet') return 'Mainnet';
    if (chainStr === 'testnet') return 'OPNet Testnet';
    if (chainStr === 'regtest') return 'Regtest';
    // Fallback for plain Network objects (e.g. the default networks.opnetTestnet
    // used before the wallet connects).
    if (network === networks.bitcoin)      return 'Mainnet';
    if (network === networks.opnetTestnet) return 'OPNet Testnet';
    return 'Regtest';
}

// Returns the chain string discriminator for a network object.
export function getChainStr(network: Network): string {
    return ((network as unknown as Record<string, unknown>).network as string | undefined) ?? 'testnet';
}
