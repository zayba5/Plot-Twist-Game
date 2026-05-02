import React, { useState } from "react";
import { loginUser, postUser } from "./Utility";

const AuthModal = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState("login"); // login | signup
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setAuthError("");

      let result;
      const trimmedUsername = username.trim();

      if (mode === "login") {
        result = await loginUser(trimmedUsername, password);
      } else {
        result = await postUser(trimmedUsername, password);
      }

      onSuccess(result);
      onClose();
    } catch (err) {
      const message =
        err.message === "username_taken"
          ? "That username is already taken."
          : err.message === "missing_fields"
            ? "Enter a username and password."
            : "Invalid username or password.";
      setAuthError(message);
    } finally {
      setSubmitting(false);
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
              value={username || ""}
              onChange={(e) => {
                setUsername(e.target.value);
                setAuthError("");
              }}
            />
          </div>

          <div className="credential-input-section">
            <label>Password</label>
            <input
              className="credential-input"
              type="password"
              placeholder="Enter password"
              value={password || ""}
              onChange={(e) => {
                setPassword(e.target.value);
                setAuthError("");
              }}
            />
          </div>
          {authError && <span className="credential-error">{authError}</span>}
        </div>

        {/* Control bar */}
        <div className="game-window-control-bar">
          <button className="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Working..." : mode === "login" ? "Login" : "Sign Up"}
          </button>
        </div>

        {/* Footer switch */}
        <div className="auth-footer">
          <button
            className="auth-switch"
            onClick={() => {
              setAuthError("");
              setMode(mode === "login" ? "signup" : "login");
            }}
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
