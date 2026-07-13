from sqlalchemy.orm import Session
from app.db.session import engine, SessionLocal, Base
from app.models.users import User          # Keep only one correct import
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def init_db() -> None:
    """Initialize database tables and default admin user."""
    
    # Create all tables (safe to run multiple times)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.username == "admin").first()

        if not admin:
            hashed_password = pwd_context.hash("1234")

            new_admin = User(
                username="admin",
                password=hashed_password,
                role="admin",
                # Add other required fields if any (email, is_active, etc.)
            )

            db.add(new_admin)
            db.commit()
            print(" Admin user created successfully with username: 'admin' and password: '1234'")
        else:
            print("Admin user already exists.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error initializing database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()