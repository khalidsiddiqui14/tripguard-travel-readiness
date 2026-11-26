import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    home_city: "",
  });

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
      const details = {
        ...form,
        phone: form.phone || null,
        home_city: form.home_city || null,
      };

      await register(details);

      navigate("/login", {
        state: { message: "Account created successfully. Please sign in." },
      });
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand">
          <span className="brand-icon">T</span>
          <strong>TripGuard</strong>
        </div>

        <div className="auth-visual-content">
          <span className="auth-tag">YOUR NEXT JOURNEY STARTS HERE</span>
          <h1>
            Make every
            <br />
            trip count.
          </h1>
          <p>
            Create your account and bring your travel plans,
            readiness, and organization together.
          </p>
        </div>

        <p className="auth-visual-footer">
          Smart travel readiness for modern teams.
        </p>
      </section>

      <section className="auth-form-section">
        <form className="auth-form" onSubmit={handleSubmit}>
          <span className="form-eyebrow">GET STARTED</span>
          <h2>Create your account</h2>
          <p className="form-description">
            Fill in your details to join TripGuard.
          </p>

          {error && <div className="form-error">{error}</div>}

          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            placeholder="Your full name"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
            required
          />

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>

          <div className="password-input-wrapper">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label htmlFor="phone">Phone number (optional)</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Your phone number"
            value={form.phone}
            onChange={handleChange}
            autoComplete="tel"
          />

          <label htmlFor="home_city">Home city (optional)</label>
          <input
            id="home_city"
            name="home_city"
            placeholder="Your home city"
            value={form.home_city}
            onChange={handleChange}
            autoComplete="address-level2"
          />

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
