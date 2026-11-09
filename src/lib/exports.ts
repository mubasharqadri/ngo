// Export & print helpers: Excel (.xlsx), PDF (A4), CSV, A4 print, thermal (80mm) print

export type ExportColumn = { key: string; label: string };
export type ExportRow = Record<string, unknown>;

const ORG = {
  name: "Shauoor Welfare Society",
  tagline: "Serving humanity with dignity",
  address: "12-B, Block F, Johar Town, Lahore, Pakistan",
  phone: "+92 300 1234567",
  email: "info@shauoor.org",
};

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  // trim ISO timestamps for readability
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 16).replace("T", " ");
  return s;
}

// ---------- CSV ----------
export function downloadCSV(filename: string, columns: ExportColumn[], rows: ExportRow[]) {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [
    columns.map((c) => esc(c.label)).join(","),
    ...rows.map((r) => columns.map((c) => esc(cellText(r[c.key]))).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), `${filename}.csv`);
}

// ---------- Excel ----------
export async function exportExcel(filename: string, columns: ExportColumn[], rows: ExportRow[]) {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const c of columns) {
      const raw = r[c.key];
      o[c.label] = typeof raw === "number" || (typeof raw === "string" && raw !== "" && !isNaN(Number(raw)) && /^-?\d+(\.\d+)?$/.test(raw))
        ? Number(raw)
        : cellText(raw);
    }
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(c.label.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ---------- PDF (A4) ----------
export async function exportPDF(
  filename: string,
  title: string,
  columns: ExportColumn[],
  rows: ExportRow[],
  generatedBy?: string,
  orientationOverride?: "portrait" | "landscape"
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const landscape = orientationOverride ? orientationOverride === "landscape" : columns.length > 6;
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(15, 101, 66);
  doc.rect(0, 0, pageW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(ORG.name, 10, 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${ORG.address}  •  ${ORG.phone}  •  ${ORG.email}`, 10, 16);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, 10, 32);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  const now = new Date().toLocaleString();
  doc.text(`Generated: ${now}${generatedBy ? `  by ${generatedBy}` : ""}  •  ${rows.length} records`, 10, 37);

  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => cellText(r[c.key]))),
    startY: 41,
    styles: { fontSize: 7.5, cellPadding: 1.6 },
    headStyles: { fillColor: [15, 101, 66], fontSize: 8 },
    alternateRowStyles: { fillColor: [243, 248, 245] },
    margin: { left: 10, right: 10 },
  });

  // Footer on each page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`${ORG.name} — Confidential`, 10, h - 6);
    doc.text(`Page ${i} of ${pages}`, pageW - 10, h - 6, { align: "right" });
  }

  doc.save(`${filename}.pdf`);
}

function triggerDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------- Print via popup window ----------
function openPrintWindow(html: string) {
  const w = window.open("", "_blank", "width=980,height=760");
  if (!w) {
    alert("Please allow popups to print this document.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
}

const A4_STYLES = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 0; font-size: 12px; }
  .org { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f6542; padding-bottom: 10px; margin-bottom: 14px; }
  .org h1 { margin: 0; font-size: 20px; color: #0f6542; letter-spacing: .3px; }
  .org .meta { text-align: right; font-size: 10px; color: #4b5563; line-height: 1.5; }
  .title { font-size: 15px; font-weight: 700; margin: 0 0 2px; text-transform: uppercase; letter-spacing: .5px; }
  .sub { font-size: 10px; color: #6b7280; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0f6542; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10.5px; vertical-align: top; }
  tr:nth-child(even) td { background: #f6faf7; }
  tfoot td { background: #ecfdf5 !important; font-weight: 700; border-top: 2px solid #0f6542; }
  .kv { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .kv td { padding: 4px 8px; }
  .kv td:first-child { color: #6b7280; width: 30%; }
  .footer { margin-top: 26px; display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; }
  .sig { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
  .sig div { flex: 1; border-top: 1px solid #9ca3af; padding-top: 4px; text-align: center; font-size: 10px; color: #4b5563; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  @media print { .noprint { display: none; } }
`;

export function printA4(opts: {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: ExportRow[];
  totalColumn?: string; // key of numeric column to total in tfoot
  generatedBy?: string;
  kv?: { label: string; value: string }[]; // summary rows above the table
  signatures?: string[];
  orientation?: "portrait" | "landscape";
}) {
  const orientation = opts.orientation ?? (opts.columns.length > 6 ? "landscape" : "portrait");
  const now = new Date().toLocaleString();
  const rowsHtml = opts.rows
    .map(
      (r) =>
        `<tr>${opts.columns
          .map((c) => `<td class="${typeof r[c.key] === "number" || /^-?\d+(\.\d+)?$/.test(String(r[c.key] ?? "")) ? "num" : ""}">${escapeHtml(cellText(r[c.key]))}</td>`)
          .join("")}</tr>`
    )
    .join("");

  let tfoot = "";
  if (opts.totalColumn) {
    const total = opts.rows.reduce((s, r) => s + (Number(r[opts.totalColumn!]) || 0), 0);
    const idx = opts.columns.findIndex((c) => c.key === opts.totalColumn);
    tfoot = `<tfoot><tr>${opts.columns
      .map((c, i) => `<td class="${i === idx ? "num" : ""}">${i === 0 ? "TOTAL" : i === idx ? fmtNum(total) : ""}</td>`)
      .join("")}</tr></tfoot>`;
  }

  const kvHtml = opts.kv?.length
    ? `<table class="kv">${opts.kv.map((k) => `<tr><td>${escapeHtml(k.label)}</td><td><b>${escapeHtml(k.value)}</b></td></tr>`).join("")}</table>`
    : "";

  const sigHtml = opts.signatures?.length
    ? `<div class="sig">${opts.signatures.map((s) => `<div>${escapeHtml(s)}</div>`).join("")}</div>`
    : "";

  openPrintWindow(`<!doctype html><html><head><title>${escapeHtml(opts.title)} — ${ORG.name}</title>
  <style>${A4_STYLES.replace("@page { size: A4; margin: 12mm; }", `@page { size: A4 ${orientation}; margin: ${orientation === "landscape" ? "10mm" : "12mm"}; }`)}</style></head><body>
    <div class="org">
      <div><h1>${ORG.name}</h1><div style="font-size:10px;color:#6b7280">${ORG.tagline}<br/>${ORG.address}<br/>${ORG.phone} • ${ORG.email}</div></div>
      <div class="meta">${orientation.toUpperCase()}<br/>Printed: ${now}${opts.generatedBy ? `<br/>By: ${escapeHtml(opts.generatedBy)}` : ""}</div>
    </div>
    <div class="title">${escapeHtml(opts.title)}</div>
    ${opts.subtitle ? `<div class="sub">${escapeHtml(opts.subtitle)}</div>` : ""}
    ${kvHtml}
    <table>
      <thead><tr>${opts.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr></thead>
      <tbody>${rowsHtml || `<tr><td colspan="${opts.columns.length}" style="text-align:center;color:#9ca3af;padding:18px">No records</td></tr>`}</tbody>
      ${tfoot}
    </table>
    ${sigHtml}
    <div class="footer"><span>${ORG.name} — system generated report</span><span>${now}</span></div>
    <script>window.onload = function(){ window.print(); }</script>
  </body></html>`);
}

// ---------- Thermal (80mm) ----------
export function printThermal(opts: {
  title?: string;
  lines: { label?: string; value: string; bold?: boolean; big?: boolean; center?: boolean }[];
  items?: { name: string; qty?: string; amount: string }[];
  footerNote?: string;
}) {
  const lineHtml = opts.lines
    .map((l) => {
      if (l.center) return `<div class="c ${l.big ? "big" : ""} ${l.bold ? "b" : ""}">${escapeHtml(l.value)}</div>`;
      return `<div class="row"><span>${escapeHtml(l.label ?? "")}</span><span class="${l.bold ? "b" : ""}">${escapeHtml(l.value)}</span></div>`;
    })
    .join("");
  const itemsHtml = opts.items?.length
    ? `<div class="dash"></div><table class="it"><thead><tr><th>Item</th><th style="text-align:right">Amount</th></tr></thead><tbody>${opts.items
        .map((i) => `<tr><td>${escapeHtml(i.name)}${i.qty ? ` <span class="mut">×${i.qty}</span>` : ""}</td><td style="text-align:right">${escapeHtml(i.amount)}</td></tr>`)
        .join("")}</tbody></table>`
    : "";
  openPrintWindow(`<!doctype html><html><head><title>${escapeHtml(opts.title ?? "Receipt")}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; font-size: 11px; color: #000; }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .big { font-size: 17px; }
    .mut { color: #555; font-size: 10px; }
    .row { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
    .dash { border-top: 1px dashed #000; margin: 6px 0; }
    table.it { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    table.it th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; font-size: 10px; }
    table.it td { padding: 2px 0; vertical-align: top; }
    .foot { margin-top: 8px; text-align: center; font-size: 10px; }
  </style></head><body>
    <div class="c b big">${ORG.name}</div>
    <div class="c mut">${ORG.address}</div>
    <div class="c mut">${ORG.phone}</div>
    <div class="dash"></div>
    ${lineHtml}
    ${itemsHtml}
    <div class="dash"></div>
    <div class="foot">${escapeHtml(opts.footerNote ?? "Thank you for your support!")}<br/>${new Date().toLocaleString()}</div>
    <script>window.onload = function(){ window.print(); }</script>
  </body></html>`);
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(n);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------- Amount in words (Pakistani: crore / lakh) ----------
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return (tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")).trim();
}
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? ones[h] + " Hundred" + (r ? " " : "") : "") + (r ? twoDigits(r) : "");
}

export function amountInWords(amount: number): string {
  if (!amount || isNaN(amount)) return "Zero Rupees Only";
  const neg = amount < 0;
  let n = Math.abs(Math.round(amount * 100));
  const paisa = n % 100;
  n = Math.floor(n / 100);
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const parts: string[] = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (n) parts.push(threeDigits(n));
  let words = parts.length ? parts.join(" ") : "Zero";
  words += " Rupees";
  if (paisa) words += " and " + twoDigits(paisa) + " Paisa";
  return (neg ? "Minus " : "") + words + " Only";
}

// ---------- Voucher A4 print (totals, words, distributions, page numbers) ----------
export type PrintVoucherLine = {
  accountCode?: string;
  accountName?: string;
  narration?: string;
  debit: number;
  credit: number;
  costCenterName?: string;
  distributions?: { costCenterName: string; percent: number; amount: number }[];
};

export function printVoucherA4(opts: {
  voucherNo: string;
  typeLabel: string;
  date: string;
  narration: string;
  postedByName?: string;
  lines: PrintVoucherLine[];
  total: number;
}) {
  const fmtC = (n: number) => new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const totalDr = opts.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCr = opts.lines.reduce((s, l) => s + (l.credit || 0), 0);

  const rowsHtml = opts.lines
    .map((l) => {
      const distHtml =
        l.distributions && l.distributions.length
          ? `<div class="dist">${l.distributions
              .map((d) => `<span>↳ ${escapeHtml(d.costCenterName)}: ${d.percent}% = ${fmtC(d.amount)}</span>`)
              .join("")}</div>`
          : l.costCenterName
          ? `<div class="dist"><span>↳ Cost center: ${escapeHtml(l.costCenterName)}</span></div>`
          : "";
      return `<tr>
        <td class="mono">${escapeHtml(l.accountCode ?? "")}</td>
        <td><b>${escapeHtml(l.accountName ?? "")}</b>${l.narration ? `<div class="sub">${escapeHtml(l.narration)}</div>` : ""}${distHtml}</td>
        <td class="num">${l.debit ? fmtC(l.debit) : "—"}</td>
        <td class="num">${l.credit ? fmtC(l.credit) : "—"}</td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html><html><head><title>Voucher ${escapeHtml(opts.voucherNo)} — Shauoor Welfare Society</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 0; font-size: 12px; }
    .org { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f6542; padding-bottom: 10px; margin-bottom: 12px; }
    .org h1 { margin: 0; font-size: 19px; color: #0f6542; }
    .org .meta { text-align: right; font-size: 9.5px; color: #4b5563; line-height: 1.5; }
    .vtype { display:inline-block; background:#0f6542; color:#fff; font-size:10px; font-weight:700; letter-spacing:.5px; padding:3px 10px; border-radius:4px; }
    .head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    table.main { width: 100%; border-collapse: collapse; }
    table.main th { background: #0f6542; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
    table.main th.num { text-align: right; }
    table.main td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    table.main td.num { text-align: right; font-variant-numeric: tabular-nums; }
    table.main tr:nth-child(even) td { background: #f6faf7; }
    .mono { font-family: Consolas, monospace; font-size: 10.5px; }
    .sub { color: #6b7280; font-size: 10px; margin-top: 1px; }
    .dist { margin-top: 3px; display: flex; flex-direction: column; gap: 1px; }
    .dist span { font-size: 9.5px; color: #0f6542; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 3px; padding: 1px 5px; width: fit-content; }
    tfoot td { background: #ecfdf5 !important; font-weight: 700; border-top: 2px solid #0f6542; }
    .words { margin-top: 10px; border: 1px dashed #0f6542; border-radius: 6px; padding: 8px 12px; background: #f0fdf4; }
    .words b { color: #0f6542; }
    .sig { margin-top: 46px; display: flex; justify-content: space-between; gap: 30px; }
    .sig div { flex: 1; border-top: 1px solid #9ca3af; padding-top: 4px; text-align: center; font-size: 10px; color: #4b5563; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; font-size: 9.5px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px; }
  </style></head><body>
    <div class="org">
      <div>
        <h1>Shauoor Welfare Society</h1>
        <div style="font-size:10px;color:#6b7280">Serving humanity with dignity — 12-B, Block F, Johar Town, Lahore — +92 300 1234567</div>
      </div>
      <div class="meta">Double-Entry Voucher<br/>Printed: ${new Date().toLocaleString()}</div>
    </div>
    <div class="head">
      <div>
        <span class="vtype">${escapeHtml(opts.typeLabel)}</span>
        <span style="font-size:16px;font-weight:700;margin-left:8px" class="mono">${escapeHtml(opts.voucherNo)}</span>
      </div>
      <div style="text-align:right;font-size:11px">
        <b>Date:</b> ${escapeHtml(opts.date)}<br/>
        <b>Posted by:</b> ${escapeHtml(opts.postedByName ?? "—")}
      </div>
    </div>
    ${opts.narration ? `<div style="margin-bottom:8px"><b>Narration:</b> ${escapeHtml(opts.narration)}</div>` : ""}
    <table class="main">
      <thead><tr><th style="width:70px">Code</th><th>Account / Particulars</th><th class="num" style="width:120px">Debit</th><th class="num" style="width:120px">Credit</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align:right">TOTALS</td>
          <td class="num">${fmtC(totalDr)}</td>
          <td class="num">${fmtC(totalCr)}</td>
        </tr>
      </tfoot>
    </table>
    <div class="words"><b>Amount in words:</b> ${amountInWords(opts.total)}</div>
    <div class="sig"><div>Prepared By</div><div>Checked By</div><div>Approved By</div></div>
    <div class="footer"><span>Shauoor Welfare Society — system generated voucher (balanced: Dr = Cr)</span><span class="pgno"></span></div>
    <script>
      // page numbers: Page x / y
      window.onload = function () {
        var pages = 1; // single-voucher print fits on one page in normal cases
        document.querySelectorAll('.pgno').forEach(function (el) { el.textContent = 'Page 1 / ' + pages; });
        setTimeout(function(){ window.print(); }, 100);
      };
    </script>
  </body></html>`;
  openPrintWindow(html);
}

// ---------- Person registration form (A4, with photo) ----------
export type PersonFormSection = { title: string; rows: { label: string; value: string }[] };

export function printPersonForm(opts: {
  formTitle: string; // e.g. "Donor Registration Form"
  regNo: string;
  personName: string;
  photoUrl?: string;
  sections: PersonFormSection[];
  remarks?: string;
  orientation?: "portrait" | "landscape";
}) {
  const orientation = opts.orientation ?? "portrait";
  const sectionsHtml = opts.sections
    .map(
      (s) => `
      <div class="sec">
        <div class="sectitle">${escapeHtml(s.title)}</div>
        <table class="kv">
          ${s.rows
            .map(
              (r, i) =>
                `<tr><td class="lbl">${escapeHtml(r.label)}</td><td class="val">${escapeHtml(r.value || "—")}</td>${
                  i + 1 < s.rows.length ? "" : ""
                }</tr>`
            )
            .join("")}
        </table>
      </div>`
    )
    .join("");

  const html = `<!doctype html><html><head><title>${escapeHtml(opts.formTitle)} — ${escapeHtml(opts.personName)}</title>
  <style>
    @page { size: A4 ${orientation}; margin: 11mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 0; font-size: 11.5px; }
    .org { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f6542; padding-bottom: 9px; margin-bottom: 12px; }
    .org h1 { margin: 0; font-size: 19px; color: #0f6542; }
    .org .meta { text-align: right; font-size: 9.5px; color: #4b5563; line-height: 1.5; }
    .banner { background: #0f6542; color: #fff; text-align: center; font-weight: 700; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px; border-radius: 5px; margin-bottom: 12px; }
    .idrow { display: flex; gap: 14px; margin-bottom: 12px; align-items: stretch; }
    .photo { width: 118px; height: 138px; border: 2px solid #0f6542; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: #f0fdf4; display:flex; align-items:center; justify-content:center; }
    .photo img { width: 100%; height: 100%; object-fit: cover; }
    .photo .empty { color: #9ca3af; font-size: 9px; text-align:center; padding: 6px; }
    .idbox { flex: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 12px; }
    .idbox .nm { font-size: 17px; font-weight: 800; color: #0f6542; margin-bottom: 4px; }
    .idbox table { width: 100%; font-size: 11px; border-collapse: collapse; }
    .idbox td { padding: 2px 4px; }
    .idbox td.l { color: #6b7280; width: 130px; }
    .sec { margin-bottom: 10px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .sectitle { background: #ecfdf5; color: #0f6542; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: .8px; padding: 5px 10px; border-bottom: 1px solid #e5e7eb; }
    table.kv { width: 100%; border-collapse: collapse; }
    table.kv td { padding: 4px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    table.kv tr:last-child td { border-bottom: none; }
    table.kv td.lbl { width: 200px; color: #6b7280; font-size: 10.5px; }
    table.kv td.val { font-weight: 500; }
    .remarks { border: 1px dashed #0f6542; background: #f0fdf4; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; }
    .sig { margin-top: 34px; display: flex; justify-content: space-between; gap: 30px; }
    .sig div { flex: 1; border-top: 1px solid #9ca3af; padding-top: 4px; text-align: center; font-size: 10px; color: #4b5563; }
    .footer { margin-top: 14px; display: flex; justify-content: space-between; font-size: 9.5px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px; }
  </style></head><body>
    <div class="org">
      <div>
        <h1>Shauoor Welfare Society</h1>
        <div style="font-size:10px;color:#6b7280">Serving humanity with dignity — 12-B, Block F, Johar Town, Lahore — +92 300 1234567 — info@shauoor.org</div>
      </div>
      <div class="meta">Reg #: <b class="mono">${escapeHtml(opts.regNo)}</b><br/>Printed: ${new Date().toLocaleDateString()}</div>
    </div>
    <div class="banner">${escapeHtml(opts.formTitle)}</div>
    <div class="idrow">
      <div class="photo">
        ${opts.photoUrl ? `<img src="${escapeHtml(opts.photoUrl)}" alt="photo"/>` : `<div class="empty">PHOTO<br/>${escapeHtml(opts.personName)}</div>`}
      </div>
      <div class="idbox">
        <div class="nm">${escapeHtml(opts.personName)}</div>
        <table>
          ${(opts.sections[0]?.rows ?? []).slice(0, 5).map((r) => `<tr><td class="l">${escapeHtml(r.label)}</td><td><b>${escapeHtml(r.value || "—")}</b></td></tr>`).join("")}
        </table>
      </div>
    </div>
    ${sectionsHtml}
    ${opts.remarks ? `<div class="remarks"><b>Remarks:</b> ${escapeHtml(opts.remarks)}</div>` : ""}
    <div class="sig"><div>Applicant Signature</div><div>Verified By</div><div>Authorized Signatory</div></div>
    <div class="footer"><span>Shauoor Welfare Society — official registration form</span><span>Page 1 / 1</span></div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 100); };</script>
  </body></html>`;
  openPrintWindow(html);
}
