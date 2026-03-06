import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const InsuranceVaultEvents = [];

export const InsuranceVaultAbi = [
    {
        name: 'depositLiquidity',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'lpTokensMinted', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'withdrawLiquidity',
        inputs: [{ name: 'lpTokenAmount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'btcReturned', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'buyProtection',
        inputs: [{ name: 'coverageAmount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'policyId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'triggerEvent',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claimPayout',
        inputs: [{ name: 'policyId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'payout', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPolicy',
        inputs: [{ name: 'policyId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'coverageAmount', type: ABIDataTypes.UINT256 },
            { name: 'startBlock', type: ABIDataTypes.UINT256 },
            { name: 'expiryBlock', type: ABIDataTypes.UINT256 },
            { name: 'status', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUserPolicy',
        inputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'policyId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getTotalLiquidity',
        inputs: [],
        outputs: [{ name: 'liquidity', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getTotalActiveCoverage',
        inputs: [],
        outputs: [{ name: 'coverage', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPolicyCount',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'isEventTriggered',
        inputs: [],
        outputs: [{ name: 'triggered', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getEventTimestamp',
        inputs: [],
        outputs: [{ name: 'blockNumber', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...InsuranceVaultEvents,
    ...OP_NET_ABI,
];

export default InsuranceVaultAbi;
