import React from "react";
import { useApp } from "../../context/AppContext";
import { fmt } from "../../utils";

export default function Orders() {
  const { orders, updateOrderStatus } = useApp();
  return (
    <>
      <div className="admin-head"><h2>Orders</h2></div>
      <div className="table-scroll">
      <table className="admin-table">
        <tbody>
          <tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr>
          {orders.map((o) => (
            <tr key={o.id}>
              <td style={{ fontFamily: "var(--font-mono)" }}>{o.id}</td>
              <td>{o.customer}</td>
              <td>{o.date}</td>
              <td>{fmt(o.total)}</td>
              <td>
                <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
