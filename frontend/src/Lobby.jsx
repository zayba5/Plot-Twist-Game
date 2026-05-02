import React, { useState } from 'react';
import './index.css';
import { api, socket } from "./global.jsx";
import Chat from "./Chat";


const Lobby = ({ username, setUsername, currentUserId, isAuthenticated = false }) => {

  //const [username, setUsername] = useState('');
  const [rounds, setRounds] = useState(5);
  const [votingSessions, setVotingSessions] = useState(3);
  const [inviteCode, setInviteCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');

  const [isLobbyCreated, setIsLobbyCreated] = useState(false);
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [gameId, setGameId] = useState('');
  const [players, setPlayers] = useState([]);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const isHost = players.some(
    (p) => p.user_id === currentUserId && p.isHost === true
  );

  const isLoggedIn = isAuthenticated;

  React.useEffect(() => {
    if (!isLoggedIn && username && !joinUsername) {
      setJoinUsername(username);
    }
  }, [isLoggedIn, joinUsername, username]);



  React.useEffect(() => {
    if (!gameId) return;

    const interval = setInterval(() => {
      fetchPlayers(gameId);
    }, 2000);

    return () => clearInterval(interval);
  }, [gameId]);

  


  React.useEffect(() => {
    const handleLobbyUpdate = (data) => {
      if (!data?.players) return;

      setPlayers(
        data.players.map((p) => ({
          name: p.username,
          user_id: p.user_id,
          isHost: p.isHost
        }))
      );
    };

    socket.on("lobby_update", handleLobbyUpdate);

    return () => {
      socket.off("lobby_update", handleLobbyUpdate);
    };
  }, []);
 

  /*React.useEffect(() => {
    socket.on("lobby_snapshot", (data) => {
      if (data.players) {
        // update player list UI
        setPlayers(
          data.players.map(p => ({
            name: p.username,
            user_id: p.user_id,
            isHost: p.isHost || false
          }))
        );

      }
    });

    return () => socket.off("lobby_snapshot");
  }, []); */

  //handle host left their own game
  React.useEffect(() => {
    const handleLobbyClosed = (data) => {
      alert(data?.message || "The host left. Lobby closed.");

      if (gameId) {
        socket.emit("leave_game", { game_id: gameId });
      }

      setIsLobbyCreated(false);
      setGameId("");
      setGameCode("");
      setPlayers([]);
    };

    socket.on("lobby_closed", handleLobbyClosed);

    return () => {
      socket.off("lobby_closed", handleLobbyClosed);
    };
  }, [gameId]);

  React.useEffect(() => {
    const handleGameStarted = (data) => {
      console.log("Game started!", data);
      window.location.href = `/story?game_id=${data.game_id}`;
    };

    socket.on("game_started", handleGameStarted);

    return () => socket.off("game_started", handleGameStarted);
  }, []);



  const fetchPlayers = async (gameId) => {
    try {
      const res = await fetch(`${api}lobby-players?game_id=${gameId}`, {
        credentials: "include",
      });

      const data = await res.json();

      if (data.players) {
        setPlayers(
          data.players.map((p) => ({
            name: p.username,
            user_id: p.user_id,
            isHost: p.isHost
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch players", err);
    }
  };


  const roundMin = 1;
  const roundMax = 20;
  const votingMin = 1;
  const votingMax = 20;
  const sliderStep = 1;
  const tickValues = [1, 5, 10, 15, 20];

  const closestTick = (current, ticks) =>
    ticks.reduce((best, t) => (Math.abs(current - t) < Math.abs(current - best) ? t : best));



  const handleInvite = async (e) => {
    e.preventDefault();

    setIsCreatingLobby(true); // start loading

    await fetch(`${api}leave-lobby`, {
      method: "POST",
      credentials: "include",
    });

    const name = isLoggedIn
      ? username
      : (username.trim() || joinUsername.trim() || "Host");

    try {
      const res = await fetch(`${api}create-lobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: name, rounds, votingSessions }),
      });

      const data = await res.json();

      if (data.ok) {
        if (!isLoggedIn) {
          setUsername(name);
          setJoinUsername(name);
        }
        setGameCode(data.game_code);
        setGameId(data.game_id);
        setIsLobbyCreated(true);

        socket.emit("join_game", { game_id: data.game_id });
      } else {
        alert(data.error || "Could not create lobby.");
      }
    } catch (err) {
      console.error(err);
      alert("Could not connect to backend.");
    } finally {
      setIsCreatingLobby(false); // stop loading
    }
  };

    const handleCopy = async () => {
    // e.preventDefault();
    if (!gameCode) return;

    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500); // resets after 1.5s
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();

    // ADD THIS BLOCK
    await fetch(`${api}leave-lobby`, {
      method: "POST",
      credentials: "include",
    });


  const name = isLoggedIn
    ? username
    : (joinUsername.trim() || username.trim() || "Player");

    try {
      const res = await fetch(`${api}join-lobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ game_code: inviteCode.trim().toUpperCase(), username: name }),
      });
      const data = await res.json();

      if (data.ok) {
        if (!isLoggedIn) {
          setUsername(name);
          setJoinUsername(name);
        }
        setGameCode(data.game_code);
        setGameId(data.game_id);
        setIsLobbyCreated(true);

        // join socket room
        socket.emit("join_game", { game_id: data.game_id });
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to join game");
    }
  };

  const handleStartGame = (e) => {
  e.preventDefault();

  socket.emit("start_game", { game_id: gameId });
  };

  const handleLeaveGame = async () => {
    const leavingGameId = gameId;

    try {
      const res = await fetch(`${api}leave-lobby`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (leavingGameId) {
        socket.emit("leave_game", { game_id: leavingGameId });
      }

      setIsLobbyCreated(false);
      setGameId("");
      setGameCode("");
      setPlayers([]);

      if (!data.ok) {
        console.error("Leave lobby returned non-ok:", data);
      }
    } catch (err) {
      console.error("Failed to leave lobby", err);
    }
  };



  return (
    <div className="lobby">
      <div className="lobby-bg">
        <div className="lobby-bg-stars" />
        <div className="lobby-bg-glow" />
        <div className="lobby-bg-planet" />
      </div>

      <header className="lobby-header">
        <p className="lobby-status">
          {isLobbyCreated ? 'Waiting for players...' : 'Create a game or join with a code.'}
        </p>
        <button
          className="lobby-howto-btn"
          onClick={() => setShowHowToPlay(true)}
        >
          How to Play
        </button>
      </header>

      <div className="lobby-panels">
        <section className="lobby-panel lobby-panel-left">
          <div className="lobby-flow-section lobby-flow-create">
            <h2 className="lobby-panel-title">Create Game</h2>
            <div className="lobby-options">
              <label className="lobby-label">
                Username
                <input
                  type="text"
                  className="lobby-input"
                  value={username}
                  disabled={isLoggedIn}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (!isLoggedIn && !joinUsername.trim()) {
                      setJoinUsername(e.target.value);
                    }
                  }}
                />
              </label>
              <label className="lobby-label">
                Number of Rounds
                <div className="lobby-slider-row">
                  <div className="lobby-slider-track">
                    <input
                      type="range"
                      min={roundMin}
                      max={roundMax}
                      step={sliderStep}
                      value={rounds}
                      onChange={(e) => setRounds(Number(e.target.value))}
                      className="lobby-range"
                    />
                    <div className="lobby-ticks" role="presentation">
                      {tickValues.map((value) => (
                        <span
                          key={value}
                          className={`lobby-tick${value === closestTick(rounds, tickValues) ? ' lobby-tick-active' : ''}`}
                          style={{ left: `${((value - roundMin) / (roundMax - roundMin)) * 100}%` }}
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="lobby-range-value">{rounds}</span>
                </div>
              </label>
              <label className="lobby-label">
                Voting Sessions
                <div className="lobby-slider-row">
                  <div className="lobby-slider-track">
                    <input
                      type="range"
                      min={votingMin}
                      max={votingMax}
                      step={sliderStep}
                      value={votingSessions}
                      onChange={(e) => setVotingSessions(Number(e.target.value))}
                      className="lobby-range"
                    />
                    <div className="lobby-ticks" role="presentation">
                      {tickValues.map((value) => (
                        <span
                          key={value}
                          className={`lobby-tick${value === closestTick(votingSessions, tickValues) ? ' lobby-tick-active' : ''}`}
                          style={{ left: `${((value - votingMin) / (votingMax - votingMin)) * 100}%` }}
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="lobby-range-value">{votingSessions}</span>
                </div>
              </label>
            </div>
            {isLobbyCreated ? (
              <div className="lobby-invite-result">
                <p className="lobby-game-code-label">Invite code</p>
                <div className="lobby-game-code-row">
                  <p className="lobby-game-code">{gameCode}</p>

                  <button
                    type="button"
                    className={`lobby-copy-btn ${copied ? "✓" : "⧉"}`}
                    onClick={handleCopy}
                  >
                    {copied ? "✓" : "⧉"}
                  </button>
                </div>
              </div>
            ) : (
            <button
              type="button"
              className="lobby-btn-invite"
              onClick={handleInvite}
              disabled={isCreatingLobby}
            >
              {isCreatingLobby ? (
                <span className="dot-loader">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              ) : (
                "Invite"
              )}
            </button>
            )}
          </div>

          <div className="lobby-flow-divider" />
          <div className="lobby-flow-section lobby-flow-join">
            <h2 className="lobby-panel-title">Join Game</h2>
            <div className="lobby-options lobby-options-join">
              <div className="lobby-join-row">
                <label className="lobby-label">
                  Username
                  
                  <input
                    type="text"
                    className="lobby-input"
                    value={isLoggedIn ? username : joinUsername}
                    disabled={isLoggedIn}
                    onChange={(e) => setJoinUsername(e.target.value)}
                  />
                </label>
                <label className="lobby-label">
                  Invite Code
                  <input
                    type="text"
                    className="lobby-input"
                    placeholder="Paste code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                className="lobby-btn-join"
                onClick={handleJoinGame}
              >
                Join Game
              </button>
            </div>
          </div>
        </section>

        <Chat
          username={username}
          currentUserId={currentUserId}
          gameId={gameId}
          players={players}
        />
      </div>
      <footer className="lobby-footer">

        <p className="lobby-footer-tagline">
          <span>Build</span>
          <span>a</span>
          <span>story</span>
          <span>together,</span>
          <span>then</span>
          <span>vote</span>
          <span>for</span>
          <span>the</span>
          <span>best</span>
          <span>one!</span>
        </p>

        <button
          type="button"
          className="lobby-footer-btn lobby-btn-play"
          onClick={handleStartGame}
          disabled={!isHost}
        >
          {isHost ? "Play Game" : "Waiting for host..."}
        </button>

        <button
          type="button"
          className="lobby-footer-btn lobby-btn-leave"
          onClick={handleLeaveGame}
        >
          Leave Game
        </button>
      </footer>

      {showHowToPlay && (
        <div
          className="howto-overlay"
          onClick={() => setShowHowToPlay(false)}
        >
          <div
            className="howto-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="howto-close"
              onClick={() => setShowHowToPlay(false)}
            >
              ✕
            </button>

            <h2 className="lobby-panel-title">How to Play</h2>

            <div className="howto-content">

              <div className="howto-step">
                <span className="howto-step-number">1</span>
                <div>
                  <p className="howto-title">Start or Join a Game</p>
                  <p>Create a lobby or enter an invite code to play with others.</p>
                </div>
              </div>

              <div className="howto-step">
                <span className="howto-step-number">2</span>
                <div>
                  <p className="howto-title">Set Game Settings</p>
                  <p>Choose how many rounds you want to play and how many voting sessions will happen.</p>
                </div>
              </div>

              <div className="howto-step">
                <span className="howto-step-number">3</span>
                <div>
                  <p className="howto-title">Write Your Part</p>
                  <p>Each round, write a continuation of a story based on what you receive.</p>
                </div>
              </div>

              <div className="howto-step">
                <span className="howto-step-number">4</span>
                <div>
                  <p className="howto-title">Pass It On</p>
                  <p>Your story is passed to another player—continue building together.</p>
                </div>
              </div>

              <div className="howto-step">
                <span className="howto-step-number">5</span>
                <div>
                  <p className="howto-title">Vote</p>
                  <p>After several rounds, vote for your favorite completed story.</p>
                </div>
              </div>

              <div className="howto-step">
                <span className="howto-step-number">6</span>
                <div>
                  <p className="howto-title">Score Points</p>
                  <p>Everyone who contributed to the winning story earns points.</p>
                </div>
              </div>

              <div className="howto-step">
                <span className="howto-step-number">7</span>
                <div>
                  <p className="howto-title">Win the Game</p>
                  <p>After all rounds, the player with the highest score wins.</p>
                </div>
              </div>

              <div className="howto-tip">
                💡 Tip: You only see the previous part of the story—be creative!
              </div>

            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default Lobby;

