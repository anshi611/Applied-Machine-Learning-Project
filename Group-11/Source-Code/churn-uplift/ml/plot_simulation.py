"""
Draw a one-page picture of the SIMULATED treatment design.
Output: ml/results/figures/sim_design.png

Run from the project root:
    python ml/plot_simulation.py
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from preprocess import PROJECT_ROOT, load_clean
from simulate_treatment import BACKFIRE_RATE, SAVE_RATE, simulate_treatment

ORDER = ["persuadable", "m2m_other", "lost_cause", "contract", "sleeping_dog"]
LABELS = {
    "persuadable": "Persuadable\n(month-to-month,\ntenure ≤ 12)",
    "m2m_other": "Other\nmonth-to-month",
    "lost_cause": "Lost cause\n(fiber + e-check\n+ bill > $90)",
    "contract": "1/2-year\ncontract",
    "sleeping_dog": "Sleeping dog\n(2-year,\ntenure > 48)",
}


def main() -> None:
    sim = simulate_treatment(load_clean())
    ctrl = sim[sim.treatment == 0].groupby("segment")["churn_sim"].mean().reindex(ORDER) * 100
    trt = sim[sim.treatment == 1].groupby("segment")["churn_sim"].mean().reindex(ORDER) * 100
    sizes = sim["segment"].value_counts().reindex(ORDER)
    # True (designed) effect in percentage points, using each segment's real churn rate
    base = sim.groupby("segment")["Churn"].mean().reindex(ORDER)
    true_pp = [(base[s] * SAVE_RATE[s] - (1 - base[s]) * BACKFIRE_RATE.get(s, 0)) * 100 for s in ORDER]

    fig, axes = plt.subplots(1, 2, figsize=(15, 5.5), gridspec_kw={"width_ratios": [1.5, 1]})
    fig.suptitle("SIMULATED retention offer: assumed design (not real campaign data)",
                 fontsize=14, fontweight="bold", color="#B03A2E")

    # Left: churn with vs without offer per segment
    x = np.arange(len(ORDER)); w = 0.38
    ax = axes[0]
    b1 = ax.bar(x - w / 2, ctrl, w, label="No offer (control)", color="#8C8C8C")
    b2 = ax.bar(x + w / 2, trt, w, label="Got offer (treated)", color="#4C72B0")
    for bars in (b1, b2):
        for b in bars:
            ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.8, f"{b.get_height():.0f}%",
                    ha="center", fontsize=9)
    ax.set_xticks(x, [f"{LABELS[s]}\nn={sizes[s]:,}" for s in ORDER], fontsize=9)
    ax.set_ylabel("Churn rate (%)"); ax.set_ylim(0, 60)
    ax.set_title("Churn rate with vs without the offer, by segment")
    ax.legend()

    # Right: designed (true) uplift per segment
    ax = axes[1]
    colors = ["#55A868" if v > 5 else ("#C44E52" if v < 0 else "#CCB974") for v in true_pp]
    ax.barh([LABELS[s].replace("\n", " ") for s in ORDER][::-1], true_pp[::-1], color=colors[::-1])
    for i, v in enumerate(true_pp[::-1]):
        # label always to the right of the bar (or of zero for negative bars)
        ax.text(max(v, 0) + 0.3, i, f"{v:+.1f} pts", va="center", ha="left", fontsize=9)
    ax.axvline(0, color="black", lw=0.8)
    ax.set_xlim(-6, 24)
    ax.set_xlabel("True uplift = churn reduction from the offer (percentage points)")
    ax.set_title("Designed effect of the offer\n(green = helps, yellow = barely, red = backfires)")
    ax.tick_params(axis="y", labelsize=9)

    ctrl_all = sim.loc[sim.treatment == 0, "churn_sim"].mean() * 100
    trt_all = sim.loc[sim.treatment == 1, "churn_sim"].mean() * 100
    fig.text(0.5, 0.005,
             f"Overall: churn {ctrl_all:.1f}% without offer vs {trt_all:.1f}% with offer "
             f"(average effect {ctrl_all - trt_all:.1f} pts). Offer given to a random 50% of customers.",
             ha="center", fontsize=10)
    plt.tight_layout(rect=(0, 0.03, 1, 0.94))
    out = PROJECT_ROOT / "ml" / "results" / "figures" / "sim_design.png"
    plt.savefig(out, dpi=120)
    print("Saved", out)


if __name__ == "__main__":
    main()
