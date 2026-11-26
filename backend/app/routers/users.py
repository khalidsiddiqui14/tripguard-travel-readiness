import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import UserResponse


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


class ProfileUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
    )

    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    home_city: str | None = Field(
        default=None,
        max_length=120,
    )

    @field_validator("name", "home_city")
    @classmethod
    def clean_text_fields(cls, value):
        if value is None:
            return value

        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "This field must contain at least 2 characters."
            )

        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        if value is None:
            return value

        value = value.strip()

        if not value:
            return None

        if not re.fullmatch(r"[+0-9() -]{7,30}", value):
            raise ValueError(
                "Please enter a valid phone number."
            )

        digits = re.sub(r"\D", "", value)

        if not 7 <= len(digits) <= 15:
            raise ValueError(
                "Phone number must contain 7 to 15 digits."
            )

        return value

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError(
                "At least one profile field must be provided."
            )

        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Name cannot be null.")

        if "home_city" in self.model_fields_set and self.home_city is None:
            raise ValueError("Home city cannot be null.")

        return self


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_profile(
    user: User = Depends(get_current_user),
):
    return user


@router.patch(
    "/me",
    response_model=UserResponse,
)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    updates = payload.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(user, key, value)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user
