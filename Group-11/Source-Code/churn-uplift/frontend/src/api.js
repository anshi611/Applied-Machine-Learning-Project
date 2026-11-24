// All calls to the FastAPI backend live here.
// The backend address comes from VITE_API_URL (see .env.example).
export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// Build "?a=1&b=2", skipping empty values
const qs = (params) =>
  "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null)).toString();

export const api = {
  summary: () => request("/summary"),
  metrics: () => request("/metrics"),
  customers: (params = {}) => request(`/customers${qs(params)}`),
  customer: (id) => request(`/customers/${encodeURIComponent(id)}`),
  predict: (customer, { save = false } = {}) =>
    request(`/predict${save ? "?save=true" : ""}`, { method: "POST", body: JSON.stringify(customer) }),

  // Database: contact log + prediction history
  contacts: (id) => request(`/customers/${encodeURIComponent(id)}/contacts`),
  addContact: (id, contact) =>
    request(`/customers/${encodeURIComponent(id)}/contacts`, { method: "POST", body: JSON.stringify(contact) }),
  updateContact: (contactId, changes) =>
    request(`/contacts/${contactId}`, { method: "PATCH", body: JSON.stringify(changes) }),
  deleteContact: (contactId) =>
    fetch(`${API_URL}/contacts/${contactId}`, { method: "DELETE" }),
  recentContacts: (params = {}) => request(`/contacts${qs(params)}`),
  contactStats: () => request("/contacts/stats"),
  predictionHistory: () => request("/predictions/history"),
};
