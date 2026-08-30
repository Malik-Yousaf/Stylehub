import React from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Footer() {
  const { settings } = useApp();
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="logo" style={{ color: "#fff", marginBottom: 14 }}>Style<span className="dot">Hub</span></div>
            <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 260 }}>Modern essentials for how Pakistan dresses today — clothing, footwear and accessories, delivered nationwide.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><Link to="/shop">All Products</Link></li>
              <li><Link to="/shop">New Arrivals</Link></li>
              <li><Link to="/shop">Best Sellers</Link></li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li><Link to="/track-order">Track Order</Link></li>
              <li><Link to="/policy/returns">Returns &amp; Exchanges</Link></li>
              <li><Link to="/policy/shipping">Shipping Info</Link></li>
              <li><Link to="/faq">FAQs</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>{settings.address || "Karachi, Pakistan"}</li>
              <li>{settings.phone || "+92 300 0000000"}</li>
              <li>{settings.email || "support@stylehub.pk"}</li>
              <li>Mon–Sat, 10am–8pm</li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 StyleHub. All rights reserved.</span>
          <span>Secure checkout · SSL protected · COD · JazzCash · EasyPaisa</span>
        </div>
      </div>
    </footer>
  );
}
