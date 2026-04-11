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

export async function fetchCurrentStory(gameID = null) {
  return await apiJson("CreateStory", {
    method: "POST",
    credentials: "include",
    body: gameID ? { game_id: gameID } : {},
  });
}

export async function postStory(gameID, outerRoundNumber, innerRoundNumber, content) {
  console.log("stroy POST endpoint called")
  return apiJson("StorySubmission", {
    method: "POST",
    credentials: "include",
    body: {
      game_id: gameID,
      outer_round_number: outerRoundNumber,
      inner_round_number: innerRoundNumber,
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

export async function fetchPollReady(gameId, outerRoundNumber, innerRoundNumber) {
  const params = new URLSearchParams({
    game_id: String(gameId),
    outer_round_number: String(outerRoundNumber),
    inner_round_number: String(innerRoundNumber),
  });

  return apiJson(`PollReady?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function fetchNextStoryPart(gameId, outerRoundNumber, innerRoundNumber) {
  const params = new URLSearchParams({
    game_id: String(gameId),
    outer_round_number: String(outerRoundNumber),
    inner_round_number: String(innerRoundNumber),
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
