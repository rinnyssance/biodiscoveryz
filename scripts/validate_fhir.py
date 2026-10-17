"""Check all demo Patient resources against the official HL7 FHIR R4 JSON schema.

Download https://hl7.org/fhir/R4/fhir.schema.json to a local file, then run:
python -m scripts.validate_fhir --schema path/to/fhir.schema.json
The schema is supplied explicitly so routine tests do not depend on the network.
"""

import argparse
import hashlib
import json
from pathlib import Path

from jsonschema import Draft6Validator
from sqlalchemy import select

from backend.database import make_engine
from backend.fhir_patient import map_patient
from backend.models import imports, patients


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--schema', type=Path, required=True)
    args = parser.parse_args()
    raw_schema = args.schema.read_bytes()
    schema = json.loads(raw_schema)
    if schema.get('id') != 'http://hl7.org/fhir/json-schema/4.0' or 'Patient' not in schema.get('definitions', {}):
        parser.error('Expected the official HL7 FHIR R4 schema with a Patient definition.')
    # Use the Patient definition plus its referenced types from the complete R4 file.
    validator = Draft6Validator({'$schema': schema['$schema'], '$ref': '#/definitions/Patient',
                                 'definitions': schema['definitions']})
    engine = make_engine()
    try:
        with engine.connect() as connection:
            if connection.scalar(select(imports.c.id)) is None:
                parser.error('Import the local dataset before validating FHIR resources.')
            records = connection.execute(select(patients)).mappings()
            count = 0
            for patient in records:
                validator.validate(map_patient(dict(patient)))
                count += 1
        print(json.dumps({'status': 'pass', 'patient_resources_validated': count,
                          'schema_sha256': hashlib.sha256(raw_schema).hexdigest()}))
        return 0
    finally:
        engine.dispose()


if __name__ == '__main__':
    raise SystemExit(main())
