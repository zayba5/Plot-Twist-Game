import React, { useState } from 'react';
import './index.css';
import './Lobby.css';
import { io } from "socket.io-client";
const socket = io("http://localhost:5000", { withCredentials: true });

const Lobby = () => {

  const [username, setUsername] = useState('');
  const [rounds, setRounds] = useState(5);
  const [votingSessions, setVotingSessions] = useState(3);
  const [inviteCode, setInviteCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');

  const [isLobbyCreated, setIsLobbyCreated] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [gameId, setGameId] = useState('');
  const [players, setPlayers] = useState([]);

  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'StoryBot',
      text: 'Welcome to Plot Twist! Prepare your story and wait for friends to join!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

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
        }
      });

  }, []);


  React.useEffect(() => {
    if (!gameCode) return;

    const interval = setInterval(() => {
      fetchPlayers(gameCode);
    }, 2000);

    return () => clearInterval(interval);
  }, [gameCode]);

  


  React.useEffect(() => {
    if (!socket) return;

    socket.on("lobby_update", (data) => {
      if (data.players) {
        setPlayers(
          data.players.map(p => ({
            name: p.username,
            user_id: p.user_id,
            isHost: p.isHost || false,   // <-- key fix
          }))
        );
      }
    });

    return () => {
      socket.off("lobby_update");
    };
  }, [socket]);

  React.useEffect(() => {
    if (!socket) return;

    // listen for system join messages from server

    socket.on("player_joined_message", (data) => {
      const playerNames = data.players
        ? data.players.map(p => p.username).join(", ")
        : "";

      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          user: "System",
          text: `${data.username} joined the lobby. Players: ${playerNames}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    });

    return () => socket.off("player_joined_message");
  }, [socket]);


  React.useEffect(() => {
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

        // join socket room
        socket.emit("join_game", { game_code: data.game_code });

        // add local lobby message
        setMessages(prev => [
          ...prev,
          {
            id: prev.length + 1,
            user: "Lobby",
            text: `${name} created the lobby and joined as Host.`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      alert("Could not connect to backend.");
    }
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();
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
        socket.emit("join_game", { game_code: data.game_code });

        // add local lobby message
        setMessages(prev => [
          ...prev,
          {
            id: prev.length + 1,
            user: "Lobby",
            text: `${name} joined the lobby.`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
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
    // TODO: call api to start game
    console.log('Start game');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        user: 'You',
        text: chatMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatMessage('');
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
                <p className="lobby-game-code">{gameCode}</p>
              </div>
            ) : (
              <button
                type="button"
                className="lobby-btn-invite"
                onClick={handleInvite}
              >
                Invite
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

        <section className="lobby-panel lobby-panel-right">
          <h2 className="lobby-panel-title">Chat</h2>
          {players.length > 0 && (
            <div className="lobby-players-in-chat">
              <p className="lobby-players-in-chat-title">Players in lobby</p>
              <ul className="lobby-players-in-chat-list">
                {players.map((p, i) => (
                  <li key={i}>{p.name}{p.isHost ? ' (Host)' : ''}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="lobby-chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`lobby-chat-msg${msg.user === 'System' ? ' lobby-chat-msg-system' : ''}`}>
                <span className="lobby-chat-user">{msg.user}</span>
                <span className="lobby-chat-time">{msg.time}</span>
                <p className="lobby-chat-text">{msg.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="lobby-chat-form">
            <input
              type="text"
              className="lobby-chat-input"
              placeholder="Type a message..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
            />
            <button type="submit" className="lobby-btn-send">
              Send
            </button>
          </form>
        </section>
      </div>

      <footer className="lobby-footer">
        <button type="button" className="lobby-footer-btn lobby-btn-play">
          Play Game
        </button>
      </footer>
    </div>
  );
};

export default Lobby;
