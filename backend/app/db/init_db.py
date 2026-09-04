from sqlalchemy.orm import Session

from app.db.session import engine, SessionLocal, Base
from app.db.base import User, Role

from passlib.context import CryptContext


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def get_or_create_role(
    db: Session,
    name: str,
    description: str,
) -> Role:
    role = (
        db.query(Role)
        .filter(Role.name == name)
        .first()
    )

    if role is None:
        role = Role(
            name=name,
            description=description,
        )

        db.add(role)
        db.flush()

        print(f"🚀 Role created: {name}")

    else:
        print(f"Role already exists: {name}")

    return role


def init_db() -> None:
    """Initialize database tables, roles, and default users."""

    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        # ==========================================
        # 1. CREATE ROLES
        # ==========================================

        admin_role = get_or_create_role(
            db,
            "admin",
            "System administrator",
        )

        staff_role = get_or_create_role(
            db,
            "staff",
            "Staff user",
        )

        # ==========================================
        # 2. CREATE ADMIN USER
        # ==========================================

        admin = (
            db.query(User)
            .filter(User.username == "admin")
            .first()
        )

        if admin is None:
            admin = User(
                username="admin",
                password=pwd_context.hash("1234"),
                role=admin_role,
                is_active=True,
            )

            db.add(admin)

            print(
                "🚀 Admin user created successfully "
                "with username: 'admin'"
            )

        else:
            print("Admin user already exists.")

        # ==========================================
        # 3. CREATE STAFF USER
        # ==========================================

        staff = (
            db.query(User)
            .filter(User.username == "staff")
            .first()
        )

        if staff is None:
            staff = User(
                username="staff",
                password=pwd_context.hash("1234"),
                role=staff_role,
                is_active=True,
            )

            db.add(staff)

            print(
                "👤 Staff user created successfully "
                "with username: 'staff'"
            )

        else:
            print("Staff user already exists.")

        # ==========================================
        # 4. COMMIT
        # ==========================================

        db.commit()

        print("=" * 60)
        print("Database initialized successfully.")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Error initializing database: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    init_db()
