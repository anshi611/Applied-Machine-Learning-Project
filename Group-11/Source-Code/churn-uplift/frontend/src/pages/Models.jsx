// Model comparison (/models): the three targeting rankings, then the full method detail.
import React from "react";
import { api } from "../api.js";
import { Details, KeyMessage, Loading, PageHeader, SimulatedNote, useApi } from "../components/ui.jsx";
import { C, num } from "../theme.js";
import { GainChart, MetricBars, ModelTable, SavedBars, UpliftMatrix, gainRows, savedTop20 } from "./DashboardDataScientist.jsx";

const f3 = (v) => (v == null ? "–" : v.toFixed(3));

export default function Models() {
  const { data, error } = useApi(api.metrics);
  if (!data) return <Loading error={error} label="Loading model results…" />;

  const { classical = {}, uplift = {} } = data;
  const top = savedTop20(uplift);
  const { rows, names } = gainRows(uplift);
  const k = uplift.k_customers || 282;
  const byName = Object.fromEntries(top.map((t) => [t.name, t.saved]));
  const methods = Object.keys(uplift.gain_curves || {});

  return (
    <div className="page">
      <PageHeader title="Three ways to choose who gets the offer">
        With money to contact {k} of {num(uplift.test_size)} test customers (20%), which ranking keeps the most of them?
      </PageHeader>

      <ul className="method-list">
        <li style={{ borderColor: C.line }}>
          <h3>Most likely to leave</h3>
          <p>Rank by the churn model's predicted chance of leaving, and call from the top.</p>
        </li>
        <li style={{ borderColor: C.uplift }}>
          <h3>Most likely to respond</h3>
          <p>Rank by the uplift model's estimate of how much the offer lowers each person's chance of leaving.</p>
        </li>
        <li style={{ borderColor: C.quiet }}>
          <h3>Random picks</h3>
          <p>Choose customers at random. The baseline any model has to beat.</p>
        </li>
      </ul>

      <KeyMessage>
        Ranking by churn risk saved the most customers ({byName["Most likely to leave"]}), with uplift close behind
        ({byName["Most likely to respond"]}). Both beat random picks ({byName["Random picks"]}) by about three to one.
      </KeyMessage>

      <div className="cols-2 cols-wide-right">
        <section className="panel">
          <header className="panel-head"><div><h2>Saved at a 20% budget</h2><p className="panel-sub">{k} customers contacted.</p></div></header>
          <SavedBars data={top} />
          <SimulatedNote />
        </section>
        <section className="panel">
          <header className="panel-head"><div><h2>Saved as the budget grows</h2><p className="panel-sub">The curves flatten past about 60%: extra offers mostly reach people who'd stay or leave anyway.</p></div></header>
          <GainChart rows={rows} names={names} height={240} />
        </section>
      </div>

      <section className="panel">
        <header className="panel-head"><div><h2>Four kinds of customer</h2><p className="panel-sub">Why uplift skips some high-risk customers that churn ranking would call.</p></div></header>
        <UpliftMatrix />
      </section>

      <section className="panel">
        <Details title={`Churn models in detail (${num(classical.test_size)} test customers)`}>
          <MetricBars models={classical.models} />
          <div style={{ marginTop: 20 }}><ModelTable models={classical.models} best={classical.best_model} /></div>
        </Details>
        <Details title="Uplift rankings in detail (top 20% of test customers)">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ranking</th>
                  <th className="r">Customers saved</th>
                  <th className="r">Qini AUC</th>
                  <th className="r">Uplift at 20%</th>
                  <th className="r">Lost causes contacted</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m) => {
                  const r = uplift.methods?.[m] || {};
                  return (
                    <tr key={m} className={m === uplift.chosen_uplift_model ? "is-best" : ""}>
                      <td><b>{m}</b></td>
                      <td className="r"><b>{r.true_saved_top20 ?? "–"}</b></td>
                      <td className="r">{f3(r.qini_auc)}</td>
                      <td className="r">{r.observed_uplift_at_20 != null ? `${(r.observed_uplift_at_20 * 100).toFixed(1)}%` : "–"}</td>
                      <td className="r">{r.segments_top20?.lost_cause ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small" style={{ marginTop: 12, maxWidth: "72ch" }}>
            A perfect ranking would save {uplift.best_possible_saved_top20} customers. The uplift model in use,{" "}
            {uplift.chosen_uplift_model}, was picked by 5-fold cross-validated Qini on the training data.
          </p>
          <SimulatedNote />
        </Details>
      </section>
    </div>
  );
}
