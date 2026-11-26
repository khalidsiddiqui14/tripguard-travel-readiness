const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

export { API_URL };

export function getToken() {
  return localStorage.getItem("tripguard_token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("tripguard_token", token);
  } else {
    localStorage.removeItem("tripguard_token");
  }
}

export function clearToken() {
  localStorage.removeItem("tripguard_token");
}

export async function api(path, options = {}) {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to TripGuard server. Please check your connection."
    );
  }
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else {
    const message = await response.text().catch(() => "");
    data = { detail: message };
  }
  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d?.msg || JSON.stringify(d)).join(", ")
          : detail?.msg || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data;
}

// For PDF / file downloads - JSON wala api() yahan kaam nahi karega
export async function downloadFile(path, filename) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") message = data.detail;
    } catch {}
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}