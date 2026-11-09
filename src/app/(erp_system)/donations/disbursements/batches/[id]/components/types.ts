export type BatchStatus = "draft" | "approved" | "paid" | "cancelled";
export type DisbursementItem = { id: number; doneeName: string; amount: number; purpose?: string };
