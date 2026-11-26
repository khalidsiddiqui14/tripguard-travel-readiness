import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { formatDate } from "../utils/formatters";
import { useAuth } from "../hooks/useAuth";

const statusLabels = {
  upcoming: "Upcoming",
  pending: "Pending",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const allowedStatuses = new Set(Object.keys(statusLabels));

function MetricCard({ label, value, description, icon, color }) {
  return (
    <article className="dash-metric">
      <div className="dash-metric-top">
        <span className={`dash-metric-icon ${color}`} aria-hidden="true">{icon}</span>
        <span className="dash-metric-label">{label}</span>
      </div>
      <h3>{value}</h3>
      <p>{description}</p>
    </article>
  );
}

function getTripStatus(status) {
  const normalized = String(status || "upcoming").toLowerCase();
  return {
    label: statusLabels[normalized] || "Upcoming",
    className: allowedStatuses.has(normalized) ? normalized : "upcoming",
  };
}

function getTripList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.trips)) return data.trips;
  return [];
}

function getRiskInfo(trip) {
  const risk = String(trip?.readiness?.risk_level || trip?.risk_level || "").toLowerCase();
  const score = Number(trip?.readiness?.score ?? trip?.readiness_score);
  let level = risk;
  if (!level && Number.isFinite(score)) {
    if (score >= 75) level = "low";
    else if (score >= 45) level = "medium";
    else level = "high";
  }
  if (!level) return { label: "—", className: "risk-unknown", score: null };
  if (level === "low") return { label: "Low Risk", className: "risk-low", score };
  if (level === "medium") return { label: "Medium Risk", className: "risk-medium", score };
  return { label: "High Risk", className: "risk-high", score };
}

function normalizeWeather(raw) {
  if (!raw) return null;
  const w = raw.weather || raw.data || raw;
  if (!w || typeof w !== "object") return null;
  return w;
}

function getWeatherInfo(trip, weatherMap = {}) {
  const w = normalizeWeather(
    weatherMap[trip?.destination_city] || trip?.weather || trip?.intelligence?.weather || null
  );
  if (!w) return null;
  const label = w.condition || w.summary || w.description || w.main || "Weather available";
  const temp = w.temperature ?? w.temp ?? w.temp_c ?? "";
  return `${label}${temp !== "" ? ` • ${Math.round(Number(temp))}°C` : ""}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const [summary, setSummary] = useState(null);
  const [trips, setTrips] = useState([]);
  const [weatherMap, setWeatherMap] = useState({});
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const dashboardPath = isAdmin ? "/dashboard/admin" : "/dashboard/employee";
      const results = await Promise.allSettled([
        api(dashboardPath),
        api("/trips"),
      ]);
      const [dashboardResult, tripsResult] = results;
      const errors = [];
      if (dashboardResult.status === "fulfilled") {
        setSummary(dashboardResult.value || null);
      } else {
        errors.push("Travel readiness information is temporarily unavailable.");
      }
      if (tripsResult.status === "fulfilled") {
        const tripsFromTripsApi = getTripList(tripsResult.value);
        const dashboardData = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
        const tripsFromDashboard = getTripList(dashboardData?.trips);
        const merged = tripsFromTripsApi.map((trip) => {
          const match = tripsFromDashboard.find((d) => d.trip_id === trip.id || d.id === trip.id);
          if (!match) return trip;
          return {
            ...trip,
            readiness: match.readiness,
            readiness_score: match.readiness_score,
            risk_level: match.risk_level,
          };
        });
        const dashboardAsTrips = tripsFromDashboard.map((d) => ({
          ...d,
          id: d.trip_id || d.id,
          destination_city: d.destination || d.destination_city,
          destination_country: d.destination_country,
        }));
        setTrips(merged.length > 0 ? merged : dashboardAsTrips);
        setTripsLoaded(true);
      } else {
        const dashboardData = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
        const tripsFromDashboard = getTripList(dashboardData?.trips);
        if (tripsFromDashboard.length > 0) {
          setTrips(tripsFromDashboard.map((d) => ({
            ...d,
            id: d.trip_id || d.id,
            destination_city: d.destination || d.destination_city,
            destination_country: d.destination_country,
          })));
          setTripsLoaded(true);
        } else {
          errors.push(tripsResult.reason?.message || "Unable to load your trips.");
        }
      }
      setError(errors.join(" "));
    } catch (err) {
      setError(err?.message || "Unable to load your dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    async function loadWeather() {
      if (trips.length === 0) return;
      const cities = [...new Set(trips.map((t) => t.destination_city).filter(Boolean))];
      if (cities.length === 0) return;
      const map = {};
      for (const city of cities) {
        try {
          const res = await api(`/intelligence/weather?city=${encodeURIComponent(city)}`);
          map[city] = normalizeWeather(res);
        } catch {
          try {
            const res2 = await api(`/weather?city=${encodeURIComponent(city)}`);
            map[city] = normalizeWeather(res2);
          } catch {
            map[city] = null;
          }
        }
      }
      setWeatherMap(map);
    }
    loadWeather();
  }, [trips]);

  const totalTrips = typeof summary?.total_trips === "number" ? summary.total_trips : trips.length;

  const upcomingTrips = useMemo(() => {
    if (typeof summary?.upcoming_trips === "number") return summary.upcoming_trips;
    return trips.filter((t) => String(t.status || "").toLowerCase() === "upcoming").length;
  }, [summary, trips]);

  const completedTrips = useMemo(
    () => trips.filter((t) => String(t.status || "").toLowerCase() === "completed").length,
    [trips]
  );

  const pendingTasks =
    typeof summary?.pending_tasks === "number" && Number.isFinite(summary.pending_tasks)
      ? summary.pending_tasks
      : "—";

  const readinessValue = Number(summary?.average_readiness);
  const hasReadiness =
    summary?.average_readiness !== null &&
    summary?.average_readiness !== undefined &&
    summary?.average_readiness !== "" &&
    Number.isFinite(readinessValue);
  const readinessPercentage = hasReadiness ? Math.min(100, Math.max(0, Math.round(readinessValue))) : 0;

  const highRiskCount = useMemo(
    () => trips.filter((t) => getRiskInfo(t).className === "risk-high").length,
    [trips]
  );

  const weatherAlertTrips = useMemo(
    () => trips.filter((t) => {
      const w = normalizeWeather(weatherMap[t?.destination_city] || t?.weather || t?.intelligence?.weather);
      const cond = String(w?.condition || "").toLowerCase();
      return cond.includes("storm") || cond.includes("severe") || cond.includes("heavy") || cond.includes("extreme");
    }),
    [trips, weatherMap]
  );

  const recentTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => {
        const dateA = new Date(a.departure_date).getTime();
        const dateB = new Date(b.departure_date).getTime();
        if (!Number.isFinite(dateA)) return 1;
        if (!Number.isFinite(dateB)) return -1;
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [trips]);

  const nextTrip = recentTrips[0] || null;
  const nextWeather = nextTrip ? getWeatherInfo(nextTrip, weatherMap) : null;
  const breakdown = [
    { label: "Checklist", value: 40, hint: "Tasks complete karo" },
    { label: "Weather", value: 30, hint: "Destination weather" },
    { label: "Departure", value: 20, hint: "Time remaining" },
    { label: "Details", value: 10, hint: "Trip info complete" },
  ];

  if (loading) {
    return (
      <div className="content-loader" role="status" aria-live="polite">
        Loading your travel workspace...
      </div>
    );
  }

  return (
    <div className="page-content dashboard-page dash-full">
      {/* COMPACT HERO */}
      <section className="dash-compact-hero">
        <div>
          <span className="dashboard-eyebrow">{isAdmin ? "ADMIN COMMAND CENTER" : "YOUR TRAVEL COMMAND CENTER"}</span>
          <h2>Welcome back, {user?.name?.trim()?.split(/\s+/)[0] || "Traveler"}! ✈️</h2>
          <p>{isAdmin ? "Monitor all employee trips, readiness scores and flagged risks in one place." : `You have ${upcomingTrips} upcoming trip • ${pendingTasks} tasks pending • ${readinessPercentage}% ready.`}</p>
        </div>
        <div className="dash-hero-actions">
          <Link to="/trips" className="dashboard-primary-link">+ New Trip <span>→</span></Link>
          <button type="button" className="dashboard-refresh" onClick={() => loadDashboard(true)} disabled={refreshing}>{refreshing ? "Refreshing..." : "↻ Refresh"}</button>
        </div>
      </section>

      {error && (
        <div className="form-error dashboard-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => loadDashboard(true)} disabled={refreshing}>
            {refreshing ? "Retrying..." : "Try again"}
          </button>
        </div>
      )}

      {weatherAlertTrips.length > 0 && (
        <div className="form-error dashboard-error" role="alert">
          <span>⚠ Weather Alert: {weatherAlertTrips.length} trip(s) me severe weather hai — {weatherAlertTrips.map((t) => t.destination_city || t.title).filter(Boolean).join(", ")}</span>
        </div>
      )}

      {/* METRICS */}
      <section className="dashboard-metrics">
        <MetricCard label="Total trips" value={totalTrips} description={isAdmin ? "All employee travel requests" : "All your travel requests"} icon="✈" color="metric-blue" />
        <MetricCard label="Upcoming trips" value={upcomingTrips} description="Trips scheduled ahead" icon="◷" color="metric-green" />
        <MetricCard label="Completed" value={completedTrips} description="Successfully completed" icon="✓" color="metric-purple" />
        {isAdmin ? (
          <MetricCard label="High Risk trips" value={highRiskCount} description="Needs immediate attention" icon="⚠" color="metric-orange" />
        ) : (
          <MetricCard label="Pending tasks" value={pendingTasks} description="Checklist tasks remaining" icon="⌛" color="metric-orange" />
        )}
      </section>

      {/* 3 CARDS — YE KHALI PAN KHATAM KAREGA */}
      <section className="dash-grid-3">
        <article className="dash-card">
          <span className="dashboard-section-label">TRAVEL READINESS</span>
          <h3>Journey overview</h3>
          <div className="dash-big">{hasReadiness ? `${readinessPercentage}%` : "—"}</div>
          <div className="readiness-progress-track"><div className="readiness-progress-fill" style={{ width: `${readinessPercentage}%` }} /></div>
          <p className="dash-muted">{readinessPercentage >= 75 ? "Low risk — ready to travel" : readinessPercentage >= 45 ? "Medium risk — finish checklist" : "High risk — complete tasks"}</p>
          <div className="dash-breakdown">
            {breakdown.map((b) => (
              <div key={b.label} className="dash-break-row"><span>{b.label}</span><div className="dash-mini-bar"><div style={{ width: `${b.value * 2.5}%` }} /></div><strong>{b.value}</strong></div>
            ))}
          </div>
          <small className="dash-muted">Score = Checklist 40 + Weather 30 + Departure 20 + Details 10</small>
        </article>

        <article className="dash-card dash-next">
          <span className="dashboard-section-label">NEXT TRIP</span>
          {nextTrip ? (
            <>
              <h3>{nextTrip.title}</h3>
              <p className="dash-route">{nextTrip.origin_city} → <strong>{nextTrip.destination_city}</strong></p>
              <div className="dash-next-meta"><span>📅 {formatDate(nextTrip.departure_date)}</span><span>🌍 {nextTrip.destination_country}</span></div>
              <div className="dash-next-meta"><span>☀ {nextWeather || "Weather loading..."}</span><span className={`status-badge ${getRiskInfo(nextTrip).className}`}>{getRiskInfo(nextTrip).label}</span></div>
              <Link to={`/trips/${nextTrip.id}`} className="primary-button" style={{ marginTop: 12 }}>View trip details →</Link>
            </>
          ) : (
            <><h3>No trip yet</h3><p className="dash-muted">Create your first trip to see next trip, weather and risk here.</p><Link to="/trips" className="primary-button" style={{ marginTop: 12 }}>+ Create Trip</Link></>
          )}
          <div className="dash-tip"><strong>💡 Tip:</strong> Checklist tick karte hi readiness 50% → 90% ho jayega.</div>
        </article>

        <article className="dash-card">
          <span className="dashboard-section-label">QUICK ACCESS</span>
          <h3>Where to go?</h3>
          <Link to="/trips" className="quick-action-link"><span className="quick-action-icon">✈</span><span><strong>{isAdmin ? "Manage all trips" : "Manage my trips"}</strong><small>View & organize journeys</small></span><span>→</span></Link>
          <Link to="/trips" className="quick-action-link"><span className="quick-action-icon">☑</span><span><strong>Checklist & readiness</strong><small>Complete tasks, boost score</small></span><span>→</span></Link>
          <Link to="/profile" className="quick-action-link"><span className="quick-action-icon">♙</span><span><strong>My profile</strong><small>Update name, phone, city</small></span><span>→</span></Link>
          <div className="dash-tip"><strong>PDF Report:</strong> Trip khol ke Download Report dabao — teacher ko dikhane ke liye best hai.</div>
        </article>
      </section>

      <section className="content-panel dashboard-trips-panel">
        <div className="panel-heading">
          <div>
            <span className="dashboard-section-label">YOUR TRAVEL ACTIVITY</span>
            <h2>{isAdmin ? "Employee trips" : "Your trips"}</h2>
            <p className="dashboard-panel-description">Keep track of your upcoming and previous journeys.</p>
          </div>
          <Link to="/trips" className="text-link">View all trips →</Link>
        </div>

        {!tripsLoaded ? (
          <div className="empty-state">
            <h3>Trips couldn't be loaded</h3>
            <p>Please check your connection and try again.</p>
            <button type="button" className="primary-button" onClick={() => loadDashboard(true)} disabled={refreshing}>
              {refreshing ? "Loading..." : "Try again"}
            </button>
          </div>
        ) : recentTrips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">✈</div>
            <h3>Your journey starts here</h3>
            <p>You haven't created any trips yet. Visit My Trips to create and manage your travel requests.</p>
            <Link to="/trips" className="primary-button">Go to my trips →</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table dashboard-data-table">
              <thead>
                <tr>
                  <th>TRIP DETAILS</th>
                  <th>DESTINATION</th>
                  <th>DEPARTURE</th>
                  <th>READINESS</th>
                  <th>RISK</th>
                  <th>WEATHER</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((trip) => {
                  const status = getTripStatus(trip.status);
                  const risk = getRiskInfo(trip);
                  const weather = getWeatherInfo(trip, weatherMap);
                  return (
                    <tr key={trip.id}>
                      <td>
                        <div className="dashboard-trip-name">
                          <span className="trip-table-icon" aria-hidden="true">✈</span>
                          <strong>{trip.title || "Untitled trip"}</strong>
                        </div>
                        {isAdmin && trip.user_name && <small className="trip-country">{trip.user_name} • {trip.user_email || ""}</small>}
                      </td>
                      <td>
                        <strong>{trip.destination_city || "—"}</strong>
                        <small className="trip-country">{trip.destination_country || ""}</small>
                      </td>
                      <td>{trip.departure_date ? formatDate(trip.departure_date) : "—"}</td>
                      <td><strong>{Number.isFinite(risk.score) ? `${Math.round(risk.score)}%` : "—"}</strong></td>
                      <td><span className={`status-badge ${risk.className}`}>{risk.label}</span></td>
                      <td><small>{weather || "—"}</small></td>
                      <td><span className={`status-badge ${status.className}`}>{status.label}</span></td>
                      <td><Link to={`/trips/${trip.id}`} className="dashboard-view-link">View details →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="dashboard-footer">
        <span>TripGuard</span>
        <span>Travel smarter. Travel prepared.</span>
      </footer>
    </div>
  );
}