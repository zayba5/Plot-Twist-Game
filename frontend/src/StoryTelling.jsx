import React, { useEffect, useMemo, useState, useRef } from "react";
import "./index.css";
import { fetchItem } from "./Utility.jsx";
import { fetchCurrentStory, fetchUserId, fetchPollReady, fetchNextStoryPart } from "./Utility";
import { postStory } from "./Utility.jsx";
import { socket } from "./global.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import DebugPanel from "./DebugPanel.jsx";

// Hardcode game settings
const ROUND_TIME_SECONDS = 60000; // on deployment change it to 60
const MAX_ROUNDS = 3;

// UI
const Header = ({ roundNumber, maxRounds }) => {
  return (
    <div className="game-window-header">
      <h1>Write your story</h1>
      <p>Round {roundNumber} / {maxRounds}</p>
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

const TimerBar = ({ timeLeft }) => {
  return (
    <div className="timer-box">
      <p>Time remaining: {timeLeft}s</p>
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

const ControlBar = ({ onSubmit, disabled, submitted, submitting, timeLeft }) => {
  return (
    <div className="game-window-control-bar">
      <div className="control-bar-left">
        <span>
          {submitted
            ? "Submitted"
            : submitting
            ? "Submitting..."
            : `Auto-submit in ${timeLeft}s`}
        </span>
      </div>
      <div></div>

      <button
        className="button"
        onClick={onSubmit}
        disabled={disabled || submitting}
      >
        {(!submitted && submitting) ? "Submitting..." : (submitted)? "Submitted": "Submit"}
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
  const [prompt, setPrompt] = useState("");
  const [storyText, setStoryText] = useState("");

  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [innerRoundNumber, setInnerRoundNumber] = useState(-1);
  const [outerRoundNumber, setOuterRoundNumber] = useState(-1);
  const [claimError, setClaimError] = useState("");
  const [userId, setUserId] = useState(null);

  const [status, setStatus] = useState("idle"); // idle | submitting | waiting | ready | error
  const [isPolling, setIsPolling] = useState(false);
  const [fetchNext, setFetchNext] = useState(false);

  const gameIdRef = useRef(gameId);
  const innerRoundRef = useRef(innerRoundNumber);
  const outerRoundRef = useRef(outerRoundNumber);
  const hasClaimedRef = useRef(false);

  const canSubmit = useMemo(() => {
    return !submitted && storyText.trim().length > 0;
  }, [submitted, storyText]);

  const [showDebug, setShowDebug] = useState(false);
  const debugData = useMemo(() => ({
    gameId,
    storyId,
    innerRoundNumber,
    outerRoundNumber,
    userId,
    prompt,
    storyText,
    timeLeft,
    submitting,
    submitted,
    claimError,
    status,
    isPolling,
    fetchNext,
    canSubmit,
    hasClaimed: hasClaimedRef.current,
    gameIdRef: gameIdRef.current,
    innerRoundRef: innerRoundRef.current,
    outerRoundRef: outerRoundRef.current,
  }), [
    gameId,
    storyId,
    innerRoundNumber,
    outerRoundNumber,
    userId,
    prompt,
    storyText,
    timeLeft,
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

        setGameId(res.game_id);
        setStoryId(res.story_id);
        setInnerRoundNumber(res.inner_round_number);
        setOuterRoundNumber(res.outer_round_number);
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

  // update the timer, stops when submitted or no time left
  useEffect(() => {
    if (submitted) return;
    if (timeLeft <= 0) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, submitted]);
  
  //auto submission when timer runs out
  useEffect(() => {
    if (timeLeft === 0 && !submitted && !submitting) {
      console.log(`timeLeft: ${timeLeft}, submitted: ${submitted}, submitting: ${submitting}`);
      handleSubmit(true);
    }
  }, [timeLeft, submitted, submitting]);

  //sets and shows UserId on page
  useEffect(() => {
    if (hasClaimedRef.current) return;
    hasClaimedRef.current = true;

    console.log("joining game:", gameId);
    socket.emit("join_game", { game_id: gameId });
    fetchUserId().then(setUserId);

  }, [gameId]);

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
          roundRef.current
        );

        if (cancelled) return;

        if (data?.status === "ready") {
          setStatus("idle");
          setSubmitted(false);
          setIsPolling(false); // stops the polling
          setFetchNext(true); // trigger the next fetch
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
        const res = await fetchNextStoryPart(gameId, roundNumber);

        if (!res.ok) {
          throw new Error(res.error || "Something went wrong");
        }

        if (res.status === "voting") {
          setStoryText("");
          setFetchNext(false);

          // create an entry in voting
          navigate("/vote");
          return;
        }

        if (res.status === "ready") {
          setPrompt(res.prompt);
          setRoundNumber(res.round_number);
          setStoryText("");
          setFetchNext(false);
        }

      } catch (err) {
        console.error(`Error fetching prompt after sending round ${roundRef}:`, err);
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
      console.log(`sending to backend: gameId: ${gameId}, roundNumber: ${roundNumber}, normStorytext: ${normStorytext}`);
      const result = await postStory(gameId, roundNumber, normStorytext);

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

  return (
    <div className="game-window" id="storytelling-page">
      
      <div>
          <DebugPanel
            title="Story Page State"
            data={debugData}
            enabled={showDebug}
            onToggle={setShowDebug}
          />
        <label><strong>Claimed Player: {userId || "Not assigned"}</strong></label> 
        {claimError ? <div>{claimError}</div> : null}
        <div><label><strong>Status: {status || "no status available"}</strong></label></div>
      </div>

      <Header innerRoundNumber={innerRoundNumber} maxRounds={MAX_ROUNDS} />
      <PromptBox prompt={prompt} />
      <TimerBar timeLeft={timeLeft} />
      <StoryInput
        storyText={storyText}
        setStoryText={setStoryText}
        disabled={submitted}
      />
      <ControlBar
        onSubmit={() => handleSubmit(false)}
        disabled={!canSubmit}
        submitted={submitted}
        submitting={submitting}
        timeLeft={timeLeft}
      />
    </div>
  );
};

export default StorytellingPage;