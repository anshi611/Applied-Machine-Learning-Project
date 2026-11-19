# Group 01 — Smooth operators

## TEXL — Verifiable explanations for credit decisions

Applied Machine Learning Lab (CSE2512P), Track 1 — Patent Design, Topic A.

TEXL records a model's credit score, decision and feature contributions in a signed, linked ledger. An applicant receives a receipt for their decision. An auditor can check the recorded history and replay the model and explanation from the committed input.

## Team members

| Member | Enrollment number |
|---|---|
| Varun Chaudhary | 2481032 |
| Om Rohilla | 2481022 |
| Nisha | 2481159 |
| Punit | 2481019 |

## Objectives

- Explain decisions with a seeded, model-agnostic permutation-Shapley estimator.
- Check that the explanation reconstructs the score before recording it.
- Sign a record binding the input commitment, model/explainer identifiers, reasons and decision.
- Detect historical tampering through checkpoints and receipts, and falsification at creation through replay.
- Evaluate detection, explanation fidelity and runtime on public credit data.

## Submission contents

| Folder | Contents |
|---|---|
| [Source-Code](Source-Code/) | Implementation, demo, tests, executed notebook, experiment scripts and archived results |
| [Project-Design](Project-Design/) | Architecture, decision flow, class relationships and UI navigation |
| [Dataset](Dataset/) | German Credit data, attribution, licence and checksum |
| [Documentation](Documentation/) | Final project report, patent-design specification and invention disclosure in PDF and Word |
| [Screenshots](Screenshots/) | Actual demo and output views |

## Technologies

Python, NumPy, pandas, scikit-learn, SciPy, SHAP, cryptography (SHA-256 and Ed25519), Streamlit, Altair, Jupyter, pytest, Matplotlib and python-docx.

## Installation and execution

Use Python 3.12. The submitted lock file was verified on Python 3.12.14 / macOS arm64. Other operating systems can install the direct dependencies if a pinned wheel is unavailable.

From this group folder:

~~~bash
cd Source-Code
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-lock.txt
python -m pytest -q tests
python -m streamlit run demo/app.py
~~~

On Windows activate with .venv\Scripts\activate. Direct dependencies can be installed with python -m pip install -r requirements.txt.

The app opens at http://localhost:8501. Its first run trains the reference models and prepares the demo ledger. Tabs include Decide, Ledger, Tamper & verify, and Results.

The loader reads ../Dataset/german.data. Keep the group folder together.

## Reproduce the experiments

From Source-Code with the environment active:

~~~bash
PY=.venv/bin/python ./run_all.sh --no-pdf
~~~

This checks the dataset, runs tests and experiments, executes the notebook, and rebuilds the original experiment-based report and disclosure in Source-Code/report/ and Source-Code/disclosure/. It takes several minutes on a laptop. The final edited submission documents are in Documentation/.

Without --no-pdf, the original builders attempt PDF export through Microsoft Word. Submitted PDFs are included.

Individual commands:

~~~bash
python scripts/download_data.py
python scripts/run_experiments.py
python scripts/check_explainer_stability.py
python -m nbconvert --to notebook --execute --inplace notebooks/TEXL_PoC.ipynb --ExecutePreprocessor.timeout=1200
~~~

## Results and scope

The archived study evaluates nine attacks over 200 trials each. At 32 records per epoch, the full verifier detects six attack classes in every trial. Detection for deletion, reordering and truncation ranges from 21.5% to 94.5%. With one-record checkpoints, all tested attack classes reach 100% detection under the study conditions.

The witness is simulated. The demo signing key is reproducible test material. Receipts contain encoded input and salt and should be handled as sensitive in a real deployment. The disclosure and claims are academic patent-design deliverables.

## Provenance and cleanup

Team repository https://github.com/ivarunchaudhary/Aml-Credit-decisions

Source snapshot 029e7165f510652fdb3119eab9d234d01366811e.

The submission retains executable source, tests, the executed notebook, artifacts used by the demo/builders and final documents. It excludes caches, local environments, agent planning folders, the stale completion-status report/builder, course instruction templates and earlier report drafts.

Claude Code and OpenAI Codex assisted the implementation and documentation. Turnitout was used during the report wording review. The report includes the AI-use declaration.
