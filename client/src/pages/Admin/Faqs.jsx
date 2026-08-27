import React, { useState } from "react";
import { useApp } from "../../context/AppContext";

const DEFAULT_CATEGORIES = ["Shipping & Delivery", "Payment & Pricing", "Returns & Exchange", "Sizing & Product", "Order & Account", "General"];

export default function Faqs() {
  const { faqs, addFaq, editFaq, deleteFaq, showToast } = useApp();

  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editCategory, setEditCategory] = useState("");
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  async function handleAdd() {
    if (!question.trim() || !answer.trim()) {
      showToast("Enter both a question and an answer");
      return;
    }
    const saved = await addFaq({ category, question: question.trim(), answer: answer.trim() });
    if (saved) {
      setFormOpen(false);
      setCategory(DEFAULT_CATEGORIES[0]);
      setQuestion("");
      setAnswer("");
    }
  }

  function startEdit(f) {
    setEditingId(f.id);
    setEditCategory(f.category);
    setEditQuestion(f.question);
    setEditAnswer(f.answer);
  }

  async function handleSaveEdit(id) {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      showToast("Enter both a question and an answer");
      return;
    }
    const saved = await editFaq(id, { category: editCategory, question: editQuestion.trim(), answer: editAnswer.trim() });
    if (saved) setEditingId(null);
  }

  const grouped = {};
  [...faqs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).forEach((f) => {
    const cat = f.category || "General";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(f);
  });

  return (
    <>
      <div className="admin-head"><h2>FAQs</h2><button className="btn btn-gold btn-sm" onClick={() => setFormOpen((o) => !o)}>+ Add FAQ</button></div>

      {formOpen && (
        <div className="add-form" style={{ gridTemplateColumns: "1fr" }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {DEFAULT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="text" placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <textarea
            rows="3"
            placeholder="Answer"
            style={{ border: "1px solid var(--line)", padding: 10, borderRadius: 2, fontFamily: "inherit", fontSize: 13.5 }}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button className="btn btn-sm btn-gold" onClick={handleAdd}>Save FAQ</button>
        </div>
      )}

      {Object.keys(grouped).length === 0 && <p style={{ color: "var(--muted)" }}>No FAQs yet — add one above.</p>}

      {Object.keys(grouped).map((cat) => (
        <div key={cat} className="chart-card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gold-bright)", fontFamily: "var(--font-mono)" }}>{cat}</h3>
          {grouped[cat].map((f) => (
            <div key={f.id} style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}>
              {editingId === f.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                    {DEFAULT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input type="text" value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} />
                  <textarea
                    rows="3"
                    style={{ border: "1px solid var(--line)", padding: 10, borderRadius: 2, fontFamily: "inherit", fontSize: 13.5 }}
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="mini-btn" onClick={() => handleSaveEdit(f.id)}>Save</button>
                    <button className="mini-btn" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{f.question}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>{f.answer}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="mini-btn" onClick={() => startEdit(f)}>Edit</button>
                      <button className="mini-btn danger" onClick={() => deleteFaq(f.id)}>Delete</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
      <p style={{ fontSize: 11.5, color: "var(--muted)" }}>Changes here are saved to <code>data.json</code> and appear immediately on the storefront's FAQ page (<code>/faq</code>).</p>
    </>
  );
}
