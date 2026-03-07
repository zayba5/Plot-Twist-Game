import React from "react";
import "./index.css";

//a react component to display an individual story
//to display for voting
export default function StoryCard({ story }) {
  if (!story) return null;

  return (
    <div className="story-vote-card">
      <p>{story ?? "No content available"}</p>
    </div>
  );
}