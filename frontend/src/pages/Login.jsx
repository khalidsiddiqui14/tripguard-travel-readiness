import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message || "";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form);
      const role = String(user?.role || user?.user_type || "").toLowerCase();
      const isAdmin = role === "admin" || user?.is_admin === true || user?.isAdmin === true;
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand"><span className="brand-icon">T</span><strong>TripGuard</strong></div>
        <div className="auth-visual-content">
          <span className="auth-tag">TRAVEL WITH CONFIDENCE</span>
          <h1>Your journey.<br />Better prepared.</h1>
          <p>Plan business travel, stay organized, and keep every trip ready for takeoff.</p>
        </div>
        <p className="auth-visual-footer">Smart travel readiness for modern teams.</p>
      </section>
      <section className="auth-form-section">
        <form className="auth-form" onSubmit={handleSubmit}>
          <span className="form-eyebrow">WELCOME BACK</span>
          <h2>Sign in to TripGuard</h2>
          <p className="form-description">Enter your details to access your workspace.</p>
          {successMessage && <div className="trips-success">{successMessage}</div>}
          {error && <div className="form-error">{error}</div>}
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={form.password} onChange={handleChange} autoComplete="current-password" required />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
          <p className="auth-switch">Don't have an account? <Link to="/register">Create account</Link></p>
        </form>
      </section>
    </main>
  );
}