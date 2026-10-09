import { useState } from "react";
import api from "./api";
import "./Auth.css";

function getAuthError(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response) return "The API returned an unexpected response. Please try again.";
  return "Cannot reach the TaskFlow API. Start both services from the project folder with npm run dev, then try again.";
}

function Register({ onSwitchToLogin, onAuthenticated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerUser = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setName("");
      setEmail("");
      setPassword("");
      onAuthenticated(response.data);
    } catch (error) {
      setErrorMessage(getAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const advanceToPassword = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.elements.password?.focus();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">TaskFlow</div>
        <p className="auth-subtitle">Organize. Focus. Achieve.</p>
        <h2>Create Account</h2>

        <form onSubmit={registerUser} noValidate>
          <input
            className="auth-input"
            type="text"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            placeholder="Enter your name"
            aria-label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="auth-input"
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
            placeholder="Enter your email"
            aria-label="Email address"
            value={email}
            onKeyDown={advanceToPassword}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={72}
            required
            placeholder="Create a password"
            aria-label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}

          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <button className="auth-link auth-link-button" type="button" onClick={onSwitchToLogin}>Login</button>
        </p>
      </div>
    </div>
  );
}

export default Register;
