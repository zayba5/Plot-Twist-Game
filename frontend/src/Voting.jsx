import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import { socket } from "./global.jsx";
import { fetchGameStories, postVote, fetchVotingSession } from "./Utility.jsx";
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

  const classes = isSelected ? "story-vote-card selected-card clickable" : "story-vote-card clickable";

  return (
    <div className={classes} onClick={() => onClick(story.story_id)}>
      {story.story_parts?.map((part, idx) => (
        <StoryPart part={part} key={idx} />
      ))}
    </div>
  );
};

const VoteNav = () => {

  return (
    <div id="vote-nav">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" id="left-arrow" className="nav-arrow clickable">
        <path d="M448 208v96c0 13.3-10.7 24-24 24H224v103.8c0 21.4-25.8 32.1-41 17L7 273c-9.4-9.4-9.4-24.6 0-34L183 63.3c15.1-15.1 41-4.4 41 17V184h200c13.3 0 24 10.7 24 24z" /></svg>

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="nav-circle clickable cur-circle"><defs><style></style></defs>
        <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 424c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" class="fa-secondary" />
        <path d="M256 432c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" class="fa-primary" /></svg>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="nav-circle clickable"><defs><style></style></defs>
        <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 424c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" class="fa-secondary" />
        <path d="M256 432c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" class="fa-primary" /></svg>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="nav-circle clickable"><defs><style></style></defs>
        <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 424c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" class="fa-secondary" />
        <path d="M256 432c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" class="fa-primary" /></svg>

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" id="right-arrow" className="nav-arrow clickable">
        <path d="M0 304v-96c0-13.3 10.7-24 24-24h200V80.2c0-21.4 25.8-32.1 41-17L441 239c9.4 9.4 9.4 24.6 0 34L265 448.7c-15.1 15.1-41 4.4-41-17V328H24c-13.3 0-24-10.7-24-24z" /></svg>

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

const ControlBar = ({ selectedStoryId, gameId, submitting, setSubmitting }) => {
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
      <div></div>
      <VoteNav />
      <button
        className="button clickable"
        id="vote-button"
        onClick={handleVoteClick}
        disabled={!selectedStoryId || submitting}
      >
        {submitting ? "Voting..." : "Vote"}
      </button>
    </div>
  );
};

const Header = ({ handleTimerExpire, time, title }) => {

  return (
    <div className="game-window-header">
      <h1>{title}</h1>
      <Timer durationSec={time} onExpire={handleTimerExpire} />
    </div>
  );
};

const VotingPage = () => {
  const navigate = useNavigate();
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [votingSession, setVotingSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const finished = useRef(false)
  let prompt1 = "Which story would you like to continue?";

  ///////////////hardcoded beware//////////////////////
  const gameId = "01731b8d-0f53-42a2-9172-49674c247858";

  const endRound = useCallback((reason, path, payload = null) => {
    if (finished.current) return;
    finished.current = true;
    console.log("round finished because:", reason, payload);
    navigate(path);
  }, [navigate]);

  const handleTimerExpire = async () => {
    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);

      if (selectedStoryId) {
        const result = await postVote(gameId, selectedStoryId);
      }
    } catch (error) {
      console.error("postVote failed:", error);
    } finally {
      setSubmitting(false);

      socket.emit("voting_round_expired", { game_id: gameId })
      if (!votingSession) return;
      if (votingSession.voting_session_number === votingSession.num_voting_sessions) {
        endRound("timer_expired", "/score")
      }
      else {
        endRound("timer_expired", "/story");
      }
    }
  };

  useEffect(() => {
    async function loadVotingSession() {
      try {
        setLoadingSession(true);
        const data = await fetchVotingSession(gameId);
        setVotingSession(data);

      } catch (error) {
        console.error("Failed to load voting session:", error);
        setVotingSession(null);
      } finally {
        setLoadingSession(false);
      }
    }
    loadVotingSession();
  }, [gameId]);


  useEffect(() => {
    function handleAllVotesIn(payload) {
      console.log("all votes in:", payload);
      if (!votingSession) return;
      if (votingSession.voting_session_number === votingSession.num_voting_sessions) {
        endRound("all_votes_in", "/score", payload)
      }
      else {
        endRound("all_votes_in", "/story", payload)
      }
    }

    socket.emit("join_game_room", { game_id: gameId });
    socket.on("all_votes_in", handleAllVotesIn);

    return () => {
      socket.off("all_votes_in", handleAllVotesIn);
    };
  }, [gameId, endRound, votingSession]);

  if (!votingSession) {
    return (
      <div className="game-window" id="voting-page">
      </div>
    );
  }

  return (
    <div className="game-window" id="voting-page">
      <Header handleTimerExpire={handleTimerExpire} time={votingSession.timer} title={prompt1} />
      <StoryCardList
        selectedStoryId={selectedStoryId}
        setSelectedStoryId={setSelectedStoryId}
      />
      <ControlBar
        selectedStoryId={selectedStoryId}
        gameId={gameId}
        submitting={submitting}
        setSubmitting={setSubmitting}
      />
    </div>
  );
};

export default VotingPage;