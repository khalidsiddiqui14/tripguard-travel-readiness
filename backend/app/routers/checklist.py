from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip
from app.models.checklist import ChecklistItem
from app.schemas.checklist import (
    ChecklistCreate,
    ChecklistUpdate,
    ChecklistResponse,
)

router = APIRouter(
    prefix="/trips/{trip_id}/checklist",
    tags=["Preparation Checklist"],
)


def get_accessible_trip(
    db: Session,
    trip_id: int,
    user: User,
) -> Trip:
    trip = db.get(Trip, trip_id)

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )

    if user.role != "admin" and trip.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )

    return trip


def get_checklist_item(
    db: Session,
    trip_id: int,
    item_id: int,
) -> ChecklistItem:
    item = db.scalar(
        select(ChecklistItem).where(
            ChecklistItem.id == item_id,
            ChecklistItem.trip_id == trip_id,
        )
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found",
        )

    return item


@router.get(
    "",
    response_model=list[ChecklistResponse],
)
def list_items(
    trip_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_accessible_trip(db, trip_id, user)

    statement = (
        select(ChecklistItem)
        .where(ChecklistItem.trip_id == trip_id)
        .order_by(ChecklistItem.id)
    )

    return list(db.scalars(statement).all())


@router.post(
    "",
    response_model=ChecklistResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_item(
    trip_id: int,
    payload: ChecklistCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_accessible_trip(db, trip_id, user)

    title = payload.title.strip()

    if not title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Checklist title cannot be empty",
        )

    item = ChecklistItem(
        trip_id=trip_id,
        title=title,
    )

    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise

    return item


@router.patch(
    "/{item_id}",
    response_model=ChecklistResponse,
)
def update_item(
    trip_id: int,
    item_id: int,
    payload: ChecklistUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_accessible_trip(db, trip_id, user)

    item = get_checklist_item(db, trip_id, item_id)

    updates = payload.model_dump(exclude_unset=True)

    if "title" in updates:
        updates["title"] = updates["title"].strip()

        if not updates["title"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Checklist title cannot be empty",
            )

    for key, value in updates.items():
        setattr(item, key, value)

    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise

    return item


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_item(
    trip_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_accessible_trip(db, trip_id, user)

    item = get_checklist_item(db, trip_id, item_id)

    try:
        db.delete(item)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return None
