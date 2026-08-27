import React, { useState } from "react";
import { useApp } from "../../context/AppContext";

export default function Banner() {
  const { heroSlides, addHeroSlide, editHeroSlide, deleteHeroSlide, showToast } = useApp();

  const [formOpen, setFormOpen] = useState(false);
  const [eyebrow, setEyebrow] = useState("");
  const [title, setTitle] = useState("");
  const [copy, setCopy] = useState("");
  const [cta, setCta] = useState("Shop Now");
  const [tag, setTag] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [efEyebrow, setEfEyebrow] = useState("");
  const [efTitle, setEfTitle] = useState("");
  const [efCopy, setEfCopy] = useState("");
  const [efCta, setEfCta] = useState("");
  const [efTag, setEfTag] = useState("");
  const [efPrice, setEfPrice] = useState("");
  const [efFile, setEfFile] = useState(null);
  const [efPreview, setEfPreview] = useState("");

  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
    if (!f) { setPreview(""); return; }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  }

  function onEfFileChange(e) {
    const f = e.target.files && e.target.files[0];
    setEfFile(f || null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setEfPreview(reader.result);
    reader.readAsDataURL(f);
  }

  function resetForm() {
    setEyebrow(""); setTitle(""); setCopy(""); setCta("Shop Now"); setTag(""); setPrice(""); setFile(null); setPreview("");
  }

  async function handleAdd() {
    if (!title.trim() || !copy.trim()) {
      showToast("Enter at least a headline and description");
      return;
    }
    const saved = await addHeroSlide({
      eyebrow: eyebrow.trim(), title: title.trim(), copy: copy.trim(),
      cta: cta.trim() || "Shop Now", tag: tag.trim(), price: price.trim(), file
    });
    if (saved) { setFormOpen(false); resetForm(); }
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEfEyebrow(s.eyebrow || "");
    setEfTitle(s.title || "");
    setEfCopy(s.copy || "");
    setEfCta(s.cta || "");
    setEfTag(s.tag || "");
    setEfPrice(s.price || "");
    setEfFile(null);
    setEfPreview(s.img || "");
  }

  async function handleSaveEdit(id) {
    if (!efTitle.trim() || !efCopy.trim()) {
      showToast("Enter at least a headline and description");
      return;
    }
    const saved = await editHeroSlide(id, {
      eyebrow: efEyebrow.trim(), title: efTitle.trim(), copy: efCopy.trim(),
      cta: efCta.trim() || "Shop Now", tag: efTag.trim(), price: efPrice.trim(), file: efFile
    });
    if (saved) setEditingId(null);
  }

  const sorted = [...heroSlides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <>
      <div className="admin-head"><h2>Homepage Banner</h2><button className="btn btn-gold btn-sm" onClick={() => setFormOpen((o) => !o)}>+ Add Slide</button></div>
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 20 }}>
        This is the big rotating banner at the top of the homepage. Wrap a word in <code>&lt;em&gt;text&lt;/em&gt;</code> inside the headline to highlight it in gold, like the current slides do.
      </p>

      {formOpen && (
        <div className="add-form" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <input type="text" placeholder="Eyebrow label (e.g. Limited Time)" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} />
          <input type="text" placeholder="Corner tag (e.g. Up to 30% Off)" value={tag} onChange={(e) => setTag(e.target.value)} />
          <input
            type="text"
            placeholder="Headline — wrap a word in <em></em> to highlight it in gold"
            style={{ gridColumn: "1/-1" }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            rows="2"
            placeholder="Description text"
            style={{ gridColumn: "1/-1", border: "1px solid var(--line)", padding: 9, borderRadius: 2, fontFamily: "inherit", fontSize: 12.5 }}
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
          />
          <input type="text" placeholder="Button text (e.g. Shop the Sale)" value={cta} onChange={(e) => setCta(e.target.value)} />
          <input type="text" placeholder="Price label (e.g. From Rs. 4,200)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Banner photo:</label>
            <input type="file" accept="image/*" onChange={onFileChange} />
            {preview && <img src={preview} style={{ width: 60, height: 75, objectFit: "cover", borderRadius: 2, border: "1px solid var(--line)" }} />}
          </div>
          <button className="btn btn-sm btn-gold" style={{ gridColumn: "1/-1" }} onClick={handleAdd}>Save Slide</button>
        </div>
      )}

      {sorted.length === 0 && <p style={{ color: "var(--muted)" }}>No banner slides yet — add one above.</p>}

      {sorted.map((s) => (
        <div key={s.id} className="chart-card" style={{ marginBottom: 16 }}>
          {editingId === s.id ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="form-grid">
                <input type="text" placeholder="Eyebrow label" value={efEyebrow} onChange={(e) => setEfEyebrow(e.target.value)} />
                <input type="text" placeholder="Corner tag" value={efTag} onChange={(e) => setEfTag(e.target.value)} />
              </div>
              <input type="text" placeholder="Headline" value={efTitle} onChange={(e) => setEfTitle(e.target.value)} />
              <textarea
                rows="2"
                style={{ border: "1px solid var(--line)", padding: 10, borderRadius: 2, fontFamily: "inherit", fontSize: 13.5 }}
                value={efCopy}
                onChange={(e) => setEfCopy(e.target.value)}
              />
              <div className="form-grid">
                <input type="text" placeholder="Button text" value={efCta} onChange={(e) => setEfCta(e.target.value)} />
                <input type="text" placeholder="Price label" value={efPrice} onChange={(e) => setEfPrice(e.target.value)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Banner photo:</label>
                <input type="file" accept="image/*" onChange={onEfFileChange} />
                {efPreview && <img src={efPreview} style={{ width: 60, height: 75, objectFit: "cover", borderRadius: 2, border: "1px solid var(--line)" }} />}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="mini-btn" onClick={() => handleSaveEdit(s.id)}>Save</button>
                <button className="mini-btn" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div style={{ display: "flex", gap: 14 }}>
                {s.img && <img src={s.img} style={{ width: 60, height: 75, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />}
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--gold-bright)", textTransform: "uppercase", marginBottom: 6 }}>{s.eyebrow}</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: s.title }} />
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>{s.copy}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Button: "{s.cta}" · Tag: "{s.tag}" · Price label: "{s.price}"</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button className="mini-btn" onClick={() => startEdit(s)}>Edit</button>
                <button className="mini-btn danger" onClick={() => deleteHeroSlide(s.id)}>Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <p style={{ fontSize: 11.5, color: "var(--muted)" }}>Changes here are saved to <code>data.json</code> and appear immediately on the homepage.</p>
    </>
  );
}
