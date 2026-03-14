import { apiJson } from "./global.jsx";

export async function fetchItem() {
  return apiJson("Sample", {
    method: "GET",
  });
}

//fetch stories and their parts for a given game
export async function fetchGameStories() {
  return apiJson("Story", {
    method: "GET",
  });
}