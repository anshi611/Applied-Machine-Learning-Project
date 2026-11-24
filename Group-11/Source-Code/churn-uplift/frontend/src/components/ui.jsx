import React, { useEffect, useState } from "react";
import { ACTION_STYLE, RISK_STYLE } from "../theme.js";
import { API_URL } from "../api.js";
import { Glyph, Signal } from "./kit.jsx";

// Load data from the API; re-runs when `deps` change. Returns { data, error, loading }.
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn()
      .then((d) => { if (alive) { setData(d); setError(null); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}

export function Loading({ error, label = "Loading customers…" }) {
  if (error) {
    return (
      <div className="error-panel" role="alert">
        {Glyph.alert({ size: 20 })}
        <div>
          <h2>The backend isn't answering</h2>
          <p>
            This page reads from the API at <code>{API_URL}</code>. Start it with <code>start.bat</code>, then
            refresh. If another app is using port 8000, close that app first.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="loading" role="status">
      <span className="loading-bars" aria-hidden="true"><i /><i /><i /></span>
      <span>{label}</span>
    </div>
  );
}

// A figure in a row of facts (no card chrome; rows are divided by rules)
export function Fact({ label, value, note, tone }) {
  return (
    <div className={`fact ${tone ? `fact-${tone}` : ""}`}>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
      {note && <dd className="fact-note">{note}</dd>}
    </div>
  );
}
export function Facts({ children, label }) {
  return <dl className="facts" aria-label={label}>{children}</dl>;
}

export function Card({ title, subtitle, children, action, className = "", as: Tag = "section" }) {
  return (
    <Tag className={`panel ${className}`}>
      {(title || subtitle || action) && (
        <header className="panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="panel-sub">{subtitle}</p>}
          </div>
          {action && <div className="panel-action">{action}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

export function PageHeader({ title, children, right }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {children && <p className="lead">{children}</p>}
      </div>
      {right && <div className="page-head-right">{right}</div>}
    </header>
  );
}

export function KeyMessage({ children }) {
  return <p className="key-message">{children}</p>;
}

export function ActionBadge({ action, large }) {
  const s = ACTION_STYLE[action] || { label: action, tone: "none", glyph: "info" };
  return (
    <span className={`tag tag-${s.tone} ${large ? "tag-lg" : ""}`}>
      {Glyph[s.glyph]({ size: large ? 16 : 13, sw: 2.2 })}
      {s.label}
    </span>
  );
}

export function RiskBadge({ level }) {
  const s = RISK_STYLE[level] || { label: level, tone: "medium" };
  return <span className={`tag tag-risk-${s.tone}`}>{s.label}</span>;
}

// Back-compat name: chance of staying
export function StayBar({ value }) {
  return <Signal value={value} />;
}

export function SimulatedNote() {
  return (
    <p className="sim-note">
      {Glyph.info({ size: 15 })}
      <span>Discount effects are estimates from a simulated trial, not a real campaign.</span>
    </p>
  );
}

export function Details({ title = "How this was measured", children }) {
  return (
    <details className="details">
      <summary>{Glyph.right({ size: 16 })}<span>{title}</span></summary>
      <div className="details-body">{children}</div>
    </details>
  );
}

export function Legend({ items }) {
  return (
    <ul className="legend">
      {items.map(([label, color, dashed]) => (
        <li key={label}>
          <i style={{ background: dashed ? "none" : color, borderColor: color }} className={dashed ? "dashed" : ""} />
          {label}
        </li>
      ))}
    </ul>
  );
}

export function ChartTip({ active, payload, label, title, fmt = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <b>{title ? title(label) : label}</b>
      {payload.map((p) => (
        <div key={p.dataKey}>
          <i style={{ background: p.color || p.fill }} />
          <span>{p.name}</span>
          <span className="num">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Pager({ page, pages, onPage }) {
  return (
    <nav className="pager" aria-label="Pages">
      <button type="button" className="btn btn-quiet" disabled={page === 0} onClick={() => onPage(page - 1)}>
        {Glyph.left({ size: 16 })} Previous
      </button>
      <span className="num">Page {page + 1} of {pages}</span>
      <button type="button" className="btn btn-quiet" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>
        Next {Glyph.right({ size: 16 })}
      </button>
    </nav>
  );
}
