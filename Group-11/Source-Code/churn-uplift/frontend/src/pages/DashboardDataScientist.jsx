// Data scientist overview (/scientist). All figures from GET /metrics.
import React from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api.js";
import { ChartTip, Fact, Facts, KeyMessage, Legend, Loading, PageHeader, SimulatedNote, useApi } from "../components/ui.jsx";
import { AXIS, C, METHOD_COLORS, METHOD_LABEL, MODEL_COLORS, num } from "../theme.js";

const ORDER = ["Most likely to leave", "Most likely to respond", "Random picks"];
const METRICS = [["roc_auc", "ROC-AUC"], ["precision", "Precision"], ["recall", "Recall"], ["f1", "F1"]];
const f3 = (v) => (v == null ? "–" : v.toFixed(3));

// Saved customers at the 20% budget, per targeting method (shared with Models page)
export function savedTop20(uplift) {
  const methods = Object.keys(uplift.gain_curves || {});
  return methods
    .filter((m) => uplift.methods?.[m])
    .map((m) => ({ name: METHOD_LABEL[m] || m, saved: Math.round(uplift.methods[m].true_saved_top20 ?? 0) }))
    .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
}

export function gainRows(uplift) {
  const methods = Object.keys(uplift.gain_curves || {});
  if (!methods.length) return { rows: [], names: [] };
  const names = methods.map((m) => METHOD_LABEL[m] || m);
  const rows = uplift.gain_curves[methods[0]].map((p, i) => ({
    pct: p.pct,
    ...Object.fromEntries(methods.map((m) => [METHOD_LABEL[m] || m, Math.round(uplift.gain_curves[m]?.[i]?.saved ?? 0)])),
  }));
  return { rows, names };
}

export function SavedBars({ data }) {
  const max = Math.max(...data.map((d) => d.saved), 1);
  return (
    <ul className="bars">
      {data.map((d) => (
        <li key={d.name}>
          <span className="bars-label">{d.name}</span>
          <span className="bars-track">
            <span className="bars-fill" style={{ width: `${(d.saved / max) * 80}%`, background: METHOD_COLORS[d.name] }} />
            <span className="bars-val num">{d.saved}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function GainChart({ rows, names, height = 260 }) {
  return (
    <>
      <Legend items={names.map((n) => [n, METHOD_COLORS[n], n === "Random picks"])} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ right: 16, top: 22, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="pct" tick={AXIS} tickFormatter={(v) => `${v}%`} axisLine={{ stroke: C.rule }} tickLine={false} />
          <YAxis tick={AXIS} width={40} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTip title={(l) => `Contact the top ${l}%`} fmt={(v) => `${v} saved`} />} />
          <ReferenceLine x={20} stroke={C.ink} strokeDasharray="2 4"
            label={{ value: "20% budget", position: "top", fill: C.ink, fontSize: 12, fontWeight: 650 }} />
          {names.map((n) => (
            <Line key={n} name={n} type="monotone" dataKey={n} stroke={METHOD_COLORS[n]} isAnimationActive={false}
              strokeWidth={n === "Random picks" ? 2 : 2.5} strokeDasharray={n === "Random picks" ? "5 5" : undefined} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

export function ModelTable({ models, best }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Model</th>
            <th className="r">ROC-AUC</th>
            <th className="r">Precision</th>
            <th className="r">Recall</th>
            <th className="r">F1</th>
            <th className="r">5-fold CV AUC</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(models).map(([m, r]) => (
            <tr key={m} className={m === best ? "is-best" : ""}>
              <td><b>{m}</b>{m === best && <span className="tag tag-send" style={{ marginLeft: 10 }}>In use</span>}</td>
              <td className="r"><b>{f3(r.roc_auc)}</b></td>
              <td className="r">{f3(r.precision)}</td>
              <td className="r">{f3(r.recall)}</td>
              <td className="r">{f3(r.f1)}</td>
              <td className="r">{r.cv_roc_auc_mean != null ? `${f3(r.cv_roc_auc_mean)} ± ${f3(r.cv_roc_auc_std)}` : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MetricBars({ models }) {
  const names = Object.keys(models);
  const data = METRICS.map(([key, label]) => ({ metric: label, ...Object.fromEntries(names.map((n) => [n, models[n]?.[key] ?? 0])) }));
  return (
    <>
      <Legend items={names.map((n) => [n, MODEL_COLORS[n] || C.quiet])} />
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ top: 10, bottom: 0, left: 0, right: 8 }} barGap={3}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="metric" tick={AXIS} axisLine={{ stroke: C.rule }} tickLine={false} />
          <YAxis domain={[0, 1]} tick={AXIS} width={36} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: C.paper }} content={<ChartTip fmt={(v) => v.toFixed(3)} />} />
          {names.map((m) => <Bar key={m} name={m} dataKey={m} fill={MODEL_COLORS[m] || C.quiet} radius={[3, 3, 0, 0]} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// The four uplift groups: what happens with and without the offer
export function UpliftMatrix() {
  return (
    <div className="matrix" role="table" aria-label="Customer groups by response to the offer">
      <span aria-hidden="true" />
      <span className="matrix-axis" role="columnheader">Without an offer, they would leave</span>
      <span className="matrix-axis" role="columnheader">Without an offer, they would stay</span>

      <span className="matrix-axis y" role="rowheader">With an offer, they stay</span>
      <div className="cell cell-persuade" role="cell">
        <h3>Persuadables</h3>
        <p>The offer changes their mind. Every dollar of the discount does work here.</p>
        <span className="cell-do">Send the discount</span>
      </div>
      <div className="cell cell-sure" role="cell">
        <h3>Sure things</h3>
        <p>They stay either way. A discount only gives away revenue.</p>
        <span className="cell-do">Leave them be</span>
      </div>

      <span className="matrix-axis y" role="rowheader">With an offer, they leave</span>
      <div className="cell cell-lost" role="cell">
        <h3>Lost causes</h3>
        <p>They leave no matter what. The money is wasted, though a service call may help.</p>
        <span className="cell-do">Call them instead</span>
      </div>
      <div className="cell cell-dog" role="cell">
        <h3>Sleeping dogs</h3>
        <p>Contacting them is what makes them leave. The worst group to reach out to.</p>
        <span className="cell-do">Don't contact</span>
      </div>
    </div>
  );
}

export default function DashboardDataScientist() {
  const { data, error } = useApi(api.metrics);
  if (!data) return <Loading error={error} label="Loading model results…" />;

  const { classical = {}, uplift = {} } = data;
  const models = classical.models || {};
  const bestKey = classical.best_model || Object.keys(models)[0];
  const best = models[bestKey] || {};
  const upliftKey = uplift.chosen_uplift_model || "T-learner (Logistic Regression)";
  const upliftModel = uplift.methods?.[upliftKey] || {};
  const top = savedTop20(uplift);
  const { rows, names } = gainRows(uplift);
  const byName = Object.fromEntries(top.map((t) => [t.name, t.saved]));
  const ratio = byName["Random picks"] ? (byName["Most likely to leave"] / byName["Random picks"]).toFixed(1) : null;
  const k = uplift.k_customers || 282;

  return (
    <div className="page">
      <PageHeader title="How well the models work"
        right={<Link to="/models" className="btn btn-quiet">Full model comparison</Link>}>
        Every number below is measured on {num(classical.test_size || 1409)} customers the models never saw during training.
      </PageHeader>

      <Facts label="Model summary">
        <Fact label="Churn model in use" value={bestKey} tone="text" note="picked by 5-fold cross-validation" />
        <Fact label="Test ROC-AUC" value={f3(best.roc_auc)} note={`CV ${f3(best.cv_roc_auc_mean)} ± ${f3(best.cv_roc_auc_std)}`} />
        <Fact label="Uplift model Qini" value={f3(upliftModel.qini_auc)} note={upliftKey} />
        <Fact label="Test customers" value={num(classical.test_size || 1409)} note={`${(classical.test_churn_rate * 100 || 26.5).toFixed(1)}% of them left`} />
      </Facts>

      {ratio && (
        <KeyMessage>
          With a budget to contact the top 20% ({k} customers), ranking by churn risk saved <b>{byName["Most likely to leave"]}</b>,
          ranking by uplift saved <b>{byName["Most likely to respond"]}</b>, and random picks saved <b>{byName["Random picks"]}</b>.
          Churn ranking does {ratio}× better than random.
        </KeyMessage>
      )}

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Churn models, side by side</h2>
            <p className="panel-sub">Predicting who leaves, on the held-out test set.</p>
          </div>
        </header>
        <ModelTable models={models} best={bestKey} />
      </section>

      <div className="cols-2">
        <section className="panel">
          <header className="panel-head"><div><h2>Scores by metric</h2><p className="panel-sub">Higher is better. Recall matters most: missed leavers cost the most.</p></div></header>
          <MetricBars models={models} />
        </section>
        <section className="panel">
          <header className="panel-head"><div><h2>Customers saved at a 20% budget</h2><p className="panel-sub">Contacting the top {k} test customers by each ranking.</p></div></header>
          <SavedBars data={top} />
          <SimulatedNote />
        </section>
      </div>

      <section className="panel">
        <header className="panel-head"><div><h2>Customers saved as the budget grows</h2><p className="panel-sub">Cumulative customers saved by share of the test set contacted.</p></div></header>
        <GainChart rows={rows} names={names} />
        <SimulatedNote />
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Four kinds of customer</h2>
            <p className="panel-sub">Uplift modelling sorts customers by how the offer changes what they do, not just by risk.</p>
          </div>
        </header>
        <UpliftMatrix />
      </section>
    </div>
  );
}
