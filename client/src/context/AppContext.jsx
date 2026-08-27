import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PROMO_CODES, CITY_SHIPPING } from "../data/staticData";

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [policies, setPolicies] = useState({ returns: { intro: "", rules: [] }, shipping: { intro: "", rules: [] } });
  const [heroSlides, setHeroSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------------- Admin session ----------------
  const [adminToken, setAdminToken] = useState(() => {
    try { return localStorage.getItem("stylehub_admin_token") || null; } catch (e) { return null; }
  });
  const [adminChecked, setAdminChecked] = useState(false); // has the stored token (if any) been validated yet?
  const adminTokenRef = useRef(adminToken);
  useEffect(() => { adminTokenRef.current = adminToken; }, [adminToken]);

  // Wrapper around fetch that attaches the admin session token, used for
  // every admin-only (mutating or sensitive) request.
  const adminFetch = useCallback((url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (adminTokenRef.current) headers["x-admin-token"] = adminTokenRef.current;
    return fetch(url, { ...options, headers });
  }, []);

  const isAdminAuthed = !!adminToken;

  const loadAdminData = useCallback(async () => {
    try {
      const [oResp, cResp] = await Promise.all([
        adminFetch("/api/orders"),
        adminFetch("/api/customers")
      ]);
      if (!oResp.ok || !cResp.ok) throw new Error("unauthorized");
      const [o, c] = await Promise.all([oResp.json(), cResp.json()]);
      setOrders(o);
      setCustomers(c);
      return true;
    } catch (e) {
      return false;
    }
  }, [adminFetch]);

  const adminLogin = useCallback(
    async (password) => {
      try {
        const resp = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          return { ok: false, msg: err.error || "Incorrect password" };
        }
        const data = await resp.json();
        adminTokenRef.current = data.token; // set synchronously so loadAdminData below can use it immediately
        setAdminToken(data.token);
        try { localStorage.setItem("stylehub_admin_token", data.token); } catch (e) {}
        await loadAdminData();
        return { ok: true };
      } catch (e) {
        return { ok: false, msg: "Could not reach the server" };
      }
    },
    [loadAdminData]
  );

  const adminLogout = useCallback(async () => {
    try { await adminFetch("/api/admin/logout", { method: "POST" }); } catch (e) {}
    adminTokenRef.current = null;
    setAdminToken(null);
    try { localStorage.removeItem("stylehub_admin_token"); } catch (e) {}
    setOrders([]);
    setCustomers([]);
  }, [adminFetch]);

  const changeAdminPassword = useCallback(
    async (oldPassword, newPassword) => {
      try {
        const resp = await adminFetch("/api/admin/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) return { ok: false, msg: data.error || "Could not change password" };
        return { ok: true };
      } catch (e) {
        return { ok: false, msg: "Could not reach the server" };
      }
    },
    [adminFetch]
  );

  // If a token was already saved in the browser (from a previous visit),
  // quietly verify it still works on load. If the server has restarted
  // since, the token is no longer valid — clear it so the login screen shows.
  useEffect(() => {
    (async () => {
      if (adminTokenRef.current) {
        const ok = await loadAdminData();
        if (!ok) {
          adminTokenRef.current = null;
          setAdminToken(null);
          try { localStorage.removeItem("stylehub_admin_token"); } catch (e) {}
        }
      }
      setAdminChecked(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [cart, setCart] = useState([]); // {productId, size, color, qty}
  const [wishlist, setWishlist] = useState(new Set());
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);

  const [toast, setToast] = useState({ show: false, msg: "" });
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
  }, []);

  const findProduct = useCallback((id) => products.find((p) => p.id === id), [products]);

  /* ---------------- Initial load (public data only) ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const [p, s, f, pol, hs] = await Promise.all([
          fetch("/api/products").then((r) => r.json()),
          fetch("/api/settings").then((r) => r.json()),
          fetch("/api/faqs").then((r) => r.json()),
          fetch("/api/policies").then((r) => r.json()),
          fetch("/api/hero-slides").then((r) => r.json())
        ]);
        setProducts(p);
        setSettings(s);
        setFaqs(f);
        setPolicies(pol);
        setHeroSlides(hs);
      } catch (e) {
        console.error("Could not load data — is server.js running?", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------- Cart ---------------- */
  const addToCart = useCallback((productId, size, color, qty) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.productId === productId && c.size === size && c.color === color);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return copy;
      }
      return [...prev, { productId, size, color, qty }];
    });
  }, []);
  const removeFromCart = useCallback((idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }, []);
  const changeQty = useCallback((idx, d) => {
    setCart((prev) => prev.map((c, i) => (i === idx ? { ...c, qty: Math.max(1, c.qty + d) } : c)));
  }, []);
  const cartCount = cart.reduce((a, c) => a + c.qty, 0);
  const cartSubtotal = useCallback(
    () => cart.reduce((sum, c) => sum + (findProduct(c.productId)?.price || 0) * c.qty, 0),
    [cart, findProduct]
  );
  const applyPromo = useCallback((code) => {
    const norm = (code || "").trim().toUpperCase();
    if (PROMO_CODES[norm]) {
      setAppliedPromo(norm);
      return { ok: true, msg: `Code "${norm}" applied — ${PROMO_CODES[norm] * 100}% off` };
    }
    setAppliedPromo(null);
    return { ok: false, msg: "Invalid or expired promo code" };
  }, []);

  /* ---------------- Wishlist ---------------- */
  const toggleWishlist = useCallback(
    (id) => {
      setWishlist((prev) => {
        const next = new Set(prev);
        const added = !next.has(id);
        if (added) next.add(id);
        else next.delete(id);
        showToast(added ? "Added to wishlist" : "Removed from wishlist");
        return next;
      });
    },
    [showToast]
  );

  /* ---------------- Checkout ---------------- */
  const placeOrder = useCallback(
    async ({ name, phone, addr, email, city, payment }) => {
      const sub = cartSubtotal();
      const discount = appliedPromo ? sub * PROMO_CODES[appliedPromo] : 0;
      const shipping = CITY_SHIPPING[city] ?? 300;
      const total = Math.round(sub - discount + shipping);
      const eta = new Date(Date.now() + (city === "Other" ? 5 : 3) * 86400000);

      const payload = {
        customer: name,
        email,
        phone,
        address: addr,
        city,
        items: cart.map((c) => ({ productId: c.productId, size: c.size, color: c.color, qty: c.qty })),
        total,
        payment
      };

      let saved;
      try {
        const resp = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        saved = await resp.json();
      } catch (err) {
        showToast("Could not reach the server — make sure server.js is running");
        return null;
      }

      const order = { id: saved.id, items: [...cart], total, city, eta: eta.toDateString(), payment };
      setLastOrder(order);
      setOrders((prev) => [saved, ...prev]);
      setCustomers((prev) => {
        const idx = prev.findIndex((c) => c.email === email || c.name === name);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], orders: copy[idx].orders + 1, spent: copy[idx].spent + total };
          return copy;
        }
        return [...prev, { name, email, orders: 1, spent: total }];
      });
      setCart([]);
      setAppliedPromo(null);
      return order;
    },
    [cart, cartSubtotal, appliedPromo, showToast]
  );

  /* ---------------- Admin: image upload ---------------- */
  const uploadImage = useCallback(async (file) => {
    if (!file) return null;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const resp = await adminFetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl })
    });
    if (!resp.ok) throw new Error("Upload failed");
    const data = await resp.json();
    return data.url;
  }, [adminFetch]);

  /* ---------------- Admin: products CRUD ---------------- */
  const addAdminProduct = useCallback(
    async ({ name, cat, price, stock, file, colors, sizes, desc }) => {
      let imgUrl = "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80";
      try {
        const uploaded = await uploadImage(file);
        if (uploaded) imgUrl = uploaded;
      } catch (e) {
        showToast("Image upload failed — saved with a placeholder photo instead");
      }
      const newProduct = {
        name,
        cat,
        price,
        was: null,
        img: imgUrl,
        img2: imgUrl,
        stock,
        colors: colors && colors.length ? colors : ["#0b0b0c"],
        sizes: sizes && sizes.length ? sizes : ["M"],
        rating: 0,
        reviews: 0,
        popularity: 0,
        isNew: true,
        best: false,
        badge: "new",
        desc: desc || ""
      };
      try {
        const resp = await adminFetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProduct)
        });
        const saved = await resp.json();
        setProducts((prev) => [...prev, saved]);
        showToast("Product added — now live on the storefront");
        return saved;
      } catch (e) {
        showToast("Could not reach the server");
        return null;
      }
    },
    [uploadImage, showToast, adminFetch]
  );

  const deleteAdminProduct = useCallback(
    async (id) => {
      try {
        await adminFetch("/api/products/" + id, { method: "DELETE" });
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showToast("Product deleted");
      } catch (e) {
        showToast("Could not reach the server");
      }
    },
    [showToast, adminFetch]
  );

  const setProductStock = useCallback(
    async (id, stock) => {
      try {
        const resp = await adminFetch("/api/products/" + id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock })
        });
        const saved = await resp.json();
        setProducts((prev) => prev.map((p) => (p.id === id ? saved : p)));
        showToast(stock === 0 ? "Marked as out of stock" : `Marked in stock (${stock} available)`);
      } catch (e) {
        showToast("Could not reach the server");
      }
    },
    [showToast, adminFetch]
  );

  const saveEditProduct = useCallback(
    async (id, patch, file) => {
      try {
        const uploaded = await uploadImage(file);
        if (uploaded) {
          patch = { ...patch, img: uploaded, img2: uploaded };
        }
      } catch (e) {
        showToast("Image upload failed — keeping the existing photo");
      }
      try {
        const resp = await adminFetch("/api/products/" + id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        const saved = await resp.json();
        setProducts((prev) => prev.map((p) => (p.id === id ? saved : p)));
        showToast("Product updated — now live on the storefront");
        return saved;
      } catch (e) {
        showToast("Could not reach the server");
        return null;
      }
    },
    [uploadImage, showToast, adminFetch]
  );

  /* ---------------- Admin: orders ---------------- */
  const updateOrderStatus = useCallback(async (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await adminFetch("/api/orders/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
    } catch (e) {
      showToast("Could not reach the server to save status");
    }
  }, [showToast, adminFetch]);

  // Re-fetch orders from the server without a full page reload — used by
  // the admin panel to notice new orders placed from another tab/device.
  const refreshOrders = useCallback(async () => {
    try {
      const resp = await adminFetch("/api/orders");
      if (!resp.ok) return null;
      const fresh = await resp.json();
      setOrders(fresh);
      return fresh;
    } catch (e) {
      return null;
    }
  }, [adminFetch]);

  /* ---------------- Admin: settings ---------------- */
  const saveSiteSettings = useCallback(
    async (patch) => {
      try {
        const resp = await adminFetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        const saved = await resp.json();
        setSettings(saved);
        showToast("Settings saved — live across the site");
      } catch (e) {
        showToast("Could not reach the server");
      }
    },
    [showToast, adminFetch]
  );

  /* ---------------- Admin: FAQs ---------------- */
  const addFaq = useCallback(
    async ({ category, question, answer }) => {
      try {
        const resp = await adminFetch("/api/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, question, answer })
        });
        const saved = await resp.json();
        setFaqs((prev) => [...prev, saved]);
        showToast("FAQ added");
        return saved;
      } catch (e) {
        showToast("Could not reach the server");
        return null;
      }
    },
    [showToast, adminFetch]
  );

  const editFaq = useCallback(
    async (id, patch) => {
      try {
        const resp = await adminFetch("/api/faqs/" + id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        const saved = await resp.json();
        setFaqs((prev) => prev.map((f) => (f.id === id ? saved : f)));
        showToast("FAQ updated");
        return saved;
      } catch (e) {
        showToast("Could not reach the server");
        return null;
      }
    },
    [showToast, adminFetch]
  );

  const deleteFaq = useCallback(
    async (id) => {
      try {
        await adminFetch("/api/faqs/" + id, { method: "DELETE" });
        setFaqs((prev) => prev.filter((f) => f.id !== id));
        showToast("FAQ deleted");
      } catch (e) {
        showToast("Could not reach the server");
      }
    },
    [showToast, adminFetch]
  );

  /* ---------------- Admin: Policies (Returns & Shipping) ---------------- */
  const savePolicy = useCallback(
    async (key, { intro, rules }) => {
      try {
        const resp = await adminFetch("/api/policies/" + key, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intro, rules })
        });
        const saved = await resp.json();
        setPolicies((prev) => ({ ...prev, [key]: saved }));
        showToast("Policy saved — now live on the storefront");
        return saved;
      } catch (e) {
        showToast("Could not reach the server");
        return null;
      }
    },
    [showToast, adminFetch]
  );

  /* ---------------- Admin: Homepage hero banner ---------------- */
  const addHeroSlide = useCallback(
    async ({ eyebrow, title, copy, cta, tag, price, file }) => {
      let imgUrl = "";
      try {
        const uploaded = await uploadImage(file);
        if (uploaded) imgUrl = uploaded;
      } catch (e) {
        showToast("Image upload failed — slide saved without a photo");
      }
      try {
        const resp = await adminFetch("/api/hero-slides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eyebrow, title, copy, cta, tag, price, img: imgUrl })
        });
        const saved = await resp.json();
        setHeroSlides((prev) => [...prev, saved]);
        showToast("Banner slide added — now live on the homepage");
        return saved;
      } catch (e) {
        showToast("Could not reach the server");
        return null;
      }
    },
    [showToast, uploadImage, adminFetch]
  );

  const editHeroSlide = useCallback(
    async (id, { eyebrow, title, copy, cta, tag, price, file }) => {
      const patch = { eyebrow, title, copy, cta, tag, price };
      try {
        const uploaded = await uploadImage(file);
        if (uploaded) patch.img = uploaded;
      } catch (e) {
        showToast("Image upload failed — keeping the existing photo");
      }
      try {
        const resp = await adminFetch("/api/hero-slides/" + id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        const saved = await resp.json();
        setHeroSlides((prev) => prev.map((s) => (s.id === id ? saved : s)));
        showToast("Banner slide updated — now live on the homepage");
        return saved;
      } catch (e) {
        showToast("Could not reach the server");
        return null;
      }
    },
    [showToast, uploadImage, adminFetch]
  );

  const deleteHeroSlide = useCallback(
    async (id) => {
      try {
        await adminFetch("/api/hero-slides/" + id, { method: "DELETE" });
        setHeroSlides((prev) => prev.filter((s) => s.id !== id));
        showToast("Banner slide deleted");
      } catch (e) {
        showToast("Could not reach the server");
      }
    },
    [showToast, adminFetch]
  );

  const value = {
    products, orders, customers, settings, faqs, policies, heroSlides, loading, findProduct,
    cart, cartCount, addToCart, removeFromCart, changeQty, cartSubtotal,
    appliedPromo, applyPromo,
    wishlist, toggleWishlist,
    lastOrder, placeOrder,
    toast, showToast,
    isAdminAuthed, adminChecked, adminLogin, adminLogout, changeAdminPassword,
    addAdminProduct, deleteAdminProduct, saveEditProduct, setProductStock, updateOrderStatus, refreshOrders, saveSiteSettings,
    addFaq, editFaq, deleteFaq, savePolicy,
    addHeroSlide, editHeroSlide, deleteHeroSlide
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
