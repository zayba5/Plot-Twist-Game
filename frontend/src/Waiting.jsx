import "./index.css";

export default function Waiting({ topText, bottomText }) {
  return (
    <div className="waiting relative min-h-screen overflow-hidden bg-[#05020b] text-white">
      <style>{`
        @keyframes driftNebulaB {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-18px, 18px, 0) scale(1.05); }
        }

        @keyframes rotateOuter {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotateMid {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes rotateInner {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes ringGlowPulse {
          0%, 100% { opacity: 0.58; transform: scale(0.994); }
          50% { opacity: 1; transform: scale(1.012); }
        }

        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 14px rgba(196,141,255,0.12); }
          50% { text-shadow: 0 0 24px rgba(196,141,255,0.22); }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(104,56,199,0.12),transparent_18%),linear-gradient(180deg,#05020c_0%,#020108_100%)]" />

      <div
        className="absolute -right-24 bottom-[-4rem] h-[38rem] w-[22rem] blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 62% 58%, rgba(210,155,255,0.18) 0%, rgba(168,85,247,0.15) 18%, rgba(124,58,237,0.09) 36%, rgba(124,58,237,0.03) 52%, transparent 76%)",
          animation: "driftNebulaB 24s ease-in-out infinite",
          opacity: 0.96,
        }}
      />
      <div
        className="absolute right-[-4rem] bottom-[14rem] h-[24rem] w-[14rem] blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 52% 50%, rgba(168,85,247,0.10) 0%, rgba(124,58,237,0.05) 34%, transparent 72%)",
          animation: "driftNebulaB 30s ease-in-out infinite reverse",
          opacity: 0.7,
        }}
      />

      <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.8)_0.6px,transparent_0.8px)] [background-size:22px_22px]" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="relative orbit-container">
          <SignalOrbital />
        </div>

        <div className="-mt-2 text-container flex w-full max-w-3xl flex-col items-center text-center">
          <h1
            className="text-4xl font-light tracking-[-0.02em] text-violet-50 sm:text-5xl md:text-6xl"
            style={{ animation: "titleGlow 4.6s ease-in-out infinite" }}
          >
            {topText}
          </h1>

          <div className="mt-5 flex items-center gap-5 opacity-90">
            <span className="h-px w-20 bg-gradient-to-r from-transparent via-violet-400/40 to-violet-300/75" />
            <span className="text-violet-300 text-base text-separator">✦</span>
            <span className="h-px w-20 bg-gradient-to-l from-transparent via-violet-400/40 to-violet-300/75" />
          </div>

          <p className="mt-7 text-lg text-violet-100/85 sm:text-xl">{bottomText}</p>
        </div>
      </div>
    </div>
  );
}

function SignalOrbital() {
  const outerNodes = [
    { angle: 356, size: 4.1 },
    { angle: 110, size: 4.6 },
    { angle: 178, size: 4.2 },
    { angle: 290, size: 4.5 },
  ];

  const midNodes = [
    { angle: 44, size: 3.6 },
    { angle: 134, size: 3.8 },
    { angle: 228, size: 3.7 },
    { angle: 312, size: 3.4 },
  ];

  const innerNodes = [
    { angle: 30, size: 1.8 },
    { angle: 120, size: 1.9 },
    { angle: 214, size: 1.8 },
    { angle: 322, size: 1.9 },
  ];

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,1)" />
          <stop offset="18%" stopColor="rgba(232,216,255,0.98)" />
          <stop offset="42%" stopColor="rgba(196,141,255,0.65)" />
          <stop offset="80%" stopColor="rgba(124,58,237,0.08)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0)" />
        </radialGradient>

        <filter id="softGlow" x="-160%" y="-160%" width="420%" height="420%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="50" cy="50" r="31" fill="url(#coreGlow)" opacity="0.26" />
      <circle cx="50" cy="50" r="18" fill="url(#coreGlow)" opacity="0.2" />

      <g
        filter="url(#softGlow)"
        style={{ transformOrigin: "50% 50%", animation: "rotateOuter 54s linear infinite" }}
      >
        <g style={{ transformOrigin: "50% 50%", animation: "ringGlowPulse 5.6s ease-in-out infinite" }}>
          <circle cx="50" cy="50" r="33" fill="none" stroke="rgba(160,95,255,0.18)" strokeWidth="0.42" />
          <circle cx="50" cy="50" r="33" fill="none" stroke="rgba(218,189,255,0.7)" strokeWidth="0.16" />
          {outerNodes.map((node, index) => (
            <OrbitNode key={index} radius={33} angle={node.angle} size={node.size} />
          ))}
        </g>
      </g>

      <g
        filter="url(#softGlow)"
        style={{ transformOrigin: "50% 50%", animation: "rotateMid 36s linear infinite" }}
      >
        <g style={{ transformOrigin: "50% 50%", animation: "ringGlowPulse 5.2s ease-in-out infinite" }}>
          <circle cx="50" cy="50" r="23" fill="none" stroke="rgba(160,95,255,0.22)" strokeWidth="0.46" />
          <circle cx="50" cy="50" r="23" fill="none" stroke="rgba(232,216,255,0.75)" strokeWidth="0.16" />
          {midNodes.map((node, index) => (
            <OrbitNode key={index} radius={23} angle={node.angle} size={node.size} />
          ))}
        </g>
      </g>

      <g
        filter="url(#softGlow)"
        style={{ transformOrigin: "50% 50%", animation: "rotateInner 24s linear infinite" }}
      >
        <g style={{ transformOrigin: "50% 50%", animation: "ringGlowPulse 4s ease-in-out infinite" }}>
          <circle cx="50" cy="50" r="12.5" fill="none" stroke="rgba(160,95,255,0.12)" strokeWidth="0.36" />
          <circle cx="50" cy="50" r="12.5" fill="none" stroke="rgba(232,216,255,0.48)" strokeWidth="0.13" />
          {innerNodes.map((node, index) => (
            <OrbitNode key={index} radius={12.5} angle={node.angle} size={node.size} subtle />
          ))}
        </g>
      </g>

      <g>
        <circle cx="50" cy="50" r="4.6" fill="rgba(196,141,255,0.24)" filter="url(#softGlow)" />
      </g>
    </svg>
  );
}

function OrbitNode({ radius, angle, size, subtle = false }) {
  const radians = (angle * Math.PI) / 180;
  const x = 50 + radius * Math.cos(radians);
  const y = 50 + radius * Math.sin(radians);

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={subtle ? size * 0.9 : size}
        fill={subtle ? "rgba(196,141,255,0.12)" : "rgba(196,141,255,0.18)"}
      />
      <circle
        cx={x}
        cy={y}
        r={subtle ? size * 0.34 : size * 0.38}
        fill="rgba(255,255,255,0.98)"
      />
    </g>
  );
}