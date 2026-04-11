import React, { useState, useMemo } from 'react';
import './index.css';
import { api } from "./global.jsx"
import { useNavigate } from "react-router-dom";
import CredentialInput from './CredentialInput.jsx';
import { postUser } from './Utility.jsx';


const Header = () => {
  return (
    <div className="game-window-header">
      <h1>{"Sign Up"}</h1>
    </div>

  )
}

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
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
};

//start display content functions
const SignUpPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repassword, setRepassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);

  const canSubmit = useMemo(() => {
    return !usernameTaken && !submitting && username.trim().length > 0 && password.length > 0 && repassword === password;
  }, [usernameTaken, submitting, username, password, repassword]);

  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      const normUsername = username.trim();
      const result = await postUser(normUsername, password);

    if (result.error === "username_taken") {
      setUsernameTaken(true);
      return;
    }

      console.log("User created:", result);
      
      navigate("/login");
    } catch (error) {
      console.error("Failed to create user:", error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleUsernameChange = (value) => {
    setUsername(value);
    setUsernameTaken(false);
  };

  return (
    <div className='game-window' id='scoreboard-page'>
      <Header></Header>

      <CredentialInput 
        label="Choose a username:" 
        credential={username}
        setCredential={handleUsernameChange} 
        error={usernameTaken ? "Username already taken" : null}
      ></CredentialInput>

      <CredentialInput 
        label="Choose a password:" 
        credential={password} 
        setCredential={setPassword} 
        isPassword={true}
      ></CredentialInput>
      
      <CredentialInput 
        label="Re-enter password:" 
        credential={repassword} 
        setCredential={setRepassword} 
        isPassword={true} 
        error={password != repassword ? "Passwords do not match" : null}
      ></CredentialInput>

      <ControlBar onSubmit={() => handleSubmit()} disabled={!canSubmit} submitting={submitting}></ControlBar>
    </div>
  )
}
//end display content functions

export default SignUpPage