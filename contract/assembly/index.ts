import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { InsuranceVault } from './contracts/InsuranceVault';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';

// Factory: must return a NEW instance on every call
Blockchain.contract = (): InsuranceVault => {
    return new InsuranceVault();
};

// Required runtime exports
export * from '@btc-vision/btc-runtime/runtime/exports';

// Required abort handler
export function abort(
    message: string,
    fileName: string,
    line: u32,
    column: u32
): void {
    revertOnError(message, fileName, line, column);
}
