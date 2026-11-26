import re
from typing import Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
)

from app.schemas.common import ORMModel


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=30)
    home_city: str | None = Field(default=None, max_length=120)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 2:
            raise ValueError("Name must contain at least 2 characters")

        if not re.fullmatch(r"[\w .'-]+", value, flags=re.UNICODE):
            raise ValueError("Name contains invalid characters")

        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            return None

        if not re.fullmatch(r"[+0-9() -]{7,30}", value):
            raise ValueError("Enter a valid phone number")

        digits = sum(character.isdigit() for character in value)

        if not 7 <= digits <= 15:
            raise ValueError("Phone number must contain 7-15 digits")

        return value

    @field_validator("home_city")
    @classmethod
    def validate_home_city(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            return None

        if len(value) > 120:
            raise ValueError("Home city is too long")

        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserResponse(ORMModel):
    id: int
    name: str
    email: str
    phone: str | None
    home_city: str | None
    role: Literal["employee", "admin"]
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserResponse
