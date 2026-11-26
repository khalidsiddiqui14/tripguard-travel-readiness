from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

db = SessionLocal()

try:
    email = "employee1@test.com"
    new_password = "TripGuard@2026"

    user = db.query(User).filter(User.email == email).first()

    if user:
        user.hashed_password = hash_password(new_password)
        db.commit()
        print("Password reset successful!")
    else:
        print("User not found!")

finally:
    db.close()

