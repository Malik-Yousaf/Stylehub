import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { CATEGORIES, CATEGORY_IMG } from "../data/staticData";
import ProductCard from "../components/ProductCard.jsx";

export default function Home() {
  const { products, heroSlides } = useApp();
  const [heroIdx, setHeroIdx] = useState(0);
  const [nlEmail, setNlEmail] = useState("");
  const [nlMsg, setNlMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!heroSlides.length) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroSlides.length), 5500);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  function subscribeNL(e) {
    e.preventDefault();
    setNlMsg("Thanks for subscribing! Check your inbox for your 10% off code.");
    setNlEmail("");
  }

  function goCategory(cat) {
    navigate("/shop", { state: { category: cat } });
  }

  const bestGrid = products.filter((p) => p.best).slice(0, 4);
  const featGrid = products.filter((p) => p.isNew).slice(0, 4);

  return (
    <div className="page active" id="page-home">
      <section className="hero" style={{ padding: 0 }}>
        <div className="hero-slides">
          {heroSlides.map((s, i) => (
            <div key={s.id} className={"hero-slide" + (i === heroIdx ? " active" : "")}>
              <div className="wrap">
                <div className="hero-copy">
                  <p className="eyebrow">{s.eyebrow}</p>
                  <h1 dangerouslySetInnerHTML={{ __html: s.title }} />
                  <p>{s.copy}</p>
                  <Link to="/shop" className="btn btn-gold">{s.cta}</Link>
                </div>
                <div className="hero-visual" style={{ backgroundImage: s.img ? `url('${s.img}')` : "none", backgroundSize: "cover", backgroundPosition: "center" }}>
                  <span className="tag">{s.tag}</span>
                  <span className="price-float">{s.price}</span>
                </div>
              </div>
            </div>
          ))}
          {heroSlides.length > 1 && (
            <div className="hero-dots">
              {heroSlides.map((_, i) => (
                <button key={i} className={i === heroIdx ? "active" : ""} onClick={() => setHeroIdx(i)}></button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <div><p className="eyebrow">Shop by category</p><h2>Find your fit</h2></div>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <a href="#" key={c} className="cat-card" style={{ "--cimg": `url('${CATEGORY_IMG[c]}')` }} onClick={(e) => { e.preventDefault(); goCategory(c); }}>
                <span>{c}<small>{products.filter((p) => p.cat === c).length} items</small></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="alt-bg">
        <div className="wrap">
          <div className="section-head">
            <div><p className="eyebrow">Curated for you</p><h2>Best sellers</h2></div>
            <Link to="/shop" className="view-all">View all →</Link>
          </div>
          <div className="prod-grid">{bestGrid.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <div><p className="eyebrow">Just landed</p><h2>Featured pieces</h2></div>
            <Link to="/shop" className="view-all">View all →</Link>
          </div>
          <div className="prod-grid">{featGrid.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </div>
      </section>

      <div className="newsletter">
        <div className="wrap">
          <div>
            <p className="eyebrow" style={{ color: "var(--gold-bright)" }}>Stay in the loop</p>
            <h2>Get 10% off your first order, plus early access to drops.</h2>
          </div>
          <div>
            <form onSubmit={subscribeNL}>
              <input type="email" placeholder="Enter your email" required value={nlEmail} onChange={(e) => setNlEmail(e.target.value)} />
              <button className="btn btn-gold" type="submit">Subscribe</button>
            </form>
            <div className="nl-msg">{nlMsg}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
