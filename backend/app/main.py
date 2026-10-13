from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import WeightRecord, WorkoutRecord


app = FastAPI(
    title="GymTrack API",
    description="Track body weight and gym workouts",
    version="1.0.0",
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class WeightEntry(BaseModel):
    entry_date: date
    weight_kg: Decimal = Field(gt=0, le=500, max_digits=5, decimal_places=2)


class WorkoutEntry(BaseModel):
    workout_date: date
    workout_name: str = Field(min_length=1, max_length=100)
    duration_minutes: int = Field(gt=0, le=600)
    status: Literal["planned", "completed", "missed"] = "planned"


@app.get("/")
def home():
    return {"message": "Welcome to GymTrack API"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/weights", status_code=201)
def add_weight(entry: WeightEntry, db: Session = Depends(get_db)):
    record = WeightRecord(**entry.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"message": "Weight recorded", "entry": record}


@app.get("/weights")
def get_weights(db: Session = Depends(get_db)):
    return db.scalars(
        select(WeightRecord).order_by(WeightRecord.entry_date.desc())
    ).all()


@app.post("/workouts", status_code=201)
def add_workout(entry: WorkoutEntry, db: Session = Depends(get_db)):
    record = WorkoutRecord(**entry.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"message": "Workout recorded", "entry": record}


@app.get("/workouts")
def get_workouts(db: Session = Depends(get_db)):
    return db.scalars(
        select(WorkoutRecord).order_by(WorkoutRecord.workout_date.desc())
    ).all()


class WorkoutStatusUpdate(BaseModel):
    status: Literal["planned", "completed", "missed"]


@app.patch("/workouts/{workout_id}/status")
def update_workout_status(
    workout_id: int,
    update: WorkoutStatusUpdate,
    db: Session = Depends(get_db),
):
    workout = db.get(WorkoutRecord, workout_id)

    if workout is None:
        raise HTTPException(status_code=404, detail="Workout not found")

    workout.status = update.status
    db.commit()
    db.refresh(workout)

    return {
        "message": "Workout status updated",
        "entry": workout,
    }



@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    latest_weight = db.scalar(
        select(WeightRecord)
        .order_by(WeightRecord.entry_date.desc(), WeightRecord.id.desc())
        .limit(1)
    )
    total_workouts = db.scalar(
        select(func.count()).select_from(WorkoutRecord)
    ) or 0
    completed_workouts = db.scalar(
        select(func.count())
        .select_from(WorkoutRecord)
        .where(WorkoutRecord.status == "completed")
    ) or 0

    return {
        "latest_weight": latest_weight,
        "total_workouts": total_workouts,
        "completed_workouts": completed_workouts,
    }
