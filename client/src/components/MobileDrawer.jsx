import React from "react";
import { Link } from "react-router-dom";

export default function MobileDrawer({ open, onClose }) {
  return (
    <div className={"mobile-drawer" + (open ? " open" : "")}>
      <div className="scrim" onClick={onClose}></div>
      <div className="panel">
        <button className="icon-btn" style={{ alignSelf: "flex-end" }} onClick={onClose}>✕</button>
        <Link to="/" onClick={onClose}>Home</Link>
        <Link to="/shop" onClick={onClose}>Shop</Link>
        <Link to="/cart" onClick={onClose}>Cart</Link>
      </div>
    </div>
  );
}
