/**
 * deploy.ts – Deploy InsuranceVault to OPNet testnet (Node.js script)
 *
 * Usage:
 *   MNEMONIC="word1 word2 ..." npx tsx src/deploy.ts
 *
 * Prerequisites:
 *   - Fund your P2TR address on OPNet testnet (from Signet faucet)
 *   - Set the MNEMONIC env variable (BIP39 12/24 word phrase)
 *   - Contract WASM must be built: cd ../contract && npm run build
 */

import { Mnemonic, TransactionFactory } from '@btc-vision/transaction';
import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NETWORK = networks.opnetTestnet;
const RPC_URL = 'https://testnet.opnet.org';
const WASM_PATH = join(__dirname, '../../contract/build/release.wasm');

async function deploy(): Promise<void> {
    const phrase = process.env.MNEMONIC;
    if (!phrase) throw new Error('Set the MNEMONIC environment variable before running.');

    // ── 1. Provider ────────────────────────────────────────────────────────────
    console.log('Connecting to OPNet testnet…');
    const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

    // ── 2. Wallet ──────────────────────────────────────────────────────────────
    // OPWallet-compatible P2TR derivation (index 0, account 0)
    const mnemonic = new Mnemonic(phrase, '', NETWORK);
    const wallet = mnemonic.deriveOPWallet();

    const address = wallet.p2tr;
    console.log('Deployer P2TR address:', address);

    // ── 3. WASM bytecode ───────────────────────────────────────────────────────
    const bytecode = new Uint8Array(readFileSync(WASM_PATH));
    console.log(`Contract bytecode: ${bytecode.length} bytes`);
    if (bytecode.length > 128 * 1024) {
        throw new Error('Contract exceeds 128 KB maximum deployment size.');
    }

    // ── 4. UTXOs ───────────────────────────────────────────────────────────────
    console.log('Fetching UTXOs…');
    const utxos = await provider.utxoManager.getUTXOs({
        address,
        optimize: true,
        mergePendingUTXOs: true,
        filterSpentUTXOs: true,
    });

    if (!utxos || utxos.length === 0) {
        throw new Error(
            `No UTXOs found for ${address}.\n` +
            `Fund your testnet address from a Signet faucet, then retry.\n` +
            `OPNet testnet uses Bitcoin Signet — search for "Bitcoin Signet faucet".`,
        );
    }
    console.log(`Found ${utxos.length} UTXO(s)`);

    // ── 5. Epoch challenge ─────────────────────────────────────────────────────
    console.log('Fetching epoch challenge…');
    const challenge = await provider.getChallenge();
    console.log(`Epoch: ${challenge.epochNumber}`);

    // ── 6. Gas parameters ──────────────────────────────────────────────────────
    console.log('Fetching gas parameters…');
    let feeRate: number = 10;           // sat/vByte — higher for faster confirmation
    let priorityFee: bigint = 10_000n; // satoshis
    // gasSatFee funds the on-chain gas for onDeployment() execution.
    // Previous deployments reverted with "out of gas (consumed: 330000000)" when
    // this was 330 sats. Set a high minimum (0.005 BTC) to ensure enough gas budget.
    let gasSatFee: bigint = 500_000n;  // satoshis (0.005 BTC)

    try {
        const gasParams = await provider.gasParameters();
        if (gasParams) {
            const g = gasParams as unknown as Record<string, unknown>;
            if (typeof g['feeRate'] === 'number') feeRate = Math.max(feeRate, g['feeRate']);
            if (g['priorityFee'] != null) {
                const networkPriority = BigInt(g['priorityFee'] as string | number);
                priorityFee = networkPriority > priorityFee ? networkPriority : priorityFee;
            }
            // Do NOT use the network's gasSatFee — it's too low for contract deployment.
            // Keep our minimum of 500_000n sats.
        }
    } catch {
        console.log('Could not fetch gas params — using defaults.');
    }
    console.log(`Gas: feeRate=${feeRate} sat/vB  priorityFee=${priorityFee}  gasSatFee=${gasSatFee}`);

    // ── 7. Sign deployment ─────────────────────────────────────────────────────
    console.log('Signing deployment transactions…');
    const factory = new TransactionFactory();

    const result = await factory.signDeployment({
        signer:      wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        network:     NETWORK,
        from:        address,
        bytecode,
        utxos,
        challenge,
        feeRate,
        priorityFee,
        gasSatFee,
        // Required on first deployment to register the ML-DSA key on-chain
        revealMLDSAPublicKey:       true,
        linkMLDSAPublicKeyToAddress: true,
        // calldata omitted — onDeployment() requires no constructor args
    });

    console.log('\n─── Deployment signed ───────────────────────────────────');
    console.log('Contract address :', result.contractAddress);
    console.log('Funding TX       :', result.transaction[0].slice(0, 60) + '…');
    console.log('Deployment TX    :', result.transaction[1].slice(0, 60) + '…');

    // ── 8. Broadcast ───────────────────────────────────────────────────────────
    // Funding transaction must be confirmed before the deployment transaction.
    console.log('\nBroadcasting funding transaction…');
    const fundResult = await provider.sendRawTransaction(result.transaction[0], false);
    if (!fundResult || (fundResult as unknown as Record<string, unknown>)['error']) {
        throw new Error(`Funding TX rejected: ${JSON.stringify(fundResult)}`);
    }
    console.log('Funding TX broadcast:', JSON.stringify(fundResult));

    console.log('Broadcasting deployment transaction…');
    const deployResult = await provider.sendRawTransaction(result.transaction[1], false);
    if (!deployResult || (deployResult as unknown as Record<string, unknown>)['error']) {
        throw new Error(`Deployment TX rejected: ${JSON.stringify(deployResult)}`);
    }
    console.log('Deployment TX broadcast:', JSON.stringify(deployResult));

    // ── 9. Done ────────────────────────────────────────────────────────────────
    console.log('\n✅  InsuranceVault deployed to OPNet testnet!');
    console.log('Contract address :', result.contractAddress);
    console.log('\nNext steps:');
    console.log('  1. Confirm on https://testnet-explorer.opnet.org');
    console.log('  2. Open frontend/src/config/contracts.ts');
    console.log(`  3. Set CONTRACT_ADDRESSES.testnet = '${result.contractAddress}'`);

    // Zeroize sensitive key material from memory
    mnemonic.zeroize();
}

deploy().catch(err => {
    console.error('\n❌ Deployment failed:', err.message ?? err);
    process.exit(1);
});
