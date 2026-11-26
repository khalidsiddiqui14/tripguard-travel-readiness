import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getInitials, getStatusLabel } from "../utils/formatters";
const pageTitles = {
  "/dashboard": "Dashboard",
  "/admin": "Admin Dashboard",
  "/trips": "My Trips",
  "/profile": "My Profile",
};
export default function Topbar() {
  const location = useLocation();
  const { user } = useAuth();
  let title = pageTitles[location.pathname];
  if (!title) {
    if (location.pathname.startsWith("/trips/")) {
      title = "Trip Details";
    } else if (location.pathname.startsWith("/admin")) {
      title = "Admin Dashboard";
    } else {
      title = "Dashboard";
    }
  }
  return (
    <header className="topbar">
      <div>
        <p className="topbar-eyebrow">TRIPGUARD WORKSPACE</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-user">
        <div className="notification-icon" aria-label="Notifications">♧</div>
        <div className="topbar-user-info">
          <strong>{user?.name || "Traveler"}</strong>
          <span>{getStatusLabel(user?.role || "Employee")}</span>
        </div>
        <div className="avatar">{getInitials(user?.name || "Traveler")}</div>
      </div>
    </header>
  );
}