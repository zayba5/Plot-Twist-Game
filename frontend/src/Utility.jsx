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
    credentials: "include"
  });
}

export async function fetchScores() {
  return apiJson("Scores", {
    method: "GET",
    credentials: "include"
  });
}

//post vote for a voting session in a game
export async function postVote(gameID, storyID) {
  return apiJson("TestVote", { //<---change this to Vote when stories work properly
    method: "POST",
    credentials: "include",
    body: {
      game_id: gameID,
      story_id: storyID,
    },
  });
}