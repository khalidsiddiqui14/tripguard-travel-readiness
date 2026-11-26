"""Create an administrator account from environment variables.

Run after configuring the backend environment:
TRIPGUARD_ADMIN_NAME, TRIPGUARD_ADMIN_EMAIL, TRIPGUARD_ADMIN_PASSWORD
python -m app.utils.seed_admin
Do not use a weak or shared demo password in production.
"""
import os
from sqlalchemy import select
from app.db.database import SessionLocal, Base, engine
from app.models.user import User
from app.core.security import hash_password

def main():
    name = os.environ["TRIPGUARD_ADMIN_NAME"]
    email = os.environ["TRIPGUARD_ADMIN_EMAIL"].lower()
    password = os.environ["TRIPGUARD_ADMIN_PASSWORD"]
    if len(password) < 12:
        raise SystemExit("Admin password must be at least 12 characters")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == email)):
            raise SystemExit("An account with this email already exists")
        db.add(User(name=name, email=email, hashed_password=hash_password(password), role="admin"))
        db.commit()
        print("Administrator account created.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
