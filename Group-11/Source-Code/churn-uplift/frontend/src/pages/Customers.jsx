// Customers (/customers): quick filter chips, then a card grid or a table. Filters live in the URL.
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { ActionBadge, Loading, Pager, RiskBadge, useApi } from "../components/ui.jsx";
import { Glyph, Segmented, Signal } from "../components/kit.jsx";
import CustomerCard from "../components/CustomerCard.jsx";
import { ACTION_STYLE, num } from "../theme.js";

const PAGE = 24;
const SORTS = {
  churn_prob: "Most likely to leave",
  uplift_score: "Discount helps most",
  chance_of_staying: "Least likely to leave",
  MonthlyCharges: "Highest bill",
  tenure: "Longest with us",
  name: "Name, A to Z",
};

// One-tap filters: [label, param, value]
const QUICK = [
  ["High risk", "risk", "High"],
  ["Month-to-month", "contract", "Month-to-month"],
  ["Discount works", "action", "Send retention offer"],
  ["Call instead", "action", "Try non-discount retention"],
  ["Don't contact", "action", "Do not contact"],
];

const VIEWS = [{ value: "cards", label: "Cards" }, { value: "table", label: "Table" }];
const readView = () => { try { return localStorage.getItem("mydel_customers_view") || "cards"; } catch { return "cards"; } };

export default function Customers() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [search, setSearch] = useState(q);
  const [view, setView] = useState(readView);
  const [more, setMore] = useState(false);

  const risk = params.get("risk") || "";
  const contract = params.get("contract") || "";
  const action = params.get("action") || "";
  const sort = params.get("sort") || "churn_prob";
  const page = Number(params.get("page") || 0);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  // keep the box in sync when the header search changes the URL
  useEffect(() => { setSearch(q); }, [q]);
  useEffect(() => {
    const t = setTimeout(() => { if (search !== q) set("q", search); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useEffect(() => { try { localStorage.setItem("mydel_customers_view", view); } catch { /* ignore */ } }, [view]);
  useEffect(() => {
    if (!more) return;
    const esc = (e) => e.key === "Escape" && setMore(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [more]);

  const { data, error, loading } = useApi(
    () => api.customers({
      q, risk, contract, action, limit: PAGE, offset: page * PAGE, sort_by: sort,
      descending: sort === "chance_of_staying" ? false : sort !== "name",
    }),
    [q, risk, contract, action, sort, page]
  );

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;
  const active = [risk, contract, action, q].filter(Boolean).length;
  const current = { risk, contract, action };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="lead">Every customer, scored by the churn model, with what the uplift model says to do.</p>
        </div>
        <Link to="/predict" className="btn btn-quiet">{Glyph.plus({ size: 16 })}Check a new customer</Link>
      </header>

      <div className="filterbar">
        <label className="search-field">
          <span className="sr-only">Search customers</span>
          {Glyph.search({ size: 16 })}
          <input type="search" placeholder="Name or customer ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch("")}>{Glyph.x({ size: 14 })}</button>
          )}
        </label>

        <div className="chips chips-scroll" role="group" aria-label="Quick filters">
          <button type="button" className={`chip chip-filter ${more ? "is-open" : ""}`} aria-expanded={more} onClick={() => setMore((m) => !m)}>
            {Glyph.filter({ size: 15 })}Filters{active > 0 && <span className="chip-count">{active}</span>}
          </button>
          {QUICK.map(([label, key, value]) => {
            const on = current[key] === value;
            return (
              <button key={label} type="button" className="chip" aria-pressed={on} onClick={() => set(key, on ? "" : value)}>
                {label}{on && Glyph.x({ size: 13 })}
              </button>
            );
          })}
          <label className="chip chip-select">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => set("sort", e.target.value)}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v}</option>)}
            </select>
          </label>
        </div>

        {more && (
          <div className="more-filters" role="dialog" aria-label="Filters">
            <label className="field"><span>Risk</span>
              <select value={risk} onChange={(e) => set("risk", e.target.value)}>
                <option value="">Any risk</option>
                <option value="High">High (60%+ chance of leaving)</option>
                <option value="Medium">Medium (30–60%)</option>
                <option value="Low">Low (under 30%)</option>
              </select>
            </label>
            <label className="field"><span>Contract</span>
              <select value={contract} onChange={(e) => set("contract", e.target.value)}>
                <option value="">Any contract</option>
                <option value="Month-to-month">Month-to-month</option>
                <option value="One year">One year</option>
                <option value="Two year">Two year</option>
              </select>
            </label>
            <label className="field"><span>Recommended action</span>
              <select value={action} onChange={(e) => set("action", e.target.value)}>
                <option value="">Any action</option>
                {Object.entries(ACTION_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <div className="more-filters-foot">
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setParams((p) => { const n = new URLSearchParams(p); ["risk", "contract", "action", "page"].forEach((k) => n.delete(k)); return n; }); }}>Reset</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setMore(false)}>Done</button>
            </div>
          </div>
        )}
      </div>

      {!data ? (
        <Loading error={error} />
      ) : (
        <>
          <div className="list-meta" aria-live="polite">
            <span>
              <b>{num(data.total)}</b> customers{loading ? ", updating…" : ""}
              {active > 0 && (
                <button type="button" className="link-btn" onClick={() => { setSearch(""); setParams(new URLSearchParams()); }}>
                  Clear all filters
                </button>
              )}
            </span>
            <Segmented label="Layout" options={VIEWS} value={view} onChange={setView} />
          </div>

          {data.items.length === 0 ? (
            <div className="empty">
              {Glyph.search({ size: 28 })}
              <h2>No customers match</h2>
              <p>Try a different name, or clear the filters to see everyone.</p>
              <button type="button" className="btn btn-primary" onClick={() => { setSearch(""); setParams(new URLSearchParams()); }}>Clear filters</button>
            </div>
          ) : view === "cards" ? (
            <div className="card-grid">
              {data.items.map((c) => <CustomerCard key={c.customerID} c={c} />)}
            </div>
          ) : (
            <section className="panel">
              <div className="table-wrap">
                <table className="table clickable">
                  <thead>
                    <tr>
                      <th>Customer</th><th>Region</th><th>Contract</th><th>Customer since</th>
                      <th className="r">Monthly bill</th><th>Chance of staying</th><th>Risk</th><th>Recommended action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((c) => (
                      <tr key={c.customerID} onClick={() => navigate(`/customers/${c.customerID}`)}>
                        <td>
                          <Link to={`/customers/${c.customerID}`} className="row-link" onClick={(e) => e.stopPropagation()}>{c.name}</Link>
                          <small className="sub">{c.customerID}</small>
                        </td>
                        <td>{c.region}</td>
                        <td>{c.Contract}</td>
                        <td>{c.customer_since} <span className="muted">({c.tenure} mo)</span></td>
                        <td className="r">${c.MonthlyCharges.toFixed(2)}</td>
                        <td><Signal value={c.chance_of_staying} /></td>
                        <td><RiskBadge level={c.risk_level} /></td>
                        <td><ActionBadge action={c.recommended_action} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <Pager page={page} pages={pages} onPage={(p) => set("page", String(p))} />
        </>
      )}
    </div>
  );
}
