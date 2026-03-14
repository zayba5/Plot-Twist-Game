import { apiJson } from "./global.jsx";

export async function fetchItem() {
  return apiJson("Sample", {
    method: "GET",
  });
}

export async function fetchGameStories() {
  return apiJson("Story", {
    method: "GET",
  });
}