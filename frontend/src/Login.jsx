import React, { useState, useMemo } from 'react';
import './index.css';
import { useNavigate } from "react-router-dom";
import CredentialInput from './CredentialInput.jsx';
import { loginUser } from './Utility.jsx';

const Header = () => {
  return (
    <div className="game-window-header">
      <h1>{"Login"}</h1>
    </div>
  );
};

const ControlBar = ({ onSubmit, disabled, submitting }) => {
  return (
    <div className="game-window-control-bar">
      <div></div>
      <div></div>
      <button
        className="button"
        onClick={onSubmit}
        disabled={disabled}
      >
        {submitting ? "Logging in..." : "Login"}
      </button>
    </div>
  );
};

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const navigate = useNavigate();

  const canSubmit = useMemo(() => {
    return !submitting && username.trim().length > 0 && password.length > 0;
  }, [submitting, username, password]);

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setLoginError(null);

      const normUsername = username.trim();
      const result = await loginUser(normUsername, password);

      console.log("Login success:", result);

      navigate("/lobby");
    } catch (error) {
      console.error("Failed to login:", error);
      setLoginError("Invalid username or password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUsernameChange = (value) => {
    setUsername(value);
    setLoginError(null);
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    setLoginError(null);
  };

  return (
    <div className='game-window' id='scoreboard-page'>
      <Header />

      <CredentialInput
        label="Username:"
        credential={username}
        setCredential={handleUsernameChange}
      />

      <CredentialInput
        label="Password:"
        credential={password}
        setCredential={handlePasswordChange}
        isPassword={true}
        error={loginError}
      />

      <ControlBar
        onSubmit={handleSubmit}
        disabled={!canSubmit}
        submitting={submitting}
      />
    </div>
  );
};

export default LoginPage;