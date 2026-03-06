import React from "react";
import "./index.css";

export function SampleCard({ item }) {
  if (!item) return null;

  return (
    <div className="content-card">
      <p>{item.text ?? "No content available"}</p>
    </div>
  );
}