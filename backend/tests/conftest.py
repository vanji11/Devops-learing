import os

# Set this before importing the application or its database module.
os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://gymtrack_user:"
    "gymtrack_local_dev_2026@127.0.0.1:5433/gymtrack_test"
)

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
