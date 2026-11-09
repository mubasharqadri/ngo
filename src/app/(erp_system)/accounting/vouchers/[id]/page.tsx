"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, BookOpen, ReceiptText } from "lucide-react";
import { PageHeader, Card, Badge, LoadingTable } from "@/components/ui/Breadcrumbs";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions, useMe } from "@/hooks/usePermissions";
import { printThermal, printVoucherA4 } from "@/lib/exports";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";

const fmt = (n: unknown) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(Number(n));

function VoucherDetail() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const { data: me } = useMe();
  const allowPrint = can("accounting.vouchers", "print");

  const { data, isLoading } = useQuery({
    queryKey: ["voucher", id],
    queryFn: async () => {
      const res = await fetch(`/api/accounting/vouchers/${id}`, { credentials: "include" });
      return (await res.json()).data;
    },
  });

  if (isLoading) return <LoadingTable rows={5} cols={4} />;
  if (!data) return <div className="card p-8 text-center text-gray-500">Voucher not found</div>;

  const cols = [
    { key: "accountCode", label: "Code" },
    { key: "accountName", label: "Account" },
    { key: "narration", label: "Narration" },
    { key: "debit", label: "Debit (PKR)" },
    { key: "credit", label: "Credit (PKR)" },
  ];
  const rows = (data.lines ?? []).map((l: any) => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) }));

  const doPrintA4 = () =>
    printVoucherA4({
      voucherNo: data.voucherNo,
      typeLabel: data.typeLabel ?? data.type,
      date: data.date,
      narration: data.narration ?? "",
      postedByName: data.postedByName ?? undefined,
      total: Number(data.totalAmount),
      lines: rows.map((l: any) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        narration: l.narration,
        debit: l.debit,
        credit: l.credit,
        costCenterName: l.costCenterName ?? undefined,
        distributions: (data.distributions ?? [])
          .filter((x: any) => x.lineId === l.id)
          .map((x: any) => ({ costCenterName: x.costCenterName ?? "—", percent: Number(x.percent), amount: Number(x.amount) })),
      })),
    });

  const doPrintThermal = () =>
    printThermal({
      title: data.voucherNo,
      lines: [
        { value: `${data.type} — ${data.typeLabel ?? ""}`, center: true, bold: true },
        { label: "Date", value: String(data.date) },
        { label: "By", value: data.postedByName ?? "—" },
        { value: (data.narration ?? "").slice(0, 48), center: true },
      ],
      items: rows.map((l: any) => ({
        name: `${l.accountName}${l.credit > 0 ? " (Cr)" : " (Dr)"}`,
        amount: fmt(l.debit > 0 ? l.debit : l.credit),
      })),
      footerNote: `Total: PKR ${fmt(data.totalAmount)}`,
    });

  return (
    <div>
      <PageHeader
        title={`${data.voucherNo}`}
        subtitle={`${data.typeLabel ?? data.type} • ${data.date}`}
        actions={
          <>
            <Link href="/accounting/vouchers" className="btn btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</Link>
            {allowPrint && <button className="btn btn-ghost" onClick={doPrintA4}><Printer className="w-4 h-4" /> Print A4</button>}
            {allowPrint && <button className="btn btn-ghost" onClick={doPrintThermal}><ReceiptText className="w-4 h-4" /> Thermal</button>}
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Type</div>
          <div className="mt-1 font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-600" /> {data.type}</div>
          <div className="text-xs text-gray-500 mt-0.5">{data.typeLabel}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Date</div>
          <div className="mt-1 font-semibold">{data.date}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Total</div>
          <div className="mt-1 font-semibold text-emerald-700">PKR {fmt(data.totalAmount)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Posted By</div>
          <div className="mt-1 font-semibold">{data.postedByName ?? "—"}</div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="px-5 py-3.5 border-b border-gray-100 font-semibold">Double-Entry Lines</div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th><th>Account</th><th>Type</th><th>Narration</th>
                <th className="text-right">Debit</th><th className="text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l: any) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.accountCode}</td>
                  <td className="font-medium">{l.accountName}</td>
                  <td><Badge tone={l.accountType === "income" ? "emerald" : l.accountType === "expense" ? "rose" : l.accountType === "asset" ? "sky" : "slate"}>{l.accountType}</Badge></td>
                  <td className="text-sm text-gray-500">{l.narration || "—"}</td>
                  <td className="text-right font-medium">{l.debit > 0 ? fmt(l.debit) : ""}</td>
                  <td className="text-right font-medium">{l.credit > 0 ? fmt(l.credit) : ""}</td>
                </tr>
              ))}
              <tr className="bg-emerald-50/60">
                <td colSpan={4} className="font-bold text-right">Totals (balanced)</td>
                <td className="text-right font-bold text-emerald-700">{fmt(rows.reduce((s: number, l: any) => s + l.debit, 0))}</td>
                <td className="text-right font-bold text-emerald-700">{fmt(rows.reduce((s: number, l: any) => s + l.credit, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {data.narration && (
        <Card className="mt-4">
          <div className="font-semibold mb-1.5 text-sm">Narration</div>
          <p className="text-sm text-gray-600">{data.narration}</p>
        </Card>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="accounting.vouchers">
      <VoucherDetail />
    </RequireAccess>
  );
}
