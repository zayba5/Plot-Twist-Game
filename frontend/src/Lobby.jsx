import React, { useState } from 'react';
import './index.css';
import './Lobby.css';

const Lobby = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [storyType, setStoryType] = useState('Adventure');
  const [gameLength, setGameLength] = useState('Medium');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, user: 'Blues', text: 'Welcome to the story!', time: '14:32' },
    { id: 2, user: 'Hydroponos', text: 'Ready when you are.', time: '14:33' },
  ]);

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

  const handleJoinWithCode = (e) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      // TODO: call api to join with invite code
      console.log('Join with code:', inviteCode);
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
        <p className="lobby-status">Waiting for players to ready up....</p>
      </header>

      <div className="lobby-panels">
        <section className="lobby-panel lobby-panel-left">
          <h2 className="lobby-panel-title">Custom Game</h2>

          <div className="lobby-options">
            <label className="lobby-label">
              Story Type
              <select
                className="lobby-select"
                value={storyType}
                onChange={(e) => setStoryType(e.target.value)}
              >
                <option value="Adventure">Adventure</option>
                <option value="Mystery">Mystery</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Random">Random</option>
              </select>
            </label>
            <label className="lobby-label">
              Game Length
              <select
                className="lobby-select"
                value={gameLength}
                onChange={(e) => setGameLength(e.target.value)}
              >
                <option value="Short">Short</option>
                <option value="Medium">Medium</option>
                <option value="Long">Long</option>
                <option value="Epic">Epic</option>
              </select>
            </label>
            <div className="lobby-label">
              <span className="lobby-label-text">Game Rules</span>
              <button type="button" className="lobby-btn-secondary">
                CUSTOM
              </button>
            </div>
            <label className="lobby-checkbox">
              <input type="checkbox" />
              <span>Sample Text</span>
            </label>
            <label className="lobby-checkbox">
              <input type="checkbox" />
              <span>Sample Text</span>
            </label>
          </div>

          <div className="lobby-join-section">
            <p className="lobby-join-label">Or join with invite code</p>
            <form onSubmit={handleJoinWithCode} className="lobby-invite-form">
              <input
                type="text"
                className="lobby-invite-input"
                placeholder="Paste invite code..."
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
              <button type="submit" className="lobby-btn-join">
                Join Game
              </button>
            </form>
          </div>
        </section>

        <section className="lobby-panel lobby-panel-right">
          <h2 className="lobby-panel-title">Chat</h2>
          <div className="lobby-chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className="lobby-chat-msg">
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
        <button type="button" className="lobby-footer-btn lobby-btn-back">
          ← BACK
        </button>
        <button type="button" className="lobby-footer-btn lobby-btn-invite">
          INVITE FRIENDS
        </button>
        <button type="button" className="lobby-footer-btn lobby-btn-play">
          Play Game
        </button>
      </footer>
    </div>
  );
};

export default Lobby;
