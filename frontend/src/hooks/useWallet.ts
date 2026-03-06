import { useWalletConnect } from '@btc-vision/walletconnect';
import { networks } from '@btc-vision/bitcoin';
import { useCallback } from 'react';
import { clearProviderCache } from '../services/ContractService';

export function useWallet() {
    const {
        walletAddress,      // string | null
        address,            // Address | null  — needed as getContract sender
        network: walletNetwork,
        openConnectModal,   // opens the wallet selection modal (OP_WALLET + UniSat)
        disconnect,
        publicKey,
        provider,           // AbstractRpcProvider | null — wallet-injected provider
        walletBalance,      // WalletBalance | null — confirmed/unconfirmed/total sats
        connecting,         // boolean — true while connection handshake is in progress
    } = useWalletConnect();

    const isConnected = walletAddress !== null;
    const network     = walletNetwork ?? networks.opnetTestnet;

    const connect = useCallback(() => {
        openConnectModal();
    }, [openConnectModal]);

    const handleDisconnect = useCallback(() => {
        clearProviderCache();
        disconnect();
    }, [disconnect]);

    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`
        : null;

    return {
        isConnected,
        connecting,               // boolean — show spinner while connecting
        address: walletAddress,   // string | null  — display / refundTo
        addressObj: address,      // Address | null — getContract sender
        shortAddress,
        network,
        publicKey,
        provider,                 // wallet provider — MUST use for sendTransaction
        walletBalance,            // WalletBalance | null
        connect,
        disconnect: handleDisconnect,
    };
}
