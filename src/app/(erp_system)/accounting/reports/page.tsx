"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, Card, LoadingTable, Badge, Tabs } from "@/components/ui/Breadcrumbs";
import { ExportButtons } from "@/components/ExportButtons";
import { RequireAccess } from "@/components/RequireAccess";
import { Scale, TrendingUp, Landmark, Waves, GitCompareArrows } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

function FinancialReports() {
  const [tab, setTab] = useState("trial");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["financials", from, to],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (from) p.set("from", from);
      if (to) p.set("to", p.get("to") || to);
      if (to) p.set("to", to);
      const res = await fetch(`/api/accounting/financials?${p}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
  });

  const periodLabel = `${from || "Beginning"} → ${to || "Today"}`;

  const tabConfig = [
    { id: "trial", label: "Trial Balance" },
    { id: "ie", label: "Income & Expenditure" },
    { id: "bs", label: "Balance Sheet" },
    { id: "cf", label: "Cash Flow" },
    { id: "fp", label: "Changes in Fin. Position" },
  ];

  return (
    <div>
      <PageHeader
        title="Financial Statements"
        subtitle="Double-entry based reports — Trial Balance, Income & Expenditure, Balance Sheet, Cash Flow, Changes in Financial Position"
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1 block">Period from</span>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1 block">Period to</span>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <div className="text-xs text-gray-500 pb-2">Active period: <b>{periodLabel}</b></div>
        </div>
      </Card>

      <Tabs value={tab} onChange={setTab} tabs={tabConfig} />

      {isLoading && <LoadingTable rows={10} cols={5} />}

      {data && tab === "trial" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="font-semibold flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-600" /> Trial Balance <span className="text-xs text-gray-400 font-normal">({periodLabel})</span></div>
            <ExportButtons filename="trial-balance" title={`Trial Balance (${periodLabel})`}
              columns={[
                { key: "code", label: "Code" }, { key: "name", label: "Account" }, { key: "type", label: "Type" },
                { key: "openingDebit", label: "Opening Dr" }, { key: "openingCredit", label: "Opening Cr" },
                { key: "debit", label: "Period Dr" }, { key: "credit", label: "Period Cr" },
                { key: "closingDebit", label: "Closing Dr" }, { key: "closingCredit", label: "Closing Cr" },
              ]}
              rows={data.trialBalance} totalColumn="closingDebit" signatures={["Accountant", "Finance Manager"]} />
          </div>
          <div className="overflow-x-auto max-h-[34rem] overflow-y-auto">
            <table className="table">
              <thead><tr><th>Code</th><th>Account</th><th>Type</th><th className="text-right">Opening Dr</th><th className="text-right">Opening Cr</th><th className="text-right">Period Dr</th><th className="text-right">Period Cr</th><th className="text-right">Closing Dr</th><th className="text-right">Closing Cr</th></tr></thead>
              <tbody>
                {data.trialBalance.map((r: any) => (
                  <tr key={r.code}>
                    <td className="font-mono text-xs">{r.code}</td>
                    <td className="font-medium">{r.name}</td>
                    <td><Badge tone={r.type === "income" ? "emerald" : r.type === "expense" ? "rose" : r.type === "asset" ? "sky" : r.type === "liability" ? "amber" : "slate"}>{r.type}</Badge></td>
                    <td className="text-right">{r.openingDebit ? fmt(r.openingDebit) : "—"}</td>
                    <td className="text-right">{r.openingCredit ? fmt(r.openingCredit) : "—"}</td>
                    <td className="text-right">{r.debit ? fmt(r.debit) : "—"}</td>
                    <td className="text-right">{r.credit ? fmt(r.credit) : "—"}</td>
                    <td className="text-right font-medium">{r.closingDebit ? fmt(r.closingDebit) : "—"}</td>
                    <td className="text-right font-medium">{r.closingCredit ? fmt(r.closingCredit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/60">
                  <td colSpan={7} className="font-bold text-right">Closing Totals</td>
                  <td className="text-right font-bold text-emerald-700">{fmt(data.trialBalance.reduce((s: number, r: any) => s + r.closingDebit, 0))}</td>
                  <td className="text-right font-bold text-emerald-700">{fmt(data.trialBalance.reduce((s: number, r: any) => s + r.closingCredit, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {data && tab === "ie" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Income & Expenditure Account</div>
              <ExportButtons filename="income-expenditure" title={`Income & Expenditure (${periodLabel})`}
                columns={[{ key: "head", label: "Head" }, { key: "name", label: "Account" }, { key: "amount", label: "Amount (PKR)" }]}
                rows={[
                  ...data.incomeExpenditure.income.map((r: any) => ({ head: "Income", name: r.name, amount: r.amount })),
                  ...data.incomeExpenditure.expenses.map((r: any) => ({ head: "Expense", name: r.name, amount: r.amount })),
                ]} />
            </div>
            <table className="table">
              <thead><tr><th>Income Heads</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {data.incomeExpenditure.income.map((r: any) => <tr key={r.code}><td>{r.name}</td><td className="text-right font-medium">{fmt(r.amount)}</td></tr>)}
                <tr className="bg-emerald-50/60"><td className="font-bold">Total Income</td><td className="text-right font-bold text-emerald-700">{fmt(data.incomeExpenditure.totalIncome)}</td></tr>
              </tbody>
            </table>
            <table className="table">
              <thead><tr><th>Expenditure Heads</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {data.incomeExpenditure.expenses.map((r: any) => <tr key={r.code}><td>{r.name}</td><td className="text-right font-medium">{fmt(r.amount)}</td></tr>)}
                <tr className="bg-rose-50/60"><td className="font-bold">Total Expenditure</td><td className="text-right font-bold text-rose-700">{fmt(data.incomeExpenditure.totalExpense)}</td></tr>
                <tr className="bg-gray-50">
                  <td className="font-bold">Surplus / (Deficit)</td>
                  <td className={`text-right font-bold ${data.incomeExpenditure.surplus >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmt(data.incomeExpenditure.surplus)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
          <Card>
            <h3 className="font-semibold mb-3">Summary</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Total Income</dt><dd className="font-semibold text-emerald-700">{fmt(data.incomeExpenditure.totalIncome)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Total Expenditure</dt><dd className="font-semibold text-rose-700">{fmt(data.incomeExpenditure.totalExpense)}</dd></div>
              <div className="flex justify-between border-t pt-3"><dt className="font-bold">Net Surplus</dt><dd className={`font-bold ${data.incomeExpenditure.surplus >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmt(data.incomeExpenditure.surplus)}</dd></div>
            </dl>
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">Computed from all posted double-entry vouchers in the selected period. Income heads carry credit balances; expenditure heads carry debit balances.</p>
          </Card>
        </div>
      )}

      {data && tab === "bs" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="font-semibold flex items-center gap-2"><Landmark className="w-4 h-4 text-emerald-600" /> Balance Sheet <span className="text-xs text-gray-400 font-normal">(as of {to || "today"})</span></div>
            <ExportButtons filename="balance-sheet" title={`Balance Sheet (as of ${to || "today"})`}
              columns={[{ key: "side", label: "Side" }, { key: "name", label: "Account" }, { key: "amount", label: "Amount (PKR)" }]}
              rows={[
                ...data.balanceSheet.assets.map((r: any) => ({ side: "Assets", name: r.name, amount: r.amount })),
                ...data.balanceSheet.liabilities.map((r: any) => ({ side: "Liabilities", name: r.name, amount: r.amount })),
                ...data.balanceSheet.equity.map((r: any) => ({ side: "Equity", name: r.name, amount: r.amount })),
                { side: "Equity", name: "Accumulated Surplus", amount: data.balanceSheet.retainedSurplus },
              ]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div>
              <table className="table">
                <thead><tr><th>Assets</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {data.balanceSheet.assets.map((r: any) => <tr key={r.code}><td>{r.name}</td><td className="text-right font-medium">{fmt(r.amount)}</td></tr>)}
                  <tr className="bg-emerald-50/60"><td className="font-bold">Total Assets</td><td className="text-right font-bold text-emerald-700">{fmt(data.balanceSheet.totalAssets)}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <table className="table">
                <thead><tr><th>Liabilities & Equity</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {data.balanceSheet.liabilities.map((r: any) => <tr key={r.code}><td>{r.name}</td><td className="text-right font-medium">{fmt(r.amount)}</td></tr>)}
                  {data.balanceSheet.equity.map((r: any) => <tr key={r.code}><td>{r.name}</td><td className="text-right font-medium">{fmt(r.amount)}</td></tr>)}
                  <tr><td>Accumulated Surplus</td><td className="text-right font-medium">{fmt(data.balanceSheet.retainedSurplus)}</td></tr>
                  <tr className="bg-emerald-50/60"><td className="font-bold">Total Liab. & Equity</td><td className="text-right font-bold text-emerald-700">{fmt(data.balanceSheet.totalLiabilitiesEquity)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {data && tab === "cf" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="font-semibold flex items-center gap-2"><Waves className="w-4 h-4 text-emerald-600" /> Cash Flow Statement <span className="text-xs text-gray-400 font-normal">({periodLabel})</span></div>
            <ExportButtons filename="cash-flow" title={`Cash Flow Statement (${periodLabel})`}
              columns={[{ key: "item", label: "Item" }, { key: "amount", label: "Amount (PKR)" }]}
              rows={[
                { item: "Operating inflows", amount: data.cashFlow.operatingIn },
                { item: "Operating outflows", amount: -data.cashFlow.operatingOut },
                { item: "Investing inflows", amount: data.cashFlow.investingIn },
                { item: "Investing outflows", amount: -data.cashFlow.investingOut },
                { item: "Financing inflows", amount: data.cashFlow.financingIn },
                { item: "Financing outflows", amount: -data.cashFlow.financingOut },
                { item: "Net change in cash", amount: data.cashFlow.netChange },
                { item: "Opening cash & bank", amount: data.cashFlow.openingCash },
                { item: "Closing cash & bank", amount: data.cashFlow.closingCash },
              ]} />
          </div>
          <table className="table">
            <tbody>
              <tr className="bg-gray-50"><td colSpan={2} className="font-bold text-xs uppercase tracking-wide text-gray-500">Operating Activities</td></tr>
              <tr><td className="pl-8">Receipts from donations & income</td><td className="text-right font-medium">{fmt(data.cashFlow.operatingIn)}</td></tr>
              <tr><td className="pl-8">Payments for expenses & welfare</td><td className="text-right font-medium text-rose-700">({fmt(data.cashFlow.operatingOut)})</td></tr>
              <tr className="bg-gray-50"><td colSpan={2} className="font-bold text-xs uppercase tracking-wide text-gray-500">Investing Activities</td></tr>
              <tr><td className="pl-8">Inflows</td><td className="text-right font-medium">{fmt(data.cashFlow.investingIn)}</td></tr>
              <tr><td className="pl-8">Outflows</td><td className="text-right font-medium text-rose-700">({fmt(data.cashFlow.investingOut)})</td></tr>
              <tr className="bg-gray-50"><td colSpan={2} className="font-bold text-xs uppercase tracking-wide text-gray-500">Financing Activities</td></tr>
              <tr><td className="pl-8">Inflows</td><td className="text-right font-medium">{fmt(data.cashFlow.financingIn)}</td></tr>
              <tr><td className="pl-8">Outflows</td><td className="text-right font-medium text-rose-700">({fmt(data.cashFlow.financingOut)})</td></tr>
              <tr className="bg-emerald-50/60"><td className="font-bold">Net change in cash & bank</td><td className={`text-right font-bold ${data.cashFlow.netChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmt(data.cashFlow.netChange)}</td></tr>
              <tr><td>Opening cash & bank</td><td className="text-right">{fmt(data.cashFlow.openingCash)}</td></tr>
              <tr className="bg-gray-50"><td className="font-bold">Closing cash & bank</td><td className="text-right font-bold">{fmt(data.cashFlow.closingCash)}</td></tr>
            </tbody>
          </table>
        </Card>
      )}

      {data && tab === "fp" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="font-semibold flex items-center gap-2"><GitCompareArrows className="w-4 h-4 text-emerald-600" /> Statement of Changes in Financial Position <span className="text-xs text-gray-400 font-normal">({periodLabel})</span></div>
            <ExportButtons filename="changes-financial-position" title={`Changes in Financial Position (${periodLabel})`}
              columns={[{ key: "code", label: "Code" }, { key: "name", label: "Account" }, { key: "type", label: "Type" }, { key: "opening", label: "Opening" }, { key: "closing", label: "Closing" }, { key: "change", label: "Change" }]}
              rows={data.changesInFinancialPosition} signatures={["Accountant", "Finance Manager"]} />
          </div>
          <div className="overflow-x-auto max-h-[34rem] overflow-y-auto">
            <table className="table">
              <thead><tr><th>Code</th><th>Account</th><th>Type</th><th className="text-right">Opening</th><th className="text-right">Closing</th><th className="text-right">Change</th></tr></thead>
              <tbody>
                {data.changesInFinancialPosition.map((r: any) => (
                  <tr key={r.code}>
                    <td className="font-mono text-xs">{r.code}</td>
                    <td className="font-medium">{r.name}</td>
                    <td><Badge tone={r.type === "income" ? "emerald" : r.type === "expense" ? "rose" : r.type === "asset" ? "sky" : r.type === "liability" ? "amber" : "slate"}>{r.type}</Badge></td>
                    <td className="text-right">{fmt(r.opening)}</td>
                    <td className="text-right">{fmt(r.closing)}</td>
                    <td className={`text-right font-semibold ${r.change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{r.change >= 0 ? "+" : ""}{fmt(r.change)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="accounting.reports">
      <FinancialReports />
    </RequireAccess>
  );
}
