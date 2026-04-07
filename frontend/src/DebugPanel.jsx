import React from "react";

export default function DebugPanel({
  title = "Debug Panel",
  data,
  enabled,
  onToggle,
}) {
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 10000,
          background: "rgba(0,0,0,0.85)",
          color: "white",
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid #555",
          fontSize: 18,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
          Show Debug
        </label>
      </div>

      {enabled && (
        <div
          style={{
            position: "fixed",
            top: 70,
            left: 20,
            right: 20,
            bottom: 20,
            zIndex: 9999,
            background: "rgba(15,15,15,0.96)",
            color: "#e8ffe8",
            border: "2px solid #666",
            borderRadius: 14,
            padding: 24,
            overflow: "auto",
            boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {title}
          </div>

          <pre
            style={{
              margin: 0,
              fontSize: 20,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}