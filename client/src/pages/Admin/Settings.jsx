import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";

export default function Settings() {
  const { settings, saveSiteSettings } = useApp();
  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline] = useState("");
  const [banner, setBanner] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    setStoreName(settings.storeName || "");
    setTagline(settings.tagline || "");
    setBanner(settings.heroBannerText || "");
    setPhone(settings.phone || "");
    setEmail(settings.email || "");
    setWhatsapp(settings.whatsapp || "");
    setAddress(settings.address || "");
  }, [settings]);

  function handleSave() {
    saveSiteSettings({
      storeName: storeName.trim(),
      tagline: tagline.trim(),
      heroBannerText: banner.trim(),
      phone: phone.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      address: address.trim()
    });
  }

  return (
    <>
      <div className="admin-head"><h2>Website Settings</h2></div>
      <div className="chart-card" style={{ maxWidth: 560 }}>
        <div className="field"><label>Store name</label><input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} /></div>
        <div className="field"><label>Tagline</label><input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} /></div>
        <div className="field"><label>Top banner message</label><input type="text" value={banner} onChange={(e) => setBanner(e.target.value)} /></div>
        <div className="form-grid">
          <div className="field"><label>Contact phone</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="field"><label>Contact email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label>WhatsApp number (digits only, with country code)</label><input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
          <div className="field"><label>Address</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        </div>
        <button className="btn btn-gold btn-sm" onClick={handleSave}>Save Settings</button>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12 }}>These are saved to <code>data.json</code> and applied across the whole storefront (footer, WhatsApp button, top banner) immediately.</p>
      </div>
    </>
  );
}
