import React from "react";
import { useApp } from "../../context/AppContext";
import { fmt } from "../../utils";

export default function Customers() {
  const { customers } = useApp();
  return (
    <>
      <div className="admin-head"><h2>Customers</h2></div>
      <div className="table-scroll">
      <table className="admin-table">
        <tbody>
          <tr><th>Name</th><th>Email</th><th>Orders</th><th>Total Spent</th></tr>
          {customers.map((c, i) => (
            <tr key={i}>
              <td>{c.name}</td><td>{c.email}</td><td>{c.orders}</td>
              <td style={{ fontFamily: "var(--font-mono)" }}>{fmt(c.spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
