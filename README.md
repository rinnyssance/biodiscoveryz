
# 🧬 BioDiscovery Z

### Exploring Secure Healthcare Data Analytics and Interoperability with IBM Z

**IBM Z Datathon 2026 | Track 3: Wildcard — Beyond the Obvious**

BioDiscovery Z is a collaborative research and software development project exploring how artificial intelligence, data analytics, and secure computing infrastructure can improve the way healthcare information is processed, analyzed, and shared.

Our team is developing a proof of concept that allows users to upload healthcare datasets, examine their structure, identify patterns, and visualize findings. The project focuses on publicly available, non-identifiable neurological health data while investigating how IBM Z technologies can support secure, scalable healthcare data workflows.

Our goal is to demonstrate how computational tools can make complex healthcare data more accessible and useful without compromising privacy, security, or responsible research practices.

---

## 🔬 The Research Problem

Healthcare data is often distributed across different institutions, stored in inconsistent formats, and subject to strict privacy and security requirements.

These challenges can make it difficult for researchers and healthcare professionals to combine datasets, identify meaningful patterns, and exchange information efficiently.

BioDiscovery Z investigates three connected questions:

1. How can computational tools make healthcare datasets easier to explore and interpret?
2. How can data standardization and interoperability improve the usefulness of healthcare information?
3. How can IBM Z security and computing capabilities support responsible healthcare data processing?

---

## 💻 Our Proposed Solution

BioDiscovery Z will provide an interactive environment for exploring healthcare data through a streamlined research workflow.

The planned proof of concept will support:

- **Dataset Upload:** Allow users to upload supported CSV healthcare datasets.
- **Sample Dataset:** Provide a default publicly available neurological dataset for demonstration.
- **Data Exploration:** Examine dataset structure, column types, missing values, and descriptive statistics.
- **Data Visualization:** Generate charts that help users recognize patterns and relationships.
- **Data Standardization:** Explore consistent formatting and FHIR-inspired approaches to healthcare interoperability.
- **Security Architecture:** Demonstrate or document how IBM Z capabilities can support authentication, access control, auditing, and secure data handling.

The application is intended as a research and educational prototype, not a clinical diagnostic system.

---

## 👥 Meet the Team

BioDiscovery Z brings together scientific research, healthcare compliance, cybersecurity, and user-centered design.

### 🧬 Erin — Science and Data Lead

Erin leads the scientific methods and data work behind the project.

**Responsibilities:**

- Select and document research datasets and their scientific context.
- Prepare patient-level data while preserving clinical values and shifted dates.
- Check identifiers, missing values, history counts, and patient/encounter relationships.
- Develop transparent, reproducible analysis and preliminary neurological screening methods.
- Document evidence, uncertainty, and the limits of the available data.

**Prepared dataset:** The supplied [CSV](data/raw/BioDiscovery_Z_all_100_patients_synthetic_dashboard.csv)
contains 100 deidentified patients from MIMIC-IV Clinical Database Demo v2.2, with
fictional names and explicitly simulated hospital/department assignments. It is not
an entirely synthetic clinical dataset. Project notes identify `patients`,
`admissions`, `diagnoses_icd`, `d_icd_diagnoses`, and `labevents` as the five selected
source tables; the original preparation script and source tables are not available
here to reproduce those joins. Each patient row stores admissions, diagnoses, and
laboratory histories as JSON lists. Patient and demonstration IDs are unique in this
snapshot; stability across future imports has not yet been tested.

**Completed in this milestone:** Added the patient dataset, read all nested
histories, and added a reproducible Python ingestion/validation script. Checks cover
counts, duplicate IDs, missing values, data types, encounter relationships, and date
ordering. The file contains **275 admissions, 4,506 diagnoses, and 107,727 lab events**;
28,420 labs legitimately have no admission ID. The original validator passes its 10 tests. The 59 positive preliminary neurological screening flags are not a validated
cohort; all 100 patient validation flags remain false. No new diagnoses are inferred.

**Local backend:** The CSV imports into separate SQLite tables for patients,
admissions, diagnoses, and lab events. FastAPI serves patient search, individual
records, paginated histories, supported dataset summaries, and a FHIR R4 Patient
example. Repeat imports do not add duplicates. See the [backend setup guide](backend/README.md)
for commands and the [integration boundary](docs/implementation-boundary.md) for
what still needs the frontend and Db2 schema.

**Run the data checks from the repository root:**

```sh
python scripts/validate_dataset.py
python -m unittest discover -s tests -v
```

| Guide | What it helps you do |
|---|---|
| [Local backend](backend/README.md) | Set up the database, import records, and try the API. |
| [Source data](data/README.md) | Find the patient CSV, source attribution, and license. |
| [Python code](scripts/README.md) | Understand the validation script and each function. |
| [Tests](tests/README.md) | See what each test checks and how to run the suite. |
| [Validation results](docs/validation-results.md) | Read dataset totals, missing values, and limitations. |
| [Materials and methods](docs/materials-and-methods.md) | Follow the preparation and validation workflow. |
| [Data dictionary](docs/data-dictionary.md) | Look up the meaning of each field. |
| [Generated report](reports/README.md) | Interpret the JSON results and regenerate them. |

Clinical source-value equivalence has not been independently verified against the
original tables. See [Research References](#-research-references) for the dataset citation.

### 🔐 Ronin — IBM Z Security Lead

Ronin investigates the security architecture needed to support responsible healthcare data processing.

**Responsibilities:**

- Research IBM Z and LinuxONE security capabilities.
- Evaluate authentication, authorization, and role-based access control.
- Investigate encryption, data protection, and audit logging.
- Develop the proposed IBM Z security architecture.
- Help demonstrate or document the role of IBM Z in the proof of concept.
- Identify potential security risks and mitigation strategies.

### 🎨 Maci — UX/UI Lead

Maci leads the design of an accessible, intuitive interface for interacting with complex healthcare datasets.

**Responsibilities:**

- Develop the application's user experience and interface design.
- Plan the dataset upload and exploration workflow.
- Design clear, accessible data visualizations.
- Organize the presentation of statistical findings.
- Support usability testing and interface improvements.
- Contribute visual materials for the project demonstration.

### 🏥 Gio — Healthcare Compliance Research Analyst

Gio investigates the healthcare privacy, regulatory, and ethical considerations associated with medical data systems.

**Responsibilities:**

- Research HIPAA and relevant healthcare data privacy principles.
- Investigate healthcare interoperability standards, including HL7 FHIR.
- Examine responsible handling of publicly available and de-identified healthcare data.
- Identify ethical considerations and potential compliance risks.
- Research how healthcare organizations manage secure data exchange.
- Contribute compliance findings and recommendations to the research paper.

---

## 📚 Research-First Development

BioDiscovery Z follows a research-first approach. Before implementing major features, the team will investigate the scientific, technical, and ethical foundations of the proposed system.

Each team member will contribute:

- At least two credible research sources relevant to their area of responsibility.
- A concise summary of their findings.
- Recommendations that can inform the project's design and development.
- Contributions to the final presentation and post-event research paper.

Peer-reviewed literature, official technical documentation, healthcare standards, and authoritative regulatory guidance will be prioritized.

---

## 🛠️ Technology Stack

The current implementation supports dataset validation, relational import,
descriptive summaries, FHIR Patient translation, and a local read-only API.

| Component | Implemented tools and purpose |
|---|---|
| Python runtime | Python 3.10.11, used to run and test this milestone |
| Data ingestion and validation | Built-in `csv`, `json`, `collections`, `datetime`, `math`, `hashlib`, `pathlib`, and `argparse` |
| API routes | FastAPI for health, patient records, histories, and supported summaries |
| Response formats | Pydantic for typed JSON patient and history responses |
| Database access | SQLAlchemy for table definitions, queries, and atomic imports |
| Local database | SQLite for patient, admission, diagnosis, and laboratory tables |
| FHIR demonstration | Python mapping for Patient resources; `jsonschema` verifies official R4 JSON structure in development |
| Local server | Uvicorn, bound to `127.0.0.1` |
| Automated tests | pytest for the combined suite, existing `unittest` checks, and HTTPX through the API test client |
| Version control | Git and GitHub to track and share the work |
| Documentation and reports | Markdown for explanations; JSON for machine-readable findings |

[requirements.txt](requirements.txt) pins the backend libraries;
[requirements-dev.txt](requirements-dev.txt) adds the test tools. The standalone CSV
validator still uses only Python's standard library. The original CSV preparation
tools are not established by repository evidence.

**Integration boundary:** A Db2 connection probe is available, but live Db2 data
mapping cannot be completed until the team supplies authorized access and its actual
table definitions. The React/Vite dashboard is not in this repository yet, so there
is no frontend build or Vercel deployment to verify. See the [implementation boundary](docs/implementation-boundary.md).
PostgreSQL, pandas, and a newer Python runtime remain possible future choices.


---

## 🔄 Proposed Research Workflow

### Step 1 — Dataset Selection

Identify a suitable publicly available neurological healthcare dataset and review its documentation, variables, limitations, and permitted uses.

### Step 2 — Data Ingestion

Load the default dataset or accept a user-uploaded CSV file.

### Step 3 — Exploratory Data Analysis

Inspect data types, missing values, descriptive statistics, distributions, and relationships between variables.

### Step 4 — Visualization

Create interpretable charts that communicate patterns and support further investigation.

### Step 5 — Interoperability Research

Investigate how data standardization and healthcare exchange frameworks could improve compatibility between systems.

### Step 6 — Security Evaluation

Examine how IBM Z capabilities could protect sensitive workflows through access controls, encryption, and auditing.

### Step 7 — Documentation and Interpretation

Summarize findings, identify limitations, and explain the implications for healthcare research and data infrastructure.

---

## 🔒 Security, Privacy, and Responsible AI

BioDiscovery Z is designed around the principle that healthcare data systems should prioritize security and responsible use from the beginning.

The project will:

- Use publicly available, non-identifiable research datasets.
- Avoid collecting real patient-identifying information.
- Examine secure data access and processing practices.
- Clearly distinguish demonstrated functionality from proposed architecture.
- Document the limitations of exploratory analysis and any future predictive models.
- Avoid presenting experimental results as medical advice or validated clinical decisions.

Using public or de-identified data does not automatically establish regulatory compliance. Any future real-world healthcare deployment would require additional legal, security, and clinical review.

---

## 📊 Expected Deliverables

The team is working toward the following deliverables:

### 1. Interactive Proof of Concept

A functioning healthcare dataset exploration workflow.

### 2. Research Documentation

Evidence supporting the project's scientific, security, design, and compliance decisions.

### 3. IBM Z Architecture

A demonstration or documented integration showing the relevance of IBM Z technologies.

### 4. Project Presentation

A clear explanation of the problem, proposed solution, technical approach, and potential impact.

### 5. Live Demonstration

A walkthrough of the working prototype.

### 6. Research Paper

A post-datathon paper documenting the project's methodology, findings, limitations, and future directions.

---

## 🚀 Future Development

Beyond the datathon, BioDiscovery Z could expand to investigate:

- Additional neurological and other biomedical datasets.
- More advanced statistical analysis and machine learning.
- Standardized healthcare data exchange using FHIR-compatible structures.
- More comprehensive security controls and audit trails.
- Research dashboards for students, scientists, and healthcare data professionals.
- Integration with secure enterprise computing environments.

These are potential directions rather than completed features.

---

## 🌍 Why This Matters

Healthcare research increasingly depends on the ability to work with large, complex datasets. However, useful analysis requires more than sophisticated algorithms. It also depends on data quality, interoperability, privacy, security, and clear scientific communication.

BioDiscovery Z brings these concerns together in one collaborative project.

By combining biological and healthcare research with data science, cybersecurity, compliance, and interface design, our team hopes to demonstrate how interdisciplinary approaches can contribute to more trustworthy healthcare technology.

---

## 🏆 Event Information

**Event:** IBM Z Datathon 2026

**Project:** BioDiscovery Z

**Track:** Track 3 — Wildcard: Beyond the Obvious

**Team Members:**
- Erin — Science and Data Lead
- Ronin — IBM Z Security Lead
- Maci — UX/UI Lead
- Gio — Healthcare Compliance Research Analyst

**Event Website:** https://www.starhacks.org/ibm-z-datathon-2026

---

## 📖 Research References

Johnson, A., Bulgarelli, L., Pollard, T., Horng, S., Celi, L. A., & Mark, R. (2023).
*MIMIC-IV Clinical Database Demo (version 2.2).* PhysioNet.
[Dataset DOI](https://doi.org/10.13026/dp1f-ex47).

See [dataset attribution](data/README.md) for the license and additional source citation.

---

## ⚠️ Disclaimer

BioDiscovery Z is an exploratory research and educational project. It is not intended for clinical diagnosis, treatment recommendations, or direct patient care.

---

**Built for the IBM Z Datathon 2026.**
