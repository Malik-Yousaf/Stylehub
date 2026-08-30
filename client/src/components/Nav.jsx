import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Nav({ onOpenDrawer }) {
  const { cartCount, wishlist, settings, showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchVal, setSearchVal] = useState("");
  const isAdminSection = location.pathname.startsWith("/admin");

  function onSearchKeyDown(e) {
    if (e.key === "Enter") {
      navigate("/shop?q=" + encodeURIComponent(searchVal));
    }
  }

  const linkClass = (path) => (location.pathname === path ? "active" : "");
  const catLinkClass = (cat) =>
    location.pathname === "/shop" && location.state?.category === cat ? "active" : "";

  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <span className="msg">{settings.heroBannerText || "Free shipping on orders over Rs. 5,000 · Cash on Delivery available nationwide"}</span>
          <span className="msg">Karachi, PK</span>
        </div>
      </div>

      <nav className="mainnav">
        <div className="wrap">
          <Link to="/" className="logo">Style<span className="dot">Hub</span></Link>
          <div className="navlinks" id="navlinks">
            <Link to="/" className={linkClass("/")}>Home</Link>
            <Link to="/shop" state={{ category: "Men" }} className={catLinkClass("Men")}>Men</Link>
            <Link to="/shop" state={{ category: "Women" }} className={catLinkClass("Women")}>Women</Link>
            <Link to="/shop" state={{ category: "Accessories" }} className={catLinkClass("Accessories")}>Accessories</Link>
            <Link to="/shop" state={{ category: "Footwear" }} className={catLinkClass("Footwear")}>Footwear</Link>
            {isAdminSection && <Link to="/admin" className={linkClass("/admin")}>Admin</Link>}
          </div>
          <div className="search-inline">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search products…"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={onSearchKeyDown}
            />
          </div>
          <div className="navactions">
            <button className="icon-btn" title="Track Order" onClick={() => navigate("/track-order")}>
              📦
            </button>
            <button
              className="icon-btn"
              title="Wishlist"
              onClick={() => showToast(wishlist.size ? `${wishlist.size} item(s) in your wishlist` : "Tap the heart on any product to save it")}
            >
              ♡<span className="badge" style={{ display: wishlist.size > 0 ? "flex" : "none" }}>{wishlist.size}</span>
            </button>
            <button className="icon-btn" title="Cart" onClick={() => navigate("/cart")}>
              🛍<span className="badge" style={{ display: cartCount > 0 ? "flex" : "none" }}>{cartCount}</span>
            </button>
            <button className="hamburger icon-btn" onClick={onOpenDrawer}>☰</button>
          </div>
        </div>
      </nav>
    </>
  );
}
