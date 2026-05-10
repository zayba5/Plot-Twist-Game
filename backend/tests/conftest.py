import pytest
from peewee import SqliteDatabase
import models

# create an in-memory sqlite DB for tests
@pytest.fixture(scope="session")
def test_db():
    # create the in-memory DB instance
    db = SqliteDatabase(":memory:")
    models.db = db

    model_classes = [
        models.Status,
        models.App_User,
        models.Game,
        models.Game_Settings,
        models.Game_Players,
        models.Story,
        models.Voting_Category,
        models.Category_Score,
        models.Voting_Session,
        models.Voting,
        models.Story_Part,
        models.Story_Assignment,
        models.Round_State,
        models.Chat_Message,
    ]

    db.bind(model_classes, bind_refs=True, bind_backrefs=True)
    db.connect()
    db.create_tables(model_classes)
    yield db
    db.drop_tables(model_classes)
    db.close()


# create an app object configured for testing
@pytest.fixture()
def app(test_db):
    # test_db fixture ensures models.DefaultTable is bound to test DB
    from main import create_app  # import after test_db bound
    app = create_app({"TESTING": True})
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()