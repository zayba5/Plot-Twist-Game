import { apiJson } from "./global.jsx";

export async function fetchItem() {
  return apiJson("Sample", {
    method: "GET",
  });
}