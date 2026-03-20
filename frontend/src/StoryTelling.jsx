import React, { useEffect, useMemo, useState, useRef } from "react";
import "./index.css";
import { fetchItem } from "./Utility.jsx";
import { postStory } from "./Utility.jsx";
import { SampleCard } from "./SampleCard.jsx";
import { socket } from "./global.jsx";
import { useNavigate } from "react-router-dom";

// display cards
const DisplayCard = () => {
  const [userText, setUserText] = useState("");

  const old_handleSubmit = (e) => {
    e.preventDefault();
    console.log("User entered:", userText);
    //submit logic 
  };

  return (
    <div className="game-window">
      <div className="game-window-header"></div>

      <form onSubmit={old_handleSubmit}>
        <p>Please enter your response:</p>

        <input
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="Type here..."
        />

        <button
        className="button"
        id="submit-button" 
        type="submit">Submit</button>
      </form>

      <div className="game-window-control-bar"></div>
    </div>
  );
};

function LoadCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchItem();

        // expect an array in data.text, but guard it
        const nextItems = Array.isArray(data?.text) ? data.text : [];

        if (!cancelled) setItems(nextItems);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="loader"><div className="loader-bar" /></div>;
  if (error) return <div>Failed to load</div>;

  return (
    <div className="game-window">
      <div className="game-window-header"></div>

      <div className="card-list">
        {items.map((it, idx) => (
          <SampleCard key={idx} item={it} />
        ))}
      </div>

      <div className="game-window-control-bar"></div>
    </div>
  );
}

const ROUND_TIME_SECONDS = 60000; // on deployment change it to 60
const MAX_ROUNDS = 3;

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

const StorytellingPage = () => {
  const navigate = useNavigate();

  const gameId = "8b5404ae-f8c1-4b80-b4f5-18fa08ecdd5e";

  const [prompt, setPrompt] = useState("");
  const [storyText, setStoryText] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [claimedPlayerId, setClaimedPlayerId] = useState("");
  const [claimError, setClaimError] = useState("");
  const hasClaimedRef = useRef(false);
  const canSubmit = useMemo(() => {
    return !submitted && storyText.trim().length > 0;
  }, [submitted, storyText]);

  useEffect(() => {
    async function loadPrompt() {
      try {
        const data = await fetchPrompt(gameId, roundNumber);
        setPrompt(data?.prompt ?? `Write a short story based on this prompt, round ${roundNumber}`);
      } catch (error) {
        console.error("Failed to load prompt:", error);
        setPrompt("Failed to load prompt. Write a short story based on this round.");
      }
    }

    loadPrompt();
  }, [gameId, roundNumber]);

  useEffect(() => {
    if (submitted) return;
    if (timeLeft <= 0) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, submitted]);

  useEffect(() => {
    if (timeLeft === 0 && !submitted && !submitting) {
      console.log(`timeLeft: ${timeLeft}, submitted: ${submitted}, submitting: ${submitting}`);
      handleSubmit(true);
    }
  }, [timeLeft, submitted, submitting]);

  useEffect(() => {
    function resetRoundState(nextPrompt, nextRoundNumber, nextTimeLeft) {
      setRoundNumber(nextRoundNumber);
      setPrompt(nextPrompt);
      setStoryText("");
      setSubmitted(false);
      setSubmitting(false);
      setTimeLeft(nextTimeLeft);
    }

    function handleRoundStarted(payload) {
      console.log("round_started:", payload);

      resetRoundState(
        payload?.prompt ?? "",
        payload?.round_number ?? 1,
        payload?.round_time_seconds ?? ROUND_TIME_SECONDS
      );
    }

    function handleAllStoriesIn(payload) {
      console.log("all stories in:", payload);
    }

    function handleRoundEnded(payload) {
      console.log("round ended:", payload);

      const endedRoundNumber = payload?.round_number ?? 1;
      if (endedRoundNumber >= MAX_ROUNDS) {
        navigate("/vote");
        return;
      }

      resetRoundState(
        payload?.next_prompt ?? "",
        payload?.next_round_number ?? endedRoundNumber + 1,
        payload?.round_time_seconds ?? ROUND_TIME_SECONDS
      );
    }

    function handleGoToVoting(payload) {
      console.log("go_to_voting:", payload);
      navigate("/vote");
    }

    function handleStoriesRotated(payload) {
      console.log("stories rotated:", payload);
    }

    socket.on("round_started", handleRoundStarted);
    socket.on("all_stories_in", handleAllStoriesIn);
    socket.on("round_ended", handleRoundEnded);
    socket.on("go_to_voting", handleGoToVoting);
    socket.on("stories_rotated", handleStoriesRotated);

    return () => {
      socket.off("round_started", handleRoundStarted);
      socket.off("all_stories_in", handleAllStoriesIn);
      socket.off("round_ended", handleRoundEnded);
      socket.off("go_to_voting", handleGoToVoting);
      socket.off("stories_rotated", handleStoriesRotated);
    };
  }, [navigate]);

  useEffect(() => {
    if (hasClaimedRef.current) return;
    hasClaimedRef.current = true;

    console.log("joining game:", gameId);
    socket.emit("join_game", { game_id: gameId });

    console.log("emitting claim_player for game:", gameId);
    socket.emit("claim_player", { game_id: gameId }, (response) => {
      console.log("claim_player response:", response);

      if (response?.ok) {
        setClaimedPlayerId(response.player_id ?? "");
        setClaimError("");
      } else {
        setClaimedPlayerId("");
        setClaimError(response?.error ?? "Failed to claim player");
      }
    });

    // return () => {
    //   socket.emit("release_player");
    //   hasClaimedRef.current = false;
    // };
  }, [gameId]);

  const handleSubmit = async (isAutoSubmit = false) => {
    if (submitted || submitting) return;

    try {
      setSubmitting(true);
      const normStorytext = storyText?.trim() || "someone forgot to type!";
      const result = await postStory(gameId, roundNumber, normStorytext);
      console.log(isAutoSubmit ? "auto-submitted:" : "manual-submitted:", result);

      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit story:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="game-window" id="storytelling-page">
      <div>
        <label><strong>Claimed Player: {claimedPlayerId || "Not assigned"}</strong></label> 
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