# IBM Db2 Local & Jupyter Notebook SQL Connection Guide

This guide describes how to connect to and run SQL queries against the **IBM Db2** database (`DBPROD`) locally on the host machine and inside a **Jupyter Notebook**.

> [!NOTE]
> **Db2 Docker Setup & Activation:**
> The Db2 engine runs inside the container named `mydb2`:
> ```bash
> docker run -itd --name mydb2 --privileged=true -p 50000:50000 \
>   -e LICENSE=accept -e DB2INST1_PASSWORD=ibmzsadb -e DBNAME=dbprod \
>   -v /var/lib/db2data:/database ibmcom/db2
> ```
> To keep `DBPROD` permanently loaded in memory and avoid repeated startup overhead on connections, ensure it is activated:
> ```bash
> docker exec -u db2inst1 mydb2 bash -lc 'db2 activate db DBPROD'
> ```

> [!IMPORTANT]
> **Internal Network Security & Container Networking:**
> - Db2 listens on port `50000`.
> - The Jupyter Notebook container runs with host networking (`--net=host`) on port `38888` (access via `http://<host>:38888/lab?token=ibmzsa`).
> - Inside Jupyter notebooks, Db2 is accessed directly via local loopback (`127.0.0.1:50000` or `localhost:50000`).

---

## 1. Connection Parameters

All local tools, scripts, and notebook kernels connect using the following parameters:

| Parameter | Value | Notes |
|---|---|---|
| **Host / IP** | `localhost` or `127.0.0.1` | Local loopback interface (host networking) |
| **Port** | `50000` | Local Db2 engine port |
| **Database Name** | `DBPROD` | Production database containing all clinical datasets |
| **Username** | `db2inst1` | Db2 instance administrator (**do NOT use `dbprod`**) |
| **Password** | `ibmzsadb` | Instance password |
| **Default Schema** | `DB2INST1` | Holds all clinical tables |
| **Passphrase** | `BioDiscoveryZ@Datathon2026!` | Passphrase for decrypted PII patient names |

---

## 2. Connecting from a Jupyter Notebook

The notebook environment provides multiple ways to execute SQL against Db2.

### Method A: Native SQL Cell Magic (`%%sql`) — Recommended

This method lets you write standard SQL queries directly inside notebook cells using `jupysql`.

#### Cell 1: Initialize SQL Extension & Engine
```python
import sqlalchemy
from sqlalchemy import create_engine

# Configure SQLAlchemy engine using local loopback
DB_URI = "db2+ibm_db://db2inst1:ibmzsadb@127.0.0.1:50000/DBPROD"
engine = create_engine(DB_URI)

# Load SQL magic extension
%load_ext sql

# CRITICAL: Disable autocommit in jupysql to prevent isolation level errors on Db2
%config SqlMagic.autocommit = False
%config SqlMagic.feedback = False
%sql engine
```

#### Cell 2: Run Native SQL Query Directly
```sql
%%sql
SELECT 
    p.subject_id,
    p.gender,
    p.anchor_age,
    p.anchor_year,
    COUNT(a.hadm_id) AS total_admissions
FROM patients p
LEFT JOIN admissions a ON p.subject_id = a.subject_id
GROUP BY p.subject_id, p.gender, p.anchor_age, p.anchor_year
ORDER BY p.subject_id
FETCH FIRST 10 ROWS ONLY;
```

#### Cell 3: Capture SQL Results into a Pandas DataFrame
```python
# Execute SQL query and store output as a DataFrame
result = %sql SELECT subject_id, gender, anchor_age FROM patients WHERE anchor_age >= 65
df_seniors = result.DataFrame()
df_seniors.head()
```

---

### Method B: Pandas `pd.read_sql_query` (Data Analysis Workflow)

Load SQL query results directly into Pandas DataFrames for plotting, statistics, or ML:

> [!TIP]
> **Best Practice for Pandas on Db2:**
> Always use `pd.read_sql_query(text(sql_query), conn)` inside a `with engine.connect() as conn:` block.
> Passing a multi-line raw SQL string directly to `pd.read_sql(sql_query, engine)` causes Pandas to check `engine.has_table()`, which fails with `CLI0109E String data right truncation` on queries longer than 128 characters.

```python
import pandas as pd
from sqlalchemy import create_engine, text

engine = create_engine("db2+ibm_db://db2inst1:ibmzsadb@127.0.0.1:50000/DBPROD")

# SQL query joining patient demographics with admissions, diagnoses, and labs
sql_query = """
SELECT 
    p.subject_id,
    p.gender,
    p.anchor_age,
    p.anchor_year_group,
    p.dod,
    COALESCE(adm.admission_count, 0) AS admission_count,
    COALESCE(diag.diagnosis_count, 0) AS diagnosis_count,
    COALESCE(lab.lab_result_count, 0) AS lab_result_count
FROM patients p
LEFT JOIN (
    SELECT subject_id, COUNT(*) AS admission_count 
    FROM admissions 
    GROUP BY subject_id
) adm ON p.subject_id = adm.subject_id
LEFT JOIN (
    SELECT subject_id, COUNT(*) AS diagnosis_count 
    FROM diagnoses_icd 
    GROUP BY subject_id
) diag ON p.subject_id = diag.subject_id
LEFT JOIN (
    SELECT subject_id, COUNT(*) AS lab_result_count 
    FROM labevents 
    GROUP BY subject_id
) lab ON p.subject_id = lab.subject_id
ORDER BY p.subject_id
FETCH FIRST 10 ROWS ONLY
"""

with engine.connect() as conn:
    df_cohort = pd.read_sql_query(text(sql_query), conn)

print(f"Total cohort loaded: {len(df_cohort)} patients")
display(df_cohort.head())
```

---

### Method C: Low-Level `ibm_db` / `ibm_db_dbi` API

For parameterized queries or explicit transaction management:

```python
import ibm_db
import ibm_db_dbi
import pandas as pd

conn_str = "DATABASE=DBPROD;HOSTNAME=127.0.0.1;PORT=50000;PROTOCOL=TCPIP;UID=db2inst1;PWD=ibmzsadb;"
conn = ibm_db.connect(conn_str, "", "")
pconn = ibm_db_dbi.Connection(conn)

cursor = pconn.cursor()

# Parameterized SQL query
sql = "SELECT subject_id, gender, anchor_age FROM patients WHERE gender = ? AND anchor_age > ?"
cursor.execute(sql, ('F', 50))

rows = cursor.fetchall()
columns = [desc[0] for desc in cursor.description]
df_results = pd.DataFrame(rows, columns=columns)

cursor.close()
pconn.close()

df_results.head()
```

---

## 3. Connecting Locally on the Host Machine

When logged into the host machine where Db2 is running, you can connect using either the command line or local Python scripts.

### Option A: Db2 Command Line Processor (CLP) inside Container

To launch an interactive SQL session:

```bash
# 1. Open an interactive shell inside the Db2 container
docker exec -it mydb2 su - db2inst1

# 2. Connect to the database
db2 connect to DBPROD

# 3. Execute SQL statements
db2 "SELECT COUNT(*) FROM PATIENTS"
db2 "SELECT SUBJECT_ID, GENDER, ANCHOR_AGE FROM PATIENTS FETCH FIRST 5 ROWS ONLY"

# 4. Disconnect when finished
db2 terminate
exit
```

#### One-Liner SQL Execution from Host Shell:
```bash
docker exec -i mydb2 su - db2inst1 -c 'db2 connect to DBPROD && db2 "SELECT COUNT(*) FROM PATIENTS"'
```

#### Executing SQL Script Files:
```bash
# Run a script containing SQL queries
docker exec -i mydb2 su - db2inst1 -c 'db2 -tvf /database/my_query.sql'
```

---

### Option B: Local Python 3 Script (`ibm_db`)

Run a standalone Python script on the host machine connecting to `127.0.0.1:50000`:

```python
#!/usr/bin/env python3
import ibm_db

conn_str = (
    "DATABASE=DBPROD;"
    "HOSTNAME=127.0.0.1;"
    "PORT=50000;"
    "PROTOCOL=TCPIP;"
    "UID=db2inst1;"
    "PWD=ibmzsadb;"
)

try:
    conn = ibm_db.connect(conn_str, "", "")
    print("Connected to Db2 locally via 127.0.0.1:50000!")

    sql = "SELECT COUNT(*) FROM PATIENTS"
    stmt = ibm_db.exec_immediate(conn, sql)
    count = ibm_db.fetch_tuple(stmt)[0]
    print(f"Total patient count: {count}")

    ibm_db.close(conn)
except Exception as err:
    print(f"Error connecting to Db2: {err}")
```

---

## 4. Key SQL Query Examples for Transferred Tables

Here are useful SQL queries ready to run against the newly transferred datasets in `DBPROD`.

### A. Top 10 Most Frequent Diagnoses
```sql
SELECT 
    d.icd_code,
    d.icd_version,
    def.long_title,
    COUNT(*) AS diagnosis_occurrences
FROM diagnoses_icd d
LEFT JOIN d_icd_diagnoses def 
    ON d.icd_code = def.icd_code 
    AND d.icd_version = def.icd_version
GROUP BY d.icd_code, d.icd_version, def.long_title
ORDER BY diagnosis_occurrences DESC
FETCH FIRST 10 ROWS ONLY;
```

### B. ICU Stays and Vital Signs Summary
```sql
SELECT 
    icu.subject_id,
    icu.stay_id,
    icu.first_careunit,
    icu.los AS length_of_stay_days,
    COUNT(ce.itemid) AS total_chart_events
FROM icustays icu
LEFT JOIN chartevents ce 
    ON icu.stay_id = ce.stay_id
GROUP BY icu.subject_id, icu.stay_id, icu.first_careunit, icu.los
ORDER BY total_chart_events DESC
FETCH FIRST 10 ROWS ONLY;
```

### C. Laboratory Test Volume by Fluid Category
```sql
SELECT 
    item.fluid,
    COUNT(lab.labevent_id) AS event_count
FROM labevents lab
JOIN d_labitems item 
    ON lab.itemid = item.itemid
GROUP BY item.fluid
ORDER BY event_count DESC;
```

### D. Full Patient Cohort Metrics (Dashboard Alignment)
```sql
SELECT 
    p.subject_id,
    p.gender,
    p.anchor_age,
    p.anchor_year,
    p.anchor_year_group,
    p.dod,
    COALESCE(adm.admission_count, 0) AS admission_count,
    COALESCE(diag.diagnosis_count, 0) AS diagnosis_count,
    COALESCE(lab.lab_result_count, 0) AS lab_result_count
FROM patients p
LEFT JOIN (SELECT subject_id, COUNT(*) AS admission_count FROM admissions GROUP BY subject_id) adm ON p.subject_id = adm.subject_id
LEFT JOIN (SELECT subject_id, COUNT(*) AS diagnosis_count FROM diagnoses_icd GROUP BY subject_id) diag ON p.subject_id = diag.subject_id
LEFT JOIN (SELECT subject_id, COUNT(*) AS lab_result_count FROM labevents GROUP BY subject_id) lab ON p.subject_id = lab.subject_id
ORDER BY p.subject_id;
```

---

## 5. Troubleshooting Common Issues

### Issue 1: `SQL30082N ("USERNAME AND/OR PASSWORD INVALID")`
- **Cause**: Using the database name `dbprod` as the username in the connection string (e.g. `dbprod:ibmzsadb@127.0.0.1:50000/DBPROD`).
- **Fix**: The Db2 instance administrator is **`db2inst1`**. The connection string format is:
  ```python
  engine = create_engine("db2+ibm_db://db2inst1:ibmzsadb@127.0.0.1:50000/DBPROD")
  ```

### Issue 2: `CLI0109E String data right truncation. SQLSTATE=22001 SQLCODE=-99999`
- **Cause**: Passing a multi-line raw SQL query string directly to `pd.read_sql(sql_query, engine)`. Pandas internally calls `engine.has_table()`, querying `SYSCAT.TABLES WHERE TABNAME = ?` with the SQL statement. Because `TABNAME` is limited to 128 characters, Db2 raises a string truncation error.
- **Fix**: Use `pd.read_sql_query` with `sqlalchemy.text()` and an active connection:
  ```python
  from sqlalchemy import text
  with engine.connect() as conn:
      df = pd.read_sql_query(text(sql_query), conn)
  ```

### Issue 3: `Invalid isolation level requested: AUTOCOMMIT`
- **Cause**: When `%sql` (via `jupysql`) initializes, it attempts to set the isolation level to `AUTOCOMMIT`, which is not recognized by `ibm_db_sa`.
- **Fix**: Disable autocommit in `jupysql` prior to connecting:
  ```python
  %load_ext sql
  %config SqlMagic.autocommit = False
  %config SqlMagic.feedback = False
  %sql engine
  ```

### Issue 4: Database Deactivates After Every Query / High Connection Latency
- **Cause**: In Db2, if a database is not explicitly activated, it is automatically shut down when the last client disconnects.
- **Fix**: Run `db2 activate db DBPROD` once inside the container:
  ```bash
  docker exec -u db2inst1 mydb2 bash -lc 'db2 activate db DBPROD'
  ```

### Issue 5: `PermissionError` when Saving Files in Jupyter `/home/ibm-user/shared`
- **Cause**: The host directory `/home/linux1/shared` mounted into the Jupyter container is owned by `linux1` (UID 1002), whereas the Jupyter user is `ibm-user` (UID 1000).
- **Fix**: Grant write permissions on the host:
  ```bash
  sudo chown -R 1000:1000 /home/linux1/shared
  sudo chmod -R a+rwX /home/linux1/shared
  ```

