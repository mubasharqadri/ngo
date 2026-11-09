import { Card } from "@/components/ui/Breadcrumbs";
export function BatchSummaryCards({ batch }: { batch: { totalAmount: number; count: number; fund: string; status: string } }) {
  return <div className="grid grid-cols-4 gap-3">
    <Card className="p-4"><div className="text-xs text-gray-500">Total</div><div className="font-semibold">PKR {batch.totalAmount}</div></Card>
    <Card className="p-4"><div className="text-xs text-gray-500">Count</div><div className="font-semibold">{batch.count}</div></Card>
    <Card className="p-4"><div className="text-xs text-gray-500">Fund</div><div className="font-semibold">{batch.fund}</div></Card>
    <Card className="p-4"><div className="text-xs text-gray-500">Status</div><div className="font-semibold">{batch.status}</div></Card>
  </div>;
}
