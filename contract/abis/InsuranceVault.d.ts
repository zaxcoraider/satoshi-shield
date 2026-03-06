import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the depositLiquidity function call.
 */
export type DepositLiquidity = CallResult<
    {
        lpTokensMinted: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the withdrawLiquidity function call.
 */
export type WithdrawLiquidity = CallResult<
    {
        btcReturned: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the buyProtection function call.
 */
export type BuyProtection = CallResult<
    {
        policyId: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the triggerEvent function call.
 */
export type TriggerEvent = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the resetEvent function call.
 */
export type ResetEvent = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the claimPayout function call.
 */
export type ClaimPayout = CallResult<
    {
        payout: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getPolicy function call.
 */
export type GetPolicy = CallResult<
    {
        coverageAmount: bigint;
        startBlock: bigint;
        expiryBlock: bigint;
        status: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getUserPolicy function call.
 */
export type GetUserPolicy = CallResult<
    {
        policyId: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getTotalLiquidity function call.
 */
export type GetTotalLiquidity = CallResult<
    {
        liquidity: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getTotalActiveCoverage function call.
 */
export type GetTotalActiveCoverage = CallResult<
    {
        coverage: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getPolicyCount function call.
 */
export type GetPolicyCount = CallResult<
    {
        count: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the isEventTriggered function call.
 */
export type IsEventTriggered = CallResult<
    {
        triggered: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getEventTimestamp function call.
 */
export type GetEventTimestamp = CallResult<
    {
        blockNumber: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IInsuranceVault
// ------------------------------------------------------------------
export interface IInsuranceVault extends IOP_NETContract {
    depositLiquidity(amount: bigint): Promise<DepositLiquidity>;
    withdrawLiquidity(lpTokenAmount: bigint): Promise<WithdrawLiquidity>;
    buyProtection(coverageAmount: bigint): Promise<BuyProtection>;
    triggerEvent(): Promise<TriggerEvent>;
    resetEvent(): Promise<ResetEvent>;
    claimPayout(policyId: bigint): Promise<ClaimPayout>;
    getPolicy(policyId: bigint): Promise<GetPolicy>;
    getUserPolicy(owner: Address): Promise<GetUserPolicy>;
    getTotalLiquidity(): Promise<GetTotalLiquidity>;
    getTotalActiveCoverage(): Promise<GetTotalActiveCoverage>;
    getPolicyCount(): Promise<GetPolicyCount>;
    isEventTriggered(): Promise<IsEventTriggered>;
    getEventTimestamp(): Promise<GetEventTimestamp>;
}
