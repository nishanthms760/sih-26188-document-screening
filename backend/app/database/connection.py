import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sih_db")

# Try to connect to PostgreSQL. If psycopg2 is missing or PG server is down, fallback to SQLite.
if DATABASE_URL.startswith("postgresql"):
    try:
        test_engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 1})
        with test_engine.connect():
            pass
        engine = test_engine
    except Exception:
        print("WARNING: PostgreSQL database connection failed or psycopg2 is missing. Falling back to local SQLite database: sih_db.db")
        DATABASE_URL = "sqlite:///./sih_db.db"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
