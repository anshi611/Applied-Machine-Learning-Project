# Project design

Each diagram is provided as a PNG (for viewing and printing) and an SVG (scalable).

| Folder | Diagram | Shows |
|---|---|---|
| `Architecture/` | `01_system_architecture` | Offline ML pipeline → saved models → FastAPI backend + SQLite → React frontend, plus deployment |
| `Flowcharts/` | `02_ml_pipeline_flowchart` | Every step from downloading the data to saving the models the app loads |
| `Flowcharts/` | `03_decision_flowchart` | How the app picks one of four actions for a customer (`ModelService.decide`) |
| `UML-Diagrams/` | `04_uml_class_diagram` | Backend classes (ModelService, Database, Pydantic schemas), the TLearner and the database tables |
| `UML-Diagrams/` | `05_uml_sequence_predict` | What happens when a user scores a new customer in the Live Predictor |
| `UML-Diagrams/` | `06_uml_use_case_diagram` | What each user (Manager, Support agent, Data scientist) can do |
| `UI-Designs/` | `Frontend_Design_Brief.pdf` / `.md` | The UI design brief: personas, screens, components, colours and wording rules |

The finished UI is shown in `../Screenshots/App/`.
