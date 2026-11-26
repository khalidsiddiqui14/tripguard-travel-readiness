from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import ORMModel


class ChecklistCreate(BaseModel):
    title: str = Field(
        min_length=2,
        max_length=180,
        examples=["Flight booking confirmed"],
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "Checklist title must contain at least 2 characters."
            )

        return value


class ChecklistUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=2,
        max_length=180,
    )

    is_completed: bool | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "Checklist title must contain at least 2 characters."
            )

        return value

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError(
                "At least one field must be provided for an update."
            )

        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("Checklist title cannot be null.")

        if (
            "is_completed" in self.model_fields_set
            and self.is_completed is None
        ):
            raise ValueError("Completion status cannot be null.")

        return self


class ChecklistResponse(ORMModel):
    id: int
    trip_id: int
    title: str
    is_completed: bool
