import { apiJson } from "./global.jsx";

export async function fetchItem() {
  return apiJson("Sample", {
    method: "GET",
  });
}

//fetch stories and their parts for a given game
const USE_MOCK_DATA = true; // for testing, change to false in deployment
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

  return apiJson("Story", {
    method: "GET",
  });
}

export async function fetchScores() {
  return apiJson("Scores", {
    method: "GET",
  });
}

//post vote for a voting session in a game
export async function postVote(gameID, storyID) {
  return apiJson("TestVote", { //<---change this to Vote when stories work properly
    method: "POST",
    body: {
      game_id: gameID,
      story_id: storyID,
    },
  });
}

export async function postStory(gameID, roundNumber, content) {
  console.log("stroy POST endpoint called")
  return apiJson("StorySubmission", {
    method: "POST",
    body: {
      game_id: gameID,
      round_number: roundNumber,
      content: content?.trim(),
    },
  });
}