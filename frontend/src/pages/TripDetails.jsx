import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, downloadFile } from "../services/api";
import { formatDate, formatCurrency } from "../utils/formatters";
const statusLabels = {
  upcoming: "Upcoming",
  pending: "Pending",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};
function DetailCard({ icon, label, value, description }) {
  return (
    <article className="premium-detail-card">
      <div className="premium-detail-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <h3>{value || "Not specified"}</h3>
        {description && <small>{description}</small>}
      </div>
    </article>
  );
}
export default function TripDetails() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const loadDetails = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [tripData, checklistData, readinessData] = await Promise.allSettled([
        api(`/trips/${tripId}`),
        api(`/trips/${tripId}/checklist`),
        api(`/readiness/trips/${tripId}`),
      ]);
      if (tripData.status === "fulfilled") {
        setTrip(tripData.value);
      } else {
        const tripsData = await api("/trips");
        const trips = Array.isArray(tripsData) ? tripsData : tripsData?.items || [];
        const selectedTrip = trips.find((item) => String(item.id) === String(tripId));
        if (!selectedTrip) throw new Error("Trip not found.");
        setTrip(selectedTrip);
      }
      if (checklistData.status === "fulfilled") {
        setChecklist(Array.isArray(checklistData.value) ? checklistData.value : checklistData.value?.items || []);
      }
      if (readinessData.status === "fulfilled") {
        setReadiness(readinessData.value);
      } else {
        setReadiness(null);
      }
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load trip details.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);
  useEffect(() => { loadDetails(true); }, [loadDetails]);

  // WEATHER + INTELLIGENCE FIX
  useEffect(() => {
    async function loadIntelligence() {
      if (!trip?.destination_city) return;
      setIntelLoading(true);
      try {
        const city = encodeURIComponent(trip.destination_city);
        const country = encodeURIComponent(trip.destination_country || "India");
        const [w, c, co] = await Promise.allSettled([
          api(`/intelligence/weather?city=${city}`).catch(() => api(`/weather?city=${city}`)),
          api(`/intelligence/currency?from=INR&to=${encodeURIComponent(trip.budget_currency || "INR")}`).catch(() => api(`/currency?from=INR&to=${encodeURIComponent(trip.budget_currency || "INR")}`)),
          api(`/intelligence/country?name=${country}`).catch(() => api(`/countries/${country}`)),
        ]);
        setIntelligence({
          weather: w.status === "fulfilled" ? (w.value?.weather || w.value?.data || w.value) : null,
          currency: c.status === "fulfilled" ? (c.value?.currency || c.value?.data || c.value) : null,
          country: co.status === "fulfilled" ? (co.value?.country || co.value?.data || co.value) : null,
        });
      } catch {
        setIntelligence(null);
      } finally {
        setIntelLoading(false);
      }
    }
    loadIntelligence();
  }, [trip?.destination_city, trip?.destination_country, trip?.budget_currency]);

  const completedCount = checklist.filter((item) => item.is_completed).length;
  const progress = checklist.length ? Math.round((completedCount / checklist.length) * 100) : 0;
  const remainingCount = checklist.length - completedCount;
  const readinessScore = readiness?.score ?? readiness?.readiness_score ?? null;
  const riskLevel = readiness?.risk_level || null;
  const checklistSorted = useMemo(() => {
    return [...checklist].sort((a, b) => Number(a.is_completed) - Number(b.is_completed));
  }, [checklist]);
  const weather = intelligence?.weather;
  const weatherText = weather ? `${weather.condition || weather.summary || weather.description || "Weather available"}${weather.temperature ?? weather.temp ? ` • ${Math.round(Number(weather.temperature ?? weather.temp))}°C` : ""}` : null;
  const currencyText = intelligence?.currency ? `${intelligence.currency.rate ? `1 INR = ${Number(intelligence.currency.rate).toFixed(2)} ${trip.budget_currency || "INR"}` : intelligence.currency.message || JSON.stringify(intelligence.currency)}` : null;
  const countryText = intelligence?.country ? `${intelligence.country.capital ? `Capital: ${intelligence.country.capital}` : ""}${intelligence.country.currency ? ` • Currency: ${intelligence.country.currency}` : ""}${intelligence.country.language ? ` • Language: ${intelligence.country.language}` : ""}` : null;

  async function addChecklistItem(event) {
    event.preventDefault();
    const title = newItem.trim();
    if (!title) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api(`/trips/${tripId}/checklist`, { method: "POST", body: JSON.stringify({ title }) });
      setNewItem("");
      setSuccess("Checklist task added successfully.");
      await loadDetails();
    } catch (err) {
      setError(err.message || "Unable to add checklist item.");
    } finally {
      setSaving(false);
    }
  }
  async function toggleChecklistItem(item) {
    setError("");
    setSuccess("");
    setUpdatingId(item.id);
    try {
      await api(`/trips/${tripId}/checklist/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_completed: !item.is_completed }) });
      await loadDetails();
    } catch (err) {
      setError(err.message || "Unable to update checklist item.");
    } finally {
      setUpdatingId(null);
    }
  }
  async function deleteChecklistItem(itemId) {
    const confirmed = window.confirm("Are you sure you want to delete this checklist task?");
    if (!confirmed) return;
    setError("");
    setSuccess("");
    setDeletingId(itemId);
    try {
      await api(`/trips/${tripId}/checklist/${itemId}`, { method: "DELETE" });
      setSuccess("Checklist task deleted successfully.");
      await loadDetails();
    } catch (err) {
      setError(err.message || "Unable to delete checklist item.");
    } finally {
      setDeletingId(null);
    }
  }
  async function downloadReport() {
    setError("");
    setDownloading(true);
    try {
      await downloadFile(`/reports/trips/${tripId}`, `TripGuard-Report-${tripId}.pdf`);
      setSuccess("Report downloaded successfully.");
    } catch (err) {
      setError(err.message || "Unable to download report.");
    } finally {
      setDownloading(false);
    }
  }
  if (loading) {
    return <div className="content-loader">Loading your journey details...</div>;
  }
  if (error && !trip) {
    return (
      <div className="page-content">
        <div className="form-error">{error}</div>
        <button type="button" className="secondary-button" onClick={() => loadDetails(true)}>Try again</button>
        <p><Link to="/trips" className="text-link">← Back to trips</Link></p>
      </div>
    );
  }
  if (!trip) return null;
  const status = trip.status || "pending";
  return (
    <div className="page-content premium-detail-page">
      <div className="detail-navigation">
        <Link to="/trips" className="back-link">← Back to my trips</Link>
        <span className="detail-reference">TRIP #{trip.id}</span>
      </div>
      <section className="premium-detail-hero">
        <div className="premium-detail-hero-content">
          <span className="detail-eyebrow">YOUR JOURNEY OVERVIEW</span>
          <div className="detail-status-row">
            <span className={`status-badge ${status}`}>{statusLabels[status] || status.replaceAll("_", " ")}</span>
            {riskLevel && <span className={`status-badge risk-${String(riskLevel).toLowerCase()}`}>{riskLevel} risk</span>}
          </div>
          <h2>{trip.title}</h2>
          <p className="detail-purpose">{trip.purpose || "Business travel"}</p>
          <div className="detail-route-display">
            <div><span>ORIGIN</span><strong>{trip.origin_city || "—"}</strong></div>
            <div className="detail-route-line"><span>✈</span></div>
            <div><span>DESTINATION</span><strong>{trip.destination_city || "—"}</strong><small>{trip.destination_country || ""}</small></div>
          </div>
          <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" className="primary-button" onClick={downloadReport} disabled={downloading}>{downloading ? "Downloading..." : "Download Report ↓"}</button>
          </div>
        </div>
        <div className="detail-hero-decoration" aria-hidden="true">
          <div className="detail-hero-circle"><span>✈</span></div>
          <div className="detail-hero-caption">TRAVEL SMARTER</div>
        </div>
      </section>
      {error && (
        <div className="form-error detail-notice"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></div>
      )}
      {success && (
        <div className="detail-success"><span>✓</span>{success}<button type="button" onClick={() => setSuccess("")} aria-label="Dismiss message">×</button></div>
      )}
      <section className="detail-information-section">
        <div className="detail-section-heading"><span className="detail-section-eyebrow">TRAVEL INFORMATION</span><h2>Journey details</h2><p>Important information about your upcoming journey.</p></div>
        <div className="premium-detail-grid">
          <DetailCard icon="↗" label="Departure date" value={formatDate(trip.departure_date)} description="Journey begins" />
          <DetailCard icon="↙" label="Return date" value={formatDate(trip.return_date)} description="Journey ends" />
          <DetailCard icon="₹" label="Travel budget" value={formatCurrency(trip.budget_amount, trip.budget_currency)} description="Estimated trip budget" />
          <DetailCard icon="◎" label="Trip purpose" value={trip.purpose || "Not specified"} description="Reason for travel" />
          <DetailCard icon="✦" label="Readiness score" value={readinessScore !== null ? `${Math.round(Number(readinessScore))}%` : `${progress}% (checklist)`} description={readiness?.explanation || "Based on checklist + trip timing"} />
          <DetailCard icon="⚠" label="Risk level" value={riskLevel ? String(riskLevel).toUpperCase() : progress >= 75 ? "LOW" : progress >= 45 ? "MEDIUM" : "HIGH"} description="Low: 75-100, Medium: 45-74, High: 0-44" />
        </div>
      </section>

      <section className="detail-information-section">
        <div className="detail-section-heading"><span className="detail-section-eyebrow">TRAVEL INTELLIGENCE</span><h2>Weather, Currency & Country</h2><p>Live information for {trip.destination_city || "your destination"}.</p></div>
        <div className="premium-detail-grid">
          <DetailCard icon="☀" label="Weather" value={intelLoading ? "Loading..." : (weatherText || "Not available")} description={`Destination: ${trip.destination_city || ""}`} />
          <DetailCard icon="₹" label="Currency" value={intelLoading ? "Loading..." : (currencyText || "Not available")} description={`Budget currency: ${trip.budget_currency || "INR"}`} />
          <DetailCard icon="🌍" label="Country info" value={intelLoading ? "Loading..." : (countryText || trip.destination_country || "Not available")} description="Capital, currency & language" />
        </div>
      </section>

      <section className="content-panel premium-checklist-panel">
        <div className="premium-checklist-heading">
          <div><span className="detail-section-eyebrow">TRAVEL PREPARATION</span><h2>Travel checklist</h2><p>Organize your preparation and get ready for your journey.</p></div>
          <div className="checklist-completion-badge"><strong>{progress}%</strong><span>Completed</span></div>
        </div>
        <div className="premium-checklist-stats">
          <div><span>Total tasks</span><strong>{checklist.length}</strong></div>
          <div><span>Completed</span><strong>{completedCount}</strong></div>
          <div><span>Remaining</span><strong>{remainingCount}</strong></div>
        </div>
        <div className="premium-checklist-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist completion">
          <div className="premium-checklist-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <form className="premium-checklist-form" onSubmit={addChecklistItem}>
          <input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Add a new preparation task..." aria-label="New checklist task" maxLength={200} />
          <button type="submit" className="primary-button" disabled={saving || !newItem.trim()}>{saving ? "Adding..." : "+ Add task"}</button>
        </form>
        {checklistSorted.length === 0 ? (
          <div className="premium-checklist-empty"><div>✓</div><h3>Your checklist is ready</h3><p>Add your first preparation task to start organizing your journey.</p></div>
        ) : (
          <div className="premium-checklist-items">
            {checklistSorted.map((item) => (
              <article className={`premium-checklist-item ${item.is_completed ? "is-completed" : ""}`} key={item.id}>
                <label className="premium-checklist-label">
                  <input type="checkbox" checked={Boolean(item.is_completed)} disabled={updatingId === item.id} onChange={() => toggleChecklistItem(item)} />
                  <span className="custom-checkmark">✓</span>
                  <span className="premium-checklist-title">{item.title}</span>
                </label>
                <div className="premium-checklist-item-actions">
                  <span className="checklist-item-status">{item.is_completed ? "Completed" : "To do"}</span>
                  <button type="button" className="checklist-delete-button" onClick={() => deleteChecklistItem(item.id)} disabled={deletingId === item.id} aria-label={`Delete ${item.title}`}>{deletingId === item.id ? "..." : "Delete"}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {trip.notes && (
        <section className="content-panel premium-trip-notes">
          <div className="detail-section-heading"><span className="detail-section-eyebrow">ADDITIONAL INFORMATION</span><h2>Trip notes</h2></div>
          <p>{trip.notes}</p>
        </section>
      )}
      <footer className="detail-page-footer"><span>TripGuard</span><span>Travel smarter. Travel prepared.</span></footer>
    </div>
  );
}