import React, { useState } from "react";
import { loginUser, postUser } from "./Utility";

const AuthModal = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState("login"); // login | signup
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      let result;

      if (mode === "login") {
        result = await loginUser(username, password);
      } else {
        result = await postUser(username, password);
      }

      onSuccess(result);
      onClose();
    } catch (err) {
      alert("Auth failed");
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header (reuse game window header) */}
        <div className="game-window-header">
          <h1>{mode === "login" ? "Login" : "Sign Up"}</h1>
        </div>

        {/* Body */}
        <div className="auth-body">
          <div className="credential-input-section">
            <label>Username</label>
            <input
              className="credential-input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="credential-input-section">
            <label>Password</label>
            <input
              className="credential-input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Control bar */}
        <div className="game-window-control-bar">
          <button className="button" onClick={handleSubmit}>
            {mode === "login" ? "Login" : "Sign Up"}
          </button>
        </div>

        {/* Footer switch */}
        <div className="auth-footer">
          <button
            className="auth-switch"
            onClick={() =>
              setMode(mode === "login" ? "signup" : "login")
            }
          >
            {mode === "login"
              ? "No account? Sign up"
              : "Already have an account? Login"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;