"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Breadcrumbs";
import { downloadCSV } from "@/lib/exports";
import { useToast } from "@/components/ui/toast";

type ImportField = { key: string; label: string; type?: string; required?: boolean };

/**
 * CSV import modal: template download → file parse → preview → upload (bulk POST).
 */
export function ImportModal({
  open,
  onClose,
  api,
  fields,
  title,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  api: string;
  fields: ImportField[];
  title: string;
  onDone?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[]; total: number } | null>(null);

  const importFields = fields.filter((f) => f.key !== "id" && f.key !== "createdAt" && f.key !== "passwordHash");

  const reset = () => {
    setRows([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const parseFile = async (file: File) => {
    const Papa = (await import("papaparse")).default;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed = (res.data as Record<string, string>[]).map((r) => {
          const o: Record<string, unknown> = {};
          for (const f of importFields) {
            const raw = r[f.key] ?? r[f.label] ?? "";
            const v = String(raw).trim();
            if (v === "") { o[f.key] = null; continue; }
            if (f.type === "number") o[f.key] = Number(v);
            else if (f.type === "boolean") o[f.key] = /^(true|yes|1)$/i.test(v);
            else o[f.key] = v;
          }
          return o;
        });
        setRows(parsed);
        setFileName(file.name);
        setResult(null);
      },
      error: () => toast.push({ title: "Parse failed", desc: "Could not read the CSV file.", tone: "error" }),
    });
  };

  const upload = async () => {
    setUploading(true);
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(rows),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Import failed");
      setResult(j.data);
      toast.push({
        title: `Imported ${j.data.imported} of ${j.data.total} rows`,
        desc: j.data.errors?.length ? `${j.data.errors.length} rows failed` : "All rows imported",
        tone: j.data.errors?.length ? "info" : "success",
      });
      onDone?.();
    } catch (e) {
      toast.push({ title: "Import failed", desc: e instanceof Error ? e.message : "Error", tone: "error" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Import ${title} from CSV`}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={close}>{result ? "Close" : "Cancel"}</button>
          {!result && (
            <button className="btn btn-primary" disabled={!rows.length || uploading} onClick={upload}>
              <UploadCloud className="w-4 h-4" /> {uploading ? "Importing..." : `Import ${rows.length || ""} rows`}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Step 1: template */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-sm font-medium">1. Download the template</div>
              <div className="text-xs text-gray-500">Columns: {importFields.map((f) => f.key).join(", ")}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() =>
              downloadCSV(
                `${title.toLowerCase().replace(/\s+/g, "-")}-template`,
                importFields.map((f) => ({ key: f.key, label: f.key })),
                []
              )
            }
          >
            Download CSV template
          </button>
        </div>

        {/* Step 2: file pick */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) parseFile(f);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parseFile(f);
            }}
          />
          <UploadCloud className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <div className="text-sm font-medium">{fileName ? `2. Loaded: ${fileName}` : "2. Drop your CSV here or click to browse"}</div>
          {rows.length > 0 && !result && <div className="text-xs text-emerald-700 mt-1">{rows.length} rows ready to import</div>}
        </div>

        {/* Step 3: preview */}
        {rows.length > 0 && !result && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5 uppercase">3. Preview (first 5 rows)</div>
            <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-44 overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>{importFields.map((f) => <th key={f.key}>{f.key}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>{importFields.map((f) => <td key={f.key}>{r[f.key] === null || r[f.key] === undefined ? "" : String(r[f.key])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`p-4 rounded-lg border ${result.errors.length ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
            <div className="flex items-center gap-2 font-semibold text-sm mb-1">
              {result.errors.length ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              Imported {result.imported} of {result.total} rows
            </div>
            {result.errors.length > 0 && (
              <ul className="text-xs text-amber-800 mt-2 space-y-0.5 max-h-24 overflow-y-auto list-disc pl-4">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
