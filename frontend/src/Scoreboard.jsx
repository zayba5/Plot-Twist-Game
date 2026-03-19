import React, { useState, useEffect } from 'react';
import './index.css';
import { api } from "./global.jsx"
import { fetchScores } from './Utility.jsx';


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

const Scoreboard = () => {
  const [scores, setScores] = useState([]);
  useEffect(() => {
    async function loadScores() {
      try {
        const data = await fetchScores();
        setScores(data.scores.sort((a, b) => b.score - a.score));
      } catch (error) {
        console.error("Failed to load scores:", error);
        setScores([]);
      }
    }

    loadScores();
  }, []);

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

//start display content functions
const ScoreboardPage = () => {
  return (
    <div className='game-window' id='scoreboard-page'>
      <Header></Header>
      <Scoreboard></Scoreboard>
    </div>
  )
}
//end display content functions

export default ScoreboardPage