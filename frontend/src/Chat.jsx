import React, { useEffect, useState } from "react";
import { socket } from "./global.jsx";
import { fetchChatHistory } from "./utility.jsx";

const Chat = ({ username, currentUserId, gameId, players, variant = "default" }) => {
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatDisabled, setChatDisabled] = useState(false);

  const normalizeMessage = (msg) => ({
    id: msg.id,
    user:
      msg.message_type === "system"
        ? "System"
        : String(msg.user_id) === String(currentUserId)
        ? "You"
        : msg.username,
    text: msg.text,
    time: msg.time,
    message_type: msg.message_type,
  });

  useEffect(() => {
    setChatDisabled(!gameId);
  }, [gameId]);

  useEffect(() => {
    if (!gameId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      try {
        const data = await fetchChatHistory(gameId);
        if (cancelled) return;

        setMessages((data.messages || []).map(normalizeMessage));
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [gameId, currentUserId]);

  useEffect(() => {
    const handleChatMessage = (data) => {
      if (!data) return;
      if (String(data.game_id) !== String(gameId)) return;

      setMessages((prev) => {
        const alreadyExists = prev.some((msg) => String(msg.id) === String(data.id));
        if (alreadyExists) return prev;

        return [...prev, normalizeMessage(data)];
      });
    };

    const handleLobbyClosed = (data) => {
      if (!data) return;
      if (String(data.game_id) !== String(gameId)) return;

      setChatDisabled(true);
      setChatMessage("");
    };

    socket.on("chat_message", handleChatMessage);
    socket.on("lobby_closed", handleLobbyClosed);

    return () => {
      socket.off("chat_message", handleChatMessage);
      socket.off("lobby_closed", handleLobbyClosed);
    };
  }, [gameId, currentUserId]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!gameId || !currentUserId || chatDisabled) return;
    if (!chatMessage.trim()) return;

    socket.emit("send_message", {
      game_id: gameId,
      user_id: currentUserId,
      text: chatMessage.trim(),
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
            {players.map((p) => (
              <li key={p.user_id}>
                {p.name || p.username} {p.isHost ? "(Host)" : ""}
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
              msg.message_type === "system" ? "lobby-chat-msg-system" : ""
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
          placeholder={chatDisabled ? "Chat disabled" : "Type a message..."}
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          disabled={chatDisabled}
        />
        <button type="submit" className="lobby-btn-send" disabled={chatDisabled}>
          Send
        </button>
      </form>
    </section>
  );
};

export default Chat;