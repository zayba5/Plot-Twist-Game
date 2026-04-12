import React, { useState, useEffect } from 'react';
import './index.css';
import { socket } from "./global.jsx"
import { fetchScores } from './Utility.jsx';
import { useNavigate } from "react-router-dom";


const Header = () => {
  return (
    <div className="game-window-header">
      <h1>{"Final Scores"}</h1>
    </div>

  )
}

const ScoreboardItem = ({ user, score, placement }) => {
  return (
    <div className={"scoreboard-item"}>
      <span>#{placement}:</span>
      <span>{user}</span>
      <span>{score}</span>
    </div>
  );
}

const Scoreboard = ({ gameId }) => {
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
            placement={placement}
          />
        );
      })}
    </div>
  );
};

const ControlBar = () => {
  const navigate = useNavigate();

  return (
    <div className="game-window-control-bar">
      <div></div>
      <div></div>
      <button
        className="button"
        onClick={() => {navigate("/lobby")}}
      >
        {"Return to Lobby"}
      </button>
    </div>
  );
};

//start display content functions
const ScoreboardPage = () => {
  const [gameId, setGameId] = useState(null);

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
    <div className='game-window' id='scoreboard-page'>
      <Header></Header>
      <Scoreboard gameId={gameId}></Scoreboard>
      <ControlBar></ControlBar>
    </div>
  )
}
//end display content functions

export default ScoreboardPage