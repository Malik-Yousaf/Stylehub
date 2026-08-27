import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { fmt, starsHtml } from "../utils";

export default function ProductCard({ p }) {
  const { wishlist, toggleWishlist, addToCart, showToast } = useApp();
  const navigate = useNavigate();
  const inWish = wishlist.has(p.id);

  function quickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    addToCart(p.id, p.sizes[0], p.colors[0], 1);
    showToast("Added to bag");
  }
  function wish(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(p.id);
  }

  return (
    <a href="#" className="pcard" onClick={(e) => { e.preventDefault(); navigate("/product/" + p.id); }}>
      <div className={"pcard-img" + (p.stock === 0 ? " is-oos" : "")} style={{ backgroundImage: `url('${p.img}')` }}>
        <div className="tags">
          {p.stock === 0 && <span className="tag-oos">Out of Stock</span>}
          {p.stock !== 0 && p.badge === "new" && <span className="tag-new">New</span>}
          {p.stock !== 0 && p.badge === "sale" && <span className="tag-sale">Sale</span>}
        </div>
        <button className={"wish" + (inWish ? " active" : "")} onClick={wish}>{inWish ? "♥" : "♡"}</button>
        {p.stock !== 0 && <button className="quickadd" onClick={quickAdd}>+ Quick Add</button>}
      </div>
      <div className="pcard-cat">{p.cat}</div>
      <div className="pcard-name">{p.name}</div>
      <div className="pcard-price">
        <span>{fmt(p.price)}</span>
        {p.was ? <span className="was">{fmt(p.was)}</span> : null}
      </div>
      <div className="pcard-stars">
        {starsHtml(p.rating)} <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>({p.reviews})</span>
      </div>
      <div className="swatches">
        {p.colors.map((c, i) => <span key={i} className="swatch" style={{ background: c }}></span>)}
      </div>
    </a>
  );
}
