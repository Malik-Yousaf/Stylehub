import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { fmt } from "../utils";

const STEPS = ["processing", "shipped", "delivered"];
const STEP_LABELS = { processing: "Processing", shipped: "Shipped", delivered: "Delivered" };

export default function TrackOrder() {
  const { findProduct } = useApp();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orderId.trim() || !email.trim()) {
      setError("Please enter both your Order ID and email address.");
      return;
    }
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const resp = await fetch(
        `/api/track/${encodeURIComponent(orderId.trim())}?email=${encodeURIComponent(email.trim())}`
      );
      const body = await resp.json();
      if (!resp.ok) {
        setError(body.error || "We couldn't find that order.");
      } else {
        setOrder(body);
      }
    } catch {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const statusIdx = order ? STEPS.indexOf((order.status || "processing").toLowerCase()) : -1;
  const isCancelled = order && (order.status || "").toLowerCase() === "cancelled";

  return (
    <div className="page active" id="page-track-order">
      <section>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <p className="eyebrow" style={{ justifyContent: "center" }}>Order Tracking</p>
          <h1 style={{ fontSize: 30, textAlign: "center", marginTop: 10 }}>Track your order</h1>
          <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center", marginTop: 8 }}>
            Enter your Order ID and the email address you used at checkout.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: 34, display: "grid", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}>Order ID</label>
              <input
                type="text"
                placeholder="e.g. SH-88231"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }}
              />
            </div>
            <button className="btn btn-gold" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "Searching…" : "Track Order"}
            </button>
          </form>

          {error && (
            <p style={{ color: "var(--danger, #c0392b)", fontSize: 13.5, textAlign: "center", marginTop: 18 }}>
              {error}
            </p>
          )}

          {order && !isCancelled && (
            <div className="confirm-summary" style={{ marginTop: 40 }}>
              <div className="order-no" style={{ textAlign: "center" }}>{order.id}</div>
              <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center" }}>
                Placed on {order.date} {order.eta ? <>· Estimated delivery: <strong>{order.eta}</strong></> : null}
              </p>

              <div className="tracker">
                {STEPS.map((step, idx) => (
                  <div
                    key={step}
                    className={"step" + (idx < statusIdx ? " done" : idx === statusIdx ? " current" : "")}
                  >
                    <div className="dot">{idx < statusIdx ? "✓" : idx + 1}</div>
                    <div className="label">{STEP_LABELS[step]}</div>
                  </div>
                ))}
              </div>

              <h3 style={{ fontSize: 15, marginTop: 24, marginBottom: 14 }}>Order Summary</h3>
              {(order.items || []).map((c, idx) => {
                const p = findProduct(c.productId);
                return (
                  <div className="mini-item" key={idx}>
                    {p && <div className="thumb" style={{ backgroundImage: `url('${p.img}')` }}></div>}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p ? p.name : c.productId}</div>
                      <div className="qtybadge">{c.size} · Qty {c.qty}</div>
                    </div>
                    {p && (
                      <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                        {fmt(p.price * c.qty)}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="summary-row total" style={{ marginTop: 10 }}>
                <span>Total</span>
                <span>{fmt(order.total)}</span>
              </div>
            </div>
          )}

          {order && isCancelled && (
            <div className="confirm-summary" style={{ marginTop: 40, textAlign: "center" }}>
              <div className="order-no">{order.id}</div>
              <p style={{ color: "var(--danger, #c0392b)", fontSize: 14, marginTop: 10 }}>
                This order has been cancelled. Contact us on WhatsApp if you have any questions.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
