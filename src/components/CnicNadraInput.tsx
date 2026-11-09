"use client";
import { useState } from "react";
import { Fingerprint, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export type NadraRecord = { cnic: string; name: string; fatherName: string | null; dateOfBirth: string | null; gender: string | null; address: string | null };

/**
 * CNIC input with a "Verify (NADRA)" button. When the CNIC is found in the
 * (simulated) NADRA database, the identity fields are auto-filled; otherwise
 * the officer simply moves on to the next column.
 */
export function CnicNadraInput({
  value,
  verified,
  onValue,
  onVerified,
}: {
  value: string;
  verified: boolean;
  onValue: (v: string) => void;
  onVerified: (rec: NadraRecord | null) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<"found" | "notfound" | null>(verified ? "found" : null);

  async function verify() {
    if (!value.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch(`/api/nadra/verify?cnic=${encodeURIComponent(value.trim())}`, { credentials: "include" });
      if (res.ok) {
        const rec = (await res.json()).data as NadraRecord;
        setResult("found");
        onVerified(rec);
      } else {
        setResult("notfound");
        onVerified(null);
      }
    } catch {
      setResult("notfound");
      onVerified(null);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Fingerprint className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="35201-1234567-8"
            value={value}
            onChange={(e) => { onValue(e.target.value); setResult(null); }}
          />
        </div>
        <button type="button" className="btn btn-ghost shrink-0" onClick={verify} disabled={checking || !value.trim()}>
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
          {checking ? "Checking…" : "Verify (NADRA)"}
        </button>
      </div>
      {result === "found" && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" /> CNIC verified — identity fields auto-filled from NADRA
        </div>
      )}
      {result === "notfound" && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <XCircle className="w-3.5 h-3.5" /> Not found in NADRA database — continue to the next field
        </div>
      )}
    </div>
  );
}
