import React from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";

const META = {
  returns: { title: "Returns & Exchanges", crumb: "Returns & Exchanges" },
  shipping: { title: "Shipping Info", crumb: "Shipping Info" }
};

export default function Policy() {
  const { type } = useParams(); // "returns" | "shipping"
  const { policies } = useApp();
  const meta = META[type] || META.returns;
  const policy = policies[type] || { intro: "", rules: [] };

  return (
    <div className="page active" id="page-policy">
      <div className="pageheader">
        <div className="wrap">
          <div className="crumb"><Link to="/">Home</Link> / {meta.crumb}</div>
          <h1>{meta.title}</h1>
        </div>
      </div>
      <section>
        <div className="wrap" style={{ maxWidth: 720 }}>
          {policy.intro && (
            <p style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.8, marginBottom: 30 }}>{policy.intro}</p>
          )}

          {policy.rules.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>Policy details coming soon.</p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {policy.rules.map((rule, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex", gap: 14, alignItems: "flex-start",
                    padding: "16px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5, lineHeight: 1.7
                  }}
                >
                  <span style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: "var(--stone)",
                    color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1
                  }}>{i + 1}</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          )}

          <div style={{ textAlign: "center", marginTop: 40, padding: "28px 20px", background: "var(--stone)", borderRadius: 4 }}>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 12 }}>Have a specific question about your order?</p>
            <Link to="/faq" className="btn btn-outline btn-sm">Check our FAQs</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
