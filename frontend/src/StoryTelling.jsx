import React, { useEffect, useMemo, useState, useRef } from "react";
import "./index.css";
import { fetchItem } from "./Utility.jsx";
import { fetchGameStories, fetchInitialPrompt, fetchUserId, fetchNextStoryPart } from "./Utility";
import { postStory } from "./Utility.jsx";
import { socket } from "./global.jsx";
import { useNavigate } from "react-router-dom";

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

      <button
        className="button"
        onClick={onSubmit}
        disabled={disabled || submitting}
      >
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
};

//main component of StoryTelling
const StorytellingPage = () => {
  const navigate = useNavigate();

  const gameId = "01731b8d-0f53-42a2-9172-49674c247858";

  const [prompt, setPrompt] = useState("");
  const [storyText, setStoryText] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [claimError, setClaimError] = useState("");
  const [userId, setUserId] = useState(null);
  const hasClaimedRef = useRef(false);
  const [status, setStatus] = useState("idle"); // idle | submitting | waiting | ready | error
  const [isPolling, setIsPolling] = useState(false);
  const canSubmit = useMemo(() => {
    return !submitted && storyText.trim().length > 0;
  }, [submitted, storyText]);

  //initial prompt fetching, should only run once per mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchInitialPrompt(gameId, roundNumber);

        // if your apiJson already returns parsed JSON:
        if (!res.ok) {
          throw new Error(res.error || "Something went wrong");
        }

        // success case
        setPrompt("Your Story starts here! Think of an initial prompt for the next player!");

      } catch (err) {
        console.error("Error fetching initial prompt:", err);
        console.error(err.message || "Failed to load initial prompt");
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
    //socket.emit("join_game", { game_id: gameId });
    fetchUserId().then(setUserId);

  }, [gameId]);

  // frontend polling to check if other players are ready, interval: 2 s
  useEffect(() => {
    if (!isPolling) return;

    let cancelled = false;

    async function check() {
      if (cancelled) return;

      const done = await pollNextStoryPart(gameId, roundNumber + 1);

      if (!done && !cancelled) {
        setTimeout(check, 2000);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [isPolling, gameId, roundNumber]);

  const handleSubmit = async (isAutoSubmit = false) => {
    if (submitted || submitting) return;

    try {
      setSubmitting(true);

      const normStorytext = storyText?.trim() || "someone forgot to type!";
      const result = await postStory(gameId, roundNumber, normStorytext);

      console.log(isAutoSubmit ? "auto-submitted:" : "manual-submitted:", result);

      setSubmitted(true);
      setPrompt("Waiting for other players to finish this round...");

      let ready = false;

      while (!ready) {
        try {
          const data = await fetchNextStoryPart(gameId, roundNumber + 1);

          if (data?.status === "ready") {
            setPrompt(data.prompt ?? "No prompt available.");
            ready = true;

            // optionally move to next round
            setRoundNumber(prev => prev + 1);
            setSubmitted(false); // allow next submission
          } else {
            setPrompt(data?.prompt ?? "Waiting for other players...");
            await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s
          }
        } catch (err) {
          console.error("Polling failed:", err);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

    } catch (error) {
      console.error("Failed to submit story:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="game-window" id="storytelling-page">
      <div>
        <label><strong>Claimed Player: {userId || "Not assigned"}</strong></label> 
        {claimError ? <div>{claimError}</div> : null}
      </div>

      <Header roundNumber={roundNumber} maxRounds={MAX_ROUNDS} />
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