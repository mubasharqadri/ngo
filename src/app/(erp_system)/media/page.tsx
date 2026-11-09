"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { UploadCloud, Trash2, Play, ImageIcon, Link2, Film } from "lucide-react";
import { PageHeader, Card, Badge, Modal, Field, LoadingTable, ConfirmDialog } from "@/components/ui/Breadcrumbs";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";

function MediaInner() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlModal, setUrlModal] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);
  const [urlForm, setUrlForm] = useState({ url: "", mediaType: "image", title: "", caption: "", linkType: "general", linkId: "" });
  const [meta, setMeta] = useState({ title: "", caption: "", linkType: "general", linkId: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["media-lib"],
    queryFn: async () => (await (await fetch("/api/media", { credentials: "include" })).json()).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["media-lib"] });

  const deleteMut = useMutation({
    mutationFn: async (m: any) => {
      const res = await fetch(`/api/media/${m.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.push({ title: "Media removed", tone: "info" }); },
  });

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", meta.title || file.name);
      fd.append("caption", meta.caption);
      fd.append("linkType", meta.linkType);
      if (meta.linkId) fd.append("linkId", meta.linkId);
      const res = await fetch("/api/media", { method: "POST", credentials: "include", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Upload failed");
      invalidate();
      toast.push({ title: "Uploaded", desc: file.name });
      setMeta({ title: "", caption: "", linkType: "general", linkId: "" });
    } catch (e) {
      toast.push({ title: "Upload failed", desc: e instanceof Error ? e.message : "Error", tone: "error" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const urlMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/media", {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...urlForm, linkId: urlForm.linkId ? Number(urlForm.linkId) : null }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
    },
    onSuccess: () => { invalidate(); setUrlModal(false); setUrlForm({ url: "", mediaType: "image", title: "", caption: "", linkType: "general", linkId: "" }); toast.push({ title: "Media added" }); },
    onError: (e: Error) => toast.push({ title: "Add failed", desc: e.message, tone: "error" }),
  });

  const linkLabel: Record<string, string> = { donee: "Donee impact", campaign: "Campaign", mission: "Mission", post: "Post", donor: "Donor", general: "General" };

  return (
    <div>
      <PageHeader
        title="Media Library"
        subtitle="Photos & videos — upload from field visits and attach to donees (impact), campaigns, missions or posts"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* File upload */}
        <Card
          className="lg:col-span-2 border-2 border-dashed border-gray-300 hover:border-emerald-400 transition cursor-pointer text-center py-10"
        >
          <div onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
            <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <div className="font-semibold mb-1">{uploading ? "Uploading…" : "Drop photo/video here or click to browse"}</div>
            <div className="text-xs text-gray-500">Stored on the server and served from /uploads</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 max-w-xl mx-auto text-left">
            <Field label="Title"><input className="input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></Field>
            <Field label="Attach to">
              <select className="input" value={meta.linkType} onChange={(e) => setMeta({ ...meta, linkType: e.target.value })}>
                <option value="general">General</option><option value="donee">Donee (impact)</option><option value="campaign">Campaign</option><option value="mission">Mission</option><option value="post">Post</option>
              </select>
            </Field>
            <Field label={`${meta.linkType === "general" ? "—" : meta.linkType} ID`}>
              <input className="input" type="number" value={meta.linkId} onChange={(e) => setMeta({ ...meta, linkId: e.target.value })} disabled={meta.linkType === "general"} placeholder="#" />
            </Field>
            <Field label="Caption"><input className="input" value={meta.caption} onChange={(e) => setMeta({ ...meta, caption: e.target.value })} /></Field>
          </div>
        </Card>

        {/* URL add */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2"><Link2 className="w-4 h-4 text-emerald-600" /><div className="font-semibold">Add from URL</div></div>
            <p className="text-xs text-gray-500 mb-4">Paste a hosted photo/video URL (YouTube, drive, CDN…).</p>
          </div>
          <button className="btn btn-ghost w-full justify-center" onClick={() => setUrlModal(true)}><Film className="w-4 h-4" /> Add media URL</button>
        </Card>
      </div>

      {isLoading && <LoadingTable rows={4} cols={4} />}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {data.map((m: any) => (
            <div key={m.id} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="aspect-square bg-gray-100 relative">
                {m.mediaType === "video" ? (
                  <>
                    <video src={m.url} muted preload="metadata" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20"><div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-4 h-4 text-gray-800 ml-0.5" /></div></div>
                  </>
                ) : (
                  <img src={m.url} alt={m.title ?? ""} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold truncate">{m.title ?? "(untitled)"}</div>
                <div className="flex items-center justify-between mt-1.5">
                  <Badge tone={m.linkType === "donee" ? "rose" : m.linkType === "mission" ? "sky" : m.linkType === "campaign" ? "amber" : "slate"}>
                    {linkLabel[m.linkType] ?? m.linkType}{m.linkId ? ` #${m.linkId}` : ""}
                  </Badge>
                  <button className="p-1 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition" onClick={() => setDeleting(m)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-16">
              <ImageIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              No media yet — upload your first field photo or video.
            </div>
          )}
        </div>
      )}

      <Modal open={urlModal} onClose={() => setUrlModal(false)} title="Add media from URL" size="md"
        footer={<><button className="btn btn-ghost" onClick={() => setUrlModal(false)}>Cancel</button>
          <button className="btn btn-primary" disabled={urlMut.isPending || !urlForm.url} onClick={() => urlMut.mutate()}>{urlMut.isPending ? "Adding..." : "Add media"}</button></>}>
        <div className="space-y-4">
          <Field label="URL" required><input className="input" value={urlForm.url} onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })} placeholder="https://…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className="input" value={urlForm.mediaType} onChange={(e) => setUrlForm({ ...urlForm, mediaType: e.target.value })}>
                <option value="image">Image</option><option value="video">Video</option>
              </select>
            </Field>
            <Field label="Attach to">
              <select className="input" value={urlForm.linkType} onChange={(e) => setUrlForm({ ...urlForm, linkType: e.target.value })}>
                <option value="general">General</option><option value="donee">Donee (impact)</option><option value="campaign">Campaign</option><option value="mission">Mission</option><option value="post">Post</option>
              </select>
            </Field>
            <Field label="Title"><input className="input" value={urlForm.title} onChange={(e) => setUrlForm({ ...urlForm, title: e.target.value })} /></Field>
            <Field label="Linked ID"><input className="input" type="number" value={urlForm.linkId} onChange={(e) => setUrlForm({ ...urlForm, linkId: e.target.value })} /></Field>
          </div>
          <Field label="Caption"><textarea className="input" rows={2} value={urlForm.caption} onChange={(e) => setUrlForm({ ...urlForm, caption: e.target.value })} /></Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting)}
        title="Remove media?" message="The media entry will be removed from the library." confirmText="Remove" danger loading={deleteMut.isPending} />
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="media">
      <MediaInner />
    </RequireAccess>
  );
}
