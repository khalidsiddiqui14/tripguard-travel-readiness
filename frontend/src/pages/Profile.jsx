import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { getInitials, formatDate } from "../utils/formatters";
function ProfileInfoCard({ icon, label, value, hint }) {
  return (
    <article className="premium-profile-info-card">
      <div className="premium-profile-info-icon">{icon}</div>
      <div className="premium-profile-info-content">
        <span>{label}</span>
        <strong>{value || "Not provided"}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  );
}
export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", home_city: "" });
  useEffect(() => {
    if (user) {
      setForm({ name: user.name || "", phone: user.phone || "", home_city: user.home_city || "" });
    }
  }, [user]);
  const name = user?.name || "Traveler";
  const role = user?.role || "Employee";
  const isActive = Boolean(user?.is_active ?? true);
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim() || null, home_city: form.home_city.trim() || null };
      await api("/users/me", { method: "PATCH", body: JSON.stringify(payload) });
      if (refreshUser) await refreshUser();
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page-content premium-profile-page">
      <section className="page-heading-row premium-profile-heading">
        <div>
          <span className="panel-eyebrow">ACCOUNT SETTINGS</span>
          <h2>My Profile</h2>
          <p>Manage your identity and view your account information.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="profile-account-indicator">
            <span className={isActive ? "indicator-active" : "indicator-inactive"} />
            {isActive ? "Account active" : "Account inactive"}
          </span>
          <button type="button" className="secondary-button" onClick={() => { setEditing((p) => !p); setError(""); setSuccess(""); }}>{editing ? "Cancel" : "Edit profile"}</button>
        </div>
      </section>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="trips-success">{success}</div>}
      {editing && (
        <section className="content-panel">
          <form onSubmit={handleSave} className="trip-form">
            <div className="form-grid">
              <div className="field-group"><label htmlFor="name">Full name</label><input id="name" name="name" value={form.name} onChange={handleChange} required /></div>
              <div className="field-group"><label htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Your phone number" /></div>
              <div className="field-group"><label htmlFor="home_city">Home city</label><input id="home_city" name="home_city" value={form.home_city} onChange={handleChange} placeholder="Your home city" /></div>
            </div>
            <div className="premium-form-actions">
              <button type="button" className="secondary-button" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
            </div>
          </form>
        </section>
      )}
      <section className="premium-profile-hero">
        <div className="premium-profile-avatar">{getInitials(name)}</div>
        <div className="premium-profile-identity">
          <span className="premium-profile-eyebrow">TRAVELGUARD MEMBER</span>
          <h2>{name}</h2>
          <p>{user?.email || "Email not available"}</p>
          <div className="premium-profile-tags">
            <span>{role.replaceAll("_", " ")}</span>
            <span className={isActive ? "profile-tag-active" : "profile-tag-inactive"}>{isActive ? "● Active account" : "● Inactive account"}</span>
          </div>
        </div>
        <div className="premium-profile-hero-mark" aria-hidden="true">TG</div>
      </section>
      <section className="premium-profile-section">
        <div className="premium-profile-section-heading"><div><span className="panel-eyebrow">PERSONAL INFORMATION</span><h2>Basic details</h2><p>Your personal information associated with TripGuard.</p></div></div>
        <div className="premium-profile-info-grid">
          <ProfileInfoCard icon="♙" label="Full name" value={user?.name} hint="Your registered name" />
          <ProfileInfoCard icon="✉" label="Email address" value={user?.email} hint="Your registered email" />
          <ProfileInfoCard icon="☎" label="Phone number" value={user?.phone} hint="Contact information" />
          <ProfileInfoCard icon="⌖" label="Home city" value={user?.home_city} hint="Your registered home location" />
        </div>
      </section>
      <section className="content-panel premium-account-panel">
        <div className="premium-profile-section-heading"><div><span className="panel-eyebrow">ACCOUNT INFORMATION</span><h2>Account overview</h2><p>Your role and current account status.</p></div><div className="premium-account-icon">⚙</div></div>
        <div className="premium-account-details">
          <div className="premium-account-row"><div><span>Account role</span><strong>{role.replaceAll("_", " ")}</strong></div><span className="account-detail-symbol">♙</span></div>
          <div className="premium-account-row"><div><span>Account status</span><strong className={isActive ? "active-text" : "inactive-text"}>{isActive ? "Active" : "Inactive"}</strong></div><span className="account-detail-symbol">●</span></div>
          {user?.created_at && (
            <div className="premium-account-row"><div><span>Member since</span><strong>{formatDate(user.created_at)}</strong></div><span className="account-detail-symbol">▦</span></div>
          )}
        </div>
      </section>
      <section className="premium-profile-security">
        <div className="premium-security-icon">✓</div>
        <div><strong>Your account information is protected</strong><p>TripGuard uses authenticated access to protect your personal travel information.</p></div>
      </section>
      <footer className="detail-page-footer"><span>TripGuard</span><span>Your travel workspace, all in one place.</span></footer>
    </div>
  );
}