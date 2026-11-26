export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(amount, currency = "INR") {
  if (amount === null || amount === undefined || amount === "") {
    return "Not specified";
  }
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) return "Not specified";
  const safeCurrency = typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : "INR";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch {
    return `${safeCurrency} ${numericAmount.toLocaleString("en-IN")}`;
  }
}

export function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function getStatusLabel(status = "") {
  if (!status) return "Pending";
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}