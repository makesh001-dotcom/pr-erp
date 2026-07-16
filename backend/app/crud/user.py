from sqlalchemy.orm import Session, joinedload

from app.models.users import User


def get_user_by_username(db: Session, username: str):
    return (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.username == username)
        .first()
    )