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

const StoryCard = ({ story }) => {
    if (!story) return null;

    return (
        <div className="story-vote-card">
            {story.story_parts?.map((part, idx) => (
                <StoryPart part={part} key={idx} />
            ))}
        </div>
    );
};

const StoryCardList = () => {
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
        <div id="story-result-card-list" className="story-card-list">
            {stories.map((story) => (
                <StoryCard
                    story={story}
                    key={story.story_id}
                />
            ))}
        </div>
    );
};


const ResultsPage = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [votingSession, setVotingSession] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const WAIT_TIME = 60;

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
        socket.emit("voting_round_expired", { game_id: gameId })
        if (!votingSession) return;
        if (votingSession.voting_session_number === votingSession.num_voting_sessions) {
            endRound("timer_expired", "/score")
        }
        else {
            endRound("timer_expired", "/story");
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

    if (!votingSession) {
        return (
            <div className="game-window" id="voting-page">
            </div>
        );
    }

    const titles = [prompt1, votingSession.cat_1, votingSession.cat_2]

    return (
        <div className="game-window" id="results-page">
            <div className="game-window-header">
                <h1>Your Results</h1>
                <Timer durationSec={WAIT_TIME} onExpire={handleTimerExpire} />
            </div>
            <StoryCardList />
            <div className="game-window-control-bar">
                <div></div>
                <div></div>
                <button className="button clickable">Continue</button>
            </div>
        </div>
    );
};

export default ResultsPage;