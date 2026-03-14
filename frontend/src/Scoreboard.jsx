import React, { useState, useEffect } from 'react';
import './index.css';
import { api } from "./global.jsx"
import { fetchUserScores } from './Utility.jsx';


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
  const [userScores, setUserScores] = useState([]);

  useEffect(() => {
    async function loadUserScores() {
      try {
        const data = await fetchUserScores();
        setUserScores(data.userScores);
      } catch (error) {
        console.error("Failed to load user scores:", error);
        setUserScores([]);
      }
    }

    loadUserScores();
  }, []);

  return (
    <div id='scoreboard'>
      {userScores.map((item, index) => (
        <ScoreboardItem
          key={index}
          user={item?.user}
          score={item?.score}
          placement={index+1}
        />
      ))}
      
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