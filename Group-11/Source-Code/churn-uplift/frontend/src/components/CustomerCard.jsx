// A customer as a browsable card: avatar, name, plan, bill, chance-of-staying pill and the recommended action.
import React from "react";
import { Link } from "react-router-dom";
import { ACTION_STYLE, initials } from "../theme.js";
import { Glyph, Signal } from "./kit.jsx";

const TINTS = ["rose", "blue", "amber", "violet", "green", "teal"];
export const tintFor = (name = "") => TINTS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TINTS.length];

export function Avatar({ name, size = 44 }) {
  return (
    <span className={`avatar tint-${tintFor(name)}`} style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

// Ribbon across the top of a card, like a promo strip
function Ribbon({ action, uplift }) {
  const s = ACTION_STYLE[action];
  if (!s) return null;
  return (
    <span className={`ribbon ribbon-${s.tone}`}>
      {Glyph[s.glyph]({ size: 13, sw: 2.4 })}
      {s.label}
      {action === "Send retention offer" && uplift > 0 && <b>+{Math.round(uplift * 100)} pts</b>}
    </span>
  );
}

// as="link" renders a Link to the profile; as="button" calls onSelect (agent queue)
export default function CustomerCard({ c, as = "link", onSelect, selected = false, compact = false }) {
  const body = (
    <>
      <span className="ccard-top">
        <Avatar name={c.name} size={compact ? 40 : 48} />
        <Signal value={c.chance_of_staying} />
      </span>
      <span className="ccard-name">{c.name}</span>
      <span className="ccard-meta">
        {c.Contract} · {c.tenure} mo{c.region ? ` · ${c.region}` : ""}
      </span>
      <span className="ccard-bill"><b>${c.MonthlyCharges.toFixed(0)}</b>/month</span>
      {c.recommended_action && <Ribbon action={c.recommended_action} uplift={c.uplift_score} />}
    </>
  );
  const cls = `ccard ${compact ? "ccard-compact" : ""}`;
  if (as === "button") {
    return (
      <button type="button" className={cls} aria-pressed={selected} onClick={onSelect}>{body}</button>
    );
  }
  return <Link to={`/customers/${c.customerID}`} className={cls}>{body}</Link>;
}

// A horizontally scrolling row of cards with a title, like a collection
export function Collection({ title, sub, children, action }) {
  return (
    <section className="collection">
      <header className="collection-head">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </header>
      <div className="rail-scroll" tabIndex={0} role="region" aria-label={title}>{children}</div>
    </section>
  );
}
