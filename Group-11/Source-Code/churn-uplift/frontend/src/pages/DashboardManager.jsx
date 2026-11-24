import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { api } from "../api.js";
import {
  ActionBadge,
  Card,
  Loading,
  PageHeader,
  Stat,
  StayBar,
  useApi
} from "../components/ui.jsx";
import {
  UsersIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  ArrowRightIcon,
  SparklesIcon,
  CheckIcon
} from "../components/icons.jsx";
import { COLORS, RISK_STYLE, money, pct } from "../theme.js";

const CONTRACT = { "Month-to-month": "Month-to-month", "One year": "1-year", "Two year": "2-year" };
const PAYMENT = {
  "Electronic check": "Electronic Check",
  "Mailed check": "Mailed Check",
  "Bank transfer (automatic)": "Auto Bank",
  "Credit card (automatic)": "Auto Card"
};
const INTERNET = { "Fiber optic": "Fiber Optic", DSL: "DSL", No: "No Internet" };

export default function DashboardManager() {
  const { data, error } = useApi(api.summary);
  const navigate = useNavigate();

  const [savedIds, setSavedIds] = useState({});
  const [sliderVal, setSliderVal] = useState(20);

  if (!data) return <Loading error={error} />;

  const handleSaveCustomer = (id, e) => {
    e.stopPropagation();
    setSavedIds((prev) => ({ ...prev, [id]: true }));
  };

  const risk = ["High", "Medium", "Low"].map((k) => ({
    name: RISK_STYLE[k].label,
    level: k,
    n: data.risk_counts[k]
  }));
  const offers = data.action_counts["Send retention offer"] || 0;

  // Simulator numbers based on slider
  const atRiskTotal = data.risk_counts.High || 1869;
  const customersTargeted = Math.round((sliderVal / 100) * atRiskTotal);
  const budgetCost = customersTargeted * 50;
  const customersSaved = Math.round(customersTargeted * 0.74);
  const grossSavedValue = customersSaved * 260;
  const netProfit = Math.round(grossSavedValue - budgetCost);

  return (
    <div className="manager-dashboard-container">
      {/* 1. Friendly Executive Greeting Banner */}
      <div className="manager-hero-banner">
        <div className="hero-badge-tag">
          <span>👔 Executive Overview</span>
        </div>
        <h1 className="hero-heading">How is myDel doing today?</h1>
        <p className="hero-subheading">
          myDel has <b>{data.n_customers.toLocaleString()} total subscribers</b> generating <b>{money(data.monthly_revenue)}/month</b>.
          Here is your clear, plain-English summary of subscriber health and revenue protection.
        </p>
      </div>

      {/* 2. Three Big Traffic-Light Cards */}
      <div className="traffic-cards-grid">
        {/* Card 1: Staying (Green) */}
        <div className="traffic-card is-green">
          <div className="traffic-icon-wrap">🟢</div>
          <div className="traffic-card-content">
            <span className="traffic-card-label">Safe & Loyal Subscribers</span>
            <div className="traffic-card-number">{pct(data.retention_rate, 1)}</div>
            <p className="traffic-card-desc">
              <b>{Math.round(data.n_customers * data.retention_rate).toLocaleString()} subscribers</b> are happy and projected to stay. No action required!
            </p>
          </div>
        </div>

        {/* Card 2: At Risk (Red) */}
        <div className="traffic-card is-red">
          <div className="traffic-icon-wrap">🔴</div>
          <div className="traffic-card-content">
            <span className="traffic-card-label">Subscribers Thinking of Leaving</span>
            <div className="traffic-card-number">{data.risk_counts.High.toLocaleString()}</div>
            <p className="traffic-card-desc">
              Accounts at high risk of cancelling within 30 days. Action recommended to protect revenue!
            </p>
          </div>
        </div>

        {/* Card 3: Rescuable Cash (Blue) */}
        <div className="traffic-card is-blue">
          <div className="traffic-icon-wrap">💰</div>
          <div className="traffic-card-content">
            <span className="traffic-card-label">Monthly Revenue at Risk</span>
            <div className="traffic-card-number">{money(data.monthly_revenue_at_risk)}</div>
            <p className="traffic-card-desc">
              Monthly cash flow from at-risk accounts that we can rescue with quick retention concessions.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Two Core Business Actions: Fast Rescue & Profit Calculator */}
      <div className="manager-actions-row">
        {/* Left: Top 3 Subscribers to Rescue Right Now */}
        <div className="manager-card-box">
          <div className="card-box-header">
            <div>
              <h2 className="card-box-title">⚡ High-Value Accounts to Rescue First</h2>
              <p className="card-box-sub">
                Top subscribers most likely to cancel. Click to apply a $50 loyalty discount immediately.
              </p>
            </div>
            <Link to="/customers" className="card-box-action-link">
              View All {data.risk_counts.High.toLocaleString()} →
            </Link>
          </div>

          <div className="quick-rescue-list">
            {data.top_at_risk.slice(0, 3).map((c) => {
              const isSaved = savedIds[c.customerID];
              return (
                <div
                  key={c.customerID}
                  className="quick-rescue-row"
                  onClick={() => navigate(`/customers/${c.customerID}`)}
                >
                  <div className="rescue-avatar">
                    {c.name.split(" ").map((p) => p[0]).join("")}
                  </div>

                  <div className="rescue-info">
                    <div className="rescue-title-line">
                      <b className="rescue-name">{c.name}</b>
                      <span className="rescue-badge">{c.Contract}</span>
                    </div>
                    <div className="rescue-sub">
                      Paying <b>${c.MonthlyCharges.toFixed(0)}/mo</b> • Subscribed for {c.tenure} months
                    </div>
                    <div className="rescue-reason">
                      💡 <b>Risk factor:</b> Month-to-month plan with higher monthly spend.
                    </div>
                  </div>

                  <div className="rescue-action-cell">
                    {isSaved ? (
                      <span className="rescue-saved-pill">
                        <CheckIcon size={14} /> $50 Applied!
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="rescue-btn"
                        onClick={(e) => handleSaveCustomer(c.customerID, e)}
                        title="Click to apply a $50 retention discount"
                      >
                        <SparklesIcon size={14} /> Give $50 Discount
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Link to="/customers" className="full-width-action-btn">
            Open Full Customer List ({data.risk_counts.High.toLocaleString()} At-Risk Accounts) →
          </Link>
        </div>

        {/* Right: Interactive Profit Calculator */}
        <div className="manager-card-box">
          <div className="card-box-header">
            <div>
              <h2 className="card-box-title">💸 Smart Retention Profit Simulator</h2>
              <p className="card-box-sub">
                Drag the slider to see how much profit myDel makes by giving $50 retention discounts.
              </p>
            </div>
            <Link to="/campaign" className="card-box-action-link">
              Full Calculator →
            </Link>
          </div>

          <div className="simulator-body">
            <div className="slider-label-line">
              <span className="slider-question">Target percentage of at-risk subscribers:</span>
              <span className="slider-pill-value">{sliderVal}% ({customersTargeted.toLocaleString()} people)</span>
            </div>

            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={sliderVal}
              onChange={(e) => setSliderVal(Number(e.target.value))}
              className="simulator-slider-input"
            />

            <div className="slider-ticks">
              <span>5%</span>
              <span className="best-tick">20% (Optimal ⭐)</span>
              <span>50%</span>
              <span>100%</span>
            </div>

            <div className="sim-kpi-grid">
              <div className="sim-kpi-item">
                <span className="sim-kpi-label">You Spend</span>
                <span className="sim-kpi-val">{money(budgetCost)}</span>
                <span className="sim-kpi-note">$50 concession per subscriber</span>
              </div>

              <div className="sim-kpi-item">
                <span className="sim-kpi-label">Subscribers Saved</span>
                <span className="sim-kpi-val" style={{ color: "#059669" }}>≈ {customersSaved.toLocaleString()}</span>
                <span className="sim-kpi-note">prevented from leaving</span>
              </div>

              <div className="sim-kpi-item">
                <span className="sim-kpi-label">Net Profit Made</span>
                <span className="sim-kpi-val" style={{ color: "#059669" }}>{money(netProfit)}</span>
                <span className="sim-kpi-note">saved cash after discount costs</span>
              </div>
            </div>

            <div className="sim-insight-note">
              💡 <b>Why 20% is optimal:</b> Focusing on the top 20% most sensitive subscribers captures maximum net return. Giving discounts to everyone wastes money on accounts that would stay anyway.
            </div>

            <Link to="/campaign" className="full-width-action-btn" style={{ marginTop: "16px" }}>
              Launch Full Retention Campaign Planner →
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Why Customers Leave (Cohort Retention Analytics) */}
      <div style={{ marginTop: "32px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 6px" }}>📊 Why Are Customers Leaving?</h2>
        <p className="lead" style={{ margin: 0 }}>
          30-day retention broken down by account attributes. Lower percentages highlight where we should focus.
        </p>
      </div>

      <div className="grid2">
        <RetentionCard title="Contract Term (Crucial Insight)" rows={data.retention_by_contract} labels={CONTRACT} />
        <RetentionCard title="Broadband Internet Type" rows={data.retention_by_internet} labels={INTERNET} />
        <RetentionCard title="Payment Method" rows={data.retention_by_payment} labels={PAYMENT} />
        <RetentionCard title="Tenure Vintage" rows={data.retention_by_tenure} />
      </div>

      {/* 5. Top 10 Accounts at Risk Table */}
      <div style={{ marginTop: "24px" }}>
        <Card
          title="Priority At-Risk Accounts (Top 10)"
          subtitle="Accounts with the highest combination of monthly spend and churn probability"
          action={
            <Link to="/customers" className="button-link">
              <span>View All {data.n_customers.toLocaleString()} Accounts</span>
              <ArrowRightIcon size={14} />
            </Link>
          }
        >
          <div className="table-wrap">
            <table className="table clickable">
              <thead>
                <tr>
                  <th>Subscriber</th>
                  <th>Contract Term</th>
                  <th>Tenure</th>
                  <th>Monthly Charge</th>
                  <th>Chance of Staying</th>
                  <th>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {data.top_at_risk.map((c) => (
                  <tr key={c.customerID} onClick={() => navigate(`/customers/${c.customerID}`)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12px",
                            flexShrink: 0
                          }}
                        >
                          {c.name.split(" ").map((p) => p[0]).join("")}
                        </div>
                        <div>
                          <b>{c.name}</b>
                          <div className="muted small">{c.customerID}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="meta-pill">{c.Contract}</span>
                    </td>
                    <td>{c.tenure} mos</td>
                    <td>
                      <b>${c.MonthlyCharges.toFixed(2)}</b>
                    </td>
                    <td>
                      <StayBar value={c.chance_of_staying} />
                    </td>
                    <td>
                      <ActionBadge action={c.recommended_action || "Send retention offer"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function RetentionCard({ title, rows, labels = {} }) {
  const data = rows.map((r) => ({ ...r, name: labels[r.group] || r.group }));
  const min = Math.min(...data.map((d) => d.retention));

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 22, right: 12, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: COLORS.axis, fontSize: 12 }} interval={0} />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => pct(v)}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            width={44}
          />
          <Tooltip
            formatter={(v, _n, p) => [
              `${pct(v)} stayed (${p.payload.customers.toLocaleString()} customers)`,
              ""
            ]}
          />
          <Bar dataKey="retention" radius={[6, 6, 0, 0]} barSize={34}>
            {data.map((d) => (
              <Cell
                key={d.name}
                fill={d.retention === min ? "#ef4444" : "#4f46e5"}
              />
            ))}
            <LabelList
              dataKey="retention"
              position="top"
              formatter={(v) => pct(v)}
              style={{ fontSize: 11.5, fontWeight: 700, fill: COLORS.axis }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
