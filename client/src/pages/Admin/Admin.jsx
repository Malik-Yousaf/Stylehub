import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import Overview from "./Overview.jsx";
import Products from "./Products.jsx";
import Orders from "./Orders.jsx";
import Customers from "./Customers.jsx";
import Settings from "./Settings.jsx";
import Faqs from "./Faqs.jsx";
import Policies from "./Policies.jsx";
import Banner from "./Banner.jsx";

const TABS = [
  { id: "overview", label: "📊 Sales Overview" },
  { id: "products", label: "👕 Products" },
  { id: "banner", label: "🖼️ Banner" },
  { id: "orders", label: "📦 Orders" },
  { id: "customers", label: "👥 Customers" },
  { id: "faqs", label: "❓ FAQs" },
  { id: "policies", label: "📜 Policies" },
  { id: "settings", label: "⚙️ Settings" }
];

export default function Admin() {
  const [tab, setTab] = useState("overview");
  const { orders, refreshOrders, showToast } = useApp();
  const knownOrderIds = useRef(null); // null until first load, so we don't "alert" for orders that already existed

  const pendingCount = orders.filter((o) => o.status === "processing").length;

  // Poll for new orders every 15s while the admin panel is open, so a new
  // order placed from another tab/device/customer shows up without a
  // manual refresh — and gives a toast + browser-tab flash when it does.
  useEffect(() => {
    if (knownOrderIds.current === null) {
      knownOrderIds.current = new Set(orders.map((o) => o.id));
    }
  }, [orders]);

  useEffect(() => {
    const originalTitle = document.title;
    const interval = setInterval(async () => {
      const fresh = await refreshOrders();
      if (!fresh || !knownOrderIds.current) return;
      const newOnes = fresh.filter((o) => !knownOrderIds.current.has(o.id));
      if (newOnes.length > 0) {
        showToast(newOnes.length === 1 ? `New order placed — ${newOnes[0].id}` : `${newOnes.length} new orders placed`);
        knownOrderIds.current = new Set(fresh.map((o) => o.id));
        document.title = "🔔 New Order — " + originalTitle;
        setTimeout(() => { document.title = originalTitle; }, 6000);
      }
    }, 15000);
    return () => { clearInterval(interval); document.title = originalTitle; };
  }, [refreshOrders, showToast]);

  return (
    <div className="page active" id="page-admin">
      <div className="admin-shell">
        <div className="admin-side">
          <div className="alogo">StyleHub</div>
          <span className="arole">Admin Dashboard</span>
          <Link to="/" style={{ display: "block", fontSize: 12, color: "var(--gold-bright)", margin: "-16px 10px 20px", textDecoration: "underline" }}>← View Storefront</Link>
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === "orders" && pendingCount > 0 && (
                <span style={{ marginLeft: "auto", background: "var(--gold-bright)", color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 7px" }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="admin-main">
          {tab === "overview" && <Overview />}
          {tab === "products" && <Products />}
          {tab === "banner" && <Banner />}
          {tab === "orders" && <Orders />}
          {tab === "customers" && <Customers />}
          {tab === "faqs" && <Faqs />}
          {tab === "policies" && <Policies />}
          {tab === "settings" && <Settings />}
        </div>
      </div>
    </div>
  );
}
