import React, { useState } from 'react';
import './index.css';
// import './Lobby.css';
//import { io } from "socket.io-client";
import { socket } from "./global.jsx";
import Chat from "./Chat";


const Lobby = () => {

  const [username, setUsername] = useState('');
  const [rounds, setRounds] = useState(5);
  const [votingSessions, setVotingSessions] = useState(3);
  const [inviteCode, setInviteCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  const [isLobbyCreated, setIsLobbyCreated] = useState(false);
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [gameId, setGameId] = useState('');
  const [players, setPlayers] = useState([]);

  const isHost = players.find(p => p.user_id === currentUserId)?.isHost;


  React.useEffect(() => {
    fetch("http://localhost:5000/session", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        console.log("SESSION:", data);

        if (data.username) {
          setUsername(data.username);
          setJoinUsername(data.username);
          setCurrentUserId(data.user_id);
        }
      });

  }, []);


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

      setPlayers((prev) =>
        data.players.map((p) => {
          const existing = prev.find((x) => x.user_id === p.user_id);
          return {
            name: p.username,
            user_id: p.user_id,
            isHost: p.isHost ?? existing?.isHost ?? false,
          };
        })
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
      const res = await fetch(`http://localhost:5000/lobby-players?game_id=${gameId}`, {
        credentials: "include",
      });

      const data = await res.json();

      if (data.players) {
        setPlayers(
          data.players.map((p) => ({
            name: p.username,
            user_id: p.user_id,
            isHost: p.isHost || false,
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

    await fetch("http://localhost:5000/leave-lobby", {
      method: "POST",
      credentials: "include",
    });

    const name = username.trim() || "Host";

    try {
      const res = await fetch("http://localhost:5000/create-lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: name, rounds, votingSessions }),
      });

      const data = await res.json();

      if (data.ok) {
        setGameCode(data.game_code);
        setGameId(data.game_id);
        setIsLobbyCreated(true);

        socket.emit("join_game", { game_id: data.game_id });
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
    await fetch("http://localhost:5000/leave-lobby", {
      method: "POST",
      credentials: "include",
    });

  const name = joinUsername.trim() || "Player";

    try {
      const res = await fetch("http://localhost:5000/join-lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ game_code: inviteCode, username: name }),
      });
      const data = await res.json();

      if (data.ok) {
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
      const res = await fetch("http://localhost:5000/leave-lobby", {
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
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInvite(e);
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
                    placeholder="Enter username"
                    value={joinUsername}
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
    </div>

  );
};

export default Lobby;
