"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Printer, FileDown, ReceiptText, Download } from "lucide-react";
import { exportExcel, exportPDF, downloadCSV, printA4, printThermal, type ExportColumn, type ExportRow } from "@/lib/exports";
import { useMe } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";

/**
 * Universal export bar: Excel, PDF, CSV, Print (A4), optional thermal print.
 */
export function ExportButtons({
  filename,
  title,
  subtitle,
  columns,
  rows,
  totalColumn,
  signatures,
  thermal,
  size = "sm",
  orientation,
}: {
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: ExportRow[];
  totalColumn?: string;
  signatures?: string[];
  thermal?: {
    lines: { label?: string; value: string; bold?: boolean; big?: boolean; center?: boolean }[];
    items?: { name: string; qty?: string; amount: string }[];
    footerNote?: string;
  };
  size?: "sm" | "md";
  /** print/PDF page orientation */
  orientation?: "portrait" | "landscape";
}) {
  const { data: me } = useMe();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (kind: string, fn: () => Promise<void> | void) => {
    setBusy(kind);
    try {
      await fn();
      if (kind !== "print" && kind !== "thermal") {
        toast.push({ title: "Export ready", desc: `${title} exported successfully.`, tone: "success" });
      }
    } catch (e) {
      toast.push({ title: "Export failed", desc: e instanceof Error ? e.message : "Unknown error", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const cls = size === "sm"
    ? "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition disabled:opacity-50"
    : "btn btn-ghost";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button className={cls} disabled={busy !== null || !rows.length} onClick={() => run("excel", () => exportExcel(filename, columns, rows))} title="Download Excel (.xlsx)">
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
      </button>
      <button className={cls} disabled={busy !== null || !rows.length} onClick={() => run("pdf", () => exportPDF(filename, title, columns, rows, me?.user.name, orientation))} title="Download PDF (A4)">
        <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF
      </button>
      <button className={cls} disabled={busy !== null || !rows.length} onClick={() => run("csv", () => downloadCSV(filename, columns, rows))} title="Download CSV">
        <FileDown className="w-3.5 h-3.5 text-sky-600" /> CSV
      </button>
      <button className={cls} disabled={busy !== null} onClick={() => run("print", () => printA4({ title, subtitle, columns, rows, totalColumn, generatedBy: me?.user.name, signatures, orientation }))} title={`Print on A4 (${orientation ?? "auto"})`}>
        <Printer className="w-3.5 h-3.5 text-gray-600" /> Print A4 {orientation ? `(${orientation === "landscape" ? "▭" : "▯"})` : ""}
      </button>
      {thermal && (
        <button className={cls} disabled={busy !== null} onClick={() => run("thermal", () => printThermal({ title, ...thermal }))} title="Print on 80mm thermal printer">
          <ReceiptText className="w-3.5 h-3.5 text-amber-600" /> Thermal
        </button>
      )}
      {busy && <Download className="w-3.5 h-3.5 text-gray-400 animate-pulse" />}
    </div>
  );
}
