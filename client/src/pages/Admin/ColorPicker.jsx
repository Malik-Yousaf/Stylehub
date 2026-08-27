import React, { useState } from "react";

export default function ColorPicker({ colors, onChange }) {
  const [pickerVal, setPickerVal] = useState("#0b0b0c");

  function addColor() {
    if (colors.includes(pickerVal)) return;
    onChange([...colors, pickerVal]);
  }
  function removeColor(c) {
    if (colors.length <= 1) return; // keep at least one color
    onChange(colors.filter((x) => x !== c));
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {colors.map((c) => (
          <span key={c} style={{ position: "relative", display: "inline-block" }}>
            <span
              title={c}
              style={{ width: 28, height: 28, borderRadius: "50%", background: c, display: "block", border: "1px solid var(--line)" }}
            ></span>
            <button
              type="button"
              onClick={() => removeColor(c)}
              title="Remove color"
              style={{
                position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: "50%",
                background: "var(--ink)", color: "#fff", border: "none", fontSize: 10, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}
            >✕</button>
          </span>
        ))}
        {colors.length === 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>No colors added yet</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="color" value={pickerVal} onChange={(e) => setPickerVal(e.target.value)} style={{ width: 40, height: 32, padding: 0, border: "1px solid var(--line)", cursor: "pointer" }} />
        <button type="button" className="mini-btn" onClick={addColor}>+ Add Color</button>
      </div>
    </div>
  );
}
