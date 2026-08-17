// ── Users ─────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  mobileMoneyProvider: MobileMoneyProvider | null;
  mobileMoneyIdentifier: string | null;
  createdAt: string;
}

export type MobileMoneyProvider = "opay" | "palmpay" | "moniepoint" | "mpesa";

// ── Energy provider links ────────────────────────────────
// A user connects an existing PAYG solar / smart-meter provider account.
// Greenenergy never owns the hardware — it reads usage data via partner APIs.

export type EnergyProviderName = "m_kopa" | "sun_king" | "bboxx" | "manual";

export type EnergyProviderLinkStatus = "active" | "revoked" | "error";

export interface EnergyProviderLink {
  id: string;
  userId: string;
  provider: EnergyProviderName;
  externalAccountId: string;
  status: EnergyProviderLinkStatus;
  linkedAt: string;
}

// ── Telemetry ─────────────────────────────────────────────
// Raw usage/generation readings pulled from a linked provider.

export interface TelemetryReading {
  id: string;
  energyProviderLinkId: string;
  kwh: number;
  readingStart: string;
  readingEnd: string;
  source: "synthetic" | "self_reported" | "partner_api";
  evidenceUrl: string | null;
  ingestedAt: string;
}

// ── Carbon batches ────────────────────────────────────────
// Many users' telemetry is pooled and verified before being sold as credits.

export type CarbonBatchStatus = "pending" | "verified" | "submitted" | "sold" | "rejected";

export interface CarbonBatch {
  id: string;
  status: CarbonBatchStatus;
  totalKwh: number;
  estimatedTonsCo2e: number;
  registrySubmissionId: string | null;
  reviewNotes: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

// ── Payouts ───────────────────────────────────────────────
// A user's revenue share from a sold carbon batch, paid via mobile money.

export type PayoutStatus = "pending" | "paid" | "failed";

export interface Payout {
  id: string;
  userId: string;
  carbonBatchId: string;
  amount: number;
  currency: "NGN";
  mobileMoneyReference: string | null;
  status: PayoutStatus;
  createdAt: string;
}

// ── Excess energy marketplace ────────────────────────────
// A host's solar generation/consumption profile, and the resulting
// excess capacity listed for other people nearby to access (device
// charging, etc). Deliberately a simple daily-average model, not
// time-series telemetry.

export interface SolarProfile {
  id: string;
  userId: string;
  panelWatts: number | null;
  dailyGenerationKwh: number;
  dailyConsumptionKwh: number;
  excessKwh: number;
  aiPlausible: boolean | null;
  aiReviewNote: string | null;
  locationText: string;
  pricePerSessionNgn: number;
  isListed: boolean;
  updatedAt: string;
}

export type EnergyRequestStatus =
  | "pending_payment"
  | "paid"
  | "confirmed"
  | "paid_out"
  | "cancelled"
  | "disputed";

export interface EnergyRequest {
  id: string;
  seekerId: string;
  hostId: string;
  solarProfileId: string;
  amountNgn: number;
  platformCommissionNgn: number;
  hostPayoutNgn: number;
  status: EnergyRequestStatus;
  paystackReference: string | null;
  createdAt: string;
  paidAt: string | null;
  confirmedAt: string | null;
}
