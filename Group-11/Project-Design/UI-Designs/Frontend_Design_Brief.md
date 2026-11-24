# myDel Customer Retention: Project Brief for Frontend Design

This document is the brief for designing new frontend screens. It describes **what the product does, who uses it, what every screen must show, what data the backend gives you, and the rules a design must respect**. You don't need to read any code to design from it.

> Group 11 · Track 3 Project Showcase · Topic A: *Customer Churn Prediction with Simple Uplift Extension*

---

## 1. The product in one paragraph

**myDel** is a fictional phone and internet company with **7,043 customers**. The customer records are real but anonymous (IBM Telco dataset), and the names are generated. About **1 in 4 customers leave** ("churn") each period. myDel can offer a customer a **$50 retention discount**, but giving it to everyone wastes money. The app uses two machine-learning models to answer one question:

> **Which customers should we contact, and what should we offer them?**

- **Model 1, churn model (Random Forest):** *how likely is this customer to leave?*
- **Model 2, uplift model (T-learner, Logistic Regression):** *how much would the discount change their chance of staying?*
- **Business layer:** combines both into a **recommended action** and a **profit estimate** for each customer and for a whole campaign.
- **Database (SQLite):** stores what staff actually do: logged contacts and their outcomes, plus a history of predictions.

---

## 2. Who uses it (personas)

The app has a persona switcher in the top bar. Each persona sees the same data, framed for their job.

| Persona | Their question | What they need on screen | Tone |
|---|---|---|---|
| 👔 **Manager** (default) | "How is the business doing and where is money leaking?" | Retention rate, revenue at risk, why people leave, the top accounts to rescue, campaign profit | Executive: big numbers, few charts, plain words |
| 🎧 **Support agent** | "Who do I call next, and what do I say?" | Prioritised call queue, one customer at a time, reason in one sentence, the offer they're allowed to give, a call script, a way to log the outcome | Task-focused: fast, scannable, action buttons |
| 🔬 **Data scientist / examiner** | "Are the models any good? Is the method sound?" | Model comparison table, ROC-AUC/precision/recall/F1, Qini and gain curves, SHAP drivers, the simulated-data disclaimer | Technical, but every chart still gets a one-line takeaway |

**The presentation audience** (lecturers and examiners) also matters. The design must make the ML story easy to follow in a 10-minute demo.

---

## 3. Core concepts (use these words consistently)

### 3.1 Risk level (from churn probability)
| Level | Rule | Colour token |
|---|---|---|
| **High** | churn probability ≥ 60% | danger (rose `#e11d48`) |
| **Medium** | 30% – 60% | warning (amber `#d97706`) |
| **Low** | < 30% | success (emerald `#059669`) |

Customer-facing screens show **"chance of staying"** (= 1 − churn probability) because it reads more positively. Technical screens can show churn probability.

### 3.2 Recommended action (four outcomes, always these four)
| Backend value (exact string) | Plain label used in UI | Meaning | Tone | Count (of 7,043) |
|---|---|---|---|---|
| `Send retention offer` | **Send the discount** | At risk, and the discount is predicted to pay for itself | good / emerald | 2,269 |
| `Try non-discount retention` | **Call them instead** | At risk, but a discount won't pay off. Fix the underlying problem (service call, support) | warning / amber | 312 |
| `No action needed` | **No need, likely to stay** | Low risk. A discount would be wasted | neutral / slate | 3,460 |
| `Do not contact` | **Don't contact** | Discount predicted to *backfire* ("sleeping dog") | danger / rose | 1,002 |

### 3.3 The four customer types (the uplift story; use in explainers)
| Type | Would leave without offer? | Does the offer help? | Action |
|---|---|---|---|
| 😊 **Persuadable** | Yes | Yes | Send offer ✅ |
| 😐 **Sure thing** | No | Not needed | Don't spend money |
| 😠 **Lost cause** | Yes | No | Don't spend the discount; try another fix |
| 😴 **Sleeping dog** | No | **Makes it worse** | Never contact |

### 3.4 Money
- **Customer value** = monthly bill × 12 months (avg ≈ $780).
- **Expected offer profit** = uplift × customer value − $50.
- Offer cost and the 12-month horizon are **assumptions** set in `params.yaml`.

---

## 4. The headline facts (what the app must communicate)

| Fact | Value |
|---|---|
| Customers | 7,043 |
| Retention (stayed last period, real data) | 73.5% (churn 26.5%) |
| Risk split | High 1,090 · Medium 1,511 · Low 4,442 (calibrated probabilities) |
| Monthly revenue | $456k, of which **$88k is from high-risk customers** |
| Best churn model | Random Forest (calibrated), **ROC-AUC 0.846**, recall 79%, precision 54% |
| Biggest churn driver | **Month-to-month contract** (43% leave vs 3% on 2-year) |
| Other drivers | Short tenure, fiber-optic internet, electronic-check payment, no tech support, high bills |
| Campaign result (all customers) | Targeting by **churn risk** earns the most: **$180k profit at 20% contacted**, **peak $207k at 40%**. Uplift peaks at $183k (40%); random tops out at about $10k |
| Key insight | **Contacting more than about 40% reduces profit.** Extra offers go to people who'd stay anyway or who react badly |
| Honest result | The uplift model **did not beat** churn-risk ranking in this simulation, but it **avoids lost causes** far better (17 vs 56 in the top 20% of the test set) |

### ⚠️ Non-negotiable: the simulation disclaimer
The dataset has **no record of who received a discount**, so the discount experiment and every uplift / profit number built on it are **SIMULATED**. Any screen that shows uplift scores, profit, ROI or "customers saved" **must show a visible but calm disclaimer** (currently the `SimulatedNote` component). Hiding it is not acceptable in the presentation.

---

## 5. Screens (current information architecture)

Top bar: **logo (myDel, "Customer Retention")** · **persona switcher** · nav: 🏠 Overview · 📞 Who to Call · 💰 Profit Planner · 🔍 Check Customer · **Export CSV** button.

| Route | Screen | Purpose | Must contain |
|---|---|---|---|
| `/` | **Overview** (changes per persona) | Landing page | *Manager:* "How is myDel doing today?" hero, KPIs, retention by contract / internet / payment / tenure, top 10 at-risk accounts, high-value accounts to rescue. *Agent:* call queue + selected-customer panel with diagnosis, script, $50 offer button, outcome logging, notes. *Data scientist:* model leaderboard, metric benchmark, top-20% budget comparison, gain curve, CV stability, uplift segment breakdown |
| `/customers` | **Who to Call**: customer directory | Find and filter customers | Search (name / ID), filters (risk, contract, action), sortable columns, pagination, risk badge, action badge, chance-of-staying bar. Row click opens detail |
| `/customers/:id` | **Customer detail** | Everything about one customer | Identity (name, initials avatar, ID, region, customer since, tenure), chance of staying (big number + meter), monthly bill / annual value / lifetime spend, recommended action + explanation, uplift statement ("discount raises retention by +X pts"), risk factors vs loyalty anchors, **Contact Log** (database), **What-If simulator** (live re-scoring), services grid |
| `/campaign` | **Profit Planner** | Decide campaign size | Slider (% of customers to contact), sort method toggle, KPI tiles (concessions, budget, net profit), profit curve comparing 3 methods, prioritised call list with pagination |
| `/predict` | **Check Customer** | Score a hypothetical customer live | Preset chips (High-Risk New User, Long-Tenure Loyalist, Family Bundle), main fields (tenure, bill, contract, internet, payment…), optional secondary fields, live result: churn %, risk, action, reason, uplift |
| `/models` | **Model comparison** *(not in nav; reachable by URL)* | Method comparison for the viva | 3 targeting methods side by side, saved-customers chart, gain curve, methodology accordion |

Shared states every screen needs: **loading**, **backend unreachable** (error card), **empty results**, **not found** (customer ID).

---

## 6. Data available from the backend

Base URL: `VITE_API_URL` (default `http://127.0.0.1:8000`). Interactive docs at `/docs`. All responses are JSON.

### `GET /summary`: Overview dashboard
```
company, n_customers, retention_rate, churn_rate, avg_chance_of_staying,
monthly_revenue, monthly_revenue_at_risk,
risk_counts {High, Medium, Low},
retention_by_contract / _by_tenure / _by_internet / _by_payment: [{group, retention, customers}],
action_counts {<action>: n},
top_at_risk: [{customerID, name, Contract, tenure, MonthlyCharges, chance_of_staying}]   (10 rows)
best_model, best_model_auc,
top_drivers: [{feature, mean_abs_shap, direction: "increases churn" | "reduces churn"}]   (10 rows)
```
Tenure groups: `0-6 months, 7-12 months, 1-2 years, 2-4 years, 4+ years`.

### `GET /customers`: directory and call list
Query: `q`, `risk` (High/Medium/Low), `contract`, `action`, `sort_by` (churn_prob, chance_of_staying, uplift_score, expected_offer_profit, MonthlyCharges, tenure, name), `descending`, `limit` (≤10,000), `offset`.
```
total, offer_cost,
items: [{customerID, name, region, customer_since, Contract, tenure, InternetService,
         MonthlyCharges, chance_of_staying, churn_prob, uplift_score, risk_level,
         expected_offer_profit, recommended_action}]
```

### `GET /customers/{id}`: customer detail
All list fields plus every model feature: `gender, SeniorCitizen, Partner, Dependents, PhoneService, MultipleLines, InternetService, OnlineSecurity, OnlineBackup, DeviceProtection, TechSupport, StreamingTV, StreamingMovies, Contract, PaperlessBilling, PaymentMethod, TotalCharges`, plus `customer_value`, `reason` (one sentence), `reasons_leave: string[]`, `reasons_stay: string[]` (plain-English, e.g. *"Month-to-month contract (can leave any time)"*).

### `POST /predict`: live scoring (`?save=true` also stores it in history)
Body: any of the customer features above (all have defaults). Allowed values:
- `Contract`: Month-to-month | One year | Two year
- `InternetService`: DSL | Fiber optic | No
- `PaymentMethod`: Electronic check | Mailed check | Bank transfer (automatic) | Credit card (automatic)
- Yes/No fields; `tenure` 0–100; `MonthlyCharges` 0–500
```
churn_probability, uplift_score, customer_value, expected_offer_profit,
risk_level, recommended_action, reason
```
Response time is about 0.1 seconds locally (measured). That's fast enough to re-score on every input change, but debounce typing and show an inline "updating…" state.

### `GET /metrics`: model screens
```
classical:  best_model, test_size (1409), models{LR, RF, XGB: roc_auc, precision, recall, f1,
            cv_roc_auc_mean, cv_roc_auc_std}, confusion_matrix_best, roc_curves{model: [{fpr,tpr}]}
uplift:     simulated: true, note, chosen_uplift_model, cv_qini_train,
            methods{name: qini_auc, observed_uplift_at_20, true_saved_top20, segments_top20{type: n}},
            qini_curves, gain_curves{method: [{pct, saved}]}, uplift_by_decile, best_possible_saved_top20
roi:        test-set profit table
mydel_roi:  simulated, customers, assumptions{offer_cost, clv_months},
            table: [{method, percent, contacted, customers_saved, cost, value_saved, profit, roi}]
            methods: "Churn risk" | "Uplift (T-learner)" | "Random"; percent 10…100
```

### Database endpoints (contact log + history)
| Endpoint | Use |
|---|---|
| `GET /customers/{id}/contacts` | Contact history for one customer (newest first) |
| `POST /customers/{id}/contacts` | Log a contact: `{channel, action, outcome, note, agent}` |
| `PATCH /contacts/{contact_id}` | Change `outcome` and/or `note` |
| `DELETE /contacts/{contact_id}` | Remove a contact |
| `GET /contacts?limit=&outcome=` | Recent contacts across all customers (includes `customer_name`) |
| `GET /contacts/stats` | `total_contacts, customers_contacted, acceptance_rate, by_outcome{}, by_channel{}` |
| `GET /predictions/history` | Saved predictions: `{input{…}, churn_probability, uplift_score, risk_level, recommended_action, created_at}` |

Allowed values:
- **channel:** Phone call · Email · SMS · In store
- **action:** Retention offer ($50 discount) · Contract upgrade offer · Service / support call · Check-in (no offer)
- **outcome:** Pending · Accepted offer · Declined · No answer · Stayed · Left

---

## 7. Business rules the UI must reflect

The recommended action is decided **in this order** (first match wins):
1. Uplift < −0.02 (`backfire_margin`) → **Do not contact**
2. Churn probability < 30% → **No action needed**
3. Expected offer profit > 0 → **Send retention offer**
4. Otherwise → **Try non-discount retention**

Campaign maths: contacting the top *N%* costs `N% × customers × $50`; profit = value of customers saved − cost. **The profit curve rises, peaks at about 40%, then falls.** Designs for the Profit Planner should make that peak obvious, for example by marking the optimum on the chart.

---

## 8. Current design system

| Item | Value |
|---|---|
| Stack | React 18 + Vite 5, React Router 6, **Recharts 2** for charts, plain CSS (`frontend/src/styles.css`), no UI library |
| Fonts | **Plus Jakarta Sans** (UI), **JetBrains Mono** (IDs, numbers, code) |
| Brand | Indigo `#4f46e5` (hover `#4338ca`, light `#eef2ff`, border `#c7d2fe`), single-letter **"R"** logo badge |
| Canvas / surface | `#f8fafc` / `#ffffff` / alt `#f1f5f9`; borders `#e2e8f0` |
| Text | main `#0f172a`, muted `#64748b`, subtle `#94a3b8` |
| Status | success `#059669` · warning `#d97706` · danger `#e11d48` · info `#2563eb` (each has a `-bg` and `-border` tint) |
| Radii | 6 / 10 / 14 / 18 px, pill 9999 |
| Shadows | Soft slate shadows: `--shadow-card`, `--shadow-card-hover` |
| Chart colours | **Churn-risk method = blue `#2563eb`**, **Uplift method = orange `#ea580c`**, **Random = slate `#94a3b8`**. Models: LR blue, RF orange, XGBoost emerald |
| Theme | Light only (dark mode not implemented) |

**Reusable components** (`components/ui.jsx`): `Card` (title, subtitle, action slot), `Stat` (KPI tile with tone + icon), `PageHeader` (badge + title + description), `KeyMessage` (💡 one-line takeaway box), `ActionBadge`, `RiskBadge`, `StayBar` (chance-of-staying meter), `SimulatedNote`, `Details` (collapsible "Technical details"), `Legend`, `Loading` (loading + error). Also `ContactLog` (database-backed contact form + history table).

### Design principles already in use (keep them)
1. **Plain English first, jargon second.** Every page leads with a 💡 key message. Technical charts go inside a collapsible "Technical details".
2. **Positive framing for business users:** "chance of staying", not "churn probability".
3. **Colour means status, never decoration:** green = good / send, amber = caution, rose = risk / don't contact, slate = neutral.
4. **One method, one colour**, the same on every chart.
5. **Be honest about the simulation and about uplift losing.** The design should present it as an insight, not hide it.

---

## 9. Constraints for new designs

- **Data volume:** 7,043 customers. Lists must paginate (current pages use 25–500 rows per request).
- **Live interactions:** What-If, Check Customer and the Profit Planner slider re-query the backend, so show inline loading states, not full-page spinners.
- **Responsive:** must work on a laptop projector (1280–1440 px wide) first, and remain usable on a phone.
- **Accessibility:** status must never rely on colour alone (keep icons/labels: ▲ ● ▼, ✔ ☎ ✖); text contrast at least WCAG AA.
- **Names are fake, data is real:** don't add photos of real people. Use initials avatars.
- **Don't invent metrics.** Every number on screen should come from an endpoint in §6. Anything else (for example "calls resolved today") must be clearly a demo placeholder or backed by the database.

---

## 10. Known gaps and redesign opportunities

| # | Issue | Suggestion |
|---|---|---|
| 1 | Footer says *"Powered by XGBoost"*, but the best model is **Random Forest** and the uplift model is **T-learner (Logistic Regression)** | Fix the copy |
| 2 | Support Agent view tracks offers, outcomes and "calls resolved" in **browser memory only** (starts at a hard-coded 3, lost on refresh) | Wire it to the contact-log endpoints and `/contacts/stats` |
| 3 | No screen shows **campaign results across all customers** (database stats, recent contacts) | Add a "Campaign tracker" / activity feed using `GET /contacts` and `/contacts/stats` |
| 4 | **Prediction history** is stored but never displayed | "Recently checked" panel on Check Customer |
| 5 | `/models` page exists but is **not in the nav** | Merge into the Data Scientist view or add a nav item |
| 6 | Error card always says port **8000**, even if the app uses another backend URL | Show the configured URL |
| 7 | ~~"Do not contact" fired for any uplift below 0~~ Fixed: now needs uplift < −0.02 | Showing the uplift value can still help agents |
| 8 | No dark mode | Optional; the tokens are already centralised in `:root` |

---

## 11. Using this brief with a designer or an AI design tool

Paste sections 1–5 and 8 and say what you want, for example:

> *"Design a new Overview screen for the Manager persona of myDel, a customer-retention app. Use the data in `GET /summary`, the colour tokens and principles in §8, keep the simulation disclaimer, and make the 'revenue at risk' and 'top accounts to rescue' the focal point. Desktop 1440 px."*

Then hand the result to the developer with the endpoint fields from §6. Every design element should map to a field listed there.
