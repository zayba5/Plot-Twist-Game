import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import { socket } from "./global.jsx";
import { fetchGameStories, fetchVotingSession, fetchResults } from "./Utility.jsx";
import { useNavigate } from "react-router-dom";
import Timer from "./timer.jsx";

const StoryPart = ({ part }) => {
  if (!part) return null;

  return (
    <div className="story-part">
      <p className="part-username">{part.username ?? "Unknown player"}</p>
      <p>{part.part_content ?? "No content available"}</p>
    </div>
  );
};

const WinnerBadge = ({ tag, className }) => {
  return (
    <div className={`winner-badge ${className}`}>
      <div className="badge-text">{tag}</div>
      <div className="badge-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path d="M458.622 255.92l45.985-45.005c13.708-12.977 7.316-36.039-10.664-40.339l-62.65-15.99 17.661-62.015c4.991-17.838-11.829-34.663-29.661-29.671l-61.994 17.667-15.984-62.671C337.085.197 313.765-6.276 300.99 7.228L256 53.57 211.011 7.229c-12.63-13.351-36.047-7.234-40.325 10.668l-15.984 62.671-61.995-17.667C74.87 57.907 58.056 74.738 63.046 92.572l17.661 62.015-62.65 15.99C.069 174.878-6.31 197.944 7.392 210.915l45.985 45.005-45.985 45.004c-13.708 12.977-7.316 36.039 10.664 40.339l62.65 15.99-17.661 62.015c-4.991 17.838 11.829 34.663 29.661 29.671l61.994-17.667 15.984 62.671c4.439 18.575 27.696 24.018 40.325 10.668L256 458.61l44.989 46.001c12.5 13.488 35.987 7.486 40.325-10.668l15.984-62.671 61.994 17.667c17.836 4.994 34.651-11.837 29.661-29.671l-17.661-62.015 62.65-15.99c17.987-4.302 24.366-27.367 10.664-40.339l-45.984-45.004z" />
        </svg>
      </div>
    </div>
  );
};

const StoryCard = ({ story, winners, tags }) => {
  if (!story) return null;

  const winningEntry = winners.find((w) => w.story_id === story.story_id);

  return (
    <div className="story-vote-card">
      <div className="story-stack">
        {story.story_parts?.map((part, idx) => (
          <StoryPart part={part} key={idx} />
        ))}
      </div>

      <div className="badge-stack">
        {winningEntry?.is_winner_cont ? (
          <WinnerBadge tag={tags[0]} className="badge-cont" />
        ) : (
          <div />
        )}

        {winningEntry?.is_winner_cat_1 ? (
          <WinnerBadge tag={tags[1]} className="badge-cat-1" />
        ) : (
          <div />
        )}

        {winningEntry?.is_winner_cat_2 ? (
          <WinnerBadge tag={tags[2]} className="badge-cat-2" />
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};

const StoryCardList = ({ winners, tags, gameId }) => {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    async function loadStories() {
      if (!gameId) return;

      try {
        const data = await fetchGameStories(gameId);
        setStories(data.stories ?? []);
      } catch (error) {
        console.error("Failed to load stories:", error);
        setStories([]);
      }
    }

    loadStories();
  }, [gameId]);

  return (
    <div id="story-result-card-list" className="story-card-list">
      {stories.map((story) => (
        <StoryCard
          story={story}
          key={story.story_id}
          winners={winners.filter((w) => w.story_id === story.story_id)}
          tags={tags}
        />
      ))}
    </div>
  );
};

const ResultsPage = () => {
  const navigate = useNavigate();

  const [votingSession, setVotingSession] = useState(null);
  const [results, setResults] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [endTimeMs, setEndTimeMs] = useState(null);
  const [hasClickedContinue, setHasClickedContinue] = useState(false);
  const [readyCount, setReadyCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  const finished = useRef(false);
  const tag1 = "Continue";

  const endRound = useCallback((reason, path, payload = null) => {
    if (finished.current) return;
    finished.current = true;
    console.log("round finished because:", reason, payload);
    navigate(path);
  }, [navigate]);

  const handleTimerExpire = useCallback(() => {
    if (!gameId || hasClickedContinue) return;
    socket.emit("results_continue", { game_id: gameId });
    setHasClickedContinue(true);
  }, [gameId, hasClickedContinue]);

  const handleButtonClick = () => {
    if (!gameId || hasClickedContinue) return;
    socket.emit("results_continue", { game_id: gameId });
    setHasClickedContinue(true);
  };

  useEffect(() => {
    async function handleResultsStarted(payload) {
      try {
        const incomingGameId = payload?.game_id;
        console.log("show_results received with game_id:", incomingGameId);

        if (!incomingGameId) {
          console.error("No game_id in show_results payload");
          setVotingSession(null);
          return;
        }

        setGameId(incomingGameId);

        const sessionData = await fetchVotingSession(incomingGameId);
        setVotingSession(sessionData);

        const parsedEndTimeMs = new Date(sessionData?.results_end_at).getTime();
        console.log("results_end_at raw:", sessionData?.results_end_at);
        console.log("results_end_at parsed:", parsedEndTimeMs);

        if (Number.isFinite(parsedEndTimeMs)) {
          setEndTimeMs(parsedEndTimeMs);
        } else {
          setEndTimeMs(null);
        }
      } catch (error) {
        console.error("Failed to load voting session:", error);
        setVotingSession(null);
      }
    }

    socket.on("results_shown", handleResultsStarted);

    return () => {
      socket.off("results_shown", handleResultsStarted);
    };
  }, []);

  useEffect(() => {
    function showResults() {
      socket.emit("show_results", {});
      console.log("emitted show_results");
    }

    if (socket.connected) {
      showResults();
    } else {
      socket.on("connect", showResults);
    }

    return () => {
      socket.off("connect", showResults);
    };
  }, []);

  useEffect(() => {
    async function loadResults() {
      if (!gameId) return;

      try {
        const data = await fetchResults(gameId);
        setResults(data);
        setTotalPlayers(data.total_players ?? 0);
      } catch (error) {
        console.error("Failed to load results:", error);
        setResults(null);
      }
    }

    loadResults();
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    socket.emit("join_game_room", { game_id: gameId });
  }, [gameId]);

  useEffect(() => {
    function handleReadyUpdate(payload) {
      if (!payload || payload.game_id !== gameId) return;
      setReadyCount(payload.ready_count ?? 0);
      setTotalPlayers(payload.total_players ?? 0);
    }

    function handleContinueAll(payload) {
      if (!payload || payload.game_id !== gameId) return;
      endRound("all_players_ready", payload.path, payload);
    }

    socket.on("results_ready_update", handleReadyUpdate);
    socket.on("results_continue_all", handleContinueAll);

    return () => {
      socket.off("results_ready_update", handleReadyUpdate);
      socket.off("results_continue_all", handleContinueAll);
    };
  }, [gameId, endRound]);

  if (!votingSession || !results) {
    return <div className="game-window" id="results-page"></div>;
  }

  const tags = [tag1, results.cat_1, results.cat_2];

  return (
    <div className="game-window" id="results-page">
      <div className="game-window-header">
        <h1>Your Results</h1>
        <Timer endTimeMs={endTimeMs} onExpire={handleTimerExpire} />
      </div>

      <StoryCardList winners={results.winners} tags={tags} gameId={gameId} />

      <div className="game-window-control-bar">
        <p>{readyCount} / {totalPlayers} players ready</p>
        <div></div>
        <button
          className="button clickable"
          onClick={handleButtonClick}
          disabled={hasClickedContinue}
        >
          {hasClickedContinue ? "Waiting..." : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default ResultsPage;