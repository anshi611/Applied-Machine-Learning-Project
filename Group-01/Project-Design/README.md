# System design

- [System architecture](System-Architecture.png) shows scoring, explanation, the additivity gate, signed records, checkpoints, receipts and verification.
- [Decision flow](Decision-Flow.png) shows the execution and evidence steps.
- [Class relationships](Class-Relationships.png) maps the implemented classes and verifier functions.
- The implemented [demo views](../Screenshots/) provide the UI designs.

## UI navigation

| View | Inputs and action | Output |
|---|---|---|
| Decide | Select/edit an applicant, then decide and record | Risk, decision, contributions, signed record and receipt checks |
| Ledger | Inspect the current ledger | Sequence, hash links, sealed status and checkpoints |
| Tamper & verify | Choose an attack and seed, then verify a copy | Detection by verifier level and findings |
| Results | Read the archived experiment outputs | Detection table and explanation figures |

The UI delegates model, ledger and attack logic to Source-Code/demo/core.py, which reuses the experiments. Attacks run on copies so the honest ledger remains available for comparison.
