interface CreateRecipientInput {
    name: string;
    provider: string;
    accountNumber: string;
}
interface InitiateTransferInput {
    recipientCode: string;
    amountNgn: number;
    reason: string;
    reference: string;
}
export declare function isSupportedPayoutProvider(provider: string): boolean;
export declare function createTransferRecipient(input: CreateRecipientInput): Promise<{
    recipientCode: string;
}>;
export declare function initiateTransfer(input: InitiateTransferInput): Promise<{
    status: string;
    paystackReference: string;
}>;
export {};
