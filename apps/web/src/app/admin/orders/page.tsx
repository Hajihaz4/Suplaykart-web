import Link from "next/link";
import { adminListOrders, db, requireDefaultSupplier } from "@suplaykart/db";
import { OrderStatusBadge, formatDateTime, formatINR } from "@suplaykart/ui";
import { AdminPageHeader, DataTable, Td } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const supplier = await requireDefaultSupplier(db);
  const orders = await adminListOrders(db, supplier.id, 200);

  return (
    <>
      <AdminPageHeader title="Orders" description={`${orders.length} orders`} />
      <div className="p-4 md:p-6">
        <DataTable
          cols={["Order", "Customer", "Payment", "Status", "Total", "Placed"]}
          empty={orders.length === 0}
        >
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-surface-alt">
              <Td>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="font-bold text-brand"
                >
                  {o.orderNumber}
                </Link>
              </Td>
              <Td>
                {o.customerName ?? "—"}
                <div className="text-2xs text-muted">{o.customerPhone}</div>
              </Td>
              <Td className="text-muted">
                {o.paymentMethod === "cod" ? "COD" : "UPI on delivery"}
              </Td>
              <Td>
                <OrderStatusBadge status={o.status} />
              </Td>
              <Td className="font-semibold">{formatINR(o.totalAmount)}</Td>
              <Td className="text-muted">{formatDateTime(o.placedAt)}</Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
