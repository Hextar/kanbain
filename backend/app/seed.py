from .extensions import db
from .models import BoardColumn


DEFAULT_COLUMNS = ("To Do", "In Progress", "Done")


def seed_default_columns() -> None:
    if db.session.query(BoardColumn).count() > 0:
        return

    for order, title in enumerate(DEFAULT_COLUMNS):
        db.session.add(BoardColumn(title=title, order=order))
    db.session.commit()
