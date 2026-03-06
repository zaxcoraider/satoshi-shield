# BTC Insurance Vault

Bitcoin-native protection vault dApp built on **OPNet Testnet**.

Liquidity providers deposit BTC to earn premiums. Protection buyers pay a 2% premium for 30-day on-chain coverage. An admin can trigger an insured-event simulation, after which eligible policy holders claim payouts directly from the pool.

---

## Architecture

```
BTC-Insurance/
├── contract/               # AssemblyScript smart contract
│   ├── assembly/
│   │   ├── index.ts        # OPNet entry point
│   │   └── contracts/
│   │       └── InsuranceVault.ts   # Main contract (extends OP20)
│   ├── asconfig.json
│   └── package.json
│
└── frontend/               # React + Vite dApp
    ├── src/
    │   ├── App.tsx                         # Root (WalletConnectProvider)
    │   ├── config/contracts.ts             # Contract addresses + RPC URLs
    │   ├── services/ContractService.ts     # Provider singleton + ABI
    │   ├── hooks/
    │   │   ├── useWallet.ts                # OPWallet connection
    │   │   └── useInsuranceVault.ts        # All contract interactions
    │   └── components/
    │       ├── WalletConnect.tsx           # Header connect button
    │       ├── ProviderPanel.tsx           # LP deposit / withdraw
    │       ├── BuyerPanel.tsx              # Buy coverage / claim
    │       └── AdminPanel.tsx              # Trigger insured event
    └── package.json
```

---

## Smart Contract

**InsuranceVault** extends **OP20** (LP share token = `BTCLP`, 8 decimals).

| Method | Access | Description |
|---|---|---|
| `depositLiquidity(amount)` | Any | Deposit BTC satoshis; mints proportional BTCLP tokens |
| `withdrawLiquidity(lpAmount)` | Any | Burns BTCLP; returns proportional BTC. Reverts if undercollateralised |
| `buyProtection(coverage)` | Any | 30-day policy; 2% premium credited to pool; max 70% pool utilization |
| `claimPayout(policyId)` | Policy owner | After event trigger; pays coverage from pool |
| `triggerEvent()` | Admin only | Sets global event flag; enables all eligible claims |
| `getPolicy(id)` | View | Returns coverage, startBlock, expiryBlock, status |
| `getUserPolicy(address)` | View | Returns active policy ID for an address |
| `getTotalLiquidity()` | View | Total pool size in satoshis |
| `getTotalActiveCoverage()` | View | Sum of all active coverage |
| `isEventTriggered()` | View | Whether an insured event has been triggered |

**Key rules enforced on-chain:**
- Coverage cap: `totalActiveCoverage ≤ 70% of totalLiquidity`
- Withdrawal guard: cannot withdraw if it would breach the coverage cap
- One active policy per address
- Only admin (deployer) can call `triggerEvent()`
- Claims only valid after event trigger, while policy is active and unexpired

---

## Setup & Deploy

### 1. Contract

```bash
cd contract
npm install
npm run build
# → build/release.wasm
```

### 2. Deploy to OPNet Testnet

```bash
cd frontend
npm install
MNEMONIC="your twelve word mnemonic here" npx tsx src/deploy.ts
```

Copy the deployed contract address into `src/config/contracts.ts`:
```ts
testnet: 'opt1q...',
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Network

- **OPNet Testnet**: `networks.opnetTestnet` from `@btc-vision/bitcoin`
- **RPC**: `https://testnet.opnet.org`
- **Explorer**: `https://testnet-explorer.opnet.org`
- **Wallet**: [OPWallet](https://opnet.org) browser extension

> **Do NOT use `networks.testnet`** — that is Testnet4, which OPNet does not support.

---

## User Flows

### Liquidity Provider
1. Connect OPWallet
2. Switch to **Liquidity Provider** tab
3. Enter BTC amount → **Deposit Liquidity** → receive BTCLP tokens
4. View pool stats: total liquidity, utilization %, your BTCLP balance
5. Withdraw anytime (unless coverage cap would be breached)

### Protection Buyer
1. Connect OPWallet
2. Switch to **Protection Buyer** tab
3. Enter coverage amount (max = available capacity)
4. Review policy summary (30 days, 2% premium)
5. **Buy Protection** → policy ID stored on-chain
6. If admin triggers an event → **Claim Payout** button appears

### Admin (Deployer)
1. Connect with the wallet that deployed the contract
2. Switch to **Admin** tab
3. Review pool state
4. **Trigger Insured Event** (double-click to confirm)
5. Policy holders can now claim from the Buyer tab
