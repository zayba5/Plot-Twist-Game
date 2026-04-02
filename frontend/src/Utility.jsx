import { apiJson } from "./global.jsx";

export const api =
  import.meta.env.VITE_API;

export async function fetchItem() {
  return apiJson("Sample", {
    method: "GET",
  });
}

//fetch stories and their parts for a given game
export async function fetchGameStories(gameID) {
  return apiJson(`GetAllStory?game_id=${gameID}`, {
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
export async function postVote(gameID, storyID1=null, storyID2=null, storyID3=null) {
  return apiJson("Vote", { 
    method: "POST",
    credentials: "include",
    body: {
      game_id: gameID,
      stage_1: storyID1,
      stage_2: storyID2,
      stage_3: storyID3,
    },
  });
}

export async function fetchVotingSession(gameID){
  return apiJson(`VotingSession?game_id=${gameID}`, {
    method: "GET",
    credentials: "include"
  })
}

export async function fetchInitialPrompt(gameID, roundNumber) {
  console.log("CreateStory endpoint called")
  const response = await apiJson("CreateStory", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      game_id: gameID,
      round_number: roundNumber,
    },
  });

  return response;
}

export async function postStory(gameID, roundNumber, content) {
  console.log("stroy POST endpoint called")
  return apiJson("StorySubmission", {
    method: "POST",
    credentials: "include",
    body: {
      game_id: gameID,
      round_number: roundNumber,
      content: content?.trim(),
    },
  });
}

export async function fetchUserId() {
  const res = await fetch(`${api}/WhoAmI`, {
    method: "GET",
    credentials: "include"
  });

  const data = await res.json();
  return data.user_id;
}

export async function fetchPollReady(gameId, roundNumber) {
  const params = new URLSearchParams({
    game_id: String(gameId),
    round_number: String(roundNumber),
  });

  return apiJson(`PollReady?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function fetchNextStoryPart(gameId, roundNumber) {
  const params = new URLSearchParams({
    game_id: String(gameId),
    round_number: String(roundNumber),
  });

  return apiJson(`NextStoryPart?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function postUser(username, password) {
  return apiJson("CreateUser", {
    method: "POST",
    body: {
      username: username.trim(),
      password: password,
    },
  });
}

export async function fetchResults(gameID) {
  return apiJson(`Results?game_id=${gameID}`, {
    method: "GET",
    credentials: "include"
  })
}
