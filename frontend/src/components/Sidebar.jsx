import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || user?.user_type || "").toLowerCase();
  const isAdmin = role === "admin" || user?.is_admin === true || user?.isAdmin === true;
  const navigation = isAdmin
    ? [
        { label: "Admin Dashboard", path: "/admin", icon: "▦" },
        { label: "Dashboard", path: "/dashboard", icon: "▦" },
        { label: "My Trips", path: "/trips", icon: "✈" },
        { label: "Profile", path: "/profile", icon: "♙" },
      ]
    : [
        { label: "Dashboard", path: "/dashboard", icon: "▦" },
        { label: "My Trips", path: "/trips", icon: "✈" },
        { label: "Profile", path: "/profile", icon: "♙" },
      ];
  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">T</div>
        <div>
          <h2>TripGuard</h2>
          <span>Travel readiness</span>
        </div>
      </div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === "/dashboard" || item.path === "/admin"} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-help">
          <span className="help-icon" aria-hidden="true">?</span>
          <div>
            <strong>Need help?</strong>
            <p>Contact your travel team.</p>
          </div>
        </div>
        <button type="button" className="logout-button" onClick={handleLogout}>
          <span aria-hidden="true">↪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}