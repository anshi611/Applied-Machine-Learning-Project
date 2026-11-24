// Campaign planner (/campaign): choose how many customers get the $50 offer and how to rank them.
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api.js";
import { ActionBadge, ChartTip, Fact, Facts, Legend, Loading, PageHeader, Pager, SimulatedNote, useApi } from "../components/ui.jsx";
import { Segmented, Signal, SimulationBanner } from "../components/kit.jsx";
import { AXIS, C, METHOD_COLORS, METHOD_LABEL, kmoney, money, num } from "../theme.js";

const RANKINGS = [
  { value: "churn_prob", label: "Most likely to leave", method: "Churn risk" },
  { value: "uplift_score", label: "Most likely to respond", method: "Uplift (T-learner)" },
];
const PAGE = 20;

export default function Campaign() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("churn_prob");
  const [topPct, setTopPct] = useState(40);
  const [page, setPage] = useState(0);

  const metrics = useApi(api.metrics);
  const list = useApi(() => api.customers({ sort_by: sortBy, limit: PAGE, offset: page * PAGE }), [sortBy, page]);

  if (!metrics.data) return <Loading error={metrics.error} label="Loading campaign results…" />;

  const roi = metrics.data.mydel_roi;
  const offer = roi.assumptions.offer_cost;
  const n = Math.round((topPct / 100) * roi.customers);

  const methods = [...new Set(roi.table.map((r) => r.method))];
  const curve = [...new Set(roi.table.map((r) => r.percent))].map((p) => ({
    percent: p,
    ...Object.fromEntries(methods.map((m) => [METHOD_LABEL[m], roi.table.find((r) => r.method === m && r.percent === p).profit])),
  }));

  const best = roi.table.reduce((a, b) => (b.profit > a.profit ? b : a));
  const methodKey = RANKINGS.find((r) => r.value === sortBy).method;
  const nearest = Math.min(100, Math.max(10, Math.round(topPct / 10) * 10));
  const row = roi.table.find((r) => r.method === methodKey && r.percent === nearest);

  const pages = Math.max(1, Math.ceil(n / PAGE));
  const rows = list.data ? list.data.items.filter((_, i) => page * PAGE + i < n) : [];
  const setPct = (v) => { setTopPct(v); setPage(0); };

  return (
    <div className="page">
      <PageHeader title="Plan a discount campaign">
        Choose how many customers get the ${offer} offer and how to pick them. Profit peaks at{" "}
        <b>{best.percent}%</b> ({num(best.contacted)} customers), at <b>{kmoney(best.profit)}</b>.
      </PageHeader>

      <section className="panel">
        <div className="planner">
          <div>
            <label htmlFor="reach" className="field"><span>How many customers to contact</span></label>
            <p className="reach-value num" aria-hidden="true">{topPct}%<small>{num(n)} customers</small></p>
            <input id="reach" type="range" min="5" max="100" step="5" value={topPct}
              aria-valuetext={`${topPct}% of customers, ${num(n)} people`} onChange={(e) => setPct(Number(e.target.value))} />
            <div className="range-scale" aria-hidden="true"><span>5%</span><span>50%</span><span>100%</span></div>
            <div className="chips" style={{ marginTop: 14 }} role="group" aria-label="Quick picks">
              {[10, 20, 30, 40, 50].map((p) => (
                <button key={p} type="button" className="chip" aria-pressed={topPct === p} onClick={() => setPct(p)}>
                  {p}%{p === best.percent ? ", best" : ""}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field" style={{ marginBottom: 8 }}><span id="rank-label">Who to contact first</span></span>
            <Segmented label="Who to contact first" options={RANKINGS} value={sortBy}
              onChange={(v) => { setSortBy(v); setPage(0); }} />
            <p className="muted small" style={{ marginTop: 12, maxWidth: "52ch" }}>
              {sortBy === "churn_prob"
                ? "Call the customers the churn model thinks are most likely to leave."
                : "Call the customers the uplift model thinks the discount will sway most."}
            </p>
          </div>

          <Facts label="Campaign estimate">
            <Fact label="Offers sent" value={num(n)} />
            <Fact label="Discount budget" value={money(n * offer)} />
            <Fact label="Customers kept" value={row ? num(Math.round(row.customers_saved)) : "–"} note={`estimate at ${nearest}%`} />
            <Fact label="Profit after discounts" value={row ? kmoney(row.profit) : "–"} tone={row && row.profit > 0 ? "line" : "drop"} note="over 12 months" />
          </Facts>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Profit by share of customers contacted</h2>
            <p className="panel-sub">The dotted line is your plan. The dot marks the best result.</p>
          </div>
        </header>
        <Legend items={methods.map((m) => [METHOD_LABEL[m], METHOD_COLORS[METHOD_LABEL[m]], m === "Random"])} />
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={curve} margin={{ top: 24, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="percent" tick={AXIS} tickFormatter={(v) => `${v}%`} axisLine={{ stroke: C.rule }} tickLine={false} />
            <YAxis tick={AXIS} tickFormatter={kmoney} width={56} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip title={(l) => `Contact ${l}% of customers`} fmt={money} />} />
            <ReferenceLine y={0} stroke={C.rule} className="ref-zero" />
            <ReferenceLine x={nearest} stroke={C.ink} strokeDasharray="2 4" strokeWidth={1.5}
              label={{ value: "Your plan", position: "top", fill: C.ink, fontSize: 12, fontWeight: 700 }} />
            {methods.map((m) => (
              <Line key={m} name={METHOD_LABEL[m]} type="monotone" dataKey={METHOD_LABEL[m]} stroke={METHOD_COLORS[METHOD_LABEL[m]]}
                strokeWidth={m === "Random" ? 2 : 2.75} strokeDasharray={m === "Random" ? "5 5" : undefined} dot={false} isAnimationActive={false} />
            ))}
            <ReferenceDot x={best.percent} y={best.profit} r={6} fill={C.line} stroke="#fff" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
        <SimulatedNote />
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Your call list</h2>
            <p className="panel-sub">The first {num(n)} customers in this order. Choose a name to open the profile.</p>
          </div>
        </header>
        {!list.data ? (
          <Loading error={list.error} />
        ) : (
          <div className="table-wrap">
            <table className="table clickable">
              <thead>
                <tr><th className="r">#</th><th>Customer</th><th>Contract</th><th className="r">Tenure</th><th className="r">Monthly bill</th><th>Chance of staying</th><th>Recommended action</th></tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.customerID} onClick={() => navigate(`/customers/${c.customerID}`)}>
                    <td className="r muted">{page * PAGE + i + 1}</td>
                    <td>
                      <Link to={`/customers/${c.customerID}`} className="row-link" onClick={(e) => e.stopPropagation()}>{c.name}</Link>
                      <small className="muted" style={{ display: "block", fontSize: "var(--t-xs)" }}>{c.customerID}</small>
                    </td>
                    <td>{c.Contract}</td>
                    <td className="r">{c.tenure} mo</td>
                    <td className="r">${c.MonthlyCharges.toFixed(2)}</td>
                    <td><Signal value={c.chance_of_staying} /></td>
                    <td><ActionBadge action={c.recommended_action} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} pages={pages} onPage={setPage} />
      </section>

      <SimulationBanner />
    </div>
  );
}
