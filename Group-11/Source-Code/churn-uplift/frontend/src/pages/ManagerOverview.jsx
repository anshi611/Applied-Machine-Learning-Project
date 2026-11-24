// Manager overview (/manager). Every number comes from the API:
// GET /summary (counts, churn drivers), GET /metrics (campaign profit table), GET /customers (the collections).
import React from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api.js";
import { ChartTip, Loading, useApi } from "../components/ui.jsx";
import { Glyph, SimulationBanner } from "../components/kit.jsx";
import CustomerCard, { Collection } from "../components/CustomerCard.jsx";
import { ACTION_ORDER, ACTION_STYLE, AXIS, C, RISK_STYLE, kmoney, num, pct } from "../theme.js";

const METHODS = [
  { key: "Churn risk", label: "Most likely to leave", color: C.brand, width: 3 },
  { key: "Uplift (T-learner)", label: "Most likely to respond", color: C.uplift, width: 2.25 },
  { key: "Random", label: "Random picks", color: C.quiet, width: 2, dash: "5 5" },
];

const COLLECTIONS = [
  { key: "first", title: "Call these first", sub: "Lowest chance of staying", params: { sort_by: "churn_prob" }, more: "/customers" },
  { key: "wins", title: "Easy wins", sub: "The $50 discount helps these customers most", params: { sort_by: "uplift_score", action: "Send retention offer" }, more: "/customers?action=Send%20retention%20offer" },
  { key: "big", title: "Big bills at risk", sub: "High risk, highest monthly bill", params: { sort_by: "MonthlyCharges", risk: "High" }, more: "/customers?risk=High&sort=MonthlyCharges" },
  { key: "alone", title: "Leave these alone", sub: "Contacting them makes leaving more likely", params: { sort_by: "churn_prob", action: "Do not contact" }, more: "/customers?action=Do%20not%20contact" },
];

const churnOf = (rows, group) => 1 - (rows.find((r) => r.group === group)?.retention ?? 1);

function CollectionRow({ spec }) {
  const { data, error } = useApi(() => api.customers({ ...spec.params, limit: 10 }));
  return (
    <Collection title={spec.title} sub={spec.sub}
      action={<Link to={spec.more} className="link">See all {Glyph.right({ size: 14 })}</Link>}>
      {!data ? (
        error ? <p className="muted small">Couldn't load this list.</p>
          : Array.from({ length: 5 }, (_, i) => <span key={i} className="ccard ccard-skeleton" aria-hidden="true" />)
      ) : data.items.map((c) => <CustomerCard key={c.customerID} c={c} />)}
    </Collection>
  );
}

export default function ManagerOverview() {
  const { data: s, error } = useApi(api.summary);
  const { data: m, error: mError } = useApi(api.metrics);
  if (!s || !m) return <Loading error={error || mError} />;

  const table = m.mydel_roi.table;
  const percents = [...new Set(table.map((r) => r.percent))].sort((a, b) => a - b);
  const curve = percents.map((p) => {
    const row = { percent: p };
    METHODS.forEach(({ key }) => { row[key] = table.find((r) => r.method === key && r.percent === p)?.profit ?? null; });
    return row;
  });
  const peakOf = (key) => table.filter((r) => r.method === key).reduce((a, b) => (b.profit > a.profit ? b : a));
  const best = peakOf("Churn risk");
  const upliftPeak = peakOf("Uplift (T-learner)");
  const offer = m.mydel_roi.assumptions.offer_cost;
  const total = s.n_customers;

  const autoPay = Math.min(churnOf(s.retention_by_payment, "Bank transfer (automatic)"), churnOf(s.retention_by_payment, "Credit card (automatic)"));
  const reasons = [
    { risky: "Month-to-month contract", a: churnOf(s.retention_by_contract, "Month-to-month"), safe: "on a two-year contract", b: churnOf(s.retention_by_contract, "Two year") },
    { risky: "In their first 6 months", a: churnOf(s.retention_by_tenure, "0-6 months"), safe: "after 4 years", b: churnOf(s.retention_by_tenure, "4+ years") },
    { risky: "Pays by electronic check", a: churnOf(s.retention_by_payment, "Electronic check"), safe: "paying automatically", b: autoPay },
    { risky: "Fiber-optic internet", a: churnOf(s.retention_by_internet, "Fiber optic"), safe: "on DSL", b: churnOf(s.retention_by_internet, "DSL") },
  ];

  return (
    <div className="page page-manager">
      {/* ---------- banner ---------- */}
      <section className="banner" aria-labelledby="verdict">
        <div className="banner-copy">
          <h1 id="verdict">Contact the {best.percent}% most likely to leave and make {kmoney(best.profit)}</h1>
          <p>
            A ${offer} offer to {num(best.contacted)} of {num(total)} customers pays for itself many times over within a year.
            Contact more than that and the extra offers mostly go to people who'd have stayed anyway.
          </p>
          <div className="banner-actions">
            <Link to="/campaign" className="btn btn-primary">Plan the campaign</Link>
            <Link to="/customers" className="btn btn-quiet">Browse customers</Link>
          </div>
        </div>
        <figure className="banner-chart">
          <figcaption>
            <b>Profit by share of customers contacted</b>
            <ul className="legend">
              {METHODS.map((mt) => (
                <li key={mt.key}><i style={{ borderColor: mt.color }} className={mt.dash ? "dashed" : ""} />{mt.label}</li>
              ))}
            </ul>
          </figcaption>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={curve} margin={{ top: 26, right: 14, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="percent" tickFormatter={(v) => `${v}%`} tick={AXIS} axisLine={{ stroke: C.rule }} tickLine={false} />
              <YAxis tickFormatter={kmoney} tick={AXIS} axisLine={false} tickLine={false} width={52} />
              <ReferenceLine y={0} stroke={C.rule} className="ref-zero" />
              <Tooltip content={<ChartTip title={(l) => `Contact ${l}% of customers`} fmt={kmoney} />} />
              <ReferenceLine x={best.percent} stroke={C.ink} strokeDasharray="2 4"
                label={{ value: `Peak ${kmoney(best.profit)}`, position: "top", fill: C.ink, fontSize: 12, fontWeight: 800 }} />
              {METHODS.map((mt) => (
                <Line key={mt.key} name={mt.label} type="monotone" dataKey={mt.key} stroke={mt.color} strokeWidth={mt.width}
                  strokeDasharray={mt.dash} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} isAnimationActive={false} />
              ))}
              <ReferenceDot x={best.percent} y={best.profit} r={6} fill={C.brand} stroke="#fff" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-foot">Ranking by uplift peaks a little lower, at <b>{kmoney(upliftPeak.profit)}</b>.</p>
        </figure>
      </section>

      {/* ---------- quick stats ---------- */}
      <section className="stat-tiles" aria-label="Customer base">
        <div className="stat-tile"><span>Customers</span><b>{num(total)}</b></div>
        <div className="stat-tile"><span>Staying today</span><b>{pct(s.retention_rate, 1)}</b></div>
        <div className="stat-tile"><span>Monthly revenue</span><b>{kmoney(s.monthly_revenue)}</b></div>
        <div className="stat-tile is-alert"><span>Monthly revenue at high risk</span><b>{kmoney(s.monthly_revenue_at_risk)}</b></div>
      </section>

      {/* ---------- what to do ---------- */}
      <section aria-labelledby="todo-title">
        <h2 id="todo-title" className="section-title">What should we do with each customer?</h2>
        <ul className="moods">
          {ACTION_ORDER.map((key) => {
            const a = ACTION_STYLE[key];
            const n = s.action_counts[key] || 0;
            return (
              <li key={key}>
                <Link to={`/customers?action=${encodeURIComponent(key)}`} className="mood">
                  <span className={`mood-icon mood-${a.tone}`}>{Glyph[a.glyph]({ size: 30, sw: 2 })}</span>
                  <b>{a.label}</b>
                  <span>{num(n)} customers, {pct(n / total)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="risk-strip">
          <div className="risk-bar" role="img"
            aria-label={["High", "Medium", "Low"].map((k) => `${RISK_STYLE[k].label} ${pct(s.risk_counts[k] / total)}`).join(", ")}>
            {["High", "Medium", "Low"].map((k) => (
              <span key={k} style={{ flexGrow: s.risk_counts[k], background: RISK_STYLE[k].color }} />
            ))}
          </div>
          <ul className="risk-keys">
            {["High", "Medium", "Low"].map((k) => (
              <li key={k}>
                <Link to={`/customers?risk=${k}`}>
                  <i style={{ background: RISK_STYLE[k].color }} />{RISK_STYLE[k].label} <b>{num(s.risk_counts[k])}</b>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- collections ---------- */}
      {COLLECTIONS.map((c) => <CollectionRow key={c.key} spec={c} />)}

      {/* ---------- why they leave ---------- */}
      <section aria-labelledby="why-title">
        <h2 id="why-title" className="section-title">Why customers leave</h2>
        <ul className="why">
          {reasons.map((r) => (
            <li key={r.risky} className="why-card">
              <b className="why-big">{pct(r.a)}</b>
              <span className="why-label">{r.risky}</span>
              <span className="why-track" aria-hidden="true">
                <span className="why-fill" style={{ width: pct(r.a) }} />
                <span className="why-mark" style={{ left: pct(r.b) }} />
              </span>
              <span className="why-vs">of them left, vs {pct(r.b)} {r.safe}</span>
            </li>
          ))}
        </ul>
      </section>

      <SimulationBanner />
    </div>
  );
}
