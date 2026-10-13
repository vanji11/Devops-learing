def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_add_and_get_weight(client):
    payload = {
        "entry_date": "2026-10-13",
        "weight_kg": 66.5,
    }

    response = client.post("/weights", json=payload)

    assert response.status_code == 201
    assert float(response.json()["entry"]["weight_kg"]) == 66.5

    response = client.get("/weights")

    assert response.status_code == 200
    assert any(
        item["entry_date"] == "2026-10-13"
        for item in response.json()
    )


def test_reject_invalid_weight(client):
    payload = {
        "entry_date": "2026-10-13",
        "weight_kg": -5,
    }

    response = client.post("/weights", json=payload)

    assert response.status_code == 422


def test_add_and_get_workout(client):
    payload = {
        "workout_date": "2026-10-13",
        "workout_name": "Back and Biceps",
        "duration_minutes": 60,
        "status": "planned",
    }

    response = client.post("/workouts", json=payload)

    assert response.status_code == 201
    assert response.json()["entry"]["workout_name"] == "Back and Biceps"
    assert response.json()["entry"]["status"] == "planned"

    response = client.get("/workouts")

    assert response.status_code == 200
    assert any(
        item["workout_name"] == "Back and Biceps"
        for item in response.json()
    )


def test_reject_invalid_workout(client):
    payload = {
        "workout_date": "2026-10-13",
        "workout_name": "Leg Day",
        "duration_minutes": -10,
        "status": "planned",
    }

    response = client.post("/workouts", json=payload)

    assert response.status_code == 422

def test_update_workout_status(client):
    create_response = client.post(
        "/workouts",
        json={
            "workout_date": "2026-10-13",
            "workout_name": "Shoulders and Legs",
            "duration_minutes": 60,
            "status": "planned",
        },
    )

    assert create_response.status_code == 201
    workout_id = create_response.json()["entry"]["id"]

    update_response = client.patch(
        f"/workouts/{workout_id}/status",
        json={"status": "completed"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["entry"]["status"] == "completed"


def test_update_missing_workout(client):
    response = client.patch(
        "/workouts/999999/status",
        json={"status": "completed"},
    )

    assert response.status_code == 404


