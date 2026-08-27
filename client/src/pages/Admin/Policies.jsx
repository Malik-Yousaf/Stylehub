import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";

function PolicyEditor({ policyKey, title }) {
  const { policies, savePolicy } = useApp();
  const [intro, setIntro] = useState("");
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState("");

  useEffect(() => {
    const p = policies[policyKey] || { intro: "", rules: [] };
    setIntro(p.intro || "");
    setRules(p.rules || []);
  }, [policies, policyKey]);

  function addRule() {
    if (!newRule.trim()) return;
    setRules((prev) => [...prev, newRule.trim()]);
    setNewRule("");
  }
  function updateRule(i, val) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? val : r)));
  }
  function removeRule(i) {
    setRules((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveRule(i, dir) {
    setRules((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function handleSave() {
    savePolicy(policyKey, { intro, rules });
  }

  return (
    <div className="chart-card" style={{ maxWidth: 680 }}>
      <h3 style={{ fontSize: 16, marginBottom: 16 }}>{title}</h3>

      <div className="field">
        <label>Intro text (shown at the top of the page)</label>
        <textarea
          rows="2"
          style={{ border: "1px solid var(--line)", padding: 10, borderRadius: 2, fontFamily: "inherit", fontSize: 13.5 }}
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
        />
      </div>

      <label style={{ fontSize: 12, fontWeight: 600, display: "block", margin: "18px 0 10px" }}>Rules</label>
      {rules.map((rule, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", width: 18, flexShrink: 0 }}>{i + 1}.</span>
          <input
            type="text"
            value={rule}
            onChange={(e) => updateRule(i, e.target.value)}
            style={{ flex: 1, border: "1px solid var(--line)", padding: "8px 10px", borderRadius: 2, fontSize: 13 }}
          />
          <button className="mini-btn" title="Move up" onClick={() => moveRule(i, -1)} disabled={i === 0}>↑</button>
          <button className="mini-btn" title="Move down" onClick={() => moveRule(i, 1)} disabled={i === rules.length - 1}>↓</button>
          <button className="mini-btn danger" onClick={() => removeRule(i)}>Delete</button>
        </div>
      ))}
      {rules.length === 0 && <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>No rules yet — add one below.</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <input
          type="text"
          placeholder="Add a new rule…"
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRule(); } }}
          style={{ flex: 1, border: "1px solid var(--line)", padding: "9px 11px", borderRadius: 2, fontSize: 13 }}
        />
        <button className="mini-btn" onClick={addRule}>+ Add</button>
      </div>

      <button className="btn btn-gold btn-sm" style={{ marginTop: 20 }} onClick={handleSave}>Save {title}</button>
    </div>
  );
}

export default function Policies() {
  return (
    <>
      <div className="admin-head"><h2>Policies</h2></div>
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 24 }}>
        These rules appear on the storefront's <code>/policy/returns</code> and <code>/policy/shipping</code> pages, linked from the footer.
      </p>
      <PolicyEditor policyKey="returns" title="Returns & Exchange Policy" />
      <div style={{ height: 24 }} />
      <PolicyEditor policyKey="shipping" title="Shipping Policy" />
    </>
  );
}
