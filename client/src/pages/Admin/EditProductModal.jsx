import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import ColorPicker from "./ColorPicker.jsx";

export default function EditProductModal({ product, onClose }) {
  const { saveEditProduct, showToast } = useApp();
  const [name, setName] = useState("");
  const [cat, setCat] = useState("Men");
  const [stock, setStock] = useState(0);
  const [price, setPrice] = useState(0);
  const [was, setWas] = useState("");
  const [desc, setDesc] = useState("");
  const [colors, setColors] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setCat(product.cat);
    setStock(product.stock);
    setPrice(product.price);
    setWas(product.was || "");
    setDesc(product.desc || "");
    setColors(product.colors || []);
    setFile(null);
    setPreview(product.img);
  }, [product]);

  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  }

  async function handleSave() {
    if (!name.trim() || !price) return;
    if (!colors.length) {
      showToast("Please add at least one color before saving");
      return;
    }
    const patch = {
      name: name.trim(),
      cat,
      price: +price,
      was: was ? +was : null,
      stock: +stock,
      desc: desc.trim(),
      colors
    };
    const saved = await saveEditProduct(product.id, patch, file);
    if (saved) onClose();
  }

  if (!product) return null;

  return (
    <div className={"modal-backdrop" + (product ? " open" : "")}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>Edit Product</h3>
        <div className="field"><label>Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="form-grid">
          <div className="field">
            <label>Category</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option>Men</option><option>Women</option><option>Footwear</option><option>Accessories</option>
            </select>
          </div>
          <div className="field"><label>Stock qty</label><input type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
          <div className="field"><label>Price (Rs.)</label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="field"><label>Was-price (optional, for sale tag)</label><input type="number" value={was} onChange={(e) => setWas(e.target.value)} /></div>
        </div>
        <div className="field"><label>Description</label><textarea rows="3" style={{ border: "1px solid var(--line)", padding: 10, borderRadius: 2 }} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="field">
          <label>Available colors</label>
          <ColorPicker colors={colors} onChange={setColors} />
        </div>
        <div className="field">
          <label>Product photo</label>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <input type="file" accept="image/*" onChange={onFileChange} />
            {preview && <img src={preview} style={{ width: 50, height: 60, objectFit: "cover", borderRadius: 2, border: "1px solid var(--line)" }} />}
          </div>
        </div>
        <button className="btn btn-gold btn-block" onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  );
}
