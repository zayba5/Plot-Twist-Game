import { useEffect, useRef, useState } from "react";
import "./index.css";

export default function Timer({ endTimeMs, onExpire }) {
  const INTERVAL_MS = 100;
  const RADIUS = 40;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const [time, setTime] = useState(0);
  const [initialTotal, setInitialTotal] = useState(1);

  const isExpired = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!Number.isFinite(endTimeMs)) {
      setTime(0);
      setInitialTotal(1);
      return;
    }

    isExpired.current = false;

    const firstRemaining = Math.max(endTimeMs - Date.now(), 0);
    setTime(firstRemaining);
    setInitialTotal(Math.max(firstRemaining, 1));

    const intervalId = setInterval(() => {
      const remaining = Math.max(endTimeMs - Date.now(), 0);
      setTime(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);

        if (!isExpired.current) {
          isExpired.current = true;
          onExpireRef.current?.();
        }
      }
    }, INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [endTimeMs]);

  const safeTime = Number.isFinite(time) ? time : 0;
  const safeTotal = Number.isFinite(initialTotal) && initialTotal > 0 ? initialTotal : 1;
  const progress = safeTime / safeTotal;
  const offset = CIRCUMFERENCE * (1 - progress);

  function getColor(time, total) {
    const p = time / total;
    if (p > 0.5) return "#82719d";
    if (p > 0.2) return "#cc7857";
    return "#a15858";
  }

  const color = getColor(safeTime, safeTotal);

  return (
    <div className="timer_box">
      <svg className="timer_svg" viewBox="0 0 100 100">
        <g className="timer_circle">
          <circle className="timer_total" cx="50" cy="50" r={RADIUS} />
          <circle
            className="timer_remaining"
            cx="50"
            cy="50"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            stroke={color}
          />
        </g>
      </svg>

      <div className="timer_counter">
        {Math.ceil(safeTime / 1000)}
      </div>
    </div>
  );
}