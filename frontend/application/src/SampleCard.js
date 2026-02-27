import React, { useState, useEffect } from 'react';
import './index.css';
export function SampleCard  ({item})  {
    return(
      <div className='content-card'>
          <p>{item.text}</p>
      </div>
    )
  }