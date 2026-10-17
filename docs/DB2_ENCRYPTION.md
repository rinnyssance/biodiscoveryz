# IBM Db2 Column-Level Encryption: `SYNTHETIC_PATIENT_NAME`

This document details the encryption implementation for the `SYNTHETIC_PATIENT_NAME` column in **IBM Db2** (`DB2INST1.BIODISCOVERY_Z_PATIENTS`), including SQL queries, view definitions, and Python/Jupyter decryption examples.

---

## 1. Overview & Security Context

In healthcare analytics and Datathon workflows, protecting Personally Identifiable Information (PII) is critical. Although patient names in this cohort are synthetic, encrypting the column demonstrates compliance with healthcare data protection standards (e.g., HIPAA Security Rule, GDPR pseudonymization).

| Attribute | Details |
|---|---|
| **Target Database** | `DBPROD` |
| **Schema & Table** | `DB2INST1.BIODISCOVERY_Z_PATIENTS` |
| **Encrypted Column** | `SYNTHETIC_PATIENT_NAME` |
| **Storage Type** | `VARCHAR(255) FOR BIT DATA` (Binary Ciphertext) |
| **Encryption Type** | Db2 Built-in Symmetric Block Encryption (`ENCRYPT`) |
| **Passphrase** | `BioDiscoveryZ@Datathon2026!` |

---

## 2. Implementation Steps

### Step 1: Alter Column to Support Binary Ciphertext
Db2's `ENCRYPT()` function outputs binary byte strings (`FOR BIT DATA`):
```sql
ALTER TABLE BIODISCOVERY_Z_PATIENTS 
    ALTER COLUMN SYNTHETIC_PATIENT_NAME 
    SET DATA TYPE VARCHAR(255) FOR BIT DATA;

-- Reorganize table to apply schema changes
CALL SYSPROC.ADMIN_CMD('REORG TABLE DB2INST1.BIODISCOVERY_Z_PATIENTS');
```

### Step 2: Encrypt Existing Patient Names
Each plaintext name was encrypted in place using the encryption passphrase:
```sql
UPDATE BIODISCOVERY_Z_PATIENTS 
SET SYNTHETIC_PATIENT_NAME = ENCRYPT(SYNTHETIC_PATIENT_NAME, 'BioDiscoveryZ@Datathon2026!');
```

### Step 3: Create Secure Decrypted View
An authorized view was created to simplify decrypted reads for credentialed workflows:
```sql
CREATE OR REPLACE VIEW DB2INST1.V_PATIENTS_DECRYPTED AS 
SELECT 
    SUBJECT_ID, 
    DEMO_PATIENT_ID, 
    DECRYPT_CHAR(SYNTHETIC_PATIENT_NAME, 'BioDiscoveryZ@Datathon2026!') AS SYNTHETIC_PATIENT_NAME, 
    GENDER, 
    ANCHOR_AGE, 
    ANCHOR_YEAR, 
    ANCHOR_YEAR_GROUP, 
    DOD, 
    ADMISSION_COUNT, 
    DIAGNOSIS_COUNT, 
    LAB_RESULT_COUNT, 
    SIMULATED_HOSPITAL, 
    SIMULATED_DEPARTMENT, 
    NEUROLOGY_PRELIMINARY_SCREEN, 
    NEUROLOGY_SCREEN_VALIDATED, 
    DATA_SOURCE, 
    DATA_SOURCE_URL 
FROM BIODISCOVERY_Z_PATIENTS;
```

---

## 3. Querying & Verifying the Data

### A. Raw Query (Without Passphrase)
Users or applications querying the table directly see only encrypted binary ciphertext:
```sql
SELECT 
    SUBJECT_ID, 
    DEMO_PATIENT_ID, 
    HEX(SYNTHETIC_PATIENT_NAME) AS CIPHERTEXT_HEX 
FROM BIODISCOVERY_Z_PATIENTS 
FETCH FIRST 3 ROWS ONLY;
```

**Output:**
```
SUBJECT_ID  DEMO_PATIENT_ID  CIPHERTEXT_HEX
----------  ---------------  --------------------------------------------------
10000032    BDZ-001          0DEC14FF04B8D5A1AFF2CBF7A3D33E63B4C1BAFE1BABF9D8
10001217    BDZ-002          0D728EFF04B8D5A6A41DCEC26FF19984D14DE8355A27245C
10001725    BDZ-003          0D13EDFF04B8D5A0E4707839991C0C5EAE7A503E2CCA4C01
```

### B. Decrypted Query via SQL (With Passphrase)
Using Db2's `DECRYPT_CHAR()` function with the secret key restores the plaintext name:
```sql
SELECT 
    SUBJECT_ID, 
    DEMO_PATIENT_ID, 
    DECRYPT_CHAR(SYNTHETIC_PATIENT_NAME, 'BioDiscoveryZ@Datathon2026!') AS PATIENT_NAME 
FROM BIODISCOVERY_Z_PATIENTS 
FETCH FIRST 3 ROWS ONLY;
```

**Output:**
```
SUBJECT_ID  DEMO_PATIENT_ID  PATIENT_NAME
----------  ---------------  ------------
10000032    BDZ-001          Alex Ellis
10001217    BDZ-002          Jordan Rivera
10001725    BDZ-003          Taylor Bell
```

### C. Querying the Decrypted View
```sql
SELECT DEMO_PATIENT_ID, SYNTHETIC_PATIENT_NAME, GENDER, ANCHOR_AGE 
FROM V_PATIENTS_DECRYPTED 
FETCH FIRST 3 ROWS ONLY;
```

---

## 4. Python & Jupyter Notebook Integration

### Querying Decrypted Records in Python
```python
import ibm_db
import ibm_db_dbi
import pandas as pd

# Connect locally on the host machine
conn_str = (
    "DATABASE=DBPROD;"
    "HOSTNAME=127.0.0.1;"
    "PORT=50000;"
    "PROTOCOL=TCPIP;"
    "UID=db2inst1;"
    "PWD=ibmzsadb;"
)

conn = ibm_db.connect(conn_str, "", "")
pconn = ibm_db_dbi.Connection(conn)

# Passphrase can be supplied as a dynamic SQL parameter or retrieved from an environment variable
PASSPHRASE = "BioDiscoveryZ@Datathon2026!"

sql = f"""
SELECT 
    SUBJECT_ID,
    DEMO_PATIENT_ID,
    DECRYPT_CHAR(SYNTHETIC_PATIENT_NAME, '{PASSPHRASE}') AS SYNTHETIC_PATIENT_NAME,
    GENDER,
    ANCHOR_AGE,
    SIMULATED_HOSPITAL
FROM BIODISCOVERY_Z_PATIENTS
ORDER BY SUBJECT_ID
FETCH FIRST 5 ROWS ONLY
"""

df = pd.read_sql(sql, pconn)
print(df)

pconn.close()
```

---

## 5. Security & Best Practices

1. **Key Separation:** In production environments, store the decryption passphrase in a secrets manager or environment variable (e.g. `DB2_ENCRYPTION_KEY`) rather than hardcoding it in scripts.
2. **Access Control:** Grant access on `V_PATIENTS_DECRYPTED` only to authorized analytical roles, while leaving standard application roles restricted to the encrypted base table.
3. **Audit Trails:** Db2 tracks access and operations through the system audit facility (`db2audit`).
