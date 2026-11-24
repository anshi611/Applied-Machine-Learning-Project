// Check a customer (/predict): describe any customer and get a live churn score, uplift and action.
import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { ActionBadge, Card, Details, PageHeader, SimulatedNote } from "../components/ui.jsx";
import { Glyph, Signal } from "../components/kit.jsx";
import { ACTION_HELP, ACTION_STYLE, money, pct } from "../theme.js";

const YN = [["No", "No"], ["Yes", "Yes"]];

const MAIN_FIELDS = [
  ["tenure", "Months with myDel"],
  ["MonthlyCharges", "Monthly bill ($)"],
  ["Contract", "Contract", [["Month-to-month", "Month-to-month"], ["One year", "One year"], ["Two year", "Two year"]]],
  ["InternetService", "Internet", [["Fiber optic", "Fiber optic"], ["DSL", "DSL"], ["No", "No internet"]]],
  ["PaymentMethod", "Payment method", [
    ["Electronic check", "Electronic check"], ["Mailed check", "Mailed check"],
    ["Bank transfer (automatic)", "Bank transfer (automatic)"], ["Credit card (automatic)", "Credit card (automatic)"],
  ]],
  ["TechSupport", "Tech support", YN],
  ["OnlineSecurity", "Online security", YN],
];

const EXTRA_FIELDS = [
  ["PaperlessBilling", "Paperless billing", YN],
  ["OnlineBackup", "Online backup", YN],
  ["DeviceProtection", "Device protection", YN],
  ["StreamingTV", "Streaming TV", YN],
  ["StreamingMovies", "Streaming movies", YN],
  ["PhoneService", "Phone line", YN],
  ["MultipleLines", "Multiple lines", YN],
  ["Partner", "Has a partner", YN],
  ["Dependents", "Has dependents", YN],
  ["SeniorCitizen", "Senior citizen (65+)", [[0, "No"], [1, "Yes"]]],
  ["gender", "Gender", [["Female", "Female"], ["Male", "Male"]]],
];

const DEFAULTS = {
  tenure: 3, MonthlyCharges: 80, Contract: "Month-to-month", InternetService: "Fiber optic",
  PaymentMethod: "Electronic check", PaperlessBilling: "Yes", OnlineSecurity: "No", TechSupport: "No",
  OnlineBackup: "No", DeviceProtection: "No", StreamingTV: "No", StreamingMovies: "No", PhoneService: "Yes",
  MultipleLines: "No", Partner: "No", Dependents: "No", SeniorCitizen: 0, gender: "Female",
};

const PRESETS = {
  "New, high risk": DEFAULTS,
  "Long-time loyal": {
    ...DEFAULTS, tenure: 60, MonthlyCharges: 55, Contract: "Two year", InternetService: "DSL",
    PaymentMethod: "Credit card (automatic)", PaperlessBilling: "No", OnlineSecurity: "Yes", TechSupport: "Yes", Partner: "Yes",
  },
  "Family bundle": {
    ...DEFAULTS, tenure: 24, MonthlyCharges: 105, Contract: "One year", InternetService: "Fiber optic", MultipleLines: "Yes",
    Partner: "Yes", Dependents: "Yes", StreamingTV: "Yes", StreamingMovies: "Yes", TechSupport: "Yes", PaymentMethod: "Bank transfer (automatic)",
  },
};

function riskWords(p) {
  if (p >= 0.6) return { text: "Likely to leave", sub: "Without action, this customer will probably cancel." };
  if (p >= 0.3) return { text: "Could go either way", sub: "A better offer from a competitor could tip them." };
  return { text: "Likely to stay", sub: "This customer looks settled." };
}

export default function Predictor() {
  const [form, setForm] = useState(DEFAULTS);
  const [activePreset, setActivePreset] = useState("New, high risk");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const reqId = useRef(0);

  const normalize = (v) => ({ ...v, tenure: Number(v.tenure), MonthlyCharges: Number(v.MonthlyCharges), SeniorCitizen: Number(v.SeniorCitizen) });

  const loadHistory = () => api.predictionHistory().then((h) => setHistory(h.slice(0, 6))).catch(() => {});
  useEffect(() => { loadHistory(); run(DEFAULTS); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function run(values) {
    const id = ++reqId.current;
    setError(null);
    setSaved(false);
    try {
      const res = await api.predict(normalize(values));
      if (id === reqId.current) setResult(res);
    } catch {
      if (id === reqId.current) setError("Couldn't score this customer. Check the backend is running, then change any field to retry.");
    }
  }

  async function saveCurrent() {
    setSaving(true);
    try {
      await api.predict(normalize(form), { save: true });
      setSaved(true);
      loadHistory();
    } catch {
      setError("Not saved. Check the backend is running.");
    } finally {
      setSaving(false);
    }
  }

  function apply(next, preset = null) {
    setActivePreset(preset);
    setForm(next);
    run(next);
  }

  const update = (name, value) => apply({ ...form, [name]: value });

  const field = ([name, label, options]) => (
    <label key={name} className="field">
      <span>{label}</span>
      {options ? (
        <select value={form[name]} onChange={(e) => update(name, e.target.value)}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input type="number" min="0" step="1" inputMode="numeric" value={form[name]} onChange={(e) => update(name, e.target.value)} />
      )}
    </label>
  );

  const risk = result && riskWords(result.churn_probability);
  const helps = result && result.uplift_score > 0;

  return (
    <div className="page">
      <PageHeader title="Check a customer">
        Describe a customer and the models score them as you type: how likely they are to leave, whether a discount would help, and what to do.
      </PageHeader>

      <div className="cols-2">
        <div className="stack">
          <Card title="The customer">
            <div className="chips" role="group" aria-label="Start from an example" style={{ marginBottom: 20 }}>
              {Object.entries(PRESETS).map(([name, p]) => (
                <button key={name} type="button" className="chip" aria-pressed={activePreset === name} onClick={() => apply(p, name)}>
                  {name}
                </button>
              ))}
            </div>
            <div className="form-grid">{MAIN_FIELDS.map(field)}</div>
            <Details title="More details (optional)">
              <div className="form-grid">{EXTRA_FIELDS.map(field)}</div>
            </Details>
            <div className="save-row">
              <button type="button" className="btn btn-quiet" onClick={saveCurrent} disabled={!result || saved || saving}>
                {saved ? <>{Glyph.check({ size: 16 })}Saved</> : saving ? "Saving…" : "Save this check"}
              </button>
              <span>Saved checks appear below so you can reload them later.</span>
            </div>
          </Card>

          <Card title="Saved checks">
            {history.length === 0 ? (
              <p className="muted small">Nothing saved yet. Describe a customer above, then choose Save this check.</p>
            ) : (
              <ul className="history">
                {history.map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => apply({ ...form, ...Object.fromEntries(Object.entries(h.input).filter(([k]) => k in form)) })}>
                      <b>{h.input.Contract}, {h.input.tenure} months, ${Number(h.input.MonthlyCharges).toFixed(0)}/mo</b>
                      <small>{(ACTION_STYLE[h.recommended_action] || {}).label || h.recommended_action}, {new Date(h.created_at).toLocaleString()}</small>
                      <Signal value={1 - h.churn_probability} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="sticky-col" aria-live="polite">
          {error && <div className="error-panel" role="alert">{Glyph.alert({ size: 20 })}<p>{error}</p></div>}
          {result && (
            <Card title="Result" className="result">
              <div className="result-block">
                <h3>Chance of staying</h3>
                <Signal value={1 - result.churn_probability} size="lg" />
                <p><b className="result-big" style={{ display: "block", color: "var(--ink)", marginBottom: 2 }}>{risk.text}</b>
                  {risk.sub} About {Math.round(result.churn_probability * 10)} in 10 customers like this leave.</p>
              </div>

              <div className="result-block">
                <h3>Would a $50 discount help?</h3>
                <p className="result-big" style={{ color: helps ? "var(--stay-ink)" : "var(--ink)", marginTop: 0 }}>
                  {helps ? `Yes, by about ${Math.round(result.uplift_score * 100)} points` : "Not really"}
                </p>
                <p>
                  {helps
                    ? `The discount should cut their chance of leaving by about ${Math.round(result.uplift_score * 100)} percentage points.`
                    : "Money doesn't change much for this customer. A discount would cost more than it saves."}
                </p>
              </div>

              <div className="result-block">
                <h3>What to do</h3>
                <ActionBadge action={result.recommended_action} large />
                <p style={{ color: "var(--ink)" }}>{ACTION_HELP[result.recommended_action]}</p>
                <div className="value-line">
                  <span className="muted">Worth over a year</span>
                  <b className="num">{money(result.customer_value)}</b>
                </div>
              </div>
              <SimulatedNote />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
