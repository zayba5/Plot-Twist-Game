import { api } from "./global.js"

export async function fetchItem() {
  const res = await fetch(api + "Sample", { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}