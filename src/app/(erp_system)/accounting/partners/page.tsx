"use client";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { Network, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader, Card, Badge, LoadingTable } from "@/components/ui/Breadcrumbs";
import { ExportButtons } from "@/components/ExportButtons";
import { RequireAccess } from "@/components/RequireAccess";
import { clsx } from "clsx";

const fmt = (n: number) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

function PartnersInner() {
  const [partnerType, setPartnerType] = useState("donor");
  const [open, setOpen] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["partner-ledger", partnerType],
    queryFn: async () => (await (await fetch(`/api/accounting/partner-ledger?partnerType=${partnerType}`, { credentials: "include" })).json()).data,
  });

  return (
    <div>
      <PageHeader
        title="Partner Ledger — Subledger"
        subtitle="Donors, donees & vendors are NOT individual GL accounts. One control account per class holds the GL balance; partner-level detail lives here and reconciles against it (Odoo / SAP / Oracle pattern)."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 border-b border-gray-200">
          {[{ id: "donor", label: "Donors (Receivable)" }, { id: "donee", label: "Donees (Payable)" }, { id: "vendor", label: "Vendors (Payable)" }].map((t) => (
            <button key={t.id} onClick={() => { setPartnerType(t.id); setOpen(null); }}
              className={clsx("px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition", partnerType === t.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-800")}>
              {t.label}
            </button>
          ))}
        </div>
        {data && (
          <ExportButtons
            filename={`${partnerType}-ledger`}
            title={`${partnerType.toUpperCase()} Partner Ledger`}
            columns={[{ key: "name", label: "Partner" }, { key: "detail", label: "Ref" }, { key: "transactions", label: "Entries" }, { key: "balance", label: "Balance (PKR)" }]}
            rows={(data.partners ?? []).map((p: any) => ({ name: p.name, detail: p.detail, transactions: p.transactions.length, balance: p.balance }))}
            totalColumn="balance"
          />
        )}
      </div>

      {isLoading && <LoadingTable rows={6} cols={4} />}

      {data && (
        <>
          {/* Control account + reconciliation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Control account (GL)</div>
              {data.controlAccount ? (
                <>
                  <div className="font-bold text-[#1c2b26]">{data.controlAccount.code} — {data.controlAccount.name}</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{fmt(data.controlAccount.balance)}</div>
                </>
              ) : (
                <div className="text-sm text-gray-400">No control account defined for this class.</div>
              )}
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Subledger total</div>
              <div className="text-2xl font-bold text-[#1c2b26]">{fmt(data.subledgerTotal)}</div>
              <div className="text-xs text-gray-500 mt-1">{data.partners.length} partners with activity</div>
            </Card>
            <Card className={clsx("p-5 border-2", data.reconciled ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40")}>
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Reconciliation</div>
              <div className={clsx("flex items-center gap-2 font-bold", data.reconciled ? "text-emerald-700" : "text-rose-700")}>
                {data.reconciled ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                {data.reconciled === null ? "—" : data.reconciled ? "Matched ✓" : `Diff ${fmt(Math.abs((data.controlAccount?.balance ?? 0) - data.subledgerTotal))}`}
              </div>
              <div className="text-xs text-gray-500 mt-1">GL control balance vs sum of partner balances</div>
            </Card>
          </div>

          {/* Partner list with expandable ledgers */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 font-semibold flex items-center gap-2"><Network className="w-4 h-4 text-emerald-600" /> Partner balances</div>
            <table className="table">
              <thead><tr><th className="w-8"></th><th>Partner</th><th>Ref</th><th className="text-right">Entries</th><th className="text-right">Balance (PKR)</th></tr></thead>
              <tbody>
                {data.partners.map((p: any) => (
                  <Fragment key={p.id}>
                    <tr className="cursor-pointer" onClick={() => setOpen(open === p.id ? null : p.id)}>
                      <td>{open === p.id ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}</td>
                      <td className="font-semibold">{p.name}</td>
                      <td className="text-xs text-gray-500">{p.detail || "—"}</td>
                      <td className="text-right">{p.transactions.length}</td>
                      <td className="text-right font-bold">{fmt(p.balance)}</td>
                    </tr>
                    {open === p.id && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={5} className="px-8 py-3">
                          <table className="w-full text-xs bg-white border border-gray-200 rounded overflow-hidden">
                            <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left px-3 py-1.5 font-medium">Date</th><th className="text-left px-3 py-1.5 font-medium">Ref</th><th className="text-left px-3 py-1.5 font-medium">Description</th><th className="text-right px-3 py-1.5 font-medium">Amount</th></tr></thead>
                            <tbody>
                              {p.transactions.map((t: any, i: number) => (
                                <tr key={i} className="border-b border-gray-50 last:border-0">
                                  <td className="px-3 py-1.5">{t.date}</td>
                                  <td className="px-3 py-1.5 font-mono">{t.ref}</td>
                                  <td className="px-3 py-1.5 text-gray-600">{t.description}</td>
                                  <td className="px-3 py-1.5 text-right font-semibold">{fmt(t.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {data.partners.length === 0 && <tr><td colSpan={5} className="text-center text-sm text-gray-400 py-8">No partner activity yet.</td></tr>}
              </tbody>
              {data.partners.length > 0 && (
                <tfoot><tr className="bg-emerald-50/60"><td colSpan={4} className="font-bold text-right">Subledger total</td><td className="text-right font-bold text-emerald-700">{fmt(data.subledgerTotal)}</td></tr></tfoot>
              )}
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="accounting.partners">
      <PartnersInner />
    </RequireAccess>
  );
}
