# 👋 START HERE: the whole project explained simply

Read this top to bottom once (about 10 minutes). You don't need to read any code to understand the project.

---

## 1. The story (what problem are we solving?)

Imagine you run a **phone company** with 7,000 customers.

- Every month, about **1 in 4 customers cancel** and leave for another company. This is called **churn**.
- Losing a customer = losing their monthly bill (about **$65/month**).
- You can send a customer a **$50 discount** to convince them to stay. This is called a **retention offer**.
- But you **can't send it to everyone**. That costs too much, and many people would have stayed anyway.

> **Our question: WHICH customers should get the discount?**

That's the whole project. Everything else exists to answer this one question.

---

## 2. Our answer, in 3 steps

### Step 1: Guess who will leave → "churn model"
We gave a computer the history of 7,000 real customers (contract type, monthly bill, how long they've stayed, and **whether they left**).
It learned patterns like:
- 📄 **Month-to-month contract** → much more likely to leave (43%) than a 2-year contract (3%)
- 🆕 **New customers** (first 6 months) → leave the most (about 53%)
- 💸 **High bills, fiber internet, paying by electronic check** → leave more

Now for any customer it can say: *"This person is **85% likely** to leave."*

### Step 2: Guess who the discount will actually help → "uplift model"
Not everyone at risk can be saved:

| Type of customer | Example | Should we send the discount? |
|---|---|---|
| 😊 **Persuadable** | New customer, would leave, but a discount changes their mind | ✅ **YES**, the money is well spent |
| 😐 **Sure thing** | Happy, loyal customer, will stay anyway | ❌ No, wasted money |
| 😠 **Lost cause** | Angry about bad service, leaving no matter what | ❌ No, wasted money |
| 😴 **Sleeping dog** | Loyal, but contacting them reminds them to shop around | ❌ **NO**, it makes things worse! |

The **uplift model** tries to find the 😊 persuadables: *"How much MORE likely is this person to stay IF we send the discount?"*

⚠️ **Honest note:** the real dataset doesn't say who got a discount in the past. So we **made up (simulated)** a discount experiment with clearly written assumptions. We say this everywhere. It's allowed, and it's in the course brief.

### Step 3: Turn it into money → "ROI"
For each customer: *value of keeping them (12 × monthly bill) × chance the discount saves them − $50 cost*.
If that's positive → send the discount.

---

## 3. What did we find? (the 4 sentences to remember)

1. The churn model is **about 85% good at ranking** customers from risky to safe (ROC-AUC 0.846). All 3 models we tried were about equally good.
2. If we can only contact **20% of customers**, picking the **most likely to leave** made the most profit: **$37,300**, vs $28,500 using the uplift model and $2,400 picking at random.
3. The uplift model was better at **avoiding lost causes**, but in our setup that wasn't enough to win.
4. Profit is highest at about **40% contacted**. Contacting everyone wastes money and annoys the "sleeping dogs".

---

## 4. Dictionary: every confusing word, explained

| Word | Plain meaning |
|---|---|
| **Churn** | A customer cancelling / leaving |
| **Model** | A program that learned patterns from past data and makes guesses |
| **Training** | Showing the model past examples so it can learn |
| **Test set** | 20% of customers we **hid** from the model, to check its guesses honestly (like an exam it hasn't seen) |
| **Feature** | One piece of information about a customer (contract, bill, tenure…) |
| **Tenure** | How many months someone has been a customer |
| **Logistic Regression / Random Forest / XGBoost** | The 3 types of model we tried. Think of them as 3 different students taking the same exam. Random Forest scored slightly best. |
| **Imbalanced data** | Only 26% left, 74% stayed. A lazy model that always says "stays" would be 74% "accurate" but useless, so we use better scores (below). |
| **Precision** | Of the people we *flagged* as leaving, how many really left? (ours: about 54%) |
| **Recall** | Of the people who *really* left, how many did we catch? (ours: about 79%) |
| **F1** | One number combining precision and recall |
| **ROC-AUC** | "If I pick one leaver and one stayer at random, how often does the model rank the leaver as riskier?" 0.5 = coin flip, 1.0 = perfect. Ours = **0.846** |
| **SHAP** | A tool that explains **why** the model made its guess, i.e. which features pushed it up or down |
| **Uplift** | How much the discount **changes** someone's chance of staying |
| **T-learner** | Our uplift method: train **T**wo models, one on people who got the discount and one on people who didn't, then subtract |
| **Qini curve** | A chart showing how many *extra* customers we keep as we contact more people. Higher = better targeting |
| **Simulated** | Made-up data with stated rules, because the real data doesn't have it |
| **ROI** | Return on investment = (money gained − money spent) ÷ money spent |
| **Backend / API** | The "kitchen": a Python program that holds the models and answers questions |
| **Frontend** | The "dining room": the website you click on, which asks the backend for answers |
| **FastAPI** | The Python tool we used to build the backend |
| **React** | The JavaScript tool we used to build the website |
| **MLOps** | Good habits that make ML projects reliable: retrain with one command, track experiments, automatic tests, packaging (Docker) |

---

## 5. Which folder does what? (project map)

```
churn-uplift/
│
├── data/           📦 The customer data (downloaded automatically, not saved in git)
│
├── notebooks/
│   └── 01_eda.ipynb      📊 Charts exploring the data, with notes. START HERE for the viva
│
├── ml-guide/       📖 The ML part explained chapter by chapter (read this for the viva)
│
├── ml/             🧠 The "brain": Python scripts that train the models
│   ├── download_data.py      1. downloads the dataset
│   ├── preprocess.py         2. cleans it
│   ├── train_classical.py    3. trains the 3 churn models → picks the best
│   ├── simulate_treatment.py 4a. creates the SIMULATED discount experiment
│   ├── train_uplift.py       4b. trains the uplift model, compares rankings
│   ├── business_roi.py       5. calculates profit / ROI
│   ├── models/               saved trained models (.joblib files)
│   └── results/              numbers + charts the website shows
│
├── backend/        🍳 The "kitchen" (FastAPI). Loads models, answers the website
│   ├── app/main.py           the 5 web addresses (endpoints)
│   ├── app/model_service.py  the logic: scores a customer, decides the action
│   ├── app/database.py       💾 SQLite database: contact log + prediction history
│   └── tests/                automatic checks that the API works
│
├── frontend/       🪑 The "dining room" (React website)
│   └── src/pages/            one file per page (Dashboard, Predictor, Models, Campaign)
│
├── params.yaml     ⚙️ The assumed business numbers ($50 offer, 12-month value)
├── start.bat       ▶️ Double-click to run the whole app
└── README.md       📘 Formal project write-up
```

**How a click travels:**
```
You click "Predict"  →  website (frontend)  →  sends customer details to backend
                                                       ↓
You see "85% · Send offer"  ←  website  ←  backend asks the 2 saved models
```

---

## 6. How to run it

**Easiest:** double-click **`start.bat`** in the `churn-uplift` folder.
Two black windows open (leave them open), then your browser opens the website.
To stop: close the two black windows.

Manual way (if needed), in two terminals inside `churn-uplift`:
```
venv\Scripts\python -m uvicorn backend.app.main:app --port 8000
cd frontend
npm run dev
```
Then open **http://127.0.0.1:5173**

---

## 7. The website: what each page is for

Every page has a blue 💡 box with its one key message. Technical charts are hidden under **"Technical details"** at the bottom (open them in the viva if asked).

| Page | One-line purpose | What to point at in the demo |
|---|---|---|
| **1. Why customers leave** | What makes people leave? | ⚠ Warning signs vs ✔ good signs; month-to-month is #1 |
| **2. Check a customer** | Try one customer | Click "🆕 New customer" → *Very likely to leave · Send the discount*. Click "🏠 Loyal customer" → *Likely to stay* |
| **3. Best way to choose** | Which way of picking customers works best? | Bar chart: "Most likely to leave" keeps 59 customers, beating the other two |
| **4. Plan a campaign** | Who exactly do we call, and is it worth it? | Move the slider; profit peaks at about 40%; the call list shows who to phone |

---

## 8. Likely viva questions (with short answers)

**Q: Why not use accuracy?**
A: Only 26% churn. A model that always says "stays" gets 74% accuracy but catches nobody. So we used precision, recall, F1 and ROC-AUC.

**Q: Why Random Forest?**
A: Highest test ROC-AUC (0.846) and F1. Honestly, all 3 were within noise of each other.

**Q: What is uplift and why does it matter?**
A: Churn models find who is *at risk*. Uplift finds who will *respond to the offer*. Sending offers to lost causes or sleeping dogs wastes money.

**Q: Your treatment data is fake?**
A: Yes, it's **simulated**, because the public dataset has no offer history. The rules are written in `ml/simulate_treatment.py` and the README. In real life you'd run an A/B test first.

**Q: Uplift lost. Isn't that a failure?**
A: No, it's an honest result. In our simulation, the people the offer helps are mostly the same as the high-risk people, so churn ranking already finds them. Uplift wins when the people who respond are *different* from the people at risk.

**Q: How did you avoid cheating (data leakage)?**
A: The model never saw the 20% test customers during training, and data scaling was learned from training data only.

**Q: Where is the database? What does it store?**
A: `backend/app/database.py` uses **SQLite** (one file, `backend/data/mydel.db`, created automatically). The ML scores are read-only, so the database stores what *people* do with them: every contact an agent logs (channel, offer, outcome, note) and every customer checked on the predictor page. It has full create / read / update / delete endpoints (`/customers/{id}/contacts`, `/contacts/{id}`, `/contacts/stats`, `/predictions/history`). See them all at http://127.0.0.1:8000/docs.

**Q: What is your business recommendation?**
A: Target the highest-risk customers first, about the top 40%. Skip anyone the uplift model says would react badly. Run a real A/B test before trusting uplift numbers.
