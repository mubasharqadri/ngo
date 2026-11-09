"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Receipt, Printer, ReceiptText, FileText, Lock, CalendarRange, Mail, Send, Paperclip } from "lucide-react";
import { PageHeader, Card, Badge, LoadingTable, Modal, Field } from "@/components/ui/Breadcrumbs";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions, useMe } from "@/hooks/usePermissions";
import { printA4, printThermal, exportPDF, amountInWords } from "@/lib/exports";
import { useToast } from "@/components/ui/toast";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";

const fmtPKR = (n: unknown) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number(n));

function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: me } = useMe();
  const toast = useToast();
  const allowPrint = can("donations.receipts", "print");
  const allowEdit = can("donations.receipts", "edit");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => {
      const res = await fetch(`/api/donations/receipts/${id}`, { credentials: "include" });
      const j = await res.json();
      return j.data;
    },
  });

  if (isLoading) return <LoadingTable rows={6} cols={4} />;
  if (!data) return <div className="card p-8 text-center text-gray-500">Receipt not found</div>;

  const lineCols = [
    { key: "serialNo", label: "S#" },
    { key: "doneeName", label: "Donee" },
    { key: "categoryName", label: "Fund" },
    { key: "amount", label: "Amount (PKR)" },
    { key: "fromDate", label: "From" },
    { key: "toDate", label: "To" },
    { key: "remarks", label: "Remarks" },
  ];
  const distCols = [
    { key: "serialNo", label: "S#" },
    { key: "month", label: "Month" },
    { key: "doneeName", label: "Donee" },
    { key: "categoryName", label: "Fund" },
    { key: "amount", label: "Amount (PKR)" },
    { key: "fromDate", label: "From" },
    { key: "toDate", label: "To" },
  ];
  const lineRows = (data.lines ?? []).map((l: any) => ({ ...l, amount: Number(l.amount) }));
  const distRows = (data.distribution ?? []).map((d: any) => ({ ...d, amount: Number(d.amount) }));

  const doPrintA4 = () =>
    printA4({
      title: `Donation Receipt — ${data.receiptNo}`,
      subtitle: `Receipt date: ${data.receiptDate}  •  Donation date: ${data.donationDate}`,
      generatedBy: me?.user.name,
      kv: [
        { label: "Donor", value: data.donorName ?? "Anonymous" },
        { label: "Membership #", value: data.donorMembershipNo ?? "—" },
        { label: "Instrument", value: data.instrumentNo ? `${data.instrumentNo} (${data.instrumentDate ?? ""})` : "Cash / not specified" },
        { label: "Voucher Ref", value: data.voucherNo ? `${data.voucherType} ${data.voucherNo}` : "—" },
        { label: "Restrict use in fund", value: data.restrictUseInFund ? "YES — donor restricted" : "No" },
        { label: "Issued By", value: data.issuedByName ?? "—" },
      ],
      columns: lineCols,
      rows: lineRows,
      totalColumn: "amount",
      signatures: ["Received By", "Donor Signature", "Authorized Signatory"],
    });

  const doPrintThermal = () =>
    printThermal({
      title: "Donation Receipt",
      lines: [
        { label: "Receipt #", value: data.receiptNo, bold: true },
        { label: "Date", value: String(data.receiptDate) },
        { label: "Donor", value: data.donorName ?? "Anonymous" },
        ...(data.instrumentNo ? [{ label: "Instrument", value: String(data.instrumentNo) }] : []),
        { value: fmtPKR(Number(data.totalAmount)), big: true, bold: true, center: true },
        ...(data.restrictUseInFund ? [{ value: "** RESTRICTED FUND USE **", center: true, bold: true }] : []),
      ],
      items: lineRows.map((l: any) => ({ name: `${l.doneeName ?? "General"} — ${l.categoryName ?? "fund"}`, amount: fmtPKR(l.amount) })),
      footerNote: "JazakAllah Khair — thank you for your donation!",
    });

  const doPDF = async () => {
    try {
      await exportPDF(`receipt-${data.receiptNo}`, `Donation Receipt ${data.receiptNo}`, [
        { key: "f", label: "Field" }, { key: "v", label: "Value" },
      ], [
        { f: "Receipt No", v: data.receiptNo },
        { f: "Receipt Date", v: data.receiptDate },
        { f: "Donation Date", v: data.donationDate },
        { f: "Donor", v: data.donorName ?? "Anonymous" },
        { f: "Total Amount", v: fmtPKR(Number(data.totalAmount)) },
        { f: "Instrument", v: data.instrumentNo ?? "—" },
        { f: "Voucher Ref", v: data.voucherNo ?? "—" },
        { f: "Restricted Fund", v: data.restrictUseInFund ? "Yes" : "No" },
        { f: "Detail Lines", v: String(lineRows.length) },
        { f: "Distribution Rows", v: String(distRows.length) },
      ], me?.user.name);
      toast.push({ title: "PDF ready", desc: "Receipt PDF downloaded." });
    } catch {
      toast.push({ title: "PDF failed", tone: "error" });
    }
  };

  const openEmail = () => {
    setEmailTo(data.donorEmail ?? "");
    setEmailBody(
      `Dear ${data.donorName ?? "Donor"},\n\nJazakAllah Khair for your generous donation.\n\nReceipt No: ${data.receiptNo}\nReceipt Date: ${data.receiptDate}\nDonation Date: ${data.donationDate}\nAmount: PKR ${Number(data.totalAmount).toLocaleString()}\nIn words: ${amountInWords(Number(data.totalAmount))}\n${data.instrumentNo ? `Instrument: ${data.instrumentNo}\n` : ""}${data.voucherNo ? `Voucher Ref: ${data.voucherNo}\n` : ""}\nYour receipt PDF is attached.\n\nWith gratitude,\nShauoor Welfare Society`
    );
    setEmailOpen(true);
  };

  const emailMut = useMutation({
    mutationFn: async () => {
      // 1) generate the PDF attachment client-side so the donor gets a real PDF
      await exportPDF(`receipt-${data.receiptNo}`, `Donation Receipt ${data.receiptNo}`, [
        { key: "f", label: "Field" }, { key: "v", label: "Value" },
      ], [
        { f: "Receipt No", v: data.receiptNo },
        { f: "Receipt Date", v: data.receiptDate },
        { f: "Donation Date", v: data.donationDate },
        { f: "Donor", v: data.donorName ?? "Anonymous" },
        { f: "Total Amount", v: fmtPKR(Number(data.totalAmount)) },
        { f: "Amount in words", v: amountInWords(Number(data.totalAmount)) },
        { f: "Instrument", v: data.instrumentNo ?? "—" },
        { f: "Voucher Ref", v: data.voucherNo ?? "—" },
        { f: "Restricted Fund", v: data.restrictUseInFund ? "Yes" : "No" },
      ], me?.user.name);
      // 2) record/send the email with the PDF attachment reference
      const res = await fetch(`/api/donations/receipts/${id}/email`, {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ toEmail: emailTo, body: emailBody, attachmentName: `Receipt-${data.receiptNo}.pdf` }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to send email");
      return j.data;
    },
    onSuccess: () => {
      setEmailOpen(false);
      qc.invalidateQueries({ queryKey: ["receipt-emails", id] });
      toast.push({ title: "Email sent to donor", desc: "Receipt PDF attached. Logged to outbox." });
    },
    onError: (e: Error) => toast.push({ title: "Email failed", desc: e.message, tone: "error" }),
  });

  const { data: sentEmails } = useQuery({
    queryKey: ["receipt-emails", id],
    queryFn: async () => (await (await fetch(`/api/donations/receipts/${id}/email`, { credentials: "include" })).json()).data,
  });

  return (
    <div>
      <PageHeader
        title={`Receipt ${data.receiptNo}`}
        subtitle={`Entered ${data.receiptDate} • Donation date ${data.donationDate}`}
        actions={
          <>
            <Link href="/donations/receipts" className="btn btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</Link>
            {allowEdit && (
              <button className="btn btn-primary" onClick={openEmail}><Mail className="w-4 h-4" /> Email to donor</button>
            )}
            {allowPrint && (
              <>
                <button className="btn btn-ghost" onClick={doPrintA4}><Printer className="w-4 h-4" /> Print A4</button>
                <button className="btn btn-ghost" onClick={doPrintThermal}><ReceiptText className="w-4 h-4" /> Thermal</button>
                <button className="btn btn-ghost" onClick={doPDF}><FileText className="w-4 h-4" /> PDF</button>
              </>
            )}
          </>
        }
      />

      {/* Email modal */}
      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title={`Email receipt to ${data.donorName ?? "donor"}`} size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEmailOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={emailMut.isPending || !emailTo} onClick={() => emailMut.mutate()}>
              <Send className="w-4 h-4" /> {emailMut.isPending ? "Sending + attaching PDF…" : "Send email"}
            </button>
          </>
        }>
        <div className="space-y-4">
          <Field label="To (donor email)" required><input type="email" className="input" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} /></Field>
          <Field label="Subject"><input className="input" value={`Donation Receipt ${data.receiptNo} — Shauoor Welfare Society`} readOnly /></Field>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Paperclip className="w-3.5 h-3.5" /> Attachment: <b>Receipt-{data.receiptNo}.pdf</b> (generated & downloaded on send)
          </div>
          <Field label="Message"><textarea className="input font-mono text-xs" rows={11} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} /></Field>
          {sentEmails && sentEmails.length > 0 && (
            <div className="text-xs text-gray-500">
              <b>Previously sent:</b> {sentEmails.map((s: any) => `${s.toEmail} on ${String(s.sentAt).slice(0, 16)}`).join(" · ")}
            </div>
          )}
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Receipt className="w-5 h-5" /></div>
            <div>
              <div className="font-semibold">Receipt Master</div>
              <div className="text-xs text-gray-500">{data.voucherNo ? <Badge tone="violet">{data.voucherType} {data.voucherNo}</Badge> : "No voucher posted"}</div>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Total Amount</dt><dd className="font-bold text-emerald-700">{fmtPKR(data.totalAmount)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Instrument</dt><dd className="font-mono text-xs">{data.instrumentNo ?? "—"} {data.instrumentDate ? `(${data.instrumentDate})` : ""}</dd></div>
            <div className="flex justify-between items-center"><dt className="text-gray-500">Restrict use in fund</dt><dd>{data.restrictUseInFund ? <Badge tone="amber"><Lock className="w-3 h-3 mr-1" />Restricted</Badge> : <Badge>Open</Badge>}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Issued By</dt><dd>{data.issuedByName ?? "—"}</dd></div>
            {data.remarks && <div className="pt-1 border-t border-gray-50"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="text-xs mt-0.5">{data.remarks}</dd></div>}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <div className="font-semibold mb-3">Donor Information</div>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{data.donorName ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Membership #</dt><dd className="font-mono text-xs">{data.donorMembershipNo ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">CNIC</dt><dd className="font-mono text-xs">{data.donorCnic ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd>{data.donorPhone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Mobile</dt><dd>{data.donorMobile ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{data.donorEmail ?? "—"}</dd></div>
            <div className="flex justify-between sm:col-span-2"><dt className="text-gray-500">Address</dt><dd className="text-right">{[data.donorAddress, data.donorCity].filter(Boolean).join(", ") || "—"}</dd></div>
          </dl>
        </Card>
      </div>

      <Card className="p-0 mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100 font-semibold flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-emerald-600" /> Detail — as donor paid (donee / fund / period)
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr>{lineCols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {lineRows.length === 0 && <tr><td colSpan={7} className="text-center text-sm text-gray-400 py-6">No detail lines</td></tr>}
              {lineRows.map((l: any) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.serialNo}</td>
                  <td className="font-medium">{l.doneeName ?? "—"}</td>
                  <td><Badge tone="sky">{l.categoryName ?? "—"}</Badge></td>
                  <td className="font-semibold">{fmtPKR(l.amount)}</td>
                  <td className="text-xs">{l.fromDate ?? "—"}</td>
                  <td className="text-xs">{l.toDate ?? "—"}</td>
                  <td className="text-xs text-gray-500">{l.remarks ?? "—"}</td>
                </tr>
              ))}
              {lineRows.length > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={3} className="font-bold text-right">Total</td>
                  <td className="font-bold text-emerald-700">{fmtPKR(lineRows.reduce((s: number, l: any) => s + l.amount, 0))}</td>
                  <td colSpan={3}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0">
        <div className="px-5 py-3.5 border-b border-gray-100 font-semibold">Distribution — month-wise (generated from detail)</div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="table">
            <thead><tr>{distCols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {distRows.length === 0 && <tr><td colSpan={7} className="text-center text-sm text-gray-400 py-6">No distribution — add From/To dates on detail lines to generate monthly splits</td></tr>}
              {distRows.map((d: any) => (
                <tr key={d.id}>
                  <td className="font-mono text-xs">{d.serialNo}</td>
                  <td className="font-mono text-xs font-semibold">{d.month}</td>
                  <td>{d.doneeName ?? "—"}</td>
                  <td><Badge tone="sky">{d.categoryName ?? "—"}</Badge></td>
                  <td className="font-medium">{fmtPKR(d.amount)}</td>
                  <td className="text-xs">{d.fromDate}</td>
                  <td className="text-xs">{d.toDate}</td>
                </tr>
              ))}
              {distRows.length > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={4} className="font-bold text-right">Total</td>
                  <td className="font-bold text-emerald-700">{fmtPKR(distRows.reduce((s: number, d: any) => s + d.amount, 0))}</td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="donations.receipts">
      <ReceiptDetail />
    </RequireAccess>
  );
}
