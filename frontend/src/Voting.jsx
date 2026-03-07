import React, { useState, useEffect } from 'react';
import './index.css';
import { api } from "./global.jsx"
import StoryCard from './StoryVoteCard.jsx';

//react component to store of list of StoryVoteCards to 
//display the stories that are being voted on
const StoryCardList = () => {
  let tempStory = "this is a temp story to display until the storytelling is implemented"
  let tempStory2 = "this is a second temp story to test voting"
  return (
    <div id="story-vote-card-list">
      <StoryCard story={tempStory}></StoryCard>
      <StoryCard story={tempStory2}></StoryCard>
      <StoryCard story={tempStory}></StoryCard>
      <StoryCard story={tempStory2}></StoryCard>
    </div>
  )
}

const ControlBar = () => {
  return (
    <div className="game-window-control-bar">
      <button className='button' id='vote-button'>Vote</button>
    </div>
  )
}

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
