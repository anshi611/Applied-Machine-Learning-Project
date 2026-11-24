// Contact log for one customer, saved in the backend's SQLite database.
// Agents record what they did (channel, offer, outcome) and can update outcomes later.
import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Card } from "./ui.jsx";
import { Glyph } from "./kit.jsx";

const CHANNELS = ["Phone call", "Email", "SMS", "In store"];
const ACTIONS = ["Retention offer ($50 discount)", "Contract upgrade offer", "Service / support call", "Check-in (no offer)"];
const OUTCOMES = ["Pending", "Accepted offer", "Declined", "No answer", "Stayed", "Left"];

const EMPTY = { channel: CHANNELS[0], action: ACTIONS[0], outcome: "Pending", note: "", agent: "" };

export default function ContactLog({ customerId, suggestedAction }) {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => api.contacts(customerId).then(setItems).catch(() => setError("Couldn't load the contact history. Check the backend is running."));

  useEffect(() => {
    setItems(null);
    setForm({
      ...EMPTY,
      action: suggestedAction === "Send retention offer" ? ACTIONS[0]
        : suggestedAction === "Try non-discount retention" ? ACTIONS[2] : ACTIONS[3],
    });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.addContact(customerId, form);
      setForm((f) => ({ ...f, note: "" }));
      await load();
    } catch {
      setError("Not saved. Check the backend is running, then try again.");
    } finally {
      setSaving(false);
    }
  }

  async function changeOutcome(id, outcome) {
    await api.updateContact(id, { outcome });
    load();
  }

  async function remove(id) {
    await api.deleteContact(id);
    load();
  }

  const select = (k, label, options) => (
    <label className="field">
      <span>{label}</span>
      <select value={form[k]} onChange={(e) => set(k, e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <Card title="Contact history" subtitle="Every call, email or visit is saved so the whole team can see what's been tried.">
      <form onSubmit={submit}>
        <div className="form-grid">
          {select("channel", "Channel", CHANNELS)}
          {select("action", "What we did", ACTIONS)}
          {select("outcome", "Outcome", OUTCOMES)}
          <label className="field">
            <span>Agent</span>
            <input type="text" value={form.agent} maxLength={80} placeholder="Your name" onChange={(e) => set("agent", e.target.value)} />
          </label>
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Note</span>
          <input type="text" value={form.note} maxLength={500} placeholder="e.g. Asked about faster internet"
            onChange={(e) => set("note", e.target.value)} />
        </label>
        <div className="save-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Logging…" : "Log contact"}</button>
          {error && <span className="form-error" role="alert">{error}</span>}
        </div>
      </form>

      <div className="table-wrap" style={{ marginTop: 22 }}>
        {items == null ? (
          !error && <p className="muted small">Loading history…</p>
        ) : items.length === 0 ? (
          <p className="muted small">No contacts logged yet. Use the form above after your first call.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>When</th><th>Channel</th><th>What we did</th><th>Outcome</th><th>Note</th><th><span className="sr-only">Delete</span></th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(c.created_at).toLocaleString()}</td>
                  <td>{c.channel}</td>
                  <td>{c.action}</td>
                  <td>
                    <select value={c.outcome} aria-label="Outcome" onChange={(e) => changeOutcome(c.id, e.target.value)}>
                      {OUTCOMES.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td>{c.note}{c.agent && <span className="muted"> ({c.agent})</span>}</td>
                  <td className="r">
                    <button type="button" className="search-clear" style={{ position: "static", transform: "none" }}
                      onClick={() => remove(c.id)} aria-label={`Delete contact from ${new Date(c.created_at).toLocaleDateString()}`}>
                      {Glyph.x({ size: 14 })}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
