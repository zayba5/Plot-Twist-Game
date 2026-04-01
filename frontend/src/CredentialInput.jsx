import React from 'react';
import './index.css';
import { api } from "./global.jsx"

const CredentialInput = ({ label, credential, setCredential, isPassword=false, error=null }) => {
  return (
    <div className="credential-input-section">
      <label htmlFor={label + "-credential-input"}>
        {label}
      </label>

      <input
        id={label + "-credential-input"}
        className={`credential-input ${error ? "input-error" : ""}`}
        type={isPassword ? "password" : "text"}
        value={credential}
        onChange={(e) => setCredential(e.target.value)}
      />

      {error && (
        <span className="credential-error">
          {error}
        </span>
      )}
    </div>
  );
};

export default CredentialInput;