// Icon glyphs, the signal meter, the segmented control and the simulation note.
import React from "react";
import { pct, stayTone } from "../theme.js";

const G = ({ size = 20, children, sw = 1.9 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const Glyph = {
  home: (p) => <G {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /></G>,
  users: (p) => <G {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c2.8 0 5 1.8 5 4.6" /></G>,
  chart: (p) => <G {...p}><path d="M4 19h16" /><path d="M6 15l4-5 3 3 5-7" /></G>,
  search: (p) => <G {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></G>,
  calc: (p) => <G {...p}><path d="M4 19h16" /><path d="M7 16V9M12 16V5M17 16v-4" /></G>,
  bell: (p) => <G {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></G>,
  tag: (p) => <G {...p}><path d="M3.5 12.5V4.5h8l9 9-8 8Z" /><circle cx="8" cy="9" r="1.4" /></G>,
  phone: (p) => <G {...p}><path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" /></G>,
  check: (p) => <G {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></G>,
  ban: (p) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></G>,
  info: (p) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 7.8h.01" /></G>,
  download: (p) => <G {...p}><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 19.5h14" /></G>,
  copy: (p) => <G {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></G>,
  sun: (p) => <G {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></G>,
  moon: (p) => <G {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></G>,
  filter: (p) => <G {...p}><path d="M4 6h16M7 12h10M10 18h4" /></G>,
  x: (p) => <G {...p}><path d="M6 6l12 12M18 6 6 18" /></G>,
  left: (p) => <G {...p}><path d="m14.5 6-6 6 6 6" /></G>,
  right: (p) => <G {...p}><path d="m9.5 6 6 6-6 6" /></G>,
  plus: (p) => <G {...p}><path d="M12 5v14M5 12h14" /></G>,
  alert: (p) => <G {...p}><path d="M12 4 2.8 19.5h18.4Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></G>,
  calendar: (p) => <G {...p}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M8.5 3v4M15.5 3v4" /></G>,
  tie: (p) => <G {...p}><path d="M9.5 3h5l-1 3.5 2.5 9-4 5-4-5 2.5-9Z" /></G>,
  headset: (p) => <G {...p}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13.5" width="4" height="6" rx="1.5" /><rect x="17" y="13.5" width="4" height="6" rx="1.5" /><path d="M19 19.5a3 3 0 0 1-3 2.5h-2" /></G>,
  flask: (p) => <G {...p}><path d="M9 3h6" /><path d="M10 3v6L4.5 18.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3" /><path d="M7.5 15h9" /></G>,
};

// Brand mark: crimson tile with signal arcs
export function Mark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" className="mark">
      <rect className="mark-bg" width="34" height="34" rx="10" />
      <circle className="mark-dot" cx="11" cy="23" r="2.6" />
      <path className="mark-arc" d="M9.5 15.5a9 9 0 0 1 9 9" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path className="mark-arc" d="M9.5 9a15.5 15.5 0 0 1 15.5 15.5" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Chance of staying as a rating-style pill: green = likely to stay, amber = could go either way,
// burnt orange = likely to leave. size: sm | lg
export function Signal({ value, size = "sm", label = "chance of staying" }) {
  const tone = stayTone(value);
  return (
    <span className={`stay stay-${size} tone-${tone}`} role="img" aria-label={`${pct(value)} ${label}`}>
      <span aria-hidden="true">{pct(value)}</span>
      {size === "lg" && <small aria-hidden="true">{label}</small>}
    </span>
  );
}
export const StayPill = Signal;

// Segmented control
export function Segmented({ options, value, onChange, label, className = "" }) {
  return (
    <div className={`seg ${className}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={value === o.value ? "is-on" : ""} onClick={() => onChange(o.value)}>
          {o.icon && Glyph[o.icon]({ size: 16 })}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// Shown wherever uplift, profit, ROI or customers-saved figures appear.
export function SimulationBanner() {
  return (
    <aside className="sim-banner" role="note">
      {Glyph.info({ size: 18 })}
      <p>
        <b>These profit and uplift figures are simulated.</b> The data has no record of who got a discount, so the
        discount's effect was simulated as a what-if, not measured in a real trial.
      </p>
    </aside>
  );
}
