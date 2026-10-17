"""Check authorized Db2 connectivity without importing or changing any records.

This optional probe does not connect the API to Db2. The live schema and credentials
are not in this repository, so no clinical Db2 queries can be verified yet.
"""

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Db2Settings:
    """Connection settings supplied by the team through environment variables."""
    host: str
    port: int
    database: str
    username: str
    password: str
    certificate: str


def settings_from_environment() -> Db2Settings:
    """Require every setting; do not guess the team's network or secrets."""
    names = ['BDZ_DB2_HOST', 'BDZ_DB2_PORT', 'BDZ_DB2_DATABASE', 'BDZ_DB2_USERNAME',
             'BDZ_DB2_PASSWORD', 'BDZ_DB2_SSL_CERTIFICATE']
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise ValueError('Missing Db2 settings: ' + ', '.join(missing))
    port = int(os.environ['BDZ_DB2_PORT'])
    if not 1 <= port <= 65535:
        raise ValueError('BDZ_DB2_PORT must be a valid TCP port.')
    values = [os.environ[name] for name in names]
    if any(any(char in value for char in ';\r\n') for value in values):
        raise ValueError('Db2 connection settings may not contain separators or newlines.')
    return Db2Settings(values[0], port, values[2], values[3], values[4], values[5])


def connection_string(settings: Db2Settings) -> str:
    """Build a TLS connection target; the password is passed separately."""
    return (f'DATABASE={settings.database};HOSTNAME={settings.host};PORT={settings.port};'
            f'PROTOCOL=TCPIP;SECURITY=SSL;SSLServerCertificate={settings.certificate};')


def probe(driver=None) -> dict:
    """Ask Db2 for its server identity using a read-only statement.

    The optional injected driver makes the connection procedure testable without
    pretending that the team's actual Db2 is reachable here.
    """
    settings = settings_from_environment()
    if driver is None:
        try:
            import ibm_db as driver
        except ImportError as error:
            raise RuntimeError('Install the optional ibm_db driver in an authorized environment.') from error
    connection = driver.connect(connection_string(settings), settings.username, settings.password)
    try:
        statement = driver.exec_immediate(connection, 'SELECT CURRENT SERVER FROM SYSIBM.SYSDUMMY1')
        row = driver.fetch_tuple(statement)
        if not row:
            raise RuntimeError('Db2 connectivity probe returned no server identity.')
        return {'status': 'connected', 'server': str(row[0])}
    finally:
        driver.close(connection)


def main() -> int:
    """Run a connection check without printing a DSN or credentials."""
    try:
        result = probe()
        print(f"Db2 connection succeeded; server: {result['server']}")
        return 0
    except (ValueError, RuntimeError, OSError) as error:
        print(f'Db2 connection check failed: {error.__class__.__name__}. '
              'Review backend/README.md and the authorized network/settings.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
