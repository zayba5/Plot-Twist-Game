import React, { useState, useEffect } from 'react';
import './index.css';
import { socket } from "./global.jsx"
import { fetchScores } from './Utility.jsx';
import { useNavigate } from "react-router-dom";
import Chat from "./Chat";
import { api } from './global.jsx';


const Header = () => {
  return (
    <div className="game-window-header">
      <h1>{"Final Scores"}</h1>
    </div>

  )
}

const WinnerBadge = ({ tag }) => {
    return (
        <div className={`winner-badge badge-cont`}>
            <div className="badge-text">{tag}</div>
            <div className="badge-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path d="M458.622 255.92l45.985-45.005c13.708-12.977 7.316-36.039-10.664-40.339l-62.65-15.99 17.661-62.015c4.991-17.838-11.829-34.663-29.661-29.671l-61.994 17.667-15.984-62.671C337.085.197 313.765-6.276 300.99 7.228L256 53.57 211.011 7.229c-12.63-13.351-36.047-7.234-40.325 10.668l-15.984 62.671-61.995-17.667C74.87 57.907 58.056 74.738 63.046 92.572l17.661 62.015-62.65 15.99C.069 174.878-6.31 197.944 7.392 210.915l45.985 45.005-45.985 45.004c-13.708 12.977-7.316 36.039 10.664 40.339l62.65 15.99-17.661 62.015c-4.991 17.838 11.829 34.663 29.661 29.671l61.994-17.667 15.984 62.671c4.439 18.575 27.696 24.018 40.325 10.668L256 458.61l44.989 46.001c12.5 13.488 35.987 7.486 40.325-10.668l15.984-62.671 61.994 17.667c17.836 4.994 34.651-11.837 29.661-29.671l-17.661-62.015 62.65-15.99c17.987-4.302 24.366-27.367 10.664-40.339l-45.984-45.004z" />
                </svg>
            </div>
        </div>
    );
}

const ScoreboardItem = ({ user, score, categoryScores, placement, scoreBreakdown }) => {
  const [scoreDisplay, setScoreDisplay] = useState(null);

  useEffect(() => {
    if (scoreBreakdown) {
      setScoreDisplay((
        <div className="badge-stack">
          {categoryScores.sort((a, b) => b.score - a.score).map((item, index) => {
            if (!item) return null;
            return (
              <span className='score-badge-pair'>{item.score}<WinnerBadge tag={item.category}/></span>
            );
          })}
        </div>
      ));
    } else {   
      setScoreDisplay((<span>{score}</span>));
    }
  }, [scoreBreakdown]);

  return (
    <div className={"scoreboard-item"}>
      <span>#{placement}:</span>
      <span>{user}</span>
      {scoreDisplay}
    </div>
  );
}

const Scoreboard = ({ gameId, scoreBreakdown }) => {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    async function loadScores() {
      if (!gameId) return;

      try {
        const data = await fetchScores(gameId);
        setScores(data.scores.sort((a, b) => b.score - a.score));
      } catch (error) {
        console.error("Failed to load scores:", error);
        setScores([]);
      }
    }

    loadScores();
  }, [gameId]);

  let prevScore = null;
  let placement = 0;

  return (
    <div id='scoreboard'>
      {scores.map((item, index) => {
        if (!item) return null;

        if (item.score !== prevScore) {
          prevScore = item.score;
          placement = index + 1;
        }

        return (
          <ScoreboardItem
            key={index}
            user={item.user}
            score={item.score}
            categoryScores={item.category_scores}
            placement={placement}
            scoreBreakdown={scoreBreakdown}
          />
        );
      })}
    </div>
  );
};

const ControlBar = ({ toggleScoreBreakdown, gameId }) => {
  const navigate = useNavigate();

  const handleReturnToLobby = async () => {
    try {
      await fetch(api + "leave-lobby", {
        method: "POST",
        credentials: "include",
      });

      if (gameId) {
        socket.emit("leave_game", { game_id: gameId });
      }

      navigate("/lobby");
    } catch (err) {
      console.error("Failed to leave game", err);
    }
  };

  return (
    <div className="game-window-control-bar">
      <button
        className="button"
        style={{ justifySelf: "start" }}
        onClick={toggleScoreBreakdown}
      >
        Toggle score breakdown
      </button>

      <div></div>

      <button
        className="button"
        onClick={handleReturnToLobby}
      >
        Leave Game
      </button>
    </div>
  );
};

//start display content functions
const ScoreboardPage = () => {
  const [gameId, setGameId] = useState(null);
  const [scoreBreakdown, setScoreBreakdown] = useState(false);
  const [username, setUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const loadSession = async () => {
      const res = await fetch(api + "session", {
        credentials: "include",
      });
      const data = await res.json();
      setCurrentUserId(data.user_id || null);
      setUsername(data.username || "Player");
    };

    loadSession();
  }, []);

  useEffect(() => {
    if (!gameId) return;

    const loadPlayers = async () => {
      try {
        const res = await fetch(`${api}lobby-players?game_id=${gameId}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (data.players) {
          setPlayers(
            data.players.map((p) => ({
              name: p.username,
              user_id: p.user_id,
              isHost: p.isHost || false,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load players", err);
      }
    };

    loadPlayers();
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;

    socket.emit("join_game", { game_id: gameId });

    return () => {
      socket.emit("leave_game", { game_id: gameId });
    };
  }, [gameId]);

  useEffect(() => {
    async function handleShowScoreboard(payload) {
      try {
        const incomingGameId = payload?.game_id;
        console.log("scoreboard_shown received with game_id:", incomingGameId);
        if (!incomingGameId) {
          console.error("No game_id in scoreboard_shown payload");
          return;
        }

        setGameId(incomingGameId);
      } catch (error) {
        console.error("Failed to load scoreboard:", error);
      }
    }

    socket.on("scoreboard_shown", handleShowScoreboard);

    return () => {
      socket.off("scoreboard_shown", handleShowScoreboard);
    };
  }, []);

  useEffect(() => {
    function showScoreboard() {
      socket.emit("show_scoreboard", {});
      console.log("emitted show_scoreboard");
    }

    if (socket.connected) {
      showScoreboard();
    } else {
      socket.on("connect", showScoreboard);
    }

    return () => {
      socket.off("connect", showScoreboard);
    };
  }, []);

  return (
    <div className="storytelling-container">
      <div className="game-window" id="scoreboard-page">
        <Header />

        <Scoreboard
          gameId={gameId}
          scoreBreakdown={scoreBreakdown}
        />

        <ControlBar
          gameId={gameId}
          toggleScoreBreakdown={() => setScoreBreakdown(!scoreBreakdown)}
        />
      </div>

      {username && gameId && (
        <Chat
          username={username}
          currentUserId={currentUserId}
          gameId={gameId}
          players={players || []}
        />
      )}
    </div>
  );
};
//end display content functions

export default ScoreboardPage