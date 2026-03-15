import React, { useState } from 'react';
import './index.css';
import './Lobby.css';

const generateGameCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

const Lobby = () => {
  const [username, setUsername] = useState('');
  const [rounds, setRounds] = useState(5);
  const [votingSessions, setVotingSessions] = useState(3);
  const [inviteCode, setInviteCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');

  const [isLobbyCreated, setIsLobbyCreated] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [players, setPlayers] = useState([]);

  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, user: 'Player1', text: 'Welcome to the story!', time: '14:32' },
    { id: 2, user: 'Player2', text: 'Ready when you are.', time: '14:33' },
  ]);

  const roundMin = 1;
  const roundMax = 20;
  const votingMin = 1;
  const votingMax = 20;
  const sliderStep = 1;
  const tickValues = [1, 5, 10, 15, 20];

  const closestTick = (current, ticks) =>
    ticks.reduce((best, t) => (Math.abs(current - t) < Math.abs(current - best) ? t : best));

  const handleInvite = (e) => {
    e.preventDefault();
    const name = username.trim() || 'Host';
    const code = generateGameCode();
    setGameCode(code);
    setPlayers([{ name, isHost: true }]);
    setIsLobbyCreated(true);
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        user: 'System',
        text: `${name} created the lobby. Invite code: ${code}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleJoinGame = (e) => {
    e.preventDefault();
    if (!joinUsername.trim() || !inviteCode.trim()) return;
    const code = inviteCode.trim().toUpperCase();
    if (gameCode && code === gameCode) {
      setPlayers((p) => [...p, { name: joinUsername.trim(), isHost: false }]);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          user: 'System',
          text: `${joinUsername.trim()} joined the lobby.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
    // TODO: call api to join with joinUsername and inviteCode when backend exists
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
          {isLobbyCreated ? 'Share the code and wait for players.' : 'Create a game or join with a code.'}
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
