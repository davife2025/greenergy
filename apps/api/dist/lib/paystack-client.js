"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYSTACK_BASE_URL = void 0;
exports.paystackRequest = paystackRequest;
const env_js_1 = require("./env.js");
exports.PAYSTACK_BASE_URL = "https://api.paystack.co";
async function paystackRequest(path, init) {
    const res = await fetch(`${exports.PAYSTACK_BASE_URL}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${env_js_1.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
            ...init.headers,
        },
    });
    const body = (await res.json());
    if (!res.ok || body.status === false) {
        throw new Error(body.message ?? `Paystack request to ${path} failed (${res.status})`);
    }
    return body.data;
}
