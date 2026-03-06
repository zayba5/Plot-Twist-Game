import { apiJson } from "./global.js";

export async function fetchItem() {
  return apiJson("Sample", {
    method: "GET",
  });
}