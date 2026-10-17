"""Open the local SQLite database and enforce links between patient records."""

import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine, URL

ROOT = Path(__file__).resolve().parents[1]


def database_path() -> Path:
    """Use an optional environment setting or the project's local data folder."""
    return Path(os.environ.get('BDZ_DATABASE_PATH', ROOT / 'var/biodiscoveryz.sqlite'))


def make_engine(path: Path | str | None = None) -> Engine:
    """Create a connection manager; each API request gets its own connection."""
    mode = os.environ.get('BDZ_DATA_SOURCE', 'sqlite').strip().lower()
    if mode == 'db2':
        raise RuntimeError(
            'Db2 patient schema and authorized connection details are not configured. '
            'The API will not fall back to local SQLite data.'
        )
    if mode != 'sqlite':
        raise ValueError('BDZ_DATA_SOURCE must be sqlite or db2.')
    location = Path(path) if path is not None else database_path()
    location = location.resolve()
    location.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        URL.create('sqlite', database=str(location)),
        connect_args={'check_same_thread': False, 'timeout': 30},
    )

    @event.listens_for(engine, 'connect')
    def configure_connection(connection, _record):
        # SQLite does not enforce foreign keys unless each connection enables them.
        # A foreign key prevents a record from pointing to a missing patient/visit.
        connection.isolation_level = None
        cursor = connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.close()

    @event.listens_for(engine, 'begin')
    def begin_transaction(connection):
        # Explicit transactions ensure a failed import cannot leave half its rows.
        connection.exec_driver_sql('BEGIN')

    return engine
