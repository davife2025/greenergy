"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportedPayoutProvider = isSupportedPayoutProvider;
exports.createTransferRecipient = createTransferRecipient;
exports.initiateTransfer = initiateTransfer;
const paystack_client_js_1 = require("./paystack-client.js");
/**
 * Nigerian fintech/mobile-money wallets are NUBAN accounts under the hood
 * (a phone number acts as the account number), so Paystack's standard
 * bank-transfer recipient type ("nuban") works for them directly — no
 * separate "mobile money" recipient type needed here (that Paystack
 * feature is Ghana/Kenya-only, not applicable to this Nigeria pilot).
 *
 * Codes confirmed against Paystack's List Banks endpoint as of Session 5
 * — re-verify via that endpoint before going live, since these can
 * occasionally change.
 */
const BANK_CODES = {
    opay: "999992",
    palmpay: "999991",
    moniepoint: "50515",
};
function isSupportedPayoutProvider(provider) {
    return provider in BANK_CODES;
}
async function createTransferRecipient(input) {
    const bankCode = BANK_CODES[input.provider];
    if (!bankCode) {
        throw new Error(`Unsupported mobile money provider: ${input.provider}. Only opay, palmpay, and moniepoint are wired up for this Nigeria pilot.`);
    }
    const data = await (0, paystack_client_js_1.paystackRequest)("/transferrecipient", {
        method: "POST",
        body: JSON.stringify({
            type: "nuban",
            name: input.name,
            account_number: input.accountNumber,
            bank_code: bankCode,
            currency: "NGN",
        }),
    });
    return { recipientCode: data.recipient_code };
}
async function initiateTransfer(input) {
    // Paystack amounts are in kobo (1 NGN = 100 kobo).
    const amountKobo = Math.round(input.amountNgn * 100);
    const data = await (0, paystack_client_js_1.paystackRequest)("/transfer", {
        method: "POST",
        body: JSON.stringify({
            source: "balance",
            amount: amountKobo,
            recipient: input.recipientCode,
            reason: input.reason,
            reference: input.reference,
        }),
    });
    return { status: data.status, paystackReference: data.reference };
}
