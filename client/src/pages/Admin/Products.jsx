import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { CATEGORIES } from "../../data/staticData";
import { fmt } from "../../utils";
import EditProductModal from "./EditProductModal.jsx";
import ColorPicker from "./ColorPicker.jsx";

export default function Products() {
  const { products, addAdminProduct, deleteAdminProduct, setProductStock, showToast } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [npName, setNpName] = useState("");
  const [npCat, setNpCat] = useState(CATEGORIES[0]);
  const [npPrice, setNpPrice] = useState("");
  const [npStock, setNpStock] = useState("");
  const [npDesc, setNpDesc] = useState("");
  const [npColors, setNpColors] = useState(["#0b0b0c"]);
  const [npFile, setNpFile] = useState(null);
  const [npPreview, setNpPreview] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);

  function handleMarkInStock(p) {
    const input = window.prompt(`How many "${p.name}" are back in stock?`, "10");
    if (input === null) return;
    const qty = +input;
    if (!qty || qty < 1) { showToast("Enter a valid quantity"); return; }
    setProductStock(p.id, qty);
  }

  function onNpFileChange(e) {
    const f = e.target.files && e.target.files[0];
    setNpFile(f || null);
    if (!f) { setNpPreview(""); return; }
    const reader = new FileReader();
    reader.onload = () => setNpPreview(reader.result);
    reader.readAsDataURL(f);
  }

  async function handleAddProduct() {
    const name = npName.trim();
    const price = +npPrice;
    const stock = +npStock;
    if (!name || !price) { showToast("Enter a product name and price"); return; }
    const saved = await addAdminProduct({ name, cat: npCat, price, stock, file: npFile, colors: npColors, desc: npDesc.trim() });
    if (saved) {
      setFormOpen(false);
      setNpName(""); setNpCat(CATEGORIES[0]); setNpPrice(""); setNpStock(""); setNpDesc(""); setNpColors(["#0b0b0c"]); setNpFile(null); setNpPreview("");
    }
  }

  return (
    <>
      <div className="admin-head"><h2>Products</h2><button className="btn btn-gold btn-sm" onClick={() => setFormOpen((o) => !o)}>+ Add Product</button></div>
      {formOpen && (
        <div className="add-form">
          <input type="text" placeholder="Product name" value={npName} onChange={(e) => setNpName(e.target.value)} />
          <select value={npCat} onChange={(e) => setNpCat(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="number" placeholder="Price (Rs.)" value={npPrice} onChange={(e) => setNpPrice(e.target.value)} />
          <input type="number" placeholder="Stock qty" value={npStock} onChange={(e) => setNpStock(e.target.value)} />
          <textarea
            rows="2"
            placeholder="Description (shown on the product page)"
            style={{ gridColumn: "1/-1", border: "1px solid var(--line)", padding: 9, borderRadius: 2, fontFamily: "inherit", fontSize: 12.5 }}
            value={npDesc}
            onChange={(e) => setNpDesc(e.target.value)}
          />
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>Available colors</label>
            <ColorPicker colors={npColors} onChange={setNpColors} />
          </div>
          <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Product photo:</label>
            <input type="file" accept="image/*" onChange={onNpFileChange} />
            {npPreview && <img src={npPreview} style={{ width: 44, height: 54, objectFit: "cover", borderRadius: 2, border: "1px solid var(--line)" }} />}
          </div>
          <button className="btn btn-sm btn-gold" style={{ gridColumn: "1/-1" }} onClick={handleAddProduct}>Save Product</button>
        </div>
      )}
      <div className="table-scroll">
      <table className="admin-table">
        <tbody>
          <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
          {products.map((p) => (
            <tr key={p.id}>
              <td style={{ display: "flex", alignItems: "center", gap: 10 }}><img className="pthumb" src={p.img} />{p.name}</td>
              <td>{p.cat}</td>
              <td style={{ fontFamily: "var(--font-mono)" }}>{fmt(p.price)}</td>
              <td>{p.stock === 0 ? <span style={{ color: "var(--danger)" }}>Out of stock</span> : p.stock}</td>
              <td>
                <button className="mini-btn" onClick={() => setEditingProduct(p)}>Edit</button>
                {p.stock === 0 ? (
                  <button className="mini-btn" onClick={() => handleMarkInStock(p)}>Mark In Stock</button>
                ) : (
                  <button className="mini-btn danger" onClick={() => setProductStock(p.id, 0)}>Mark Out of Stock</button>
                )}
                <button className="mini-btn danger" onClick={() => deleteAdminProduct(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>Changes here are saved to <code>data.json</code> on the server — reload the storefront to see them live.</p>

      <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} />
    </>
  );
}
