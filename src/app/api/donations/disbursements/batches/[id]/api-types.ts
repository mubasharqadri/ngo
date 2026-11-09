// Shared API types for disbursement batches
export type BatchStatus = "draft" | "approved" | "paid" | "cancelled";
export type FundType = "general" | "zakat" | "sadaqah" | "fitrana" | "orphan" | "ration";
export type DisbursementItem = {
  id: number;
  doneeId: number | null;
  doneeName: string | null;
  doneeCnic: string | null;
  doneePhone: string | null;
  amount: string;
  purpose: string | null;
  voucherNo: string | null;
  paidAt: string | null;
};
