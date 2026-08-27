import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Faq() {
  const { faqs } = useApp();
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const list = faqs
      .filter((f) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const map = {};
    list.forEach((f) => {
      const cat = f.category || "General";
      if (!map[cat]) map[cat] = [];
      map[cat].push(f);
    });
    return map;
  }, [faqs, search]);

  const categories = Object.keys(grouped);

  return (
    <div className="page active" id="page-faq">
      <div className="pageheader">
        <div className="wrap">
          <div className="crumb"><Link to="/">Home</Link> / FAQs</div>
          <h1>Frequently Asked Questions</h1>
        </div>
      </div>
      <section>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="search-inline" style={{ marginBottom: 36, maxWidth: 420 }}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search FAQs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {categories.length === 0 && (
            <p style={{ color: "var(--muted)" }}>No FAQs match your search.</p>
          )}

          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 36 }}>
              <h3 style={{ fontSize: 15, marginBottom: 14, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gold-bright)" }}>{cat}</h3>
              {grouped[cat].map((f) => {
                const open = openId === f.id;
                return (
                  <div key={f.id} className="faq-item" style={{ borderBottom: "1px solid var(--line)" }}>
                    <button
                      onClick={() => setOpenId(open ? null : f.id)}
                      style={{
                        width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
                        padding: "16px 4px", display: "flex", justifyContent: "space-between", alignItems: "center",
                        fontSize: 14.5, fontWeight: 600, gap: 12
                      }}
                    >
                      <span>{f.question}</span>
                      <span style={{ fontSize: 18, flexShrink: 0, transition: "transform .2s", transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                    </button>
                    {open && (
                      <p style={{ padding: "0 4px 18px", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.8 }}>{f.answer}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{ textAlign: "center", marginTop: 40, padding: "28px 20px", background: "var(--bg-alt, #f7f6f3)", borderRadius: 4 }}>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 12 }}>Still have a question?</p>
            <Link to="/" className="btn btn-outline btn-sm">Contact us via WhatsApp</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
