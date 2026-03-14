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

export async function fetchUserScores() {
  // placeholder
  return {
    "userScores": [
      {"user": "User A", "score": "12"},
      {"user": "User B", "score": "10"},
      {"user": "User C", "score": "8"},
      {"user": "User D", "score": "6"}
    ]
  }

  /*return apiJson("User", {
    method: "GET",
  });*/
}