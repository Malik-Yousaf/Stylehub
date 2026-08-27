import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";

export default function Settings() {
  const { settings, saveSiteSettings, changeAdminPassword, adminLogout } = useApp();
  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline] = useState("");
  const [banner, setBanner] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState({ ok: null, text: "" });
  const [pwSaving, setPwSaving] = useState(false);

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

  async function handleChangePassword() {
    setPwMsg({ ok: null, text: "" });
    if (!oldPassword || !newPassword) {
      setPwMsg({ ok: false, text: "Fill in both the current and new password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: "New password and confirmation don't match." });
      return;
    }
    setPwSaving(true);
    const res = await changeAdminPassword(oldPassword, newPassword);
    setPwSaving(false);
    if (!res.ok) {
      setPwMsg({ ok: false, text: res.msg || "Could not change password." });
      return;
    }
    setPwMsg({ ok: true, text: "Password changed. You'll need it next time you log in." });
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
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

      <div className="chart-card" style={{ maxWidth: 560, marginTop: 24 }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>🔒 Change Admin Password</h3>
        <div className="field"><label>Current password</label><input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} /></div>
        <div className="field"><label>New password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
        <div className="field"><label>Confirm new password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
        {pwMsg.text && (
          <p style={{ fontSize: 12.5, marginBottom: 10, color: pwMsg.ok ? "var(--success, #3a7d5c)" : "var(--danger, #c0453b)" }}>{pwMsg.text}</p>
        )}
        <button className="btn btn-outline btn-sm" onClick={handleChangePassword} disabled={pwSaving}>
          {pwSaving ? "Saving…" : "Change Password"}
        </button>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12 }}>
          The default password is <code>admin123</code> — please change it to something only you know.
        </p>
      </div>

      <button
        onClick={adminLogout}
        style={{ marginTop: 24, fontSize: 12.5, color: "#e08a8a", textDecoration: "underline" }}
      >
        Log out of admin panel
      </button>
    </>
  );
}

