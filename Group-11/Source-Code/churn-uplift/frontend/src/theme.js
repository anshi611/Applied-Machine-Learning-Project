// myDel Retention Desk: colour tokens shared by charts and badges.
// Keep in sync with the :root variables in styles.css.
// Series colours are tuned for the dark (default) theme; gridlines, axes and labels
// are themed in CSS, so only data colours live here.
export const C = {
  ink: "#F5F5F7",
  ink2: "#A1A5B0",
  ink3: "#7C808C",
  rule: "#2C2E35",
  grid: "#24262C",
  paper: "#22242B",
  brand: "#FF6689",  // accent: brand + churn-risk targeting
  stay: "#2E9E4F",   // likely to stay
  hold: "#C08A1E",   // could go either way / call instead
  drop: "#E0622F",   // likely to leave (orange, never the accent pink)
  offer: "#5B8DEF",  // discount ribbon
  uplift: "#A387FF", // uplift model
  quiet: "#6F7480",  // random / no action
};
C.line = C.brand;

// Legacy alias used by a few charts
export const COLORS = { primary: C.line, grid: C.grid, axis: C.ink2, neutral: C.quiet };

export const AXIS = { fill: C.ink2, fontSize: 12, fontFamily: "Figtree, sans-serif" };

// Plain-English names for the targeting methods
export const METHOD_LABEL = {
  "Churn risk": "Most likely to leave",
  "Churn risk (Random Forest)": "Most likely to leave",
  "Uplift (T-learner)": "Most likely to respond",
  "T-learner (Logistic Regression)": "Most likely to respond",
  "T-learner (XGBoost)": "Most likely to respond",
  Random: "Random picks",
  "Random picks": "Random picks",
};

export const METHOD_COLORS = {
  "Most likely to leave": C.brand,
  "Most likely to respond": C.uplift,
  "Random picks": C.quiet,
};

export const MODEL_COLORS = {
  "Logistic Regression": "#6F7480",
  "Random Forest": C.brand,
  XGBoost: C.uplift,
};

// Backend action -> plain label + tone (tones map to .tag-* classes)
export const ACTION_STYLE = {
  "Send retention offer": { label: "Send the discount", tone: "send", glyph: "tag" },
  "Try non-discount retention": { label: "Call them instead", tone: "call", glyph: "phone" },
  "No action needed": { label: "Leave them be", tone: "none", glyph: "check" },
  "Do not contact": { label: "Don't contact", tone: "skip", glyph: "ban" },
};
export const ACTION_ORDER = ["Send retention offer", "Try non-discount retention", "No action needed", "Do not contact"];
export const ACTION_FILL = {
  "Send retention offer": C.offer,
  "Try non-discount retention": C.hold,
  "No action needed": "#4A4D57",
  "Do not contact": "#8A8F9C",
};

export const RISK_STYLE = {
  High: { label: "High risk", tone: "high", color: C.drop },
  Medium: { label: "Medium risk", tone: "medium", color: C.hold },
  Low: { label: "Low risk", tone: "low", color: C.stay },
};

// What each action means, in the agent's words
export const ACTION_HELP = {
  "Send retention offer": "A $50 discount is likely to keep this customer, and a year of their bill is worth far more than $50.",
  "No action needed": "This customer will most likely stay anyway. A discount would only cost money.",
  "Try non-discount retention": "They might leave, but money isn't the fix. A call about service or support works better.",
  "Do not contact": "Reaching out may remind them to cancel. Leave this account alone.",
};

export const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
export const money = (v) =>
  `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
export const kmoney = (v) => `${v < 0 ? "−" : ""}$${Math.round(Math.abs(v) / 1000)}k`;
export const num = (v) => Number(v).toLocaleString("en-US");
export const initials = (name = "") => name.split(" ").map((p) => p[0]).join("").slice(0, 2);

// Chance of staying -> tone
export const stayTone = (v) => (v >= 0.7 ? "low" : v >= 0.4 ? "medium" : "high");
