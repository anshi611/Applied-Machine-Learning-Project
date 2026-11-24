// One customer (/customers/:id): chance of staying, recommended action, reasons, what-ifs and the contact log.
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { ActionBadge, Card, Loading, RiskBadge, SimulatedNote, useApi } from "../components/ui.jsx";
import { Glyph, Signal } from "../components/kit.jsx";
import { ACTION_HELP, money, pct } from "../theme.js";
import ContactLog from "../components/ContactLog.jsx";
import { Avatar } from "../components/CustomerCard.jsx";

const FEATURES = [
  "tenure", "MonthlyCharges", "TotalCharges", "SeniorCitizen", "gender", "Partner", "Dependents", "PhoneService",
  "MultipleLines", "InternetService", "OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport",
  "StreamingTV", "StreamingMovies", "Contract", "PaperlessBilling", "PaymentMethod",
];

const WHAT_IFS = [
  { label: "Move to a one-year contract", applies: (c) => c.Contract === "Month-to-month", change: { Contract: "One year" } },
  { label: "Move to a two-year contract", applies: (c) => c.Contract !== "Two year", change: { Contract: "Two year" } },
  { label: "Add tech support", applies: (c) => c.TechSupport === "No" && c.InternetService !== "No", change: { TechSupport: "Yes" } },
  { label: "Add online security", applies: (c) => c.OnlineSecurity === "No" && c.InternetService !== "No", change: { OnlineSecurity: "Yes" } },
  { label: "Switch to automatic card payment", applies: (c) => !c.PaymentMethod.includes("automatic"), change: { PaymentMethod: "Credit card (automatic)" } },
];

const SERVICES = [
  ["Contract", "Contract"], ["InternetService", "Internet"], ["PhoneService", "Phone line"], ["MultipleLines", "Multiple lines"],
  ["OnlineSecurity", "Online security"], ["OnlineBackup", "Online backup"], ["DeviceProtection", "Device protection"],
  ["TechSupport", "Tech support"], ["StreamingTV", "Streaming TV"], ["StreamingMovies", "Streaming movies"],
  ["PaymentMethod", "Payment method"], ["PaperlessBilling", "Paperless billing"], ["Partner", "Has a partner"], ["Dependents", "Has dependents"],
];

export default function CustomerDetail() {
  const { id } = useParams();
  const { data: c, error } = useApi(() => api.customer(id), [id]);
  const [whatIf, setWhatIf] = useState({});

  useEffect(() => {
    if (!c) return;
    setWhatIf({});
    const base = Object.fromEntries(FEATURES.map((f) => [f, c[f]]));
    api.predict(base).then((b) => {
      WHAT_IFS.filter((w) => w.applies(c)).forEach((w) =>
        api.predict({ ...base, ...w.change }).then((r) => {
          const after = Math.min(1, Math.max(0, c.chance_of_staying + (b.churn_probability - r.churn_probability)));
          setWhatIf((prev) => ({ ...prev, [w.label]: after }));
        })
      );
    }).catch(() => {});
  }, [c]);

  if (!c) return <Loading error={error && "Customer record not found."} label="Loading customer…" />;

  const first = c.name.split(" ")[0];
  const options = WHAT_IFS.filter((w) => w.applies(c));

  return (
    <div className="page">
      <Link to="/customers" className="back">{Glyph.left({ size: 16 })}All customers</Link>

      <header className="profile">
        <Avatar name={c.name} size={88} />
        <div>
          <h1>{c.name}</h1>
          <p className="profile-meta">
            <span>{c.customerID}</span>
            <span>{c.region} region</span>
            <span>Customer since {c.customer_since}</span>
            <span>{c.tenure} {c.tenure === 1 ? "month" : "months"}</span>
          </p>
          <p className="profile-tags">
            <RiskBadge level={c.risk_level} />
            <ActionBadge action={c.recommended_action} />
          </p>
        </div>
        <div className="profile-signal">
          <Signal value={c.chance_of_staying} size="lg" />
          <p>Chance {first} stays. About {Math.round(c.chance_of_staying * 10)} in 10 customers like this one stay.</p>
        </div>
      </header>

      <dl className="facts" aria-label="Account value">
        <div className="fact"><dt>Monthly bill</dt><dd className="num">${c.MonthlyCharges.toFixed(2)}</dd></div>
        <div className="fact"><dt>Worth over a year</dt><dd className="num">{money(c.customer_value)}</dd></div>
        <div className="fact"><dt>Paid to date</dt><dd className="num">{money(c.TotalCharges)}</dd></div>
      </dl>

      <div className="cols-2">
        <Card title="What to do">
          <ActionBadge action={c.recommended_action} large />
          <p style={{ marginTop: 14, maxWidth: "60ch" }}>{ACTION_HELP[c.recommended_action]}</p>
          {c.uplift_score > 0 ? (
            <p className="callout callout-line" style={{ marginTop: 14 }}>
              A $50 discount should raise {first}'s chance of staying by about <b>{Math.round(c.uplift_score * 100)} percentage points</b>.
            </p>
          ) : (
            <p className="callout callout-quiet" style={{ marginTop: 14 }}>
              A discount is unlikely to change whether {first} stays.
            </p>
          )}
          <SimulatedNote />
        </Card>

        <div className="stack">
          <Card title={`Why ${first} might leave`}>
            {c.reasons_leave.length ? (
              <ul className="signs bad">
                {c.reasons_leave.map((r) => <li key={r}>{Glyph.alert({ size: 16 })}<span>{r}</span></li>)}
              </ul>
            ) : <p className="muted small">Nothing in this account stands out as a reason to leave.</p>}
          </Card>
          <Card title={`Why ${first} might stay`}>
            {c.reasons_stay.length ? (
              <ul className="signs good">
                {c.reasons_stay.map((r) => <li key={r}>{Glyph.check({ size: 16 })}<span>{r}</span></li>)}
              </ul>
            ) : <p className="muted small">Nothing yet ties {first} to myDel: no contract, add-ons or long history.</p>}
          </Card>
        </div>
      </div>

      {options.length > 0 && (
        <Card title="What would change their mind?" subtitle="The churn model re-scores this customer with one thing changed.">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>If we…</th><th className="r">Chance of staying</th><th className="r">Change</th></tr>
              </thead>
              <tbody>
                {options.map((w) => {
                  const v = whatIf[w.label];
                  const diff = v != null ? v - c.chance_of_staying : null;
                  return (
                    <tr key={w.label}>
                      <td><b>{w.label}</b></td>
                      <td className="r">{v == null ? <span className="muted">Scoring…</span> : <>{pct(c.chance_of_staying)} to <b>{pct(v)}</b></>}</td>
                      <td className="r">
                        {diff == null ? "" : diff > 0.005
                          ? <span className="delta-up">+{Math.round(diff * 100)} pts</span>
                          : diff < -0.005
                            ? <span className="delta-down">−{Math.round(-diff * 100)} pts</span>
                            : <span className="delta-flat">No change</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ContactLog customerId={c.customerID} suggestedAction={c.recommended_action} />

      <Card title="Plan and services">
        <dl className="spec">
          {SERVICES.map(([k, label]) => <div key={k}><dt>{label}</dt><dd>{String(c[k])}</dd></div>)}
          <div><dt>Senior citizen</dt><dd>{c.SeniorCitizen ? "Yes" : "No"}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
