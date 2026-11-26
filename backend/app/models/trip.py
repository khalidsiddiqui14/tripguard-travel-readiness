from datetime import date, datetime
from typing import TYPE_CHECKING
from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
if TYPE_CHECKING:
    from app.models.user import User
    from app.models.checklist import ChecklistItem
    from app.models.readiness import ReadinessRecord
class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("return_date >= departure_date", name="ck_trips_valid_date_range"),
        CheckConstraint("budget_amount IS NULL OR budget_amount >= 0", name="ck_trips_non_negative_budget"),
        CheckConstraint("status IN ('upcoming', 'pending', 'approved', 'completed', 'cancelled', 'rejected')", name="ck_trips_valid_status"),
        Index("ix_trips_user_status", "user_id", "status"),
        Index("ix_trips_departure_date", "departure_date"),
    )
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    origin_city: Mapped[str] = mapped_column(String(120), nullable=False)
    destination_city: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    destination_country: Mapped[str | None] = mapped_column(String(120), nullable=True)
    purpose: Mapped[str] = mapped_column(String(80), default="Business", server_default="Business", nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date] = mapped_column(Date, nullable=False)
    budget_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    budget_currency: Mapped[str] = mapped_column(String(3), default="INR", server_default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="upcoming", server_default="upcoming", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    owner: Mapped["User"] = relationship("User", back_populates="trips")
    checklist_items: Mapped[list["ChecklistItem"]] = relationship("ChecklistItem", back_populates="trip", cascade="all, delete-orphan", passive_deletes=True)
    readiness_records: Mapped[list["ReadinessRecord"]] = relationship("ReadinessRecord", back_populates="trip", cascade="all, delete-orphan", passive_deletes=True)