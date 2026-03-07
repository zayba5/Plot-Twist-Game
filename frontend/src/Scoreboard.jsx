import React, { useState, useEffect } from 'react';
import './index.css';
import { api } from "./global.jsx"


//start display content functions
const Display2 = () => {
  return (
    <div className='game-window'>
      <div className='game-window-header'></div>
      This is a second page for the sake of testing nav
      <div className="game-window-control-bar"></div>

    </div>
  )
}
//end display content functions

export default Display2
