from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
router = APIRouter(prefix="/admin", tags=["Administration"])
@router.get("/employees")
def list_employees(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    statement = select(User).where(User.role == "employee").order_by(User.name.asc())
    employees = db.scalars(statement).all()
    return [
        {
            "id": employee.id,
            "name": employee.name,
            "email": employee.email,
            "phone": employee.phone,
            "home_city": employee.home_city,
            "is_active": employee.is_active,
            "created_at": employee.created_at,
        }
        for employee in employees
    ]
@router.patch("/employees/{user_id}/deactivate", status_code=status.HTTP_200_OK)
def deactivate_employee(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    employee = db.get(User, user_id)
    if not employee or employee.role != "employee":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    if not employee.is_active:
        return {"message": "Employee is already deactivated", "employee_id": employee.id, "is_active": False}
    employee.is_active = False
    try:
        db.commit()
        db.refresh(employee)
    except Exception:
        db.rollback()
        raise
    return {"message": "Employee deactivated successfully", "employee_id": employee.id, "is_active": employee.is_active}
@router.patch("/employees/{user_id}/reactivate", status_code=status.HTTP_200_OK)
def reactivate_employee(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    employee = db.get(User, user_id)
    if not employee or employee.role != "employee":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    if employee.is_active:
        return {"message": "Employee is already active", "employee_id": employee.id, "is_active": True}
    employee.is_active = True
    try:
        db.commit()
        db.refresh(employee)
    except Exception:
        db.rollback()
        raise
    return {"message": "Employee reactivated successfully", "employee_id": employee.id, "is_active": employee.is_active}