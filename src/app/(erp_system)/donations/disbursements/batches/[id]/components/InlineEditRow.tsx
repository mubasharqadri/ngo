"use client";
import { useState } from "react";
export function InlineEditRow({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return <input className="input" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onSave(v)} />;
}
