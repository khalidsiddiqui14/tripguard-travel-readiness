import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatCurrency } from "../utils/formatters";
const initialForm = {
  title: "",
  origin_city: "",
  destination_city: "",
  destination_country: "",
  purpose: "",
  departure_date: "",
  return_date: "",
  budget_amount: "",
  budget_currency: "INR",
  notes: "",
};
const statusLabels = {
  upcoming: "Upcoming",
  pending: "Pending",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};
const filters = [
  { label: "All trips", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Rejected", value: "rejected" },
];
function TripStatus({ status }) {
  const value = status || "pending";
  return (
    <span className={`status-badge ${value}`}>
      {statusLabels[value] || value.replaceAll("_", " ")}
    </span>
  );
}
function TripCard({ trip, onCancel, cancelling }) {
  const canCancel = trip.status !== "cancelled" && trip.status !== "completed" && trip.status !== "rejected";
  return (
    <article className="premium-trip-card">
      <div className="premium-trip-card-top">
        <div className="premium-trip-icon">✈</div>
        <TripStatus status={trip.status} />
      </div>
      <div className="premium-trip-heading">
        <span className="premium-trip-label">BUSINESS TRAVEL</span>
        <h3>{trip.title || "Untitled trip"}</h3>
        <p>{trip.purpose || "Travel request"}</p>
      </div>
      <div className="premium-trip-route">
        <div className="route-point">
          <span className="route-dot origin-dot" />
          <div>
            <small>FROM</small>
            <strong>{trip.origin_city || "—"}</strong>
          </div>
        </div>
        <div className="route-connector"><span>✈</span></div>
        <div className="route-point">
          <span className="route-dot destination-dot" />
          <div>
            <small>TO</small>
            <strong>{trip.destination_city || "—"}</strong>
            <small>{trip.destination_country || ""}</small>
          </div>
        </div>
      </div>
      <div className="premium-trip-info">
        <div><span>DEPARTURE</span><strong>{formatDate(trip.departure_date)}</strong></div>
        <div><span>RETURN</span><strong>{formatDate(trip.return_date)}</strong></div>
        <div><span>ESTIMATED BUDGET</span><strong>{formatCurrency(trip.budget_amount, trip.budget_currency)}</strong></div>
      </div>
      <div className="premium-trip-actions">
        <Link to={`/trips/${trip.id}`} className="trip-details-link">View trip details <span>→</span></Link>
        {canCancel && (
          <button type="button" className="trip-cancel-action" onClick={() => onCancel(trip.id)} disabled={cancelling}>
            {cancelling ? "Cancelling..." : "Cancel trip"}
          </button>
        )}
      </div>
    </article>
  );
}
export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const loadTrips = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await api("/trips");
      setTrips(Array.isArray(data) ? data : data?.items || []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load trips.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadTrips(true); }, [loadTrips]);
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.return_date < form.departure_date) {
      setError("Return date cannot be earlier than departure date.");
      return;
    }
    if (form.budget_amount && Number(form.budget_amount) < 0) {
      setError("Budget cannot be negative.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, budget_amount: form.budget_amount ? Number(form.budget_amount) : null };
      await api("/trips", { method: "POST", body: JSON.stringify(payload) });
      setForm(initialForm);
      setShowForm(false);
      setSuccess("Your trip request was created successfully.");
      await loadTrips();
    } catch (err) {
      setError(err.message || "Unable to create trip.");
    } finally {
      setSaving(false);
    }
  }
  async function cancelTrip(tripId) {
    const confirmed = window.confirm("Are you sure you want to cancel this trip?");
    if (!confirmed) return;
    setError("");
    setSuccess("");
    setCancellingId(tripId);
    try {
      await api(`/trips/${tripId}/cancel`, { method: "PATCH" });
      setSuccess("Trip cancelled successfully.");
      await loadTrips();
    } catch (err) {
      setError(err.message || "Unable to cancel trip.");
    } finally {
      setCancellingId(null);
    }
  }
  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();
    return trips.filter((trip) => {
      const searchableText = [trip.title, trip.origin_city, trip.destination_city, trip.destination_country, trip.purpose].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);
      const matchesStatus = activeFilter === "all" || trip.status === activeFilter;
      return matchesSearch && matchesStatus;
    });
  }, [trips, search, activeFilter]);
  const pendingCount = trips.filter((trip) => trip.status === "pending").length;
  const approvedCount = trips.filter((trip) => trip.status === "approved").length;
  const completedCount = trips.filter((trip) => trip.status === "completed").length;
  if (loading) {
    return <div className="content-loader">Loading your travel workspace...</div>;
  }
  return (
    <div className="page-content premium-trips-page">
      <section className="trips-hero">
        <div>
          <span className="trips-eyebrow">TRAVEL MANAGEMENT WORKSPACE</span>
          <h2>My Trips</h2>
          <p>Every journey in one place. Plan, organize and manage your business travel with confidence.</p>
        </div>
        <button type="button" className="trips-create-button" onClick={() => { setShowForm((previous) => !previous); setError(""); setSuccess(""); }}>
          <span>{showForm ? "×" : "+"}</span>
          {showForm ? "Close form" : "Create new trip"}
        </button>
      </section>
      {error && (
        <div className="form-error trips-notice">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button>
        </div>
      )}
      {success && (
        <div className="trips-success">
          <span>✓</span>
          {success}
          <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss success">×</button>
        </div>
      )}
      <section className="trips-overview">
        <article className="trips-overview-card"><span className="overview-card-icon overview-blue">✈</span><div><span>Total trips</span><strong>{trips.length}</strong><small>All your requests</small></div></article>
        <article className="trips-overview-card"><span className="overview-card-icon overview-orange">◷</span><div><span>Pending</span><strong>{pendingCount}</strong><small>Awaiting approval</small></div></article>
        <article className="trips-overview-card"><span className="overview-card-icon overview-green">✓</span><div><span>Approved</span><strong>{approvedCount}</strong><small>Approved requests</small></div></article>
        <article className="trips-overview-card"><span className="overview-card-icon overview-purple">★</span><div><span>Completed</span><strong>{completedCount}</strong><small>Finished journeys</small></div></article>
      </section>
      {showForm && (
        <section className="content-panel premium-trip-form-panel">
          <div className="premium-form-heading">
            <div><span className="trips-eyebrow">NEW TRAVEL REQUEST</span><h2>Create a new trip</h2><p>Enter your journey details to submit a travel request.</p></div>
            <span className="form-heading-icon">✈</span>
          </div>
          <form className="trip-form" onSubmit={handleSubmit}>
            <div className="premium-form-section">
              <h3>Trip information</h3><p>Give your travel request a name and purpose.</p>
              <div className="form-grid">
                <div className="field-group full-width"><label htmlFor="title">Trip title *</label><input id="title" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Client meeting in Mumbai" required /></div>
                <div className="field-group"><label htmlFor="purpose">Purpose *</label><input id="purpose" name="purpose" value={form.purpose} onChange={handleChange} placeholder="e.g. Business meeting" required /></div>
              </div>
            </div>
            <div className="premium-form-section">
              <h3>Journey details</h3><p>Where are you travelling from and to?</p>
              <div className="form-grid">
                <div className="field-group"><label htmlFor="origin_city">Origin city *</label><input id="origin_city" name="origin_city" value={form.origin_city} onChange={handleChange} placeholder="e.g. Delhi" required /></div>
                <div className="field-group"><label htmlFor="destination_city">Destination city *</label><input id="destination_city" name="destination_city" value={form.destination_city} onChange={handleChange} placeholder="e.g. Mumbai" required /></div>
                <div className="field-group full-width"><label htmlFor="destination_country">Destination country *</label><input id="destination_country" name="destination_country" value={form.destination_country} onChange={handleChange} placeholder="e.g. India" required /></div>
                <div className="field-group"><label htmlFor="departure_date">Departure date *</label><input id="departure_date" name="departure_date" type="date" value={form.departure_date} onChange={handleChange} required /></div>
                <div className="field-group"><label htmlFor="return_date">Return date *</label><input id="return_date" name="return_date" type="date" min={form.departure_date || undefined} value={form.return_date} onChange={handleChange} required /></div>
              </div>
            </div>
            <div className="premium-form-section">
              <h3>Budget and additional details</h3><p>Set an estimated budget for your journey.</p>
              <div className="form-grid">
                <div className="field-group"><label htmlFor="budget_amount">Budget amount</label><input id="budget_amount" name="budget_amount" type="number" min="0" step="0.01" value={form.budget_amount} onChange={handleChange} placeholder="e.g. 25000" /></div>
                <div className="field-group"><label htmlFor="budget_currency">Currency</label><select id="budget_currency" name="budget_currency" value={form.budget_currency} onChange={handleChange}><option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option></select></div>
                <div className="field-group full-width"><label htmlFor="notes">Additional notes</label><textarea id="notes" name="notes" rows="4" value={form.notes} onChange={handleChange} placeholder="Add any special travel requirements or notes..." /></div>
              </div>
            </div>
            <div className="premium-form-actions">
              <button type="button" className="secondary-button" onClick={() => { setShowForm(false); setForm(initialForm); setError(""); }}>Discard</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? "Submitting request..." : "Submit trip request →"}</button>
            </div>
          </form>
        </section>
      )}
      <section className="premium-trips-list">
        <div className="premium-trips-list-heading">
          <div><span className="trips-eyebrow">YOUR TRAVEL PORTFOLIO</span><h2>All travel requests</h2><p>View and manage all your journeys.</p></div>
          <span className="trips-total-count">{filteredTrips.length} of {trips.length} trips</span>
        </div>
        <div className="trips-toolbar">
          <div className="trips-search"><span>⌕</span><input type="search" placeholder="Search by trip, city or purpose..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search trips" />{search && (<button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>)}</div>
          <button type="button" className="trips-refresh-button" onClick={() => loadTrips(true)}>↻ Refresh</button>
        </div>
        <div className="trips-filter-row">
          {filters.map((filter) => (
            <button key={filter.value} type="button" className={`trips-filter ${activeFilter === filter.value ? "active" : ""}`} onClick={() => setActiveFilter(filter.value)}>{filter.label}{filter.value === "all" && (<span>{trips.length}</span>)}</button>
          ))}
        </div>
        {filteredTrips.length === 0 ? (
          <div className="premium-trips-empty">
            <div className="premium-empty-icon">✈</div>
            <h3>{trips.length === 0 ? "Your next journey starts here" : "No matching trips found"}</h3>
            <p>{trips.length === 0 ? "You haven't created any travel requests yet. Start planning your next journey." : "Try another search term or change your status filter."}</p>
            {trips.length === 0 ? (
              <button type="button" className="primary-button" onClick={() => setShowForm(true)}>+ Create your first trip</button>
            ) : (
              <button type="button" className="secondary-button" onClick={() => { setSearch(""); setActiveFilter("all"); }}>Clear filters</button>
            )}
          </div>
        ) : (
          <div className="premium-trip-grid">
            {filteredTrips.map((trip) => (<TripCard key={trip.id} trip={trip} onCancel={cancelTrip} cancelling={cancellingId === trip.id} />))}
          </div>
        )}
      </section>
    </div>
  );
}