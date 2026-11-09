"use client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, Phone, MapPin, Send, Check } from "lucide-react";

export default function Page() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [done, setDone] = useState(false);
  const m = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setDone(true);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Get in touch</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We'd love to hear from you. Whether you have questions, want to partner, or wish to donate — reach out.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          {[
            { icon: Mail, label: "Email", value: "info@shauoor.org" },
            { icon: Phone, label: "Phone", value: "+92 300 1234567" },
            { icon: MapPin, label: "Address", value: "12-B, Block F, Johar Town, Lahore" },
          ].map((c) => (
            <div key={c.label} className="card p-5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <c.icon className="w-5 h-5" />
              </div>
              <div className="text-xs text-gray-500 uppercase font-medium">{c.label}</div>
              <div className="font-medium">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="md:col-span-2">
          <div className="card p-6">
            <h2 className="font-semibold text-lg mb-4">Send us a message</h2>
            {done ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Message sent!</h3>
                <p className="text-sm text-gray-500 mb-4">Thank you — we'll get back to you soon.</p>
                <button className="btn btn-ghost" onClick={() => setDone(false)}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600 mb-1 block">Name *</span>
                    <input className="input" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600 mb-1 block">Email *</span>
                    <input type="email" className="input" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600 mb-1 block">Phone</span>
                    <input className="input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600 mb-1 block">Subject</span>
                    <input className="input" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">Message *</span>
                  <textarea className="input" rows={6} required value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} />
                </label>
                {m.isError && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">Failed to send. Please try again.</div>}
                <button type="submit" disabled={m.isPending} className="btn btn-primary py-2.5 px-6">
                  <Send className="w-4 h-4" /> {m.isPending ? "Sending..." : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
