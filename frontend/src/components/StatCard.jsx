export default function StatCard({
  title,
  value,
  description,
  icon,
  tone = "blue",
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-title">{title}</span>
        <div className={`stat-card-icon ${tone}`}>{icon}</div>
      </div>

      <h2 className="stat-card-value">{value ?? 0}</h2>

      {description && (
        <p className="stat-card-description">{description}</p>
      )}
    </article>
  );
}
