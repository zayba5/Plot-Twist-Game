import { apiJson } from "./global.jsx";

export async function fetchItem() {
  return apiJson("Sample", {
    method: "GET",
  });
}

//fetch stories and their parts for a given game
const USE_MOCK_DATA = false; // for testing, change to false in deployment
export async function fetchGameStories() {
  if (USE_MOCK_DATA) {
    return {
      stories: [
        {
          story_id: "1",
          story_parts: [
            { part_content: "Once upon a time, a door appeared in the forest." },
            { part_content: "A traveler opened it and found a glowing staircase." },
            { part_content: "At the top was a library floating in the sky." }
          ]
        },
        {
          story_id: "2",
          story_parts: [
            { part_content: "The train stopped at midnight with no station in sight." },
            { part_content: "Only one passenger stepped off into the fog." },
            { part_content: "She was holding the same suitcase he had lost years ago." }
          ]
        }
      ]
    };
  }

  return apiJson("GetAllStory", {
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

export async function fetchInitialPrompt(gameID, roundNumber) {
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
  const res = await fetch("http://localhost:5000/WhoAmI", {
    method: "GET",
    credentials: "include"
  });

  const data = await res.json();
  return data.user_id;
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