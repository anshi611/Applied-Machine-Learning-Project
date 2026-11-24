import React, { useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes, Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import ManagerOverview from "./pages/ManagerOverview.jsx";
import DashboardAgent from "./pages/DashboardAgent.jsx";
import DashboardDataScientist from "./pages/DashboardDataScientist.jsx";
import Customers from "./pages/Customers.jsx";
import CustomerDetail from "./pages/CustomerDetail.jsx";
import Campaign from "./pages/Campaign.jsx";
import Models from "./pages/Models.jsx";
import Predictor from "./pages/Predictor.jsx";
import { ViewModeProvider, useViewMode } from "./context/ViewModeContext.jsx";
import { api } from "./api.js";
import { Glyph, Mark } from "./components/kit.jsx";

const PERSONAS = [
  { value: "manager", label: "Manager", icon: "tie" },
  { value: "agent", label: "Agent", icon: "headset" },
  { value: "scientist", label: "Data scientist", icon: "flask" },
];
const PERSONA_PATHS = PERSONAS.map((p) => p.value);

const NAV = [
  { to: "/:persona", label: "Overview", icon: "home", end: true },
  { to: "/customers", label: "Customers", icon: "users" },
  { to: "/campaign", label: "Plan a campaign", icon: "calc" },
  { to: "/predict", label: "Check a customer", icon: "search" },
  { to: "/models", label: "Models", icon: "chart" },
];

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

// Recent contacts logged in the database (GET /contacts)
function Activity() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    api.recentContacts({ limit: 6 }).then(setItems).catch(() => setItems([]));
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="activity" ref={ref}>
      <button type="button" className="icon-btn" aria-expanded={open} aria-label="Recent contacts" title="Recent contacts"
        onClick={() => setOpen((o) => !o)}>
        {Glyph.bell({ size: 18 })}
      </button>
      {open && (
        <div className="activity-pop" role="dialog" aria-label="Recent contacts">
          {items == null ? (
            <p className="muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="muted">No contacts logged yet. Open a customer and log a call to see it here.</p>
          ) : (
            <ul>
              {items.map((c) => (
                <li key={c.id}>
                  <Link to={`/customers/${c.customer_id}`} onClick={() => setOpen(false)}>
                    <b>{c.customer_name || c.customer_id}</b>
                    <span>{c.channel}, {c.outcome.toLowerCase()}</span>
                    <small>{timeAgo(c.created_at)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Dark is the default; the person can switch to light and the choice is remembered.
function readTheme() { try { return localStorage.getItem("mydel_theme"); } catch { return null; } }
function ThemeToggle() {
  const [pref, setPref] = useState(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (pref) root.dataset.theme = pref; else delete root.dataset.theme;
    try { pref ? localStorage.setItem("mydel_theme", pref) : localStorage.removeItem("mydel_theme"); } catch { /* ignore */ }
  }, [pref]);

  const isDark = pref ? pref === "dark" : true;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" className="icon-btn theme-btn" aria-label={label} title={label}
      onClick={() => setPref(isDark ? "light" : "dark")}>
      <span className="i-moon">{Glyph.moon({ size: 18 })}</span>
      <span className="i-sun">{Glyph.sun({ size: 18 })}</span>
    </button>
  );
}

function AppContent() {
  const { viewMode, setViewMode } = useViewMode();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fromUrl = pathname.split("/")[1];
  const savedPersona = PERSONA_PATHS.includes(viewMode) ? viewMode : viewMode === "tech" ? "scientist" : "manager";
  const persona = PERSONA_PATHS.includes(fromUrl) ? fromUrl : savedPersona;

  useEffect(() => {
    if (PERSONA_PATHS.includes(fromUrl) && fromUrl !== viewMode) setViewMode(fromUrl);
  }, [fromUrl, viewMode, setViewMode]);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const handleExport = async () => {
    try {
      const res = await api.customers({ limit: 500, sort_by: "churn_prob" });
      if (!res?.items?.length) return;
      const headers = ["Customer ID", "Name", "Region", "Contract", "Tenure Months", "Monthly Bill", "Chance of Staying", "Risk Level", "Recommended Action"];
      const rows = res.items.map((c) => [
        `"${c.customerID}"`, `"${c.name}"`, `"${c.region}"`, `"${c.Contract}"`, c.tenure, c.MonthlyCharges,
        `${Math.round(c.chance_of_staying * 100)}%`, `"${c.risk_level}"`, `"${c.recommended_action}"`,
      ].join(","));
      const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `mydel_customers_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch {
      /* the page itself shows the backend error */
    }
  };

  const [q, setQ] = useState("");
  const search = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/customers?q=${encodeURIComponent(q.trim())}` : "/customers");
  };

  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="top">
        <div className="top-row">
          <Link to={`/${persona}`} className="brand" aria-label="myDel retention desk, overview">
            <Mark />
            <span><b>myDel</b><small>Retention desk</small></span>
          </Link>

          <form className="top-search" role="search" onSubmit={search}>
            {Glyph.search({ size: 18 })}
            <label htmlFor="global-search" className="sr-only">Search customers</label>
            <input id="global-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search for a customer by name or ID" />
          </form>

          <div className="top-right">
          <div className="persona" role="radiogroup" aria-label="Viewing as">
            {PERSONAS.map((p) => (
              <button key={p.value} type="button" role="radio" aria-checked={persona === p.value}
                className={persona === p.value ? "is-on" : ""}
                onClick={() => { setViewMode(p.value); navigate(`/${p.value}`); }}>
                {Glyph[p.icon]({ size: 16 })}<span>{p.label}</span>
              </button>
            ))}
          </div>

          <ThemeToggle />
          <div className="top-tools">
            <Activity />
            <button type="button" className="icon-btn" onClick={handleExport} aria-label="Export top 500 customers as CSV" title="Export top 500 (CSV)">
              {Glyph.download({ size: 18 })}
            </button>
          </div>
          </div>
        </div>

        <nav className="tabs" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to.replace(":persona", persona)} end={item.end}
              className={({ isActive }) => `tab ${isActive ? "is-on" : ""}`}>
              <span className={`tab-icon tab-${item.icon}`}>{Glyph[item.icon]({ size: 20 })}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Navigate to={`/${savedPersona}`} replace />} />
          <Route path="/manager" element={<ManagerOverview />} />
          <Route path="/agent" element={<DashboardAgent />} />
          <Route path="/scientist" element={<DashboardDataScientist />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/campaign" element={<Campaign />} />
          <Route path="/models" element={<Models />} />
          <Route path="/predict" element={<Predictor />} />
        </Routes>
      </main>

      <footer className="foot">
        myDel is a fictional phone company. Data: IBM Telco, 7,043 customers. Random Forest churn model, T-learner uplift model.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ViewModeProvider>
      <AppContent />
    </ViewModeProvider>
  );
}
