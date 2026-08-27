import React from "react";
import { useApp } from "../context/AppContext";

export function ToastBox() {
  const { toast } = useApp();
  return (
    <div className={"toast" + (toast.show ? " show" : "")}>
      <span className="gold-dot"></span>
      <span>{toast.msg}</span>
    </div>
  );
}

export function WhatsAppFab() {
  const { settings } = useApp();
  function open() {
    const number = settings.whatsapp || "923000000000";
    const storeName = settings.storeName || "StyleHub";
    window.open(`https://wa.me/${number}?text=Hi%20${encodeURIComponent(storeName)}!%20I%20have%20a%20question.`, "_blank");
  }
  return (
    <button className="whatsapp-fab" title="Chat on WhatsApp" onClick={open}>
      <svg viewBox="0 0 32 32" fill="white"><path d="M16.001 2.667c-7.363 0-13.334 5.97-13.334 13.333 0 2.351.615 4.646 1.782 6.666l-1.897 6.93a1 1 0 001.229 1.229l6.93-1.897a13.27 13.27 0 006.29 1.605h.001c7.362 0 13.333-5.97 13.333-13.333S23.363 2.667 16.001 2.667zm7.844 18.833c-.323.907-1.844 1.75-2.55 1.855-.652.098-1.474.138-2.377-.15-.548-.174-1.25-.407-2.15-.796-3.782-1.633-6.253-5.421-6.44-5.673-.188-.253-1.533-2.036-1.533-3.885s.98-2.756 1.327-3.135c.323-.35.703-.44.939-.44.234 0 .47.002.674.012.216.01.507-.082.792.605.29.7.986 2.42 1.073 2.596.088.176.146.38.03.61-.117.234-.176.38-.35.586-.176.206-.37.46-.528.618-.176.176-.36.366-.155.719.206.352.914 1.51 1.964 2.446 1.35 1.204 2.489 1.577 2.845 1.753.352.176.558.147.762-.088.206-.234.882-1.03 1.117-1.383.235-.352.47-.293.792-.176.323.117 2.048.966 2.4 1.142.352.176.586.264.674.41.088.146.088.85-.235 1.757z" /></svg>
    </button>
  );
}
