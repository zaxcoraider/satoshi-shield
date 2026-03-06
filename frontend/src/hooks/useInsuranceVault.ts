import { useState, useEffect, useCallback, useRef } from 'react';
import { getContract, AbstractRpcProvider } from 'opnet';
import { Network } from '@btc-vision/bitcoin';
import { Address } from '@btc-vision/transaction';
import {
    getProvider,
    INSURANCE_VAULT_ABI,
    Policy,
} from '../services/ContractService';
import { getContractAddress } from '../config/contracts';

export interface PoolStats {
    totalLiquidity:   bigint;
    totalCoverage:    bigint;
    policyCount:      bigint;
    eventTriggered:   boolean;
    eventTimestamp:   bigint;   // block number when event was triggered (0 = never)
    utilizationPct:   number;
}

export function useInsuranceVault(
    address:        string | null,           // wallet address string (display / refundTo)
    addressObj:     Address | null,          // Address object — getContract sender
    network:        Network,
    walletProvider: AbstractRpcProvider | null, // wallet-injected provider
) {
    const [poolStats, setPoolStats] = useState<PoolStats>({
        totalLiquidity:  0n,
        totalCoverage:   0n,
        policyCount:     0n,
        eventTriggered:  false,
        eventTimestamp:  0n,
        utilizationPct:  0,
    });
    const [lpBalance,     setLpBalance]     = useState<bigint>(0n);
    const [userPolicy,    setUserPolicy]    = useState<Policy | null>(null);
    const [currentBlock,  setCurrentBlock]  = useState<bigint>(0n);
    const [loading,       setLoading]       = useState(false);
    const [txLoading,  setTxLoading]  = useState(false);
    const [error,      setError]      = useState<string | null>(null);
    const [lastTxId,   setLastTxId]   = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contractRef        = useRef<any>(null);
    const resolvedAddrRef    = useRef<Address | string | null>(null);

    // ── Active provider: prefer wallet's injected provider ───────────────────
    const getActiveProvider = useCallback((): AbstractRpcProvider => {
        return walletProvider ?? getProvider(network);
    }, [walletProvider, network]);

    // ── Resolve P2OP contract address once per session ────────────────────────
    const resolveContractAddr = useCallback(async () => {
        const rawAddr = getContractAddress(network);
        if (!rawAddr || rawAddr.includes('YOUR_DEPLOYED') || rawAddr.startsWith('bcrt1p000')) {
            return null;
        }
        if (!resolvedAddrRef.current) {
            const provider = getActiveProvider();
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const resolved = await (provider as any).getPublicKeyInfo(rawAddr, true);
                resolvedAddrRef.current = resolved ?? rawAddr;
            } catch {
                resolvedAddrRef.current = rawAddr;
            }
        }
        return resolvedAddrRef.current;
    }, [network, getActiveProvider]);

    // ── Read-only contract (no sender required for view calls) ────────────────
    const getVaultContract = useCallback(async () => {
        const addr = await resolveContractAddr();
        if (!addr) return null;
        if (!contractRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contractRef.current = getContract(
                addr as Address,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                INSURANCE_VAULT_ABI as any,
                getActiveProvider(),
                network,
                addressObj ?? undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ) as any;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return contractRef.current as any;
    }, [network, getActiveProvider, addressObj, resolveContractAddr]);

    // ── Write contract — always fresh instance with current sender ────────────
    // A fresh instance guarantees Blockchain.tx.sender is set correctly in sim.
    const getWriteContract = useCallback(async () => {
        if (!addressObj) {
            setError('Connect your wallet first');
            return null;
        }
        const addr = await resolveContractAddr();
        if (!addr) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return getContract(
            addr as Address,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            INSURANCE_VAULT_ABI as any,
            getActiveProvider(),
            network,
            addressObj,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;
    }, [network, getActiveProvider, addressObj, resolveContractAddr]);

    // ── Pool-level stats ──────────────────────────────────────────────────────
    const refreshPool = useCallback(async () => {
        const contract = await getVaultContract();
        if (!contract) return;

        setLoading(true);
        setError(null);

        try {
            const [liqResult, covResult, countResult, eventResult, tsResult] =
                await Promise.all([
                    contract.getTotalLiquidity(),
                    contract.getTotalActiveCoverage(),
                    contract.getPolicyCount(),
                    contract.isEventTriggered(),
                    contract.getEventTimestamp(),
                ]);

            const liq   = (liqResult?.properties?.liquidity    as bigint)  ?? 0n;
            const cov   = (covResult?.properties?.coverage     as bigint)  ?? 0n;
            const count = (countResult?.properties?.count      as bigint)  ?? 0n;
            const evt   = (eventResult?.properties?.triggered  as boolean) ?? false;
            const ts    = (tsResult?.properties?.blockNumber   as bigint)  ?? 0n;

            const utilizationPct = liq > 0n ? Number((cov * 100n) / liq) : 0;

            setPoolStats({
                totalLiquidity:  liq,
                totalCoverage:   cov,
                policyCount:     count,
                eventTriggered:  evt,
                eventTimestamp:  ts,
                utilizationPct,
            });

            // Fetch current block for accurate countdown timers
            try {
                const provider = getActiveProvider();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const blockInfo = await (provider as any).getBlockNumber();
                if (typeof blockInfo === 'bigint') setCurrentBlock(blockInfo);
                else if (typeof blockInfo === 'number') setCurrentBlock(BigInt(blockInfo));
                else if (blockInfo?.blockNumber !== undefined) setCurrentBlock(BigInt(blockInfo.blockNumber));
            } catch { /* non-critical — countdown falls back to block numbers */ }
        } catch (err) {
            const msg = (err as Error).message ?? String(err);
            if (msg.toLowerCase().includes('contract not found') || msg.toLowerCase().includes('not found')) {
                setError('Contract not found — confirm the address is deployed on OPNet Testnet and wait ~10 min for indexing.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }, [getVaultContract]);

    // ── User-specific data ────────────────────────────────────────────────────
    const refreshUser = useCallback(async () => {
        const contract = await getVaultContract();
        if (!contract || !address || !addressObj) return;

        try {
            const [balResult, policyIdResult] = await Promise.all([
                contract.balanceOf(addressObj),
                contract.getUserPolicy(addressObj),
            ]);

            const bal      = (balResult?.properties?.balance    as bigint) ?? 0n;
            const policyId = (policyIdResult?.properties?.policyId as bigint) ?? 0n;

            setLpBalance(bal);

            if (policyId > 0n) {
                const pResult = await contract.getPolicy(policyId);
                if (pResult?.properties) {
                    const p = pResult.properties;
                    setUserPolicy({
                        policyId,
                        coverageAmount: (p.coverageAmount as bigint) ?? 0n,
                        startBlock:     (p.startBlock     as bigint) ?? 0n,
                        expiryBlock:    (p.expiryBlock    as bigint) ?? 0n,
                        status:         (p.status         as bigint) ?? 0n,
                    });
                }
            } else {
                setUserPolicy(null);
            }
        } catch (err) {
            console.error('[InsuranceVault] refreshUser error:', err);
        }
    }, [getVaultContract, address]);

    // ── Auto-refresh on mount / wallet / network change ───────────────────────
    useEffect(() => {
        // Invalidate both the resolved address and contract instance
        resolvedAddrRef.current = null;
        contractRef.current = null;
        refreshPool();
        if (address) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [network, address, addressObj, walletProvider]);

    // ── Revert message decoder ────────────────────────────────────────────────
    // OPNet encodes revert strings as base64 → raw binary.
    // atob() gives us a binary string; TextDecoder converts it to proper UTF-8.
    function decodeRevert(raw: unknown): string {
        // Uint8Array from the runtime — decode directly
        if (raw instanceof Uint8Array) {
            return new TextDecoder().decode(raw);
        }
        const str = String(raw);
        // Try: base64 → binary bytes → UTF-8 text
        try {
            const binary = atob(str);
            const bytes  = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const decoded = new TextDecoder('utf-8').decode(bytes);
            // Accept only if it looks like readable text (no control chars)
            if (decoded.trim().length > 0 && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(decoded)) {
                return decoded;
            }
        } catch { /* not valid base64 — fall through */ }
        return str;
    }

    // ── Transaction wrapper ───────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function sendTx(methodCall: () => Promise<any>): Promise<boolean> {
        if (!address) {
            setError('Connect your wallet first');
            return false;
        }
        setTxLoading(true);
        setError(null);
        setLastTxId(null);
        try {
            const receipt = await methodCall();
            if (receipt?.transactionId) setLastTxId(receipt.transactionId as string);
            // Refresh state after tx confirmed
            await Promise.all([refreshPool(), refreshUser()]);
            return true;
        } catch (err) {
            console.error('[InsuranceVault] sendTx error:', err);
            const raw = err instanceof Error ? err.message : String(err);
            const msg = decodeRevert(raw);
            // User-friendly messages for common cases
            if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('cancel')) {
                setError('Transaction cancelled by user.');
            } else if (msg.toLowerCase().includes('insufficient')) {
                setError('Insufficient balance to cover the transaction and fees.');
            } else {
                setError(msg || 'Transaction failed — check browser console for details.');
            }
            return false;
        } finally {
            setTxLoading(false);
        }
    }

    // ── OPWallet send params ──────────────────────────────────────────────────
    // signer: null → OPWallet intercepts and shows its signing popup (frontend rule)
    // feeRate: 0  → automatic fee calculation
    function txParams() {
        return {
            signer:                   null,
            mldsaSigner:              null,
            refundTo:                 address ?? '',
            maximumAllowedSatToSpend: 500_000n, // 0.005 BTC fee budget
            feeRate:                  0,         // auto fee rate
            network,
        };
    }

    // ── Simulation guard ──────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function assertSim(sim: any, name: string): void {
        if (!sim) throw new Error(`${name}: simulation returned no response — is the contract deployed?`);
        if ('error' in sim && sim.error) throw new Error(String(sim.error));
        if ('revert' in sim && sim.revert) {
            throw new Error(`Contract reverted: ${decodeRevert(sim.revert)}`);
        }
        if (typeof sim.sendTransaction !== 'function') {
            console.error(`[assertSim] ${name} unexpected simulation result:`, sim);
            throw new Error(`${name}: simulation did not return a sendTransaction method`);
        }
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    const depositLiquidity = useCallback(
        async (amountSat: bigint): Promise<boolean> => {
            const c = await getWriteContract();
            if (!c) return false;
            return sendTx(async () => {
                const sim = await c.depositLiquidity(amountSat);
                assertSim(sim, 'depositLiquidity');
                return sim.sendTransaction(txParams());
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [getWriteContract, address, network],
    );

    const withdrawLiquidity = useCallback(
        async (lpAmountSat: bigint): Promise<boolean> => {
            const c = await getWriteContract();
            if (!c) return false;
            return sendTx(async () => {
                const sim = await c.withdrawLiquidity(lpAmountSat);
                assertSim(sim, 'withdrawLiquidity');
                return sim.sendTransaction(txParams());
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [getWriteContract, address, network],
    );

    const buyProtection = useCallback(
        async (coverageSat: bigint): Promise<boolean> => {
            const c = await getWriteContract();
            if (!c) return false;
            return sendTx(async () => {
                const sim = await c.buyProtection(coverageSat);
                assertSim(sim, 'buyProtection');
                return sim.sendTransaction(txParams());
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [getWriteContract, address, network],
    );

    const claimPayout = useCallback(
        async (policyId: bigint): Promise<boolean> => {
            const c = await getWriteContract();
            if (!c) return false;
            return sendTx(async () => {
                const sim = await c.claimPayout(policyId);
                assertSim(sim, 'claimPayout');
                return sim.sendTransaction(txParams());
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [getWriteContract, address, network],
    );

    const triggerEvent = useCallback(async (): Promise<boolean> => {
        const c = await getWriteContract();
        if (!c) return false;
        return sendTx(async () => {
            const sim = await c.triggerEvent();
            assertSim(sim, 'triggerEvent');
            return sim.sendTransaction(txParams());
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getWriteContract, address, network]);

    return {
        poolStats,
        lpBalance,
        userPolicy,
        currentBlock,
        loading,
        txLoading,
        error,
        lastTxId,
        refreshPool,
        refreshUser,
        depositLiquidity,
        withdrawLiquidity,
        buyProtection,
        claimPayout,
        triggerEvent,
        clearError: () => setError(null),
    };
}
