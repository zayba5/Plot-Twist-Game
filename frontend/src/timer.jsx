import React, { useState, useEffect } from "react";
import "./index.css";

export default function Timer() {
    const TIME_LIMIT_MS = 20 * 1000; //<-----hardcoded until game settings are saved
    const INTERVAL_MS = 100;
    const RADIUS = 40;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    const [time, setTime] = useState(TIME_LIMIT_MS)

    useEffect(() => {
        const startTime = Date.now();

        const intervalId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(TIME_LIMIT_MS - elapsed, 0);

            setTime(remaining);

            if (remaining <= 0) {
                clearInterval(intervalId);
            }
        }, INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, []);

    const progress = time / TIME_LIMIT_MS;
    const offset = CIRCUMFERENCE * (1 - progress)

    function getColor(time, total) {
        const p = time / total;

        if (p > 0.5) return "#82719d";
        if (p > 0.2) return "#cc7857";
        return "#a15858";
    }

    const color = getColor(time, TIME_LIMIT_MS);

    return (
        <div className="timer_box">
            <svg className="timer_svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <g className="timer_circle">
                    <circle className="timer_total" cx="50" cy="50" r={RADIUS} />
                    <circle className="timer_remaining" cx="50" cy="50" r={RADIUS}
                        strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} stroke={color} />
                </g>
            </svg>
            <div className="timer_counter">
                {(time / 1000).toFixed(0)}
            </div>
        </div>
    );
}


