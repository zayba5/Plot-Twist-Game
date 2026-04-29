import React, { useEffect, useMemo, useState, useRef } from "react";
import "./index.css";
import Waiting from "./Waiting";
import Timer from "./timer.jsx";
import { fetchCurrentStory, fetchUserId, fetchPollReady, fetchNextStoryPart } from "./Utility";
import { postStory } from "./Utility.jsx";
import { socket } from "./global.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import DebugPanel from "./DebugPanel.jsx";
import Chat from "./Chat";

// Hardcode game settings
const ROUND_TIME_SECONDS = 6000; // on deployment change it to 60

// UI
const Header = ({ innerRoundNumber, maxRounds, endTimeMs, onExpire, submitted }) => {
  return (
    <div className="game-window-header">
      <h1>Write your story</h1>
      <p>Round {innerRoundNumber} / {maxRounds}</p>

      {!submitted && (
        <Timer
          endTimeMs={endTimeMs}
          onExpire={onExpire}
        />
      )}
    </div>
  );
};

const PromptBox = ({ prompt }) => {
  return (
    <div className="prompt-box">
      <h2>Prompt</h2>
      <p>{prompt || "Loading prompt..."}</p>
    </div>
  );
};



const StoryInput = ({ storyText, setStoryText, disabled }) => {
  return (
    <div className="story-input-section">
      <label htmlFor="story-input">Your story</label>
      <textarea
        id="story-input"
        className="story-textarea"
        value={storyText}
        onChange={(e) => setStoryText(e.target.value)}
        placeholder="Start writing here..."
        disabled={disabled}
      />
    </div>
  );
};

const ControlBar = ({ onSubmit, disabled, submitted, submitting }) => {
  return (
    <div className="game-window-control-bar">
      <div className="control-bar-left">
        <span>
          {submitted
            ? "Submitted"
            : submitting
            ? "Submitting..."
            : "Submit before the timer ends"}
        </span>
      </div>
      <div></div>

      <button
        className="button"
        onClick={onSubmit}
        disabled={disabled || submitting}
      >
        {!submitted && submitting
          ? "Submitting..."
          : submitted
          ? "Submitted"
          : "Submit"}
      </button>
    </div>
  );
};

//main component of StoryTelling
const StorytellingPage = () => {
  const navigate = useNavigate();
  //const gameId = "01731b8d-0f53-42a2-9172-49674c247858";
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // use URL game id as initial hint 
  const initialUrlGameId = queryParams.get("game_id");
  const [gameId, setGameId] = useState(null);
  const [storyId, setStoryId] = useState(null);
  const [maxRound, setMaxRound] = useState(-1);
  const [prompt, setPrompt] = useState("");
  const [storyText, setStoryText] = useState("");

  const [endTimeMs, setEndTimeMs] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [innerRoundNumber, setInnerRoundNumber] = useState(-1);
  const [outerRoundNumber, setOuterRoundNumber] = useState(-1);
  const [claimError, setClaimError] = useState("");
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [players, setPlayers] = useState([]);

  const [status, setStatus] = useState("idle"); // idle | submitting | waiting | ready | error
  const [isPolling, setIsPolling] = useState(false);
  const [fetchNext, setFetchNext] = useState(false);

  const gameIdRef = useRef(gameId);
  const innerRoundRef = useRef(innerRoundNumber);
  const outerRoundRef = useRef(outerRoundNumber);
  const hasClaimedRef = useRef(false);
  const waitingTimeoutRef = useRef(null);

  const canSubmit = !submitted && storyText.trim().length > 0;

  const [showDebug, setShowDebug] = useState(false);
  const shouldTriggerWaiting = submitted && isPolling;
  const [showWaiting, setShowWaiting] = useState(false);
  const shouldShowWaiting = showWaiting;


  const debugData = useMemo(() => (  
    {game: {
      gameId,
      storyId,
      maxRound,
      innerRoundNumber,
      outerRoundNumber,
    },
    player: {
      userId,
      hasClaimed: hasClaimedRef.current,
    },
    ui: {
      prompt,
      storyText,
      endTimeMs,
      submitting,
      submitted,
      canSubmit,
    },
    status: {
      status,
      claimError,
      isPolling,
      fetchNext,
    },
    refs: {
      gameIdRef: gameIdRef.current,
      innerRoundRef: innerRoundRef.current,
      outerRoundRef: outerRoundRef.current,
    }}), [
    gameId,
    storyId,
    maxRound,
    innerRoundNumber,
    outerRoundNumber,
    userId,
    prompt,
    storyText,
    endTimeMs,
    submitting,
    submitted,
    claimError,
    status,
    isPolling,
    fetchNext,
    canSubmit,
  ]);

  //refs
  useEffect(() => {
    gameIdRef.current = gameId;
    innerRoundRef.current = innerRoundNumber;
    outerRoundRef.current = outerRoundNumber;
  }, [gameId, innerRoundNumber, outerRoundNumber]);


  //initial prompt fetching, should only run once per mount
  // case 1: fresh start
  // case 2: return from voting
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchCurrentStory(initialUrlGameId);

        if (!res.ok) {
          throw new Error(res.error || "Something went wrong");
        }
        setEndTimeMs(Date.now() + ROUND_TIME_SECONDS * 1000);
        setGameId(res.game_id);
        setStoryId(res.story_id);
        setInnerRoundNumber(res.inner_round_number);
        setOuterRoundNumber(res.outer_round_number);
        setMaxRound(res.max_round)
        setUserId(res.user_id);

        if (res.parent_story_last_part) {
          setPrompt(res.parent_story_last_part);
        } else {
          setPrompt("Your Story starts here! Think of an initial prompt for the next player!");
        }
        
      } catch (err) {
        console.error("Error fetching current story:", err);
        setClaimError(err.message || "Failed to load story");
        setStatus("error");
      }
    };

    loadData();
  }, []);

  //sets and shows UserId on page

  useEffect(() => {
    if (!gameId) return;

    socket.emit("join_game", {
      game_id: gameId,
      game_code: initialUrlGameId
    });

    const loadUser = async () => {
      const res = await fetch("http://localhost:5000/session", {
        credentials: "include",
      });
      const data = await res.json();

      setUserId(data.user_id);
      setUsername(data.username || "Player");
    };

    loadUser();
  }, [gameId, initialUrlGameId]);


  // frontend polling to check if other players are ready, interval: 2 s
  useEffect(() => {
    if (!isPolling) return;

    console.log("polling actually started");
    console.trace("setIsPolling(true)");
    let cancelled = false;
    let timeoutId = null;

    async function check() {
      if (cancelled) return;

      try {
        const data = await fetchPollReady(
          gameIdRef.current,
          outerRoundRef.current,
          innerRoundRef.current
        );

        if (cancelled) return;

        if (data?.status === "ready") {
          setStatus("idle");
          setSubmitted(false);
          setIsPolling(false); // stops the polling
          setFetchNext(true); // trigger the next fetch
          setEndTimeMs(Date.now() + ROUND_TIME_SECONDS * 1000); // reset the timer
          return;
        }

        setStatus("Waiting for other players...");
      } catch (err) {
        if (!cancelled) {
          console.error("Polling failed:", err);
        }
      }

      if (!cancelled) {
        timeoutId = setTimeout(check, 2000);
      }
    }

    check();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPolling]);

  // fetching the next prompt
  // create a voting entry once max rounds reached
  useEffect(() => {
    if (!fetchNext) return; //guarding
    const newPrompt = async () => {
      try {
        const res = await fetchNextStoryPart(gameId, outerRoundNumber, innerRoundNumber);

        if (!res.ok) {
          throw new Error(res.error || "Something went wrong");
        }

        if (res.status === "voting") { // at this point we already created an entry in voting
          setStoryText("");
          setFetchNext(false);

          
          navigate("/vote");
          return;
        }

        if (res.status === "ready") {
          setPrompt(res.prompt);
          setInnerRoundNumber(res.inner_round_number);
          setStoryText("");
          setFetchNext(false);
          setEndTimeMs(Date.now() + ROUND_TIME_SECONDS * 1000); //reset timer
        }

      } catch (err) {
        console.error(
          `Error fetching prompt after sending outer ${outerRoundNumber}, inner ${innerRoundNumber}:`,
          err
        );
        console.error(err.message || "Failed to load subsequent prompt");
      }
    }
    newPrompt();

  }, [fetchNext]);

  useEffect(() => {
  socket.on("game_started", (data) => {
    if (data.game_id === gameId) {
      console.log("Game started for this lobby!", data);
      // You can reset prompt or show instructions
    }
  });

  return () => socket.off("game_started");
  }, [gameId]);

  const handleSubmit = async (isAutoSubmit = false) => {
    if (submitted || submitting) return;

    try {
      setSubmitting(true);

      const normStorytext = storyText?.trim() || "someone forgot to type!";
      console.log(`sending to backend: gameId: ${gameId}, innerRoundNumber: ${innerRoundNumber}, normStorytext: ${normStorytext}`);
      const result = await postStory(gameId, outerRoundNumber, innerRoundNumber, normStorytext);

      console.log(isAutoSubmit ? "auto-submitted:" : "manual-submitted:", result);

      setSubmitted(true);
      setStatus("Waiting for other players to finish this round...");
      setIsPolling(true); // triggers polling
    } catch (error) {
      console.error("Failed to submit story:", error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    // clear any previous timer
    if (waitingTimeoutRef.current) {
      clearTimeout(waitingTimeoutRef.current);
      waitingTimeoutRef.current = null;
    }

    if (shouldTriggerWaiting) {
      waitingTimeoutRef.current = setTimeout(() => {
        setShowWaiting(true);
      }, 200);
    } else {
      // reset immediately when condition is false
      setShowWaiting(false);
    }

    return () => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
      }
    };
  }, [shouldTriggerWaiting]);
  return (
    <div className="storytelling-container">

      {/* LEFT SIDE: your existing game */}
      <div className="game-window" id="storytelling-page">

        <Header
          innerRoundNumber={innerRoundNumber}
          maxRounds={maxRound}
          endTimeMs={submitted ? null : endTimeMs}
          onExpire={() => handleSubmit(true)}
          submitted={submitted}
        />

        {shouldShowWaiting ? (
          <Waiting
            topText="Aligning the Stars"
            bottomText="Waiting for other players"
          />
        ) : (
          <div id="story-prompt-wrapper">
            <PromptBox prompt={prompt} />
            <StoryInput
              storyText={storyText}
              setStoryText={setStoryText}
              disabled={submitted}
            />
          </div>
        )}
        <div></div>
        <ControlBar
          onSubmit={() => handleSubmit(false)}
          disabled={!canSubmit}
          submitted={submitted}
          submitting={submitting}
        />

      </div>

      {/* RIGHT SIDE: chat sidebar */}
        {username && (
          <Chat
            username={username}
            currentUserId={userId}
            gameId={gameId}
            players={players || []}
          />
        )}

    </div>
  );
};

export default StorytellingPage;