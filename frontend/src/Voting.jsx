import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import { socket, getCookie } from "./global.jsx";
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

const VoteNav = ({ curPage, visitedPages, setCurPage, setVisitedPages }) => {

  const totalPages = 3;

  const rightArrowClick = () => {
    if (curPage >= totalPages) return;

    const nextPage = curPage + 1;
    setCurPage(nextPage);

    setVisitedPages((prev) =>
      prev.includes(nextPage) ? prev : [...prev, nextPage]
    );
  };

  const leftArrowClick = () => {
    if (curPage <= 1) return;
    setCurPage((prev) => prev - 1);
  };

  const classes = (pageNum) => {
    const isActive = curPage === pageNum;
    const isVisited = visitedPages.includes(pageNum);

    if (isVisited) {
      return isActive
        ? "nav-circle clickable cur-circle"
        : "nav-circle clickable visited-circle";
    }

    return "nav-circle clickable";
  };

  return (
    <div id="vote-nav">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" onClick={leftArrowClick} id="left-arrow" className="nav-arrow clickable">
        <path d="M448 208v96c0 13.3-10.7 24-24 24H224v103.8c0 21.4-25.8 32.1-41 17L7 273c-9.4-9.4-9.4-24.6 0-34L183 63.3c15.1-15.1 41-4.4 41 17V184h200c13.3 0 24 10.7 24 24z" /></svg>

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" id="1" className={classes(1)}><defs><style></style></defs>
        <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 424c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" className="fa-secondary" />
        <path d="M256 432c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" className="fa-primary" /></svg>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" id="2" className={classes(2)}><defs><style></style></defs>
        <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 424c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" className="fa-secondary" />
        <path d="M256 432c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" className="fa-primary" /></svg>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" id="3" className={classes(3)}><defs><style></style></defs>
        <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 424c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" className="fa-secondary" />
        <path d="M256 432c-97.06 0-176-79-176-176S158.94 80 256 80s176 79 176 176-78.94 176-176 176z" className="fa-primary" /></svg>

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" onClick={rightArrowClick} id="right-arrow" className="nav-arrow clickable">
        <path d="M0 304v-96c0-13.3 10.7-24 24-24h200V80.2c0-21.4 25.8-32.1 41-17L441 239c9.4 9.4 9.4 24.6 0 34L265 448.7c-15.1 15.1-41 4.4-41-17V328H24c-13.3 0-24-10.7-24-24z" /></svg>

    </div>
  );
};

const StoryCardList = ({ selectedStoryId, setSelectedStoryId, curPage, gameId }) => {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    async function loadStories() {
      try {
        const data = await fetchGameStories(gameId);
        setStories(data.stories ?? []);
      } catch (error) {
        console.error("Failed to load stories:", error);
        setStories([]);
      }
    }

    loadStories();
  }, []);

  return (
    <div id="story-vote-card-list" className="story-card-list">
      {stories.map((story) => (
        <StoryCard
          story={story}
          key={story.story_id}
          onClick={(storyId) => {
            setSelectedStoryId((prev) => {
              const next = [...prev];
              next[curPage - 1] = storyId;
              return next;
            });
          }}
          isSelected={story.story_id === selectedStoryId[curPage - 1]}
        />
      ))}
    </div>
  );
};

const ControlBar = ({ selectedStoryId, gameId, submitting, setSubmitting,
  curPage, setCurPage, visitedPages, setVisitedPages }) => {
  const handleVoteClick = async () => {
    if (!selectedStoryId || submitting) return;

    try {
      setSubmitting(true);
      const result = await postVote(gameId, selectedStoryId[0], selectedStoryId[1], selectedStoryId[2]); console.log("vote submitted:", result);
    } catch (error) {
      console.error("Failed to submit vote:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="game-window-control-bar">
      <div></div>
      <VoteNav visitedPages={visitedPages} curPage={curPage}
        setCurPage={setCurPage} setVisitedPages={setVisitedPages} />
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

const Header = ({ handleTimerExpire, time, titles, curPage }) => {

  //replace time with var
  return (
    <div className="game-window-header">
      <h1>{titles[curPage - 1]}</h1>
      <Timer durationSec={300} onExpire={handleTimerExpire} />
    </div>
  );
};

const VotingPage = () => {
  const navigate = useNavigate();
  const [selectedStoryId, setSelectedStoryId] = useState([null, null, null]);
  const [submitting, setSubmitting] = useState(false);
  const [votingSession, setVotingSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [curPage, setCurPage] = useState(1);
  const [visitedPages, setVisitedPages] = useState([1])
  const [gameId, setGameId] = useState(null);

  const finished = useRef(false)
  let prompt1 = "Which story would you like to continue?";

  //const gameId = "01731b8d-0f53-42a2-9172-49674c247858";



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
        const result = await postVote(gameId, selectedStoryId[0], selectedStoryId[1], selectedStoryId[2]);
      }
    } catch (error) {
      console.error("postVote failed:", error);
    } finally {
      setSubmitting(false);

      socket.emit("voting_round_expired", { game_id: gameId })
      if (!votingSession) return;
      if (votingSession.voting_session_number === votingSession.num_voting_sessions) {
        endRound("timer_expired", "/results")
      }
      else {
        endRound("timer_expired", "/results");
      }
    }
  };

  useEffect(() => {
    async function handleVotingStarted(payload) {
      try {
        setLoadingSession(true);

        const incomingGameId = payload?.game_id;
        console.log("voting_started received with game_id:", incomingGameId);
        if (!incomingGameId) {
          console.error("No game_id in voting_started payload");
          setVotingSession(null);
          return;
        }

        setGameId(incomingGameId);

        const data = await fetchVotingSession(incomingGameId);
        setVotingSession(data);
      } catch (error) {
        console.error("Failed to load voting session:", error);
        setVotingSession(null);
      } finally {
        setLoadingSession(false);
      }
    }

    socket.on("voting_started", handleVotingStarted);

    return () => {
      socket.off("voting_started", handleVotingStarted);
    };
  }, []);

  useEffect(() => {
    function beginVoting() {
      socket.emit("begin_voting", {});
      console.log("emitted begin_voting");
    }

    if (socket.connected) {
      beginVoting();
    } else {
      socket.on("connect", beginVoting);
    }

    return () => {
      socket.off("connect", beginVoting);
    };
  }, []);


  useEffect(() => {
    function handleAllVotesIn(payload) {
      console.log("all votes in:", payload);
      if (!votingSession) return;
      if (votingSession.voting_session_number === votingSession.num_voting_sessions) {
        endRound("all_votes_in", "/results", payload)
      }
      else {
        endRound("all_votes_in", "/results", payload)
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

  const titles = [prompt1, votingSession.cat_1, votingSession.cat_2]

  return (
    <div className="game-window" id="voting-page">
      <Header handleTimerExpire={handleTimerExpire}
        time={votingSession.timer} titles={titles} curPage={curPage} />
      <StoryCardList
        selectedStoryId={selectedStoryId}
        setSelectedStoryId={setSelectedStoryId}
        curPage={curPage}
        gameId={gameId}
      />
      <ControlBar
        selectedStoryId={selectedStoryId}
        gameId={gameId}
        submitting={submitting}
        setSubmitting={setSubmitting}
        curPage={curPage}
        setCurPage={setCurPage}
        visitedPages={visitedPages}
        setVisitedPages={setVisitedPages}
      />
    </div>
  );
};

export default VotingPage;