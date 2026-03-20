import React, { useState, useEffect } from "react";
import "./index.css";
import { socket } from "./global.jsx";
import { fetchGameStories, postVote } from "./Utility.jsx";
import { useNavigate } from "react-router-dom";
import Timer from "./timer.jsx";

const StoryPart = ({ part }) => {
  if (!part) return null;

  return (
    <div className="story-part">
      <p>{part.part_content ?? "No content available"}</p>
    </div>
  );
};

const StoryCard = ({ story, isSelected, onClick }) => {
  if (!story) return null;

  const classes = isSelected ? "story-vote-card selected-card" : "story-vote-card";

  return (
    <div className={classes} onClick={() => onClick(story.story_id)}>
      {story.story_parts?.map((part, idx) => (
        <StoryPart part={part} key={idx} />
      ))}
    </div>
  );
};

const StoryCardList = ({ selectedStoryId, setSelectedStoryId }) => {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    async function loadStories() {
      try {
        const data = await fetchGameStories();
        setStories(data.stories ?? []);
      } catch (error) {
        console.error("Failed to load stories:", error);
        setStories([]);
      }
    }

    loadStories();
  }, []);

  return (
    <div id="story-vote-card-list">
      {stories.map((story) => (
        <StoryCard
          story={story}
          key={story.story_id}
          onClick={setSelectedStoryId}
          isSelected={story.story_id === selectedStoryId}
        />
      ))}
    </div>
  );
};

const ControlBar = ({ selectedStoryId, gameId }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleVoteClick = async () => {
    if (!selectedStoryId || submitting) return;

    try {
      setSubmitting(true);
      const result = await postVote(gameId, selectedStoryId);
      console.log("vote submitted:", result);
    } catch (error) {
      console.error("Failed to submit vote:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="game-window-control-bar">
      <button
        className="button"
        id="vote-button"
        onClick={handleVoteClick}
        disabled={!selectedStoryId || submitting}
      >
        {submitting ? "Voting..." : "Vote"}
      </button>
    </div>
  );
};

const Header = () => {
  function handleTimerExpire(){
    console.log("time up");
  }
  return (
    <div className="game-window-header">
      <h1>Vote for your favorite story</h1>
      <Timer durationSec={20} onExpire={handleTimerExpire}/>
    </div>
  );
};

const VotingPage = () => {
  const navigate = useNavigate();
  const [selectedStoryId, setSelectedStoryId] = useState(null);

  ///////////////hardcoded beware//////////////////////
  const gameId = "01731b8d-0f53-42a2-9172-49674c247858"; 

  useEffect(() => {
    function handleAllVotesIn(payload) {
      console.log("all votes in:", payload);
      navigate("/score");
    }

    socket.emit("join_game", { game_id: gameId });
    socket.on("all_votes_in", handleAllVotesIn);

    return () => {
      socket.off("all_votes_in", handleAllVotesIn);
    };
  }, [navigate, gameId]);

  return (
    <div className="game-window" id="voting-page">
      <Header />
      <StoryCardList
        selectedStoryId={selectedStoryId}
        setSelectedStoryId={setSelectedStoryId}
      />
      <ControlBar
        selectedStoryId={selectedStoryId}
        gameId={gameId}
      />
    </div>
  );
};

export default VotingPage;