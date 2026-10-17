"""Serve local health, patient-directory, and clinical-history requests.

Start with: python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
The importer is a separate command; requests never re-import the CSV.
"""

from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.engine import Engine

from backend.database import make_engine
from backend.analytics_routes import router as analytics_router
from backend.fhir_patient import router as fhir_router
from backend.models import imports, metadata, patients
from backend.patient_routes import router as patient_router
from backend.schemas import HealthResponse, PatientPage, PatientSummary


def create_app(engine: Engine | None = None) -> FastAPI:
    """Build the app; tests can supply their own temporary database."""
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        database = engine if engine is not None else make_engine()
        metadata.create_all(database)
        app.state.database = database
        try:
            yield
        finally:
            if engine is None:
                database.dispose()

    app = FastAPI(
        title='BioDiscovery Z local data API',
        version='0.2.0',
        description='Read-only access to the deidentified demo dataset with fictional identities. '
                    'Neurological flags are preliminary; this is not a clinically validated system.',
        lifespan=lifespan,
    )

    @app.get('/health', response_model=HealthResponse)
    def health(request: Request):
        """Check database access and say whether the dataset has been imported."""
        with request.app.state.database.connect() as connection:
            loaded = connection.scalar(select(imports.c.id)) is not None
        return HealthResponse(dataset_loaded=loaded)

    @app.get('/api/patients', response_model=PatientPage)
    def patient_directory(
        request: Request,
        search: Annotated[str, Query(max_length=100, description='Fictional name or demo ID; case-insensitive literal text.')] = '',
        limit: Annotated[int, Query(ge=1, le=100)] = 20,
        offset: Annotated[int, Query(ge=0)] = 0,
    ):
        """Search patients and return a bounded page, keeping event histories separate."""
        query = select(patients)
        term = search.strip().lower()
        if term:
            # Bound parameters and escaped wildcards make search text literal data.
            query = query.where(or_(
                func.lower(patients.c.synthetic_patient_name).contains(term, autoescape=True),
                func.lower(patients.c.demo_patient_id).contains(term, autoescape=True),
            ))
        with request.app.state.database.connect() as connection:
            if connection.scalar(select(imports.c.id)) is None:
                raise HTTPException(503, 'Import the dataset first: python -m backend.import_dataset')
            total = connection.scalar(select(func.count()).select_from(query.subquery()))
            rows = connection.execute(query.order_by(patients.c.demo_patient_id).limit(limit).offset(offset)).mappings()
            items = [PatientSummary.model_validate(dict(row)) for row in rows]
        return PatientPage(total=total, limit=limit, offset=offset, items=items)

    app.include_router(patient_router)
    app.include_router(analytics_router)
    app.include_router(fhir_router)
    return app


app = create_app()
