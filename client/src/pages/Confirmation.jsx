import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { fmt } from "../utils";

export default function Confirmation() {
  const { lastOrder, findProduct } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!lastOrder) navigate("/");
  }, [lastOrder, navigate]);

  if (!lastOrder) return null;

  const payLabel = { cod: "Cash on Delivery", jazzcash: "JazzCash", easypaisa: "EasyPaisa" }[lastOrder.payment];

  return (
    <div className="page active" id="page-confirmation">
      <section>
        <div className="wrap">
          <div className="confirm-wrap">
            <div className="confirm-check">✓</div>
            <p className="eyebrow" style={{ justifyContent: "center" }}>Order confirmed</p>
            <h1 style={{ fontSize: 30, marginTop: 10 }}>Thank you, your order is on its way to being placed.</h1>
            <div className="order-no">{lastOrder.id}</div>
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Estimated delivery: <strong>{lastOrder.eta}</strong> · Paying via {payLabel}</p>
            <div className="tracker">
              <div className="step current"><div className="dot">1</div><div className="label">Processing</div></div>
              <div className="step"><div className="dot">2</div><div className="label">Shipped</div></div>
              <div className="step"><div className="dot">3</div><div className="label">Delivered</div></div>
            </div>
            <div className="confirm-summary">
              <h3 style={{ fontSize: 15, marginBottom: 14 }}>Order Summary</h3>
              {lastOrder.items.map((c, idx) => {
                const p = findProduct(c.productId);
                if (!p) return null;
                return (
                  <div className="mini-item" key={idx}>
                    <div className="thumb" style={{ backgroundImage: `url('${p.img}')` }}></div>
                    <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div><div className="qtybadge">{c.size} · Qty {c.qty}</div></div>
                    <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 13 }}>{fmt(p.price * c.qty)}</div>
                  </div>
                );
              })}
              <div className="summary-row total" style={{ marginTop: 10 }}><span>Total Paid</span><span>{fmt(lastOrder.total)}</span></div>
            </div>
            <div style={{ marginTop: 34, display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-gold" onClick={() => navigate("/shop")}>Continue Shopping</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
