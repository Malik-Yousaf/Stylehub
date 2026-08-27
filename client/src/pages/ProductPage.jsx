import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { REVIEWS_SAMPLE } from "../data/staticData";
import ProductCard from "../components/ProductCard.jsx";
import { fmt, starsHtml } from "../utils";

export default function ProductPage() {
  const { id } = useParams();
  const { findProduct, products, addToCart, showToast } = useApp();
  const navigate = useNavigate();
  const p = findProduct(+id);

  const [galleryImg, setGalleryImg] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [pdTab, setPdTab] = useState("desc");
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  useEffect(() => {
    if (!p) return;
    setGalleryImg(p.img);
    setSelectedColor(p.colors[0]);
    setSelectedSize(p.sizes[0]);
    setQty(1);
    setPdTab("desc");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [p]);

  if (!p) {
    return (
      <div className="page active"><div className="wrap" style={{ padding: "80px 0", textAlign: "center", color: "var(--muted)" }}>Product not found.</div></div>
    );
  }

  const related = products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);

  function handleAddToCart() {
    addToCart(p.id, selectedSize, selectedColor, qty);
    showToast("Added to bag");
  }
  function handleBuyNow() {
    addToCart(p.id, selectedSize, selectedColor, qty);
    navigate("/checkout");
  }

  return (
    <div className="page active" id="page-product">
      <div className="pageheader">
        <div className="wrap">
          <div className="crumb"><Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / <span>{p.name}</span></div>
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="product-layout">
            <div>
              <div className="gallery-main" style={{ backgroundImage: `url('${galleryImg}')` }}></div>
              <div className="gallery-thumbs">
                <div className={"gthumb" + (galleryImg === p.img ? " active" : "")} style={{ backgroundImage: `url('${p.img}')` }} onClick={() => setGalleryImg(p.img)}></div>
                <div className={"gthumb" + (galleryImg === p.img2 ? " active" : "")} style={{ backgroundImage: `url('${p.img2}')` }} onClick={() => setGalleryImg(p.img2)}></div>
              </div>
            </div>
            <div>
              <div className="pd-cat">{p.cat}</div>
              <h1 className="pd-title">{p.name}</h1>
              <div className="pd-rating"><span className="stars">{starsHtml(p.rating)}</span> {p.rating} · {p.reviews} reviews</div>
              <div className="pd-price">{fmt(p.price)}{p.was ? <span className="was">{fmt(p.was)}</span> : null}</div>
              <div className={"pd-stock " + (p.stock === 0 ? "low" : p.stock < 8 ? "low" : "in")}>
                {p.stock === 0 ? "Out of stock" : p.stock < 8 ? `Only ${p.stock} left in stock` : "In stock"}
              </div>
              <p className="pd-desc">{p.desc}</p>

              <div className="pd-option-row">
                <div className="label-row"><span>Color</span></div>
                <div className="pd-colors">
                  {p.colors.map((c) => (
                    <button key={c} className={"pd-color" + (c === selectedColor ? " selected" : "")} style={{ background: c }} onClick={() => setSelectedColor(c)}></button>
                  ))}
                </div>
              </div>

              <div className="pd-option-row">
                <div className="label-row"><span>Size</span><span className="sizechart-link" onClick={() => setSizeChartOpen(true)}>Size chart</span></div>
                <div className="pd-sizes">
                  {p.sizes.map((s) => (
                    <button key={s} className={"size-opt" + (s === selectedSize ? " selected" : "")} onClick={() => setSelectedSize(s)}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="pd-option-row">
                <div className="label-row"><span>Quantity</span></div>
                <div className="qty-stepper">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)}>+</button>
                </div>
              </div>

              <div className="pd-actions">
                <button className="btn btn-outline" disabled={p.stock === 0} onClick={handleAddToCart}>Add to Cart</button>
                <button className="btn btn-gold" disabled={p.stock === 0} onClick={handleBuyNow}>Buy Now</button>
              </div>
              <div className="pd-meta">
                <span>SKU: SH-{String(p.id).padStart(5, "0")}</span>
                <span>Category: {p.cat}</span>
                <span>Shipping: Rs. 200–350 depending on city, calculated at checkout</span>
              </div>
            </div>
          </div>

          <div className="pd-tabs">
            <button className={"pd-tab" + (pdTab === "desc" ? " active" : "")} onClick={() => setPdTab("desc")}>Description</button>
            <button className={"pd-tab" + (pdTab === "reviews" ? " active" : "")} onClick={() => setPdTab("reviews")}>Reviews</button>
            <button className={"pd-tab" + (pdTab === "shipping" ? " active" : "")} onClick={() => setPdTab("shipping")}>Shipping &amp; Returns</button>
          </div>
          <div className={"pd-tabpanel" + (pdTab === "desc" ? " active" : "")}>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--muted)" }}>{p.desc}</p>
            <ul style={{ marginTop: 16, fontSize: 13.5, color: "var(--muted)", lineHeight: 2, paddingLeft: 18, listStyle: "disc" }}>
              <li>Premium materials, made to last multiple seasons</li>
              <li>True to size — see size chart for exact measurements</li>
              <li>Care instructions included with every order</li>
            </ul>
          </div>
          <div className={"pd-tabpanel" + (pdTab === "reviews" ? " active" : "")}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 36, fontFamily: "var(--font-display)" }}>{p.rating}</div>
              <div>
                <div className="stars" style={{ color: "var(--gold)" }}>{starsHtml(p.rating)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.reviews} reviews</div>
              </div>
            </div>
            {REVIEWS_SAMPLE.map((r, i) => (
              <div className="review" key={i}>
                <div className="stars">{starsHtml(r.stars)}</div>
                <div className="who">{r.who}</div>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
          <div className={"pd-tabpanel" + (pdTab === "shipping" ? " active" : "")}>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.8 }}>
              Standard delivery in 3–5 business days across Pakistan (1–2 days within Karachi, Lahore &amp; Islamabad). Cash on Delivery available on all orders. Easy 7-day exchange on unworn items with tags attached — no questions asked on sizing swaps.
            </p>
          </div>

          <div style={{ marginTop: 60 }}>
            <h3 className="related-heading">You may also like</h3>
            <div className="prod-grid">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </div>
        </div>
      </section>

      <div className={"modal-backdrop" + (sizeChartOpen ? " open" : "")}>
        <div className="modal">
          <button className="modal-close" onClick={() => setSizeChartOpen(false)}>✕</button>
          <h3>Size Chart</h3>
          <table className="sizechart-table">
            <tbody>
              <tr><th>Size</th><th>Chest (in)</th><th>Waist (in)</th><th>Length (in)</th></tr>
              <tr><td>XS</td><td>34</td><td>28</td><td>26</td></tr>
              <tr><td>S</td><td>36</td><td>30</td><td>27</td></tr>
              <tr><td>M</td><td>38</td><td>32</td><td>28</td></tr>
              <tr><td>L</td><td>40</td><td>34</td><td>29</td></tr>
              <tr><td>XL</td><td>42</td><td>36</td><td>30</td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>All measurements are in inches. For between sizes, we recommend sizing up.</p>
        </div>
      </div>
    </div>
  );
}
