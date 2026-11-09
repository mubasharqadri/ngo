"use client";
export function PrintVoucher({ onPrint }: { onPrint?: () => void }) {
  return <button className="btn btn-ghost" onClick={() => (onPrint ? onPrint() : window.print())}>Print Voucher</button>;
}
