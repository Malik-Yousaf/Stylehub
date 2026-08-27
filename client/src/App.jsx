import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import MobileDrawer from "./components/MobileDrawer.jsx";
import Footer from "./components/Footer.jsx";
import { ToastBox, WhatsAppFab } from "./components/ToastAndFab.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import { useApp } from "./context/AppContext.jsx";

import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Confirmation from "./pages/Confirmation.jsx";
import Faq from "./pages/Faq.jsx";
import Policy from "./pages/Policy.jsx";
import Admin from "./pages/Admin/Admin.jsx";

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { loading } = useApp();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  // Splash intro: stays up for a minimum amount of time (so the animation
  // is actually seen) AND until the store's data has finished loading —
  // whichever takes longer. It only ever plays once, on the very first
  // load of the storefront (not on every in-app navigation, and not on
  // the admin panel).
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [splashRemoved, setSplashRemoved] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), 1900);
    return () => clearTimeout(t);
  }, []);

  const splashHiding = minTimeDone && !loading;

  useEffect(() => {
    if (!splashHiding) return;
    const t = setTimeout(() => setSplashRemoved(true), 650);
    return () => clearTimeout(t);
  }, [splashHiding]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setDrawerOpen(false);
  }, [location.pathname]);

  if (isAdmin) {
    if (loading) {
      return (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
          Loading StyleHub…
        </div>
      );
    }
    return (
      <>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <ToastBox />
      </>
    );
  }

  return (
    <>
      {!splashRemoved && <SplashScreen hide={splashHiding} />}

      {!loading && (
        <>
          <Nav onOpenDrawer={() => setDrawerOpen(true)} />
          <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/policy/:type" element={<Policy />} />
          </Routes>

          <WhatsAppFab />
          <ToastBox />
          <Footer />
        </>
      )}
    </>
  );
}
