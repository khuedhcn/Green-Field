import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

function translateAuthError(message) {
  const m = (message || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Email hoặc mật khẩu không đúng.";
  if (m.includes("email not confirmed")) return "Email chưa được xác nhận.";
  return message;
}

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (!result.ok) {
      setError(translateAuthError(result.error));
      return;
    }

    const redirectTo = location.state?.from?.pathname || "/dashboard";
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>TRACE OS</h1>
        <p>Đăng nhập vào hệ thống GreenField.</p>

        {error && <div className="login-error">{error}</div>}

        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Login"}
        </button>
      </form>
    </div>
  );
}
