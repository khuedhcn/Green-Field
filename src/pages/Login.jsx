import { useState } from "react";

export default function Login({ onLogin }) {
    const [email, setEmail] = useState("khue@example.com");
    const [password, setPassword] = useState("123456");

    const handleLogin = () => {
        const user = { email };
        localStorage.setItem("traceos_user", JSON.stringify(user));
        onLogin(user);
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>TRACE OS</h1>
                <p>Login prototype. Buổi sau sẽ kết nối Supabase.</p>

                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />

                <label>Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button onClick={handleLogin}>Login</button>
            </div>
        </div>
    );
}