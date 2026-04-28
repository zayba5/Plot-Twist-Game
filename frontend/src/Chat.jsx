import React, { useState, useEffect } from "react";
import { socket } from "./global.jsx";

const Chat = ({ username, gameId, players, variant = "default", socketId }) => {
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: "StoryBot",
      text: "Welcome to Plot Twist! Prepare your story and wait for friends to join!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);


  useEffect(() => {
    const handler = (data) => {
      if (!data) return;


      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          user: "System",
          text: `${data.username} joined the lobby.`,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    };

    socket.on("player_joined_message", handler);

    return () => {
      socket.off("player_joined_message", handler);
    };
  }, [gameId]);

  useEffect(() => {
    const handler = (data) => {
      if (!data) return;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          
          user: data.username === username ? "You" : data.username,
          text: data.text,
          time: data.time,
        },
      ]);
    };

    socket.on("receive_message", handler);

    return () => socket.off("receive_message", handler);
    
  }, [username, gameId]);


  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    
    socket.emit("send_message", {
      game_id: gameId,
      username,
      text: chatMessage,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    setChatMessage("");
  };

  return (
    <section
      className={`lobby-panel lobby-panel-right ${
        variant === "sidebar" ? "chat-sidebar" : ""
      }`}
    >
      <h2 className="lobby-panel-title">Chat</h2>

      {players?.length > 0 && (
        <div className="lobby-players-in-chat">
          <p className="lobby-players-in-chat-title">Players in lobby</p>
          <ul className="lobby-players-in-chat-list">
            {players.map((p, i) => (
              <li key={i}>
                {p.name} {p.isHost ? "(Host)" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="lobby-chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`lobby-chat-msg ${
              msg.user === "System" ? "lobby-chat-msg-system" : ""
            }`}
          >
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
  );
};

export default Chat;
