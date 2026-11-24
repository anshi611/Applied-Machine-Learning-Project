// Support agent desk (/agent): a call queue on the left, the call sheet for the chosen customer on the right.
// Logging an outcome saves it to the contact log (POST /customers/{id}/contacts).
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Fact, Facts, Loading, PageHeader, useApi } from "../components/ui.jsx";
import { Glyph, Signal } from "../components/kit.jsx";
import CustomerCard, { Avatar } from "../components/CustomerCard.jsx";
import { num } from "../theme.js";

const AGENT = "Sarah";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "send", label: "Discount", test: (c) => c.recommended_action === "Send retention offer" },
  { key: "call", label: "Service call", test: (c) => c.recommended_action === "Try non-discount retention" },
  { key: "skip", label: "No call", test: (c) => ["Do not contact", "No action needed"].includes(c.recommended_action) },
];

// What to say depends on the recommended action
function scriptFor(c) {
  const first = c.name.split(" ")[0];
  const months = `${c.tenure} ${c.tenure === 1 ? "month" : "months"}`;
  switch (c.recommended_action) {
    case "Send retention offer":
      return {
        kind: "send",
        text: `Hi ${first}, this is ${AGENT} from myDel. You've been with us for ${months}, and I can take $50 off your next bill today if you'd like to move to a 12-month plan that locks in your current price.`,
        log: "Retention offer ($50 discount)",
      };
    case "Try non-discount retention":
      return {
        kind: "call",
        text: `Hi ${first}, this is ${AGENT} from myDel. I'm checking in on your service. Is everything working the way it should? If anything has been slow or unreliable, I can book a technician or set up support for you today.`,
        log: "Service / support call",
      };
    default:
      return { kind: "skip", text: null, log: "Check-in (no offer)" };
  }
}

const OUTCOMES = [
  { label: "Accepted", db: "Accepted offer", cls: "outcome-ok", icon: "check" },
  { label: "Call back later", db: "Pending", cls: "outcome-wait", icon: "calendar", note: "Callback scheduled." },
  { label: "Declined", db: "Declined", cls: "outcome-no", icon: "x" },
];

function situation(c) {
  const bill = `$${c.MonthlyCharges.toFixed(0)}`;
  if (c.Contract === "Month-to-month") {
    return c.tenure < 12
      ? `${c.name.split(" ")[0]} joined ${c.tenure} ${c.tenure === 1 ? "month" : "months"} ago, pays ${bill} a month and can cancel at any time. New month-to-month customers leave more often than any other group.`
      : `${c.name.split(" ")[0]} has been with us ${c.tenure} months on a month-to-month plan at ${bill}. No contract keeps them here, so a price lock is the main thing to offer.`;
  }
  return `${c.name.split(" ")[0]} is on a ${c.Contract.toLowerCase()} contract at ${bill} a month. Check for open service issues before the renewal date.`;
}

export default function DashboardAgent() {
  const { data, error } = useApi(api.summary);
  const list = useApi(() => api.customers({ sort_by: "churn_prob", limit: 20 }));
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [logged, setLogged] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { setApplied(false); setNotes(""); setCopied(false); }, [selectedId]);
  useEffect(() => {
    if (!sheetOpen) return;
    const esc = (e) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [sheetOpen]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!data || !list.data) return <Loading error={error || list.error} label="Loading your call queue…" />;

  const queue = list.data.items;
  const q = query.trim().toLowerCase();
  const shown = queue.filter((c) =>
    FILTERS.find((f) => f.key === filter).test(c) &&
    (!q || c.name.toLowerCase().includes(q) || c.customerID.toLowerCase().includes(q)));
  const current = queue.find((c) => c.customerID === selectedId) || shown[0] || queue[0];
  const script = scriptFor(current);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast({ error: true, text: "Couldn't copy. Select the text and copy it by hand." });
    }
  };

  const logOutcome = async (o) => {
    setSaving(true);
    try {
      await api.addContact(current.customerID, {
        channel: "Phone call",
        action: script.log,
        outcome: o.db,
        note: [o.note, notes.trim()].filter(Boolean).join(" ").slice(0, 500),
        agent: AGENT,
      });
      setLogged((n) => n + 1);
      setNotes("");
      setToast({ text: `Logged "${o.label}" for ${current.name}.` });
    } catch (e) {
      setToast({ error: true, text: `Not saved. ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title={`Good to see you, ${AGENT}`}>
        These are the {queue.length} customers least likely to stay. Pick one to see what to say and log how the call went.
      </PageHeader>

      <Facts label="Today">
        <Fact label="In your queue" value={queue.length} />
        <Fact label="Approved for the $50 discount" value={num(data.action_counts["Send retention offer"] || 0)} note="across all customers" />
        <Fact label="Calls logged this session" value={logged} tone={logged ? "line" : undefined} />
      </Facts>

      <div className="desk">
        {/* ---------- queue ---------- */}
        <section className="panel" aria-labelledby="queue-title">
          <header className="panel-head">
            <div>
              <h2 id="queue-title">Call queue</h2>
              <p className="panel-sub">Lowest chance of staying first.</p>
            </div>
          </header>
          <div className="queue-tools">
            <label className="search-field">
              <span className="sr-only">Search the queue</span>
              {Glyph.search({ size: 16 })}
              <input type="search" placeholder="Name or customer ID" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="chips" role="group" aria-label="Filter by recommended action">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label}<span className="chip-n">{queue.filter(f.test).length}</span>
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="queue-empty">No one in the queue matches. Clear the search or choose All.</p>
          ) : (
            <div className="queue">
              {shown.map((c) => (
                <CustomerCard key={c.customerID} c={c} as="button" compact
                  selected={current.customerID === c.customerID}
                  onSelect={() => { setSelectedId(c.customerID); setSheetOpen(true); }} />
              ))}
            </div>
          )}
        </section>

        {/* ---------- call sheet ---------- */}
        {sheetOpen && <button type="button" className="sheet-backdrop" aria-label="Close call sheet" onClick={() => setSheetOpen(false)} />}
        <section className={`panel call-sheet ${sheetOpen ? "is-open" : ""}`} aria-labelledby="call-title" aria-live="polite">
          <button type="button" className="sheet-close icon-btn" aria-label="Close call sheet" onClick={() => setSheetOpen(false)}>
            {Glyph.x({ size: 18 })}
          </button>
          <div className="call-who">
            <Avatar name={current.name} size={48} />
            <div>
              <h2 id="call-title">{current.name}</h2>
              <p>{current.customerID}, {current.Contract.toLowerCase()}, ${current.MonthlyCharges.toFixed(0)} a month</p>
            </div>
            <Signal value={current.chance_of_staying} />
          </div>

          <div className="call-step">
            <h3>What's going on</h3>
            <p>{situation(current)}</p>
          </div>

          <div className="call-step">
            <h3>
              What to say
              {script.text && (
                <button type="button" className="btn btn-quiet btn-sm" onClick={copy}>
                  {Glyph[copied ? "check" : "copy"]({ size: 14 })}{copied ? "Copied" : "Copy script"}
                </button>
              )}
            </h3>
            {script.text ? (
              <blockquote className="script">{script.text}</blockquote>
            ) : (
              <p className="callout callout-quiet">
                The model recommends not calling {current.name.split(" ")[0]}. A call is unlikely to change their mind and
                could remind them to cancel. Pick the next customer in the queue.
              </p>
            )}
          </div>

          {script.kind === "send" && (
            <div className="call-step">
              <h3>The $50 credit</h3>
              {applied ? (
                <p className="applied" role="status">{Glyph.check({ size: 16 })}$50 credit applied to {current.customerID}</p>
              ) : (
                <button type="button" className="btn btn-primary btn-block" onClick={() => setApplied(true)}>
                  {Glyph.tag({ size: 16 })}Apply $50 credit
                </button>
              )}
            </div>
          )}

          {script.text && (
            <div className="call-step">
              <h3>How did the call go?</h3>
              <label className="field" style={{ marginBottom: 10 }}>
                <span>Notes (optional)</span>
                <textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Asked about faster internet" />
              </label>
              <div className="outcomes">
                {OUTCOMES.map((o) => (
                  <button key={o.label} type="button" className={`btn btn-quiet ${o.cls}`} disabled={saving} onClick={() => logOutcome(o)}>
                    {Glyph[o.icon]({ size: 16 })}{o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {toast && (
            <p className={`toast ${toast.error ? "is-error" : ""}`} role="status">
              {Glyph[toast.error ? "alert" : "check"]({ size: 16 })}{toast.text}
            </p>
          )}

          <Link to={`/customers/${current.customerID}`} className="link">Open {current.name.split(" ")[0]}'s full profile and contact history</Link>
        </section>
      </div>
    </div>
  );
}
