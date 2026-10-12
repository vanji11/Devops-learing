from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_add_and_get_weight():
    payload = {
        "entry_date": "2026-10-13",
        "weight_kg": 66.5,
    }

    response = client.post("/weights", json=payload)

    assert response.status_code == 201
    assert response.json()["entry"]["weight_kg"] == "66.50" or response.json()["entry"]["weight_kg"] == 66.5

    response = client.get("/weights")

    assert response.status_code == 200
    assert any(
        item["entry_date"] == "2026-10-13"
        for item in response.json()
    )


def test_reject_invalid_weight():
    payload = {
        "entry_date": "2026-10-13",
        "weight_kg": -5,
    }

    response = client.post("/weights", json=payload)

    assert response.status_code == 422
