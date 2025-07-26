import React, { useState } from 'react';
import './PasswordScreen.css';

function PasswordScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const isCorrect = onLogin(password);
    if (!isCorrect) {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="password-screen">
      <div className="password-container">
        <h1>Enter Password</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            data-1p-ignore
          />
          <button type="submit">Enter</button>
        </form>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default PasswordScreen; 