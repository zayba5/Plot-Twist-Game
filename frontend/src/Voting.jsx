import React, { useState, useEffect } from 'react';
import './index.css';
import { api } from "./global.jsx"

//a react component to display an individual story
//to display for voting
const StoryCard = ({ story, isSelected, onClick, id }) => {
  if (!story) return null;

  const classes = isSelected ? "story-vote-card selected-card" : "story-vote-card";

  return (
    <div className={classes} onClick={() => onClick(id)}>
      <p>{story ?? "No content available"}</p>
    </div>
  );
}

//react component to store of list of StoryVoteCards to 
//display the stories that are being voted on
const StoryCardList = () => {
  let tempStory = "this is a temp story to display until the storytelling works";
  let tempStory2 = "this is a second temp story to test voting";
  let stories = [tempStory, tempStory2, tempStory, tempStory2];

  const [selectedStory, setSelectedStory] = useState(null);

  const handleStoryClick = (id) => {
    setSelectedStory(id);
  }

  return (
    <div id='story-vote-card-list'>
      {stories.map((story, idx) => (
        <StoryCard story={story} key={idx} id={idx} onClick={handleStoryClick} isSelected={idx === selectedStory}/>
      ))}
    </div>
  );
};

//react component for the window footer
const ControlBar = () => {
  return (
    <div className="game-window-control-bar">
      <button className='button' id='vote-button'>Vote</button>
    </div>
  )
}

//react component for the window footer
const Header = () => {
  return (
    <div className="game-window-header">
      <h1>{"Vote for your favorite story"}</h1>
    </div>

  )
}

//React component to display the entire voting page
const VotingPage = () => {

  return (
    <div className='game-window' id="voting-page">
      <Header></Header>
      <StoryCardList></StoryCardList>
      <ControlBar></ControlBar>
    </div>
  )
}
//end display content functions

export default VotingPage
