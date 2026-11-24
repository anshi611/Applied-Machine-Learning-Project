close

# 10. Limitations and viva questions

[← Reproduce](09_reproduce.md) · [Guide home](README.md)

Owning a weakness out loud scores better than having an examiner find it.

## Honest limitations

| Limitation                                               | Why it matters                                                                                                                               | What we'd do next                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **The treatment data is simulated**                | Uplift and profit numbers show the *method*, not real campaign results                                                                     | Run a real randomised A/B test of the offer                                                                                     |
| **The simulation favours churn ranking by design** | The offer only saves customers who would have churned, so true uplift ≈ churn risk × save rate, and churn ranking was always likely to win | Simulate worlds where responders ≠ at-risk customers (e.g. high-risk customers who ignore offers) and compare across scenarios |
| **No uncertainty on uplift results**               | Qini 0.028 vs 0.040 on 1,409 customers could partly be noise                                                                                 | Bootstrap confidence intervals on Qini and profit                                                                               |
| **Customer value is crude**                        | 12 × monthly bill ignores profit margin and real customer lifetime                                                                          | Use margin × expected remaining lifetime                                                                                       |
| **0.5 cut-off for precision/recall**               | Not tied to the cost model                                                                                                                   | Pick the cut-off where expected profit is highest                                                                               |
| **One public dataset**                             | Results may not transfer to other companies                                                                                                  | Validate on new data, monitor drift                                                                                             |
| *(Fixed)* ~~Probabilities were too high~~             | Class weights inflated them (39% predicted vs 26.5% actual)                                                                                  | **Calibrated** with Platt scaling: now 26.7% vs 26.5%                                                                     |
| *(Fixed)* ~~"Do not contact" fired on noise~~         | 856 customers had uplift within ±0.01 of zero                                                                                               | Now needs uplift < −0.02                                                                                                       |

## Likely viva questions

**Why not accuracy?**
Only 26.5% churn. Predicting "stays" for everyone gives 73.5% accuracy and catches nobody. We use ROC-AUC (ranking), plus precision, recall and F1.

**Why Random Forest?**
Highest test ROC-AUC (0.846) and F1. But honestly all three are within cross-validation noise (± 0.011), so the choice matters little.

**How did you avoid data leakage?**
Encoding and scaling live inside a Pipeline, fitted on training data only (and re-fitted inside every CV fold). The 20% test set is used only for final evaluation. Customer scores in the app are out-of-fold. Calibration uses cross-validation on training data.

**What is calibration and why did you need it?**
Calibrated means "of customers given 30%, about 30% leave." Class weights inflated our probabilities. Ranking was fine, but the app shows these numbers as "chance of staying", so we applied Platt scaling. Mean predicted churn went from 39.4% to 26.7% (actual 26.5%), Brier score from 0.158 to 0.136, and ROC-AUC stayed at 0.846.

**What does SHAP tell you, and what doesn't it?**
Which features push each prediction up or down. Top drivers match the EDA. It explains the *model*, not *causes*: changing a feature won't necessarily change churn.

**What is uplift, and how is it different from churn prediction?**
Churn prediction asks who is at risk. Uplift asks who the offer will *change*. It avoids wasting money on lost causes and sure things, and avoids harming sleeping dogs.

**What is a T-learner?**
Two models: one on treated customers, one on control. Uplift = the difference in predicted probability of staying.

**Your treatment data is fake?**
Yes, simulated with written assumptions, because the dataset has no offer history. It demonstrates the method. In practice you'd run an A/B test first.

**Uplift lost. Isn't that a failure?**
No. In our simulation the people the offer helps are mostly the high-risk people, so churn ranking already finds them. And honestly, the simulation design made that likely. Uplift still avoided lost causes far better (17 vs 56). It wins when responders differ from the at-risk group.

**What is a Qini curve?**
Contact customers in order of score and plot the *extra* customers kept compared with random targeting. The area under it (Qini AUC) summarises targeting quality.

**Why does profit fall after contacting 40%?**
Beyond that point you pay $50 for people who'd stay anyway, or upset sleeping dogs. Each extra contact costs more than it saves.

**What's your business recommendation?**
Target by churn risk, contact about the top 40%, skip clearly negative-uplift customers, and run a real A/B test before trusting uplift.

**What would you improve with more time?**
Real experiment data, bootstrap confidence intervals, profit-based cut-off, better customer-value estimate, scenario analysis for the simulation, and drift monitoring once deployed.
