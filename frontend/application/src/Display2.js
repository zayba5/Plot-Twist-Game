import React, { useState, useEffect } from 'react';
import './index.css';
import { fetchItem } from "./Utility.js"
import { SampleCard } from "./SampleCard.js"

//display cards
const DisplayCard = () => {
  return (
    <div id="card-list">
      <LoadCard />
    </div>
  )
}


function LoadCard() {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchItem();
        setItem(data.text)
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loader"><div className="loader-bar" /></div>;
  if (error) return <div>Failed to load</div>;
  return (
    <div>
      {item.map((it, idx) => (
        <SampleCard key={idx} item={it} />
      ))}
    </div>
  );
}

export default DisplayCard

