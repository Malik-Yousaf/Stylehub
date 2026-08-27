import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { CITY_SHIPPING, PROMO_CODES } from "../data/staticData";
import { fmt } from "../utils";

export default function Checkout() {
  const { cart, findProduct, cartSubtotal, appliedPromo, placeOrder, showToast } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addr, setAddr] = useState("");
  const [city, setCity] = useState("Karachi");
  const [postal, setPostal] = useState("");
  const [payment, setPayment] = useState("cod");

  useEffect(() => {
    if (cart.length === 0) navigate("/cart");
  }, [cart, navigate]);

  if (cart.length === 0) return null;

  const sub = cartSubtotal();
  const discount = appliedPromo ? sub * (PROMO_CODES[appliedPromo] || 0) : 0;
  const shipping = CITY_SHIPPING[city] ?? 300;
  const total = sub - discount + shipping;

  async function handlePlaceOrder() {
    if (!name.trim() || !phone.trim() || !addr.trim()) {
      showToast("Please fill in all required fields");
      return;
    }
    const order = await placeOrder({ name: name.trim(), phone: phone.trim(), addr: addr.trim(), email: email.trim(), city, payment });
    if (order) navigate("/confirmation");
  }

  const payOptions = [
    { id: "cod", name: "Cash on Delivery", desc: "Pay in cash when your order arrives" },
    { id: "jazzcash", name: "JazzCash", desc: "Pay instantly via JazzCash mobile wallet" },
    { id: "easypaisa", name: "EasyPaisa", desc: "Pay instantly via EasyPaisa mobile wallet" }
  ];

  return (
    <div className="page active" id="page-checkout">
      <div className="pageheader">
        <div className="wrap">
          <div className="crumb"><Link to="/cart">Cart</Link> / Checkout</div>
          <h1>Checkout</h1>
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="checkout-layout">
            <div>
              <div className="co-section">
                <h3><span className="num">1</span> Contact details</h3>
                <div className="form-grid">
                  <div className="field"><label>Full name</label><input type="text" placeholder="Ayesha Khan" required value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="field"><label>Phone number</label><input type="tel" placeholder="03xx-xxxxxxx" required value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                  <div className="field full"><label>Email</label><input type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
              </div>
              <div className="co-section">
                <h3><span className="num">2</span> Shipping address</h3>
                <div className="form-grid">
                  <div className="field full"><label>Street address</label><input type="text" placeholder="House 12, Street 5, DHA Phase 6" required value={addr} onChange={(e) => setAddr(e.target.value)} /></div>
                  <div className="field">
                    <label>City</label>
                    <select value={city} onChange={(e) => setCity(e.target.value)}>
                      <option value="Karachi">Karachi</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Islamabad">Islamabad</option>
                      <option value="Other">Other city</option>
                    </select>
                  </div>
                  <div className="field"><label>Postal code</label><input type="text" placeholder="75500" value={postal} onChange={(e) => setPostal(e.target.value)} /></div>
                </div>
              </div>
              <div className="co-section">
                <h3><span className="num">3</span> Payment method</h3>
                {payOptions.map((opt) => (
                  <label key={opt.id} className={"pay-option" + (payment === opt.id ? " selected" : "")} onClick={() => setPayment(opt.id)}>
                    <input type="radio" name="pay" checked={payment === opt.id} readOnly />
                    <div><div className="pname">{opt.name}</div><div className="pdesc">{opt.desc}</div></div>
                  </label>
                ))}
                <label className="pay-option" style={{ opacity: 0.6, cursor: "not-allowed" }}>
                  <input type="radio" name="pay" disabled />
                  <div><div className="pname">Debit / Credit Card</div><div className="pdesc">Visa, Mastercard — via secure gateway</div></div>
                  <span className="soon">Coming soon</span>
                </label>
                <div className="ssl-note">🔒 256-bit SSL encrypted checkout · Your data is protected</div>
              </div>
              <button className="btn btn-gold btn-block" style={{ padding: 17 }} onClick={handlePlaceOrder}>Place Order</button>
            </div>
            <div className="order-summary-mini">
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>Order Summary</h3>
              <div>
                {cart.map((c, idx) => {
                  const p = findProduct(c.productId);
                  if (!p) return null;
                  return (
                    <div className="mini-item" key={idx}>
                      <div className="thumb" style={{ backgroundImage: `url('${p.img}')` }}></div>
                      <div><div style={{ fontWeight: 600 }}>{p.name}</div><div className="qtybadge">{c.size} · Qty {c.qty}</div></div>
                      <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)" }}>{fmt(p.price * c.qty)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <div className="summary-row"><span>Subtotal</span><span>{fmt(sub)}</span></div>
                {appliedPromo && <div className="summary-row"><span>Discount</span><span>−{fmt(Math.round(discount))}</span></div>}
                <div className="summary-row"><span>Shipping ({city})</span><span>{fmt(shipping)}</span></div>
                <div className="summary-row total"><span>Total</span><span>{fmt(Math.round(total))}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
