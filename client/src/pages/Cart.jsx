import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { fmt } from "../utils";
import { PROMO_CODES } from "../data/staticData";

export default function Cart() {
  const { cart, findProduct, removeFromCart, changeQty, cartSubtotal, appliedPromo, applyPromo } = useApp();
  const navigate = useNavigate();
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState({ ok: null, text: "" });

  function handleApplyPromo() {
    const res = applyPromo(promoInput);
    setPromoMsg({ ok: res.ok, text: res.msg });
  }

  const sub = cartSubtotal();
  const discount = appliedPromo ? sub * (PROMO_CODES[appliedPromo] || 0) : 0;
  const shipping = sub > 5000 ? 0 : 200;
  const total = sub - discount + shipping;

  return (
    <div className="page active" id="page-cart">
      <div className="pageheader">
        <div className="wrap">
          <div className="crumb"><Link to="/">Home</Link> / Cart</div>
          <h1>Your Bag</h1>
        </div>
      </div>
      <section>
        {cart.length === 0 ? (
          <div className="wrap">
            <div className="empty-state">
              <div className="icon">🛍</div>
              <h3>Your bag is empty</h3>
              <p>Looks like you haven't added anything yet.</p>
              <button className="btn btn-gold" onClick={() => navigate("/shop")}>Start Shopping</button>
            </div>
          </div>
        ) : (
          <div className="wrap">
            <div className="cart-layout">
              <div>
                {cart.map((c, idx) => {
                  const p = findProduct(c.productId);
                  if (!p) return null;
                  return (
                    <div className="cart-item" key={idx}>
                      <div className="thumb" style={{ backgroundImage: `url('${p.img}')` }}></div>
                      <div>
                        <h4>{p.name}</h4>
                        <div className="opts">
                          Size: {c.size} &nbsp;·&nbsp;
                          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: c.color, verticalAlign: -1 }}></span>
                        </div>
                        <div className="row-actions">
                          <div className="qty-stepper">
                            <button onClick={() => changeQty(idx, -1)}>−</button>
                            <span>{c.qty}</span>
                            <button onClick={() => changeQty(idx, 1)}>+</button>
                          </div>
                          <button className="remove-btn" onClick={() => removeFromCart(idx)}>Remove</button>
                        </div>
                      </div>
                      <div className="price-col">
                        <div className="line-total">{fmt(p.price * c.qty)}</div>
                        <div className="unit">{fmt(p.price)} each</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="summary-card">
                <h3>Order Summary</h3>
                <div className="summary-row"><span>Subtotal</span><span>{fmt(sub)}</span></div>
                {appliedPromo && <div className="summary-row"><span>Discount ({appliedPromo})</span><span>−{fmt(Math.round(discount))}</span></div>}
                <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? "Free" : fmt(shipping)}</span></div>
                <div className="promo-row">
                  <input type="text" placeholder="Promo code (try STYLE10)" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} />
                  <button className="btn btn-sm btn-outline" onClick={handleApplyPromo}>Apply</button>
                </div>
                {promoMsg.text && <div className={"promo-msg " + (promoMsg.ok ? "ok" : "err")}>{promoMsg.text}</div>}
                <div className="summary-row total"><span>Total</span><span>{fmt(Math.round(total))}</span></div>
                <button className="btn btn-gold btn-block" style={{ marginTop: 16, padding: 15 }} onClick={() => navigate("/checkout")}>Proceed to Checkout</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
