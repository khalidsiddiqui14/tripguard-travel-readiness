from datetime import date
from pydantic import BaseModel, Field, model_validator
from app.schemas.common import ORMModel

class TripCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    origin_city: str = Field(min_length=2, max_length=120)
    destination_city: str = Field(min_length=2, max_length=120)
    destination_country: str | None = None
    purpose: str = "Business"
    departure_date: date
    return_date: date
    budget_amount: float | None = Field(default=None, gt=0)
    budget_currency: str = Field(default="USD", min_length=3, max_length=3)
    notes: str | None = None

    @model_validator(mode="after")
    def dates_are_valid(self):
        if self.return_date < self.departure_date:
            raise ValueError("Return date cannot be before departure date")
        return self

class TripUpdate(TripCreate):
    status: str = "upcoming"

class TripResponse(ORMModel):
    id: int
    user_id: int
    title: str
    origin_city: str
    destination_city: str
    destination_country: str | None
    purpose: str
    departure_date: date
    return_date: date
    budget_amount: float | None
    budget_currency: str
    status: str
    notes: str | None
