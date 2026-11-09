export function DisbursementTable({ items }: { items: any[] }) {
  return <table className="table"><thead><tr><th>Donee</th><th>Amount</th></tr></thead>
  <tbody>{items.map((it, i) => <tr key={i}><td>{it.doneeName}</td><td>{it.amount}</td></tr>)}</tbody></table>;
}
