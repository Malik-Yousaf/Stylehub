import React from "react";
import { useApp } from "../../context/AppContext";
import { WEEK_SALES } from "../../data/staticData";
import { fmt } from "../../utils";

export default function Overview() {
  const { orders, customers } = useApp();
  const totalRev = orders.reduce((s, o) => s + o.total, 0);
  const avgOrder = orders.length ? Math.round(totalRev / orders.length) : 0;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <>
      <div className="admin-head"><h2>Sales Overview</h2><span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--muted)" }}>Live from data.json</span></div>
      <div className="stat-grid">
        <div className="stat-card"><div className="slabel">Total Revenue</div><div className="sval">{fmt(totalRev)}</div><div className="sdelta">↑ 12.4% vs last week</div></div>
        <div className="stat-card"><div className="slabel">Orders</div><div className="sval">{orders.length}</div><div className="sdelta">↑ 3 new today</div></div>
        <div className="stat-card"><div className="slabel">Customers</div><div className="sval">{customers.length}</div><div className="sdelta">↑ 1 new this week</div></div>
        <div className="stat-card"><div className="slabel">Avg. Order Value</div><div className="sval">{fmt(avgOrder)}</div><div className="sdelta">↑ 4.1%</div></div>
      </div>
      <div className="chart-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ fontSize: 15 }}>Sales this week (thousand PKR)</h3></div>
        <div className="bar-chart">
          {WEEK_SALES.map((v, i) => (
            <div className="bar-col" key={i}>
              <div className="bar" style={{ height: v + "%" }}></div>
              <div className="blabel">{days[i]}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-card">
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Recent Orders</h3>
        <div className="table-scroll">
        <table className="admin-table">
          <tbody>
            <tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr>
            {orders.slice(0, 4).map((o) => (
              <tr key={o.id}>
                <td style={{ fontFamily: "var(--font-mono)" }}>{o.id}</td>
                <td>{o.customer}</td>
                <td>{fmt(o.total)}</td>
                <td><span className={"status-pill status-" + o.status}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
