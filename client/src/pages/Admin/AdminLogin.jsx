import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";

export default function AdminLogin() {
  const { adminLogin } = useApp();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    const res = await adminLogin(password);
    setLoading(false);
    if (!res.ok) {
      setError(res.msg || "Incorrect password");
      return;
    }
    setPassword("");
  }

  return (
    <div className="page active" id="page-admin-login">
      <section style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 380, padding: "0 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div className="logo" style={{ justifyContent: "center", display: "flex", marginBottom: 8 }}>
              Style<span className="dot">Hub</span>
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              🔒 Admin Access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-wrap" style={{ padding: 28 }}>
            <div className="field">
              <label>Admin Password</label>
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            {error && (
              <p style={{ color: "var(--danger, #c0453b)", fontSize: 12.5, marginBottom: 14 }}>{error}</p>
            )}
            <button className="btn btn-gold btn-block" type="submit" disabled={loading}>
              {loading ? "Checking…" : "Log In"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--muted)" }}>
            <Link to="/" style={{ textDecoration: "underline" }}>← Back to storefront</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
