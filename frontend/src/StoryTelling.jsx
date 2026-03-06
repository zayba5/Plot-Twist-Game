import React, { useState, useEffect } from "react";
import "./index.css";
import { fetchItem } from "./Utility.jsx";
import { SampleCard } from "./SampleCard.jsx";

// display cards
const DisplayCard = () => {
  return (
    <div id="card-list">
      <LoadCard />
    </div>
  );
};

function LoadCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchItem();

        // expect an array in data.text, but guard it
        const nextItems = Array.isArray(data?.text) ? data.text : [];

        if (!cancelled) setItems(nextItems);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="loader"><div className="loader-bar" /></div>;
  if (error) return <div>Failed to load</div>;

  return (
    <div>
      {items.map((it, idx) => (
        <SampleCard key={idx} item={it} />
      ))}
    </div>
  );
}

export default DisplayCard;