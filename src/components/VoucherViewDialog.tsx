"use client";
import { useQuery } from "@tanstack/react-query";
import { Modal, Badge } from "@/components/ui/Breadcrumbs";
import { printVoucherA4 } from "@/lib/exports";
import { Printer } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** Opens a dialog showing a full double-entry voucher (used from advances/loans pages). */
export function VoucherViewDialog({ voucherNo, onClose }: { voucherNo: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["voucher-by-no", voucherNo],
    enabled: !!voucherNo,
    queryFn: async () => {
      const list = await (await fetch(`/api/accounting/vouchers?search=${encodeURIComponent(voucherNo!)}`, { credentials: "include" })).json();
      const hit = (list.data ?? []).find((v: { voucherNo: string }) => v.voucherNo === voucherNo);
      if (!hit) return null;
      const detail = await (await fetch(`/api/accounting/vouchers/${hit.id}`, { credentials: "include" })).json();
      return detail.data;
    },
  });

  const rows = (data?.lines ?? []).map((l: { debit: string; credit: string }) => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) }));

  return (
    <Modal
      open={!!voucherNo}
      onClose={onClose}
      title={`Voucher ${voucherNo ?? ""}`}
      size="lg"
      footer={
        <>
          {data && (
            <button
              className="btn btn-ghost"
              onClick={() =>
                printVoucherA4({
                  voucherNo: data.voucherNo,
                  typeLabel: data.typeLabel ?? data.type,
                  date: data.date,
                  narration: data.narration ?? "",
                  postedByName: data.postedByName ?? undefined,
                  total: Number(data.totalAmount),
                  lines: rows,
                })
              }
            >
              <Printer className="w-4 h-4" /> Print A4
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </>
      }
    >
      {isLoading && <div className="skeleton h-40 w-full" />}
      {!isLoading && !data && <div className="text-center text-sm text-gray-500 py-8">Voucher not found.</div>}
      {!isLoading && data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="violet">{data.type} · {data.typeLabel}</Badge>
            <span className="text-gray-600">Dated {data.date}</span>
            <span className="text-gray-400">· Posted by {data.postedByName ?? "—"}</span>
          </div>
          {data.narration && <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">{data.narration}</p>}
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr>
            </thead>
            <tbody>
              {rows.map((l: { id: number; accountCode: string; accountName: string; debit: number; credit: number; narration?: string }) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.accountCode}</td>
                  <td>
                    <div className="font-medium">{l.accountName}</div>
                    {l.narration && <div className="text-xs text-gray-400">{l.narration}</div>}
                  </td>
                  <td className="text-right font-medium">{l.debit ? fmt(l.debit) : "—"}</td>
                  <td className="text-right font-medium">{l.credit ? fmt(l.credit) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50/60">
                <td colSpan={2} className="font-bold text-right">Totals</td>
                <td className="text-right font-bold text-emerald-700">{fmt(rows.reduce((s: number, l: { debit: number }) => s + l.debit, 0))}</td>
                <td className="text-right font-bold text-emerald-700">{fmt(rows.reduce((s: number, l: { credit: number }) => s + l.credit, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
}
