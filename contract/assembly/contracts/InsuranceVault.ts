import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    EMPTY_POINTER,
    OP20,
    OP20InitParameters,
    Revert,
    StoredU256,
    StoredMapU256,
    AddressMemoryMap,
    SafeMath,
} from '@btc-vision/btc-runtime/runtime';

// ─── Constants ────────────────────────────────────────────────────────────────
// 30 days ≈ 4 320 Bitcoin blocks (~10 min/block)
const THIRTY_DAYS_BLOCKS: u256 = u256.fromU32(4320);

// 70% coverage cap
const COV_MAX_NUM: u256 = u256.fromU32(70);
const COV_MAX_DEN: u256 = u256.fromU32(100);

// 2% premium rate
const PREMIUM_NUM: u256 = u256.fromU32(2);
const PREMIUM_DEN: u256 = u256.fromU32(100);

// Policy status codes
const STATUS_ACTIVE:  u256 = u256.One;
const STATUS_CLAIMED: u256 = u256.fromU32(2);

// ─── InsuranceVault ───────────────────────────────────────────────────────────
// Extends OP20 so LP share tokens (BTCLP) are a first-class on-chain token.
// All BTC amounts are in satoshis (u256). The contract is a pure accounting
// ledger — OPNet contracts cannot hold native BTC; actual BTC movement is
// handled by the OPWallet / OPNet transaction layer.
//
// The @method / @returns decorators register each method with the OPNet
// transform, which auto-generates the execute() dispatcher at compile time.
// No manual dispatch override is required.
export class InsuranceVault extends OP20 {

    // ─── Storage pointer allocation ──────────────────────────────────────────
    private readonly _pTotalLiquidity: u16 = Blockchain.nextPointer;
    private readonly _pTotalCoverage:  u16 = Blockchain.nextPointer;
    private readonly _pPolicyCount:    u16 = Blockchain.nextPointer;
    private readonly _pEventTriggered:  u16 = Blockchain.nextPointer;
    private readonly _pEventTimestamp:  u16 = Blockchain.nextPointer;
    private readonly _pAdminMap:       u16 = Blockchain.nextPointer;
    private readonly _pCoverageMap:    u16 = Blockchain.nextPointer;
    private readonly _pStartMap:       u16 = Blockchain.nextPointer;
    private readonly _pExpiryMap:      u16 = Blockchain.nextPointer;
    private readonly _pStatusMap:      u16 = Blockchain.nextPointer;
    private readonly _pUserPolicyMap:  u16 = Blockchain.nextPointer;

    // ─── Scalar storage ──────────────────────────────────────────────────────
    private readonly totalLiquidityStore: StoredU256 =
        new StoredU256(this._pTotalLiquidity, EMPTY_POINTER);

    private readonly totalCoverageStore: StoredU256 =
        new StoredU256(this._pTotalCoverage, EMPTY_POINTER);

    private readonly policyCountStore: StoredU256 =
        new StoredU256(this._pPolicyCount, EMPTY_POINTER);

    private readonly eventTriggeredStore: StoredU256 =
        new StoredU256(this._pEventTriggered, EMPTY_POINTER);

    private readonly eventTimestampStore: StoredU256 =
        new StoredU256(this._pEventTimestamp, EMPTY_POINTER);

    // ─── Admin flag map: address → u256(1) admin / u256(0) not ──────────────
    private readonly adminMap: AddressMemoryMap =
        new AddressMemoryMap(this._pAdminMap);

    // ─── Policy data maps: policyId (u256) → value (u256) ───────────────────
    private readonly coverageMap: StoredMapU256 = new StoredMapU256(this._pCoverageMap);
    private readonly startMap:    StoredMapU256 = new StoredMapU256(this._pStartMap);
    private readonly expiryMap:   StoredMapU256 = new StoredMapU256(this._pExpiryMap);
    private readonly statusMap:   StoredMapU256 = new StoredMapU256(this._pStatusMap);

    // ─── User → active policy ID (0 = no active policy) ─────────────────────
    private readonly userPolicyMap: AddressMemoryMap =
        new AddressMemoryMap(this._pUserPolicyMap);

    // ─── Constructor ─────────────────────────────────────────────────────────
    public constructor() {
        super(); // OP20 base constructor (no params)
    }

    // ─── Deployment ──────────────────────────────────────────────────────────
    // Runs once at contract creation. Initialises the LP token and grants admin.
    public override onDeployment(_calldata: Calldata): void {
        // OP20InitParameters(maxSupply, decimals, name, symbol, icon)
        this.instantiate(
            new OP20InitParameters(
                u256.fromString('2100000000000000'), // 21 M BTC in satoshis
                8,
                'BTC Insurance LP',
                'BTCLP',
            ),
            true, // skipDeployerVerification — called inside onDeployment
        );

        // Grant admin role to deployer
        this.adminMap.set(Blockchain.tx.sender, u256.One);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LIQUIDITY PROVIDER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * depositLiquidity(amount: uint256) → lpTokensMinted: uint256
     *
     * Caller deposits `amount` satoshis into the protection pool and receives
     * BTCLP tokens proportional to their contribution:
     *   - First deposit: 1 BTCLP per satoshi (1:1)
     *   - Later deposits: lpMint = amount * totalSupply / totalLiquidity
     */
    @method({ name: 'amount', type: ABIDataTypes.UINT256 })
    @returns({ name: 'lpTokensMinted', type: ABIDataTypes.UINT256 })
    public depositLiquidity(calldata: Calldata): BytesWriter {
        const amount: u256 = calldata.readU256();
        if (amount.isZero()) throw new Revert('Amount must be > 0');

        const caller: Address  = Blockchain.tx.sender;
        const curLiq: u256     = this.totalLiquidityStore.value;
        const curSupply: u256  = this._totalSupply.value;

        let lpMint: u256;
        if (curLiq.isZero() || curSupply.isZero()) {
            lpMint = amount; // first deposit: 1 satoshi → 1 BTCLP
        } else {
            lpMint = SafeMath.div(SafeMath.mul(amount, curSupply), curLiq);
        }
        if (lpMint.isZero()) throw new Revert('LP mint rounds to zero');

        this.totalLiquidityStore.set(SafeMath.add(curLiq, amount));
        this._mint(caller, lpMint);

        const w = new BytesWriter(32);
        w.writeU256(lpMint);
        return w;
    }

    /**
     * withdrawLiquidity(lpTokenAmount: uint256) → btcReturned: uint256
     *
     * Burns `lpTokenAmount` BTCLP and returns the proportional pool share:
     *   btcReturned = lpTokenAmount * totalLiquidity / totalSupply
     *
     * Reverts if the withdrawal would leave active coverage under-collateralised
     * (i.e. activeCoverage > 70% of new pool size).
     */
    @method({ name: 'lpTokenAmount', type: ABIDataTypes.UINT256 })
    @returns({ name: 'btcReturned', type: ABIDataTypes.UINT256 })
    public withdrawLiquidity(calldata: Calldata): BytesWriter {
        const lpAmount: u256  = calldata.readU256();
        if (lpAmount.isZero()) throw new Revert('Amount must be > 0');

        const curLiq: u256    = this.totalLiquidityStore.value;
        const curSupply: u256 = this._totalSupply.value;
        if (curSupply.isZero()) throw new Revert('Pool is empty');

        const btc: u256    = SafeMath.div(SafeMath.mul(lpAmount, curLiq), curSupply);
        const newLiq: u256 = SafeMath.sub(curLiq, btc);

        // Coverage cap: activeCoverage ≤ 70% of remaining pool
        const curCov: u256     = this.totalCoverageStore.value;
        const maxAllowed: u256 = SafeMath.div(SafeMath.mul(newLiq, COV_MAX_NUM), COV_MAX_DEN);
        if (curCov > maxAllowed) {
            throw new Revert('Withdrawal would under-collateralise active coverage');
        }

        this._burn(Blockchain.tx.sender, lpAmount);
        this.totalLiquidityStore.set(newLiq);

        const w = new BytesWriter(32);
        w.writeU256(btc);
        return w;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROTECTION BUYER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * buyProtection(coverageAmount: uint256) → policyId: uint256
     *
     * Issues a 30-day protection policy for `coverageAmount` satoshis.
     * Premium = 2% of coverageAmount, credited directly to the pool (LP revenue).
     *
     * Reverts if: (totalActiveCoverage + coverageAmount) > 70% of pool.
     * Each address holds at most one active policy.
     */
    @method({ name: 'coverageAmount', type: ABIDataTypes.UINT256 })
    @returns({ name: 'policyId', type: ABIDataTypes.UINT256 })
    public buyProtection(calldata: Calldata): BytesWriter {
        const coverage: u256 = calldata.readU256();
        if (coverage.isZero()) throw new Revert('Coverage must be > 0');

        const curLiq: u256 = this.totalLiquidityStore.value;
        if (curLiq.isZero()) throw new Revert('Pool has no liquidity');

        // 70% cap check
        const curCov: u256 = this.totalCoverageStore.value;
        const newCov: u256 = SafeMath.add(curCov, coverage);
        const maxCov: u256 = SafeMath.div(SafeMath.mul(curLiq, COV_MAX_NUM), COV_MAX_DEN);
        if (newCov > maxCov) throw new Revert('Coverage exceeds 70% pool capacity');

        // Premium flows into pool
        const premium: u256 = SafeMath.div(SafeMath.mul(coverage, PREMIUM_NUM), PREMIUM_DEN);
        const newLiq: u256  = SafeMath.add(curLiq, premium);

        // Assign new policy ID
        const policyId: u256 = SafeMath.add(this.policyCountStore.value, u256.One);
        this.policyCountStore.set(policyId);

        // Record policy
        const startBlock: u256  = u256.fromU64(Blockchain.block.number);
        const expiryBlock: u256 = SafeMath.add(startBlock, THIRTY_DAYS_BLOCKS);

        this.coverageMap.set(policyId, coverage);
        this.startMap.set(policyId, startBlock);
        this.expiryMap.set(policyId, expiryBlock);
        this.statusMap.set(policyId, STATUS_ACTIVE);

        // Bind policy to buyer (one active policy per address)
        this.userPolicyMap.set(Blockchain.tx.sender, policyId);

        this.totalCoverageStore.set(newCov);
        this.totalLiquidityStore.set(newLiq);

        const w = new BytesWriter(32);
        w.writeU256(policyId);
        return w;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN METHOD
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * triggerEvent() → success: bool
     *
     * Admin-only. Sets the global eventTriggered flag.
     * After this call, all active, non-expired policy holders may claim.
     */
    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public triggerEvent(_calldata: Calldata): BytesWriter {
        if (this.adminMap.get(Blockchain.tx.sender).isZero()) {
            throw new Revert('Admin only');
        }
        this.eventTriggeredStore.set(u256.One);
        this.eventTimestampStore.set(u256.fromU64(Blockchain.block.number));

        const w = new BytesWriter(1);
        w.writeBoolean(true);
        return w;
    }

    /**
     * resetEvent() → success: bool
     *
     * Admin-only. Clears the global eventTriggered flag so new policies can be
     * purchased again (starts a new coverage season).
     */
    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public resetEvent(_calldata: Calldata): BytesWriter {
        if (this.adminMap.get(Blockchain.tx.sender).isZero()) {
            throw new Revert('Admin only');
        }
        this.eventTriggeredStore.set(u256.Zero);
        this.eventTimestampStore.set(u256.Zero);

        const w = new BytesWriter(1);
        w.writeBoolean(true);
        return w;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CLAIM METHOD
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * claimPayout(policyId: uint256) → payout: uint256
     *
     * Policy holder claims coverage after an insured event is triggered.
     * Checks: event triggered, ownership, active status, not expired, pool solvent.
     */
    @method({ name: 'policyId', type: ABIDataTypes.UINT256 })
    @returns({ name: 'payout', type: ABIDataTypes.UINT256 })
    public claimPayout(calldata: Calldata): BytesWriter {
        const policyId: u256  = calldata.readU256();
        const caller: Address = Blockchain.tx.sender;

        if (this.eventTriggeredStore.value.isZero()) {
            throw new Revert('No insured event has been triggered');
        }

        // Ownership: caller's registered policyId must match
        const callerPolicyId: u256 = this.userPolicyMap.get(caller);
        if (callerPolicyId != policyId) {
            throw new Revert('You do not own this policy');
        }

        if (this.statusMap.get(policyId) != STATUS_ACTIVE) {
            throw new Revert('Policy is not active');
        }

        // Check policy was active AT THE TIME of the insured event,
        // not at the time of the claim (may be days later).
        const eventTs: u256 = this.eventTimestampStore.value;
        const expiry:  u256 = this.expiryMap.get(policyId);
        if (eventTs > expiry) {
            throw new Revert('Policy had expired before the insured event');
        }

        const coverage: u256 = this.coverageMap.get(policyId);
        const curLiq: u256   = this.totalLiquidityStore.value;
        if (coverage > curLiq) throw new Revert('Insufficient pool liquidity for payout');

        // Mark claimed and update accounting
        this.statusMap.set(policyId, STATUS_CLAIMED);

        const curCov: u256 = this.totalCoverageStore.value;
        if (curCov >= coverage) {
            this.totalCoverageStore.set(SafeMath.sub(curCov, coverage));
        }
        this.totalLiquidityStore.set(SafeMath.sub(curLiq, coverage));

        const w = new BytesWriter(32);
        w.writeU256(coverage);
        return w;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /** getPolicy(policyId) → coverageAmount, startBlock, expiryBlock, status */
    @method({ name: 'policyId', type: ABIDataTypes.UINT256 })
    @returns(
        { name: 'coverageAmount', type: ABIDataTypes.UINT256 },
        { name: 'startBlock',     type: ABIDataTypes.UINT256 },
        { name: 'expiryBlock',    type: ABIDataTypes.UINT256 },
        { name: 'status',         type: ABIDataTypes.UINT256 }
    )
    public getPolicy(calldata: Calldata): BytesWriter {
        const policyId: u256 = calldata.readU256();

        const w = new BytesWriter(128); // 4 × 32 bytes
        w.writeU256(this.coverageMap.get(policyId));
        w.writeU256(this.startMap.get(policyId));
        w.writeU256(this.expiryMap.get(policyId));
        w.writeU256(this.statusMap.get(policyId));
        return w;
    }

    /** getUserPolicy(owner: address) → policyId: uint256 */
    @method({ name: 'owner', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'policyId', type: ABIDataTypes.UINT256 })
    public getUserPolicy(calldata: Calldata): BytesWriter {
        const owner: Address = calldata.readAddress();
        const w = new BytesWriter(32);
        w.writeU256(this.userPolicyMap.get(owner));
        return w;
    }

    /** getTotalLiquidity() → liquidity: uint256 */
    @method()
    @returns({ name: 'liquidity', type: ABIDataTypes.UINT256 })
    public getTotalLiquidity(_calldata: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeU256(this.totalLiquidityStore.value);
        return w;
    }

    /** getTotalActiveCoverage() → coverage: uint256 */
    @method()
    @returns({ name: 'coverage', type: ABIDataTypes.UINT256 })
    public getTotalActiveCoverage(_calldata: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeU256(this.totalCoverageStore.value);
        return w;
    }

    /** getPolicyCount() → count: uint256 */
    @method()
    @returns({ name: 'count', type: ABIDataTypes.UINT256 })
    public getPolicyCount(_calldata: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeU256(this.policyCountStore.value);
        return w;
    }

    /** isEventTriggered() → triggered: bool */
    @method()
    @returns({ name: 'triggered', type: ABIDataTypes.BOOL })
    public isEventTriggered(_calldata: Calldata): BytesWriter {
        const triggered = !this.eventTriggeredStore.value.isZero();
        const w = new BytesWriter(1);
        w.writeBoolean(triggered);
        return w;
    }

    /** getEventTimestamp() → blockNumber: uint256 (0 if not yet triggered) */
    @method()
    @returns({ name: 'blockNumber', type: ABIDataTypes.UINT256 })
    public getEventTimestamp(_calldata: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeU256(this.eventTimestampStore.value);
        return w;
    }
}
