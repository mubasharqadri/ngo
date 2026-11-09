"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, MapPin } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/Breadcrumbs";

/**
 * Area dropdown filtered by the selected city, with an inline
 * "add new area" flow that confirms with the user before creating.
 */
export function AreaSelect({ cityId, value, onChange }: { cityId: string | number | null; value: string; onChange: (id: string, name: string) => void }) {
  const [newArea, setNewArea] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const { data: areas } = useQuery({
    queryKey: ["areas", cityId, tick],
    enabled: !!cityId,
    staleTime: 30_000,
    queryFn: async () =>
      (await (await fetch(`/api/setup/areas?cityId=${cityId}&limit=500`, { credentials: "include" })).json()).data as { id: number; name: string }[],
  });

  const nameOf = (id: string) => (areas ?? []).find((a) => String(a.id) === id)?.name ?? "";

  async function createArea() {
    setBusy(true);
    try {
      const res = await fetch("/api/setup/areas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newArea.trim(), cityId: Number(cityId) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setTick((t) => t + 1);
      onChange(String(j.data.id), newArea.trim());
      setCreating(false);
      setNewArea("");
    } catch {
      /* surface via UI below */
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!cityId) {
    return <select className="input" disabled><option>Select city first</option></select>;
  }

  return (
    <div>
      {!creating ? (
        <select
          className="input"
          value={value}
          onChange={(e) => {
            if (e.target.value === "__new__") setCreating(true);
            else onChange(e.target.value, nameOf(e.target.value));
          }}
        >
          <option value="">— select area —</option>
          {(areas ?? []).map((a) => (
            <option key={a.id} value={String(a.id)}>{a.name}</option>
          ))}
          <option value="__new__">➕ Add new area…</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              autoFocus
              placeholder="Type new area name…"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newArea.trim()) setConfirming(true); }}
            />
          </div>
          <button type="button" className="btn btn-primary shrink-0" disabled={!newArea.trim() || busy} onClick={() => setConfirming(true)}>
            <Plus className="w-4 h-4" /> Add
          </button>
          <button type="button" className="btn btn-ghost shrink-0" onClick={() => { setCreating(false); setNewArea(""); }}>✕</button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={createArea}
        title="Create new area?"
        message={`"${newArea.trim()}" will be added to this city's area list and selected. Continue?`}
        confirmText={busy ? "Creating…" : "Yes, create area"}
        loading={busy}
      />
    </div>
  );
}
